# Copyright (c) Microsoft Corporation.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require 'test/unit'
require 'json'
require 'ostruct'
require 'pathname'

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
    config = Module.new
    config.define_singleton_method(:instance) { OpenStruct.new(sandbox: OpenStruct.new(root: Pathname.new('/Pods'))) }
    pod.const_set(:Config, config)
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
    [nil, '1', '0'].each do |flag|
      %w[1000.0.0 0.85.0].each do |package_version|
        %w[0.0.0 987.6.5].each do |compiler_version|
          ENV['RCT_HERMES_V1_ENABLED'] = flag
          @package['version'] = package_version
          @package['peerDependencies'] = {'react-native' => '^0.85.9'}
          @package['dependencies'] = {'hermes-compiler' => compiler_version}
          @calls.clear
          spec = evaluate
          key = flag == '0' ? 'HERMES_VERSION_NAME' : 'HERMES_V1_VERSION_NAME'
          assert_equal(METADATA.fetch(key), spec.version)
          assert_equal('destroot/Library/Frameworks/macosx/hermesvm.framework', spec.osx.vendored_frameworks)
          if METADATA.fetch(key) == '1000.0.0'
            assert_equal({git: @sandbox::HERMES_GITHUB_URL, commit: 'merge-base-hermes-commit'}, spec.source)
            source_calls = @calls.reject { |call| call.first == :node }
            assert_equal(1, source_calls.length)
            assert_equal(:merge_base, source_calls.first.first)
            if flag == '0'
              assert_equal('main', source_calls.first[1])
            else
              assert_not_equal('main', source_calls.first[1])
            end
            assert_equal('${PODS_ROOT}/hermes-engine/build_host_hermesc/bin/hermesc', spec.user_target_xcconfig['HERMES_CLI_PATH'])
            assert_equal(". '#{RN}/sdks/hermes-engine/utils/create-dummy-hermes-xcframework.sh'", spec.prepare_command)
            assert_equal(2, spec.script_phases.length)
            assert_equal(flag == '0', spec.subspecs.key?('inspector'))
          else
            assert_equal({http: @sandbox.release_tarball_url(spec.version, :debug)}, spec.source)
            assert_equal([[:artifact, spec.source[:http]]], @calls.select { |call| call.first == :artifact })
            assert_equal([], @calls.select { |call| call.first == :merge_base })
            compiler_path = spec.user_target_xcconfig['HERMES_CLI_PATH'].sub('$(PODS_ROOT)', '/Pods')
            assert_equal('/compiler/hermesc/osx-bin/hermesc', File.expand_path(compiler_path))
            assert_equal('destroot/Library/Frameworks/macosx/hermesvm.framework', spec.subspecs['Pre-built'].osx.vendored_frameworks)
          end
        end
      end
    end
  end

  def test_ci_without_pod_executable_can_force_legacy_source
    ENV['RCT_HERMES_V1_ENABLED'] = '0'
    ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
    @sandbox::Pod.send(:remove_const, :Executable)
    spec = evaluate
    assert_equal(METADATA.fetch('HERMES_VERSION_NAME'), spec.version)
    assert_equal({git: @sandbox::HERMES_GITHUB_URL, tag: File.read(File.join(RN, 'sdks', '.hermesversion')).strip}, spec.source)
    assert_equal([], @calls)
    assert_equal(". '#{File.join(ENGINE, '..', '..')}/sdks/hermes-engine/utils/create-dummy-hermes-xcframework.sh'", spec.prepare_command)
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

      tag_file = flag == '0' ? '.hermesversion' : '.hermesv1version'
      assert_equal({git: @sandbox::HERMES_GITHUB_URL, tag: File.read(File.join(RN, 'sdks', tag_file)).strip}, evaluate.source)
      assert_equal([], @calls.select { |call| [:artifact, :download, :merge_base].include?(call.first) })
    end
  end

  def test_forced_source_without_a_tag_keeps_the_merge_base_policy
    ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
    @sandbox::File.define_singleton_method(:exist?) { |_| false }
    [nil, '1', '0'].each do |flag|
      ENV['RCT_HERMES_V1_ENABLED'] = flag
      version = flag == '0' ? METADATA.fetch('HERMES_VERSION_NAME') : METADATA.fetch('HERMES_V1_VERSION_NAME')
      type = @sandbox.hermes_source_type(version, RN)
      assert_equal(@sandbox::HermesEngineSourceType::BUILD_FROM_GITHUB_MAIN, type)
      assert_equal('merge-base-hermes-commit', @sandbox.podspec_source(type, version, RN)[:commit])
    end
    assert_equal('main', @calls.last[1])
    assert_equal(@calls[0][1], @calls[1][1])
    assert_not_equal('main', @calls[0][1])
  end

  def test_explicit_host_compiler_path_is_preserved
    ENV['RCT_HERMES_V1_ENABLED'] = '0'
    ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'
    ENV['HERMES_OVERRIDE_HERMESC_PATH'] = ENGINE
    assert_equal("#{ENGINE}/bin/hermesc", evaluate.user_target_xcconfig['HERMES_CLI_PATH'])
  end

  def test_only_the_sentinel_skips_artifacts_even_when_source_flag_is_false
    ENV['RCT_HERMES_V1_ENABLED'] = '0'
    ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'false'
    type = @sandbox.hermes_source_type('1000.0.0', RN)
    assert_equal(@sandbox::HermesEngineSourceType::BUILD_FROM_GITHUB_MAIN, type)
    assert_empty(@calls)

    type = @sandbox.hermes_source_type('123.4.5', RN)
    assert_equal(@sandbox::HermesEngineSourceType::DOWNLOAD_PREBUILD_RELEASE_TARBALL, type)
    assert_equal([[:artifact, @sandbox.release_tarball_url('123.4.5', :debug)]], @calls)
    assert_equal('false', ENV['RCT_BUILD_HERMES_FROM_SOURCE'])
  end

  def test_missing_selected_metadata_does_not_fall_back_to_package_versions
    @sandbox::File.define_singleton_method(:read) do |path, *args|
      File.basename(path) == 'version.properties' ? '' : File.read(path, *args)
    end
    assert_raise(KeyError) { evaluate }
    assert_equal([], @calls.reject { |call| call.first == :node })
  end
end
