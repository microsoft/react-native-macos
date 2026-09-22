# Copyright (c) Microsoft Corporation.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require 'test/unit'
require 'json'
require 'ostruct'

class HermesEngineTests < Test::Unit::TestCase
  ENGINE = File.expand_path('../../../sdks/hermes-engine', __dir__)
  RN = File.expand_path('../..', ENGINE)
  PODSPEC = File.join(ENGINE, 'hermes-engine.podspec')
  METADATA = Hash[*File.read(File.join(ENGINE, 'version.properties')).split(/[=\n]+/)]
  ENV_KEYS = %w[RCT_HERMES_V1_ENABLED RCT_BUILD_HERMES_FROM_SOURCE
    REACT_NATIVE_OVERRIDE_HERMES_DIR HERMES_ENGINE_TARBALL_PATH HERMES_COMMIT
    HERMES_OVERRIDE_HERMESC_PATH ENTERPRISE_REPOSITORY]

  class Spec < OpenStruct
    def initialize
      super
      self.subspecs = {}
      %w[ios tvos osx visionos].each { |platform| self[platform] = OpenStruct.new }
      yield self if block_given?
    end

    def subspec(name)
      subspecs[name] = Spec.new
      yield subspecs[name]
    end
  end

  def setup
    @env = ENV_KEYS.to_h { |key| [key, ENV[key]] }
    ENV_KEYS.each { |key| ENV.delete(key) }
    @calls = []
    @package = JSON.parse(File.read(File.join(RN, 'package.json')))
    @sandbox = Module.new
    @sandbox.module_eval(File.read(File.join(ENGINE, 'hermes-utils.rb')), File.join(ENGINE, 'hermes-utils.rb'))
    @sandbox.extend(@sandbox)
    # Evaluate the actual podspec and helpers. Stub only CocoaPods and external I/O.
    @sandbox.define_singleton_method(:require_relative) { |_| }
    @sandbox.define_singleton_method(:hermes_log) { |*_| }
    calls = @calls
    @sandbox.define_singleton_method(:hermes_artifact_exists) do |url|
      calls << [:artifact, url]
      true
    end
    @sandbox.define_singleton_method(:nightly_tarball_url) do |_|
      raise 'Unexpected nightly artifact lookup'
    end
    @sandbox.define_singleton_method(:download_hermes_tarball) do |*args|
      calls << [:download, *args]
    end
    @sandbox.define_singleton_method(:hermes_commit_at_merge_base) do |branch|
      calls << [:merge_base, branch]
      {commit: 'merge-base-hermes-commit', timestamp: '2026-01-05'}
    end
    @sandbox.define_singleton_method(:artifacts_dir) { ENGINE }
    @sandbox.define_singleton_method(:system) do |command|
      calls << [:system, command]
      true
    end
    package = @package
    file = Class.new
    file.define_singleton_method(:read) do |path, *args|
      File.expand_path(path) == File.join(RN, 'package.json') ? JSON.generate(package) : File.read(path, *args)
    end
    file.define_singleton_method(:method_missing) { |name, *args| File.public_send(name, *args) }
    @sandbox.const_set(:File, file)
    pod = Module.new
    pod.const_set(:Spec, Spec)
    executable = Module.new
    executable.define_singleton_method(:execute_command) do |_, args|
      calls << [:node, args]
      args.join.include?('hermes-compiler') ? '/compiler/index.js' : File.join(RN, 'index.js')
    end
    executable.define_singleton_method(:which!) { |_| '/usr/bin/cmake' }
    pod.const_set(:Executable, executable)
    @sandbox.const_set(:Pod, pod)
  end

  def teardown
    @env.each { |key, value| ENV[key] = value }
  end

  def evaluate
    @sandbox.send(:remove_const, :CMAKE_BINARY) if @sandbox.const_defined?(:CMAKE_BINARY, false)
    @sandbox.module_eval(File.read(PODSPEC), PODSPEC)
  end

  def test_metadata_is_independent_of_package_peer_and_compiler_versions
    package_versions = ['1000.0.0', @package['version']]
    [nil, '1', '0', '', 'true'].each do |flag|
      package_versions.each do |package_version|
        %w[0.0.0 250829098.0.9 987.6.5].each do |compiler_version|
          ENV['RCT_HERMES_V1_ENABLED'] = flag
          @package['version'] = package_version
          @package['peerDependencies'] = {'react-native' => '0.84.1'}
          @package['dependencies'] = {'hermes-compiler' => compiler_version}
          @calls.clear
          spec = evaluate
          version = flag == '0' ? '0.15.1' : '250829098.0.9'
          assert_equal(version, spec.version)
          assert_equal({http: @sandbox.release_tarball_url(version, :debug)}, spec.source)
          assert_equal([[:artifact, spec.source[:http]]], @calls.select { |call| call.first == :artifact })
          assert_equal([:debug, :release].map { |config|
            [:download, RN, @sandbox.release_tarball_url(version, config), version, config]
          }, @calls.select { |call| call.first == :download })
          assert_equal([], @calls.select { |call| call.first == :merge_base })
          assert_include(spec.script_phase[:script], %Q[-r "#{version}"])
          # Preserve upstream compiler selection; this does not establish legacy bytecode compatibility.
          assert_equal('/compiler/hermesc/osx-bin/hermesc', spec.user_target_xcconfig['HERMES_CLI_PATH'])
          assert_equal('destroot/Library/Frameworks/macosx/hermesvm.framework', spec.osx.vendored_frameworks)
          prebuilt = spec.subspecs.fetch('Pre-built')
          assert_equal('destroot/Library/Frameworks/macosx/hermesvm.framework', prebuilt.osx.vendored_frameworks)
          headers = 'destroot/include/hermes/**/*.h'
          assert_equal(flag == '0' ? headers : [headers, 'destroot/include/jsi/hermes.h'], prebuilt.source_files)
        end
      end
    end
  end

  def test_metadata_belongs_to_the_podspec_not_the_current_directory
    @sandbox::File.define_singleton_method(:read) do |path, *args|
      # A caller's version.properties must not replace the podspec's metadata.
      path == 'version.properties' ? "HERMES_VERSION_NAME=999.0.0\nHERMES_V1_VERSION_NAME=999.0.1" : File.read(path, *args)
    end
    Dir.chdir(RN) do
      [nil, '0'].each do |flag|
        ENV['RCT_HERMES_V1_ENABLED'] = flag
        key = flag == '0' ? 'HERMES_VERSION_NAME' : 'HERMES_V1_VERSION_NAME'
        assert_equal(METADATA.fetch(key), evaluate.version)
      end
    end
  end

  def test_ci_without_pod_executable_uses_metadata_and_a_local_tarball
    @sandbox::Pod.send(:remove_const, :Executable)
    ENV['HERMES_ENGINE_TARBALL_PATH'] = __FILE__
    [nil, '0'].each do |flag|
      ENV['RCT_HERMES_V1_ENABLED'] = flag
      spec = evaluate
      key = flag == '0' ? 'HERMES_VERSION_NAME' : 'HERMES_V1_VERSION_NAME'
      assert_equal(METADATA.fetch(key), spec.version)
      assert_equal({http: "file://#{__FILE__}"}, spec.source)
      assert_nil(spec.user_target_xcconfig)
    end
    assert_empty(@calls)
  end

  def test_explicit_override_order_precedes_the_default_source_policy
    [nil, '1', '0'].each do |flag|
      ENV['RCT_HERMES_V1_ENABLED'] = flag
      ENV['REACT_NATIVE_OVERRIDE_HERMES_DIR'] = ENGINE
      ENV['HERMES_ENGINE_TARBALL_PATH'] = __FILE__
      ENV['HERMES_COMMIT'] = 'custom-commit'
      ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
      @calls.clear

      spec = evaluate
      assert_equal({http: "file://#{ENGINE}/hermes-engine-from-local-source-dir.tar.gz"}, spec.source)
      assert_equal(1, @calls.count { |call| call.first == :system })
      ENV.delete('REACT_NATIVE_OVERRIDE_HERMES_DIR')

      spec = evaluate
      assert_equal({http: "file://#{__FILE__}"}, spec.source)
      assert_nil(spec.user_target_xcconfig)
      ENV.delete('HERMES_ENGINE_TARBALL_PATH')

      assert_equal({git: @sandbox::HERMES_GITHUB_URL, commit: 'custom-commit'}, evaluate.source)
      ENV.delete('HERMES_COMMIT')

      spec = evaluate
      tag_file = flag == '0' ? '.hermesversion' : '.hermesv1version'
      assert_equal({git: @sandbox::HERMES_GITHUB_URL, tag: File.read(File.join(RN, 'sdks', tag_file)).strip}, spec.source)
      assert_equal('${PODS_ROOT}/hermes-engine/build_host_hermesc/bin/hermesc', spec.user_target_xcconfig['HERMES_CLI_PATH'])
      assert_equal(2, spec.script_phases.length)
      assert_include(spec.script_phases.first[:script], 'build-hermesc-xcode.sh')
      assert_equal(flag == '0', spec.subspecs.key?('inspector'))
      assert_equal([], @calls.select { |call| [:artifact, :download, :merge_base].include?(call.first) })
    end
  end

  def test_forced_source_without_a_tag_keeps_the_merge_base_policy
    ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
    @sandbox::File.define_singleton_method(:exist?) { |_| false }
    [nil, '1', '0'].each do |flag|
      ENV['RCT_HERMES_V1_ENABLED'] = flag
      spec = evaluate
      assert_equal({git: @sandbox::HERMES_GITHUB_URL, commit: 'merge-base-hermes-commit'}, spec.source)
      assert_equal('${PODS_ROOT}/hermes-engine/build_host_hermesc/bin/hermesc', spec.user_target_xcconfig['HERMES_CLI_PATH'])
    end
    assert_equal([[:merge_base, '250829098.0.0-stable'], [:merge_base, '250829098.0.0-stable'], [:merge_base, 'main']], @calls.reject { |call| call.first == :node })
  end

  def test_explicit_host_compiler_path_is_preserved_for_source_builds
    ENV['RCT_HERMES_V1_ENABLED'] = '0'
    ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
    ENV['HERMES_OVERRIDE_HERMESC_PATH'] = ENGINE
    assert_equal("#{ENGINE}/bin/hermesc", evaluate.user_target_xcconfig['HERMES_CLI_PATH'])
  end

  def test_missing_selected_metadata_does_not_fall_back_to_package_versions
    [nil, '0'].each do |flag|
      ENV['RCT_HERMES_V1_ENABLED'] = flag
      other_key = flag == '0' ? 'HERMES_V1_VERSION_NAME' : 'HERMES_VERSION_NAME'
      @sandbox::File.define_singleton_method(:read) do |path, *args|
        File.basename(path) == 'version.properties' ? "#{other_key}=123.4.5" : File.read(path, *args)
      end
      assert_raise(KeyError) { evaluate }
    end
    assert_equal([], @calls.reject { |call| call.first == :node })
  end
end
