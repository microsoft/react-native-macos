# Copyright (c) Microsoft Corporation.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require 'test/unit'
require 'cocoapods'
require 'tmpdir'
require 'open3'
require_relative '../../react_native_pods'

class RNCoreRCTUIKitFacadeTests < Test::Unit::TestCase
  RN_ROOT = File.expand_path('../../..', __dir__)
  UIKIT_ROOT = File.join(RN_ROOT, 'ReactApple/Libraries/RCTUIKit')

  def setup
    @tmp = Dir.mktmpdir('rncore-rctuikit-')
    @previous_source = ReactNativeCoreUtils.class_variable_get(:@@build_from_source)
    @previous_frameworks = ENV['USE_FRAMEWORKS']
    @previous_tarball = ENV['RCT_TESTONLY_RNCORE_TARBALL_PATH']
    ENV['USE_FRAMEWORKS'] = 'dynamic'
    # A real local file makes podspec evaluation network-free. No download runs.
    ENV['RCT_TESTONLY_RNCORE_TARBALL_PATH'] = File.join(@tmp, 'local.tar.gz')
    File.write(ENV['RCT_TESTONLY_RNCORE_TARBALL_PATH'], '')
  end

  def teardown
    ReactNativeCoreUtils.class_variable_set(:@@build_from_source, @previous_source)
    ENV['USE_FRAMEWORKS'] = @previous_frameworks
    ENV['RCT_TESTONLY_RNCORE_TARBALL_PATH'] = @previous_tarball
    FileUtils.rm_rf(@tmp)
  end

  def pod(name, **options)
    @declaration = [name, options]
  end

  def selected_spec(source_mode)
    ReactNativeCoreUtils.class_variable_set(:@@build_from_source, source_mode)
    unless source_mode
      RNCoreFacades.generate(RN_ROOT, @tmp, 'unused', min_supported_versions)
    end
    # Execute the actual declaration from use_react_native!, without pod install's
    # network/codegen setup. This catches accidentally restoring a plain `pod`.
    prefix = RN_ROOT
    declaration = File.readlines(File.join(RN_ROOT, 'scripts/react_native_pods.rb'))
      .find { |line| line.match?(/^\s+(?:rncore_pod|pod) 'React-RCTUIKit',/) }
    assert_not_nil(declaration)
    eval(declaration, binding)
    name, options = @declaration
    assert_equal('React-RCTUIKit', name)
    dir = File.expand_path(options[:path], @tmp)
    [Pod::Specification.from_file(Dir.glob(File.join(dir, '*.podspec{,.json}')).fetch(0)), dir]
  end

  def accessor(spec, root)
    Pod::Sandbox::FileAccessor.new(Pathname.new(root), spec.consumer(:osx))
  end

  def dynamic_target(spec, files)
    definition = Pod::Podfile.new do
      target 'Consumer' do
        platform :osx, min_macos_version_supported
        use_frameworks! :linkage => :dynamic
      end
    end.target_definitions.fetch('Consumer')
    Pod::PodTarget.new(
      Pod::Sandbox.new(File.join(@tmp, 'Pods')), Pod::BuildType.dynamic_framework,
      {'Debug' => :debug, 'Release' => :release}, ['arm64'],
      Pod::Platform.new(:osx, min_macos_version_supported), [spec], [definition], [files]
    )
  end

  def test_prebuilt_facade_has_only_the_prebuilt_dependency_and_no_second_header_provider
    spec, facade_dir = selected_spec(false)
    assert_equal(JSON.parse(File.read(File.join(RN_ROOT, 'package.json')))['version'], spec.version.to_s)
    assert_equal(['React-Core-prebuilt'], spec.dependencies.map(&:name))
    assert_equal(min_macos_version_supported, spec.deployment_target(:osx))
    facade_files = accessor(spec, facade_dir)
    assert_empty(facade_files.source_files)
    assert_empty(facade_files.public_headers)
    assert_nil(spec.consumer(:osx).module_map)
    assert_false(dynamic_target(spec, facade_files).should_build?)

    # Stage the actual spec-driven RCTUIKit headers, then run the real prebuilt
    # pod's prepare command and FileAccessor. Only xcodebuild/binary work is omitted.
    artifact = File.join(@tmp, 'React-Core-prebuilt')
    FileUtils.mkdir_p(artifact)
    script = <<~'JS'
      const fs = require('fs'), path = require('path');
      const [root, out] = process.argv.slice(1);
      const {computeSpecPlan} = require(path.join(root, 'scripts/ios-prebuild/headers-compose'));
      const {renderNamespaceModuleMap} = require(path.join(root, 'scripts/ios-prebuild/headers-spec'));
      const plan = computeSpecPlan(root);
      const headers = path.join(out, 'ReactNativeHeaders.xcframework', 'macos-arm64', 'Headers');
      fs.mkdirSync(headers, {recursive:true});
      for (const entry of plan.reactNativeHeaders.filter(e => e.relPath.startsWith('RCTUIKit/'))) {
        if (entry.redirectTo) throw Error('RCTUIKit must own canonical content');
        const dest = path.join(headers, entry.relPath);
        fs.mkdirSync(path.dirname(dest), {recursive:true});
        fs.copyFileSync(path.join(root,entry.source), dest);
      }
      fs.writeFileSync(path.join(headers, 'module.modulemap'), renderNamespaceModuleMap({RCTUIKit:plan.namespaceModules.RCTUIKit}));
      const fw = path.join(out, 'React.xcframework', 'macos-arm64', 'React.framework', 'Headers');
      fs.mkdirSync(fw, {recursive:true});
      for (const name of ['RCTUIKit.h','RCTPlatformDisplayLink.h']) {
        const entry = plan.react.find(e => e.relPath === name);
        if (!entry) throw Error('Missing React compatibility header: '+name);
        fs.copyFileSync(path.join(root,entry.source),path.join(fw,name));
      }
    JS
    stdout, stderr, status = Open3.capture3('node', '-e', script, RN_ROOT, artifact)
    assert_predicate(status, :success?, stdout + stderr)
    prebuilt = Pod::Specification.from_file(File.join(RN_ROOT, 'React-Core-prebuilt.podspec'))
    stdout, stderr, status = Open3.capture3('bash', '-c', prebuilt.prepare_command, :chdir => artifact)
    assert_predicate(status, :success?, stdout + stderr)
    prebuilt_files = accessor(prebuilt, artifact)
    canonical = prebuilt_files.public_headers.select { |h| h.to_s.include?('/Headers/RCTUIKit/') }
    expected = Dir.glob(File.join(UIKIT_ROOT, '*.h')).map { |h| File.basename(h) }.sort
    assert_equal(18, expected.length)
    assert_equal(expected, canonical.map { |h| h.basename.to_s }.sort)
    providers = [facade_files, prebuilt_files].flat_map(&:public_headers)
    expected.each do |name|
      assert_equal(1, providers.count { |h| h.basename.to_s == name }, "one provider for #{name}")
    end
    assert_match(/module RCTUIKit\s*\{/, File.read(File.join(artifact, 'Headers/module.modulemap')))
    {'RCTUIKit.h' => 'RCTUIKit/RCTUIKit.h', 'RCTPlatformDisplayLink.h' => 'RCTUIKit/RCTPlatformDisplayLink.h'}.each do |name, include_path|
      compat = File.read(File.join(artifact, 'React.xcframework/macos-arm64/React.framework/Headers', name))
      assert_include(compat, "#import <#{include_path}>")
    end
    assert_false(Dir.exist?(File.join(artifact, 'ReactNativeHeaders.xcframework')))
  end

  def test_source_mode_keeps_the_original_module_headers_and_implementation
    spec, source_dir = selected_spec(true)
    assert_equal(UIKIT_ROOT, source_dir)
    assert_equal('RCTUIKit', spec.module_name)
    assert_equal('RCTUIKit', spec.consumer(:osx).header_dir)
    assert_not_include(spec.dependencies.map(&:name), 'React-Core-prebuilt')
    files = accessor(spec, source_dir)
    assert_equal(18, files.public_headers.length)
    implementations = files.source_files.select { |f| f.extname == '.m' }
    assert_equal(14, implementations.length)
    assert_true(dynamic_target(spec, files).should_build?)
  end

  def test_swiftpm_react_product_includes_rctuikit_implementation_target
    stdout, stderr, status = Open3.capture3('swift', 'package', 'dump-package', '--package-path', RN_ROOT)
    assert_predicate(status, :success?, stderr)
    manifest = JSON.parse(stdout)
    product = manifest['products'].find { |p| p['name'] == 'React' }
    assert_equal(['dynamic'], product.fetch('type').fetch('library'))
    assert_include(product.fetch('targets'), 'RCTUIKit')
    target = manifest['targets'].find { |t| t['name'] == 'RCTUIKit' }
    assert_equal('regular', target['type'])
    assert_equal('ReactApple/Libraries/RCTUIKit', target['path'])
    assert_nil(target['sources']) # SwiftPM discovers the implementation files.
    assert_equal(['README.md'], target['exclude'])
    assert_equal(14, Dir.glob(File.join(RN_ROOT, target['path'], '*.m')).length)
  end
end
