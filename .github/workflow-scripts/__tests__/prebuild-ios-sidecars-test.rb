# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license in the root LICENSE file.

require 'yaml'
require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require 'open3'

class PrebuildIOSSidecarsTest < Minitest::Test
  ROOT = File.expand_path('../..', __dir__)

  def workflow(name)
    YAML.load_file(File.join(ROOT, 'workflows', name))
  end

  def steps(name)
    workflow(name).fetch('jobs').values.flat_map { |job| job.fetch('steps', []) }
  end

  def step(name, title)
    steps(name).find { |s| s['name'] == title } || raise(title)
  end

  def expand(text, flavor)
    text.gsub(/\$\{\{\s*matrix.flavor\s*\}\}/, flavor)
  end

  def run_step(name, title, root, flavor)
    Open3.capture3('bash', '-euc', expand(step(name, title).fetch('run'), flavor), chdir: root)
  end

  def test_standalone_sidecars_are_cached_and_uploaded_for_both_flavors
    [
      ['prebuild-ios-core.yml', 'Rename ReactNativeHeaders XCFramework tarball', 'Upload ReactNativeHeaders XCFramework Artifact', 'Save cache if present'],
      ['prebuild-ios-dependencies.yml', 'Compress Headers Sidecar XCFramework', 'Upload Headers Sidecar XCFramework Artifact', 'Save XCFramework in Cache'],
    ].each do |name, create, upload, save|
      assert_includes(step(name, create).fetch('if'), "cache-hit != 'true'")
      refute(step(name, upload).key?('if'), 'cache hits must upload too')
      upload_path = step(name, upload).fetch('with').fetch('path')
      assert_includes(step(name, save).fetch('with').fetch('path').lines.map(&:strip), upload_path)
      %w[Debug Release].each do |flavor|
        Dir.mktmpdir('ios-sidecar-payload-') do |dir|
          if name.include?('core')
            stage = File.join(dir, "packages/react-native/.build/output/xcframeworks/#{flavor}")
            %w[React ReactNativeHeaders].each do |framework|
              FileUtils.mkdir_p(File.join(stage, "#{framework}.xcframework"))
              File.write(File.join(stage, "#{framework}.xcframework/Info.plist"), 'fixture')
            end
            assert(Open3.capture3('tar', '-czf', 'ReactNativeHeaders.xcframework.tar.gz', 'ReactNativeHeaders.xcframework', chdir: stage).last.success?)
            assert(run_step(name, 'Compress and Rename XCFramework', dir, flavor).last.success?)
          else
            stage = File.join(dir, 'packages/react-native/third-party')
            %w[ReactNativeDependencies ReactNativeDependenciesHeaders].each do |framework|
              FileUtils.mkdir_p(File.join(stage, "#{framework}.xcframework"))
              File.write(File.join(stage, "#{framework}.xcframework/Info.plist"), 'fixture')
            end
            assert(run_step(name, 'Compress and Rename XCFramework', dir, flavor).last.success?)
          end
          stdout, stderr, status = run_step(name, create, dir, flavor)
          assert(status.success?, stdout + stderr)
          archive = File.join(dir, expand(upload_path, flavor))
          listing, status = Open3.capture2('tar', '-tzf', archive)
          assert(status.success?)
          assert_match(/Headers\.xcframework\/Info.plist/, listing)
          combined = step(name, 'Upload XCFramework Artifact').fetch('with').fetch('path')
          listing, status = Open3.capture2('tar', '-tzf', File.join(dir, expand(combined, flavor)))
          assert(status.success?)
          assert_match(/Headers\.xcframework\/Info.plist/, listing)
        end
      end
    end
  end

  def test_old_incomplete_cache_keys_are_invalidated_consistently
    {'prebuild-ios-core.yml' => 'v5-ios-core-xcframework-', 'prebuild-ios-dependencies.yml' => 'v6-ios-dependencies-xcframework-'}.each do |name, prefix|
      keys = steps(name).filter_map { |s| s.dig('with', 'key') }.select { |key| key.start_with?(prefix) }
      assert_equal(2, keys.length)
      assert_equal(keys[0], keys[1])
    end
  end
end
