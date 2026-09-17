# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require 'yaml'
require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require 'open3'

class MicrosoftPrebuildMacOSCoreTest < Minitest::Test
  ROOT = File.expand_path('../..', __dir__)
  WORKFLOW = YAML.load_file(File.join(ROOT, 'workflows/microsoft-prebuild-macos-core.yml'))
  TOOLCHAIN = YAML.load_file(File.join(ROOT, 'actions/microsoft-setup-toolchain/action.yml'))

  def steps(job)
    WORKFLOW.fetch('jobs').fetch(job).fetch('steps')
  end

  def step(job, name)
    steps(job).find { |s| s['name'] == name } || raise("Missing step: #{name}")
  end

  # Evaluate the workflow's actual expressions for successful jobs. actionlint
  # separately validates GitHub expression syntax and context availability.
  def expression(value, platform: 'ios-simulator', hit: false, ref: 'refs/heads/main', family: nil)
    source = value.sub(/\A\$\{\{\s*/, '').sub(/\s*\}\}\z/, '')
    {
      'matrix.platform' => platform,
      'inputs.platform' => family,
      'github.ref' => ref,
      'steps.cache-slice.outputs.cache-hit' => hit.to_s,
      'steps.cache-xcframework.outputs.cache-hit' => hit.to_s
    }.each { |token, replacement| source = source.gsub(token, replacement.inspect) }
    source = source.gsub('startsWith(', 'starts_with(').gsub('endsWith(', 'ends_with(')
    eval(source, binding) # Only checked-in workflow expressions, never external input.
  end

  def starts_with(value, prefix)
    value.start_with?(prefix)
  end

  def ends_with(value, suffix)
    value.end_with?(suffix)
  end

  def enabled?(step, **context)
    !step.key?('if') || !!expression(step['if'], **context)
  end

  def test_build_cache_paths_and_header_transfers
    platforms = WORKFLOW['jobs']['build']['strategy']['matrix']['platform']
    assert_equal %w[ios ios-simulator macos visionos visionos-simulator], platforms
    restore = step('build', 'Restore slice cache')['with']
    save = step('build', 'Save slice cache')['with']
    assert_equal restore['path'], save['path']
    assert_equal '${{ steps.cache-slice.outputs.cache-primary-key }}', save['key']
    assert_match(/\Av2-/, restore['key'])
    refute restore.key?('restore-keys')

    %w[Hermes dependency].each do |kind|
      upload = step('build', "Upload #{kind} headers")
      download = step('compose-xcframework', "Download #{kind} headers")
      assert_equal upload['with']['name'], download['with']['name']
      assert_equal upload['with']['path'], download['with']['path']
      assert_includes restore['path'].lines.map(&:strip), upload['with']['path']
      assert_equal 'error', upload['with']['if-no-files-found']
      platforms.product([true, false]).each do |platform, hit|
        assert_equal platform == 'ios-simulator', enabled?(upload, platform: platform, hit: hit)
      end
    end

    platforms.product([true, false]).each do |platform, hit|
      %w[Setup\ toolchain Install\ npm\ dependencies Download\ Hermes\ artifacts Setup\ workspace\ (using\ prebuilt\ Hermes)].each do |name|
        assert_equal !hit, enabled?(step('build', name), platform: platform, hit: hit)
      end
      assert enabled?(step('build', 'Upload headers'), platform: platform, hit: hit)
      assert enabled?(step('build', 'Upload slice artifacts'), platform: platform, hit: hit)
    end
  end

  def test_toolchain_family_conditions_cover_simulators_and_compose_sdks
    setup = step('build', 'Setup toolchain')
    xcode = TOOLCHAIN['runs']['steps'].find { |s| s['name'] == 'Set up Xcode' }
    vision = TOOLCHAIN['runs']['steps'].find { |s| s['name'] == 'Download visionOS SDK' }
    { 'ios' => 'ios', 'ios-simulator' => 'ios', 'macos' => 'macos',
      'visionos' => 'visionos', 'visionos-simulator' => 'visionos' }.each do |platform, expected|
      family = expression(setup['with']['platform'], platform: platform)
      assert_equal expected, family
      assert enabled?(xcode, family: family)
      assert_equal expected == 'visionos', enabled?(vision, family: family)
    end
    family = step('compose-xcframework', 'Setup toolchain')['with']['platform']
    assert enabled?(xcode, family: family)
    assert enabled?(vision, family: family)
    script = step('compose-xcframework', 'Verify compose SDKs')['run']
    output, status = Open3.capture2('bash', '-euc', 'xcrun() { printf "%s\n" "$2"; }; ' + script)
    assert status.success?
    assert_equal %w[iphoneos iphonesimulator macosx xros xrsimulator], output.lines.map(&:strip)
  end

  def test_compose_cold_and_cache_hit_paths
    job = 'compose-xcframework'
    restore = step(job, 'Restore compose cache')['with']
    save = step(job, 'Save compose cache')['with']
    assert_equal restore['path'], save['path']
    assert_equal '${{ steps.cache-xcframework.outputs.cache-primary-key }}', save['key']
    assert_match(/\Av2-/, restore['key'])
    refute restore.key?('restore-keys')
    %w[.github/workflows/microsoft-prebuild-macos-core.yml headers-include-baseline.json version.properties yarn.lock].each do |input|
      assert_includes restore['key'], input
      assert_includes step('build', 'Restore slice cache')['with']['key'], input
    end
    uploads = steps(job).select { |s| s['uses'] == 'actions/upload-artifact@v4' }
    assert_equal 3, uploads.length
    assert_equal restore['path'].lines.map(&:strip).sort, uploads.map { |s| s['with']['path'] }.sort
    [true, false].each do |hit|
      steps(job).each do |s|
        next if s['uses']&.start_with?('actions/checkout', 'actions/cache/')
        expected = s['name'] == 'Verify archive payloads' || uploads.include?(s) || !hit
        assert_equal expected, enabled?(s, hit: hit), "#{s['name']}, hit=#{hit}"
      end
    end
    assert_includes step(job, 'Create XCFramework')['run'], '--require-hermes'
    assert_equal 'node scripts/ios-prebuild/headers-verify.js --flavor Debug', step(job, 'Verify composed headers (iOS Simulator)')['run']
    names = steps(job).map { |s| s['name'] }
    assert_operator names.index('Verify composed headers (iOS Simulator)'), :<, names.index('Name XCFramework archives')
    assert_operator names.index('Verify archive payloads'), :<, names.index('Save compose cache')
    uploads.each { |s| assert_equal 'error', s['with']['if-no-files-found'] }
  end

  def test_cache_save_conditions
    { 'build' => 'Save slice cache', 'compose-xcframework' => 'Save compose cache' }.each do |job, name|
      %w[refs/heads/main refs/heads/0.87-stable refs/heads/topic refs/pull/1/merge].product([true, false]).each do |ref, hit|
        expected = !hit && %w[refs/heads/main refs/heads/0.87-stable].include?(ref)
        assert_equal expected, enabled?(step(job, name), hit: hit, ref: ref)
      end
    end
  end

  def test_actual_archive_commands_reject_the_old_payload
    Dir.mktmpdir('prebuild-payload-test-') do |dir|
      %w[React ReactNativeHeaders].each do |name|
        FileUtils.mkdir_p(File.join(dir, "Debug/#{name}.xcframework"))
        File.write(File.join(dir, "Debug/#{name}.xcframework/Info.plist"), 'fixture')
      end
      FileUtils.mkdir_p(File.join(dir, 'Debug/Symbols'))
      File.write(File.join(dir, 'Debug/Symbols/fixture.dSYM'), 'fixture')
      run = lambda do |script, cwd|
        Open3.capture3('bash', '-euc', script, chdir: cwd)
      end
      assert run.call('tar -czf React.xcframework.tar.gz React.xcframework ReactNativeHeaders.xcframework; tar -czf ReactNativeHeaders.xcframework.tar.gz ReactNativeHeaders.xcframework', File.join(dir, 'Debug')).last.success?
      assert run.call(step('compose-xcframework', 'Name XCFramework archives')['run'], dir).last.success?
      assert run.call('tar -czf ../../ReactCoreDebug.framework.dSYM.tar.gz .', File.join(dir, 'Debug/Symbols')).last.success?
      check = step('compose-xcframework', 'Verify archive payloads')['run']
      assert run.call(check, dir).last.success?
      FileUtils.mv(File.join(dir, 'ReactNativeHeadersDebug.xcframework.tar.gz'), File.join(dir, 'headers.saved'))
      refute run.call(check, dir).last.success?, 'A missing standalone archive must fail'
      FileUtils.mv(File.join(dir, 'headers.saved'), File.join(dir, 'ReactNativeHeadersDebug.xcframework.tar.gz'))
      assert run.call('tar -czf ../ReactCoreDebug.xcframework.tar.gz React.xcframework', File.join(dir, 'Debug')).last.success?
      refute run.call(check, dir).last.success?, 'The old core-only payload must fail on cache hits too'
    end
  end

  def test_actual_compose_input_checks_require_hermes_headers
    Dir.mktmpdir('prebuild-input-test-') do |dir|
      script = step('compose-xcframework', 'Verify downloaded artifacts')['run']
      %w[
        packages/react-native/.build/output/spm/Debug/Build/Products
        packages/react-native/.build/headers
        packages/react-native/.build/artifacts/hermes/destroot/include/hermes
        packages/react-native/third-party/ReactNativeDependencies.xcframework/Headers
      ].each { |entry| FileUtils.mkdir_p(File.join(dir, entry)) }
      refute Open3.capture3('bash', '-euc', script, chdir: dir).last.success?
      File.write(File.join(dir, 'packages/react-native/.build/artifacts/hermes/destroot/include/hermes/hermes.h'), 'fixture')
      assert Open3.capture3('bash', '-euc', script, chdir: dir).last.success?
    end
  end
end
