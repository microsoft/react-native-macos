# coding: utf-8
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))
version = package['version']

source = { :git => 'https://github.com/facebook/react-native.git' }
if version == '1000.0.0'
  # This is an unpublished version, use the latest commit hash of the react-native repo, which we’re presumably in.
  source[:commit] = `git rev-parse HEAD`.strip if system("git rev-parse --git-dir > /dev/null 2>&1")
else
  source[:tag] = "v#{version}"
end


Pod::Spec.new do |s|
  s.name                   = "React-cxxreact"
  s.version                = version
  s.summary                = "-"  # TODO
  s.homepage               = "https://reactnative.dev/"
  s.license                = package["license"]
  s.author                 = "Meta Platforms, Inc. and its affiliates"
  s.platforms              = min_supported_versions
  s.source                 = source
  s.source_files           = podspec_sources("*.{cpp,h}", "*.h")
  # [macOS] Generate per-platform-suffixed framework header search paths so headers
  # resolve in multi-platform (iOS/macOS/visionOS) use_frameworks! workspaces.
  cxxreact_framework_header_search_paths = create_header_search_path_for_frameworks("React-debug", framework_name: "React_debug")
    .concat(create_header_search_path_for_frameworks("React-runtimeexecutor", framework_name: "React_runtimeexecutor"))
    .map { |search_path| "\"#{search_path}\"" }
  s.pod_target_xcconfig    = {
    "HEADER_SEARCH_PATHS" => cxxreact_framework_header_search_paths.join(" "),
    "CLANG_CXX_LANGUAGE_STANDARD" => rct_cxx_language_standard()
  }
  s.header_dir             = "cxxreact"

  add_dependency(s, "React-jsinspector", :framework_name => 'jsinspector_modern')
  add_dependency(s, "React-jsinspectorcdp", :framework_name => 'jsinspector_moderncdp')
  add_dependency(s, "React-jsinspectortracing", :framework_name => 'jsinspector_moderntracing')
  s.dependency "React-callinvoker", version
  add_dependency(s, "React-runtimeexecutor", :additional_framework_paths => ["platform/ios"])
  s.dependency "React-perflogger", version
  s.dependency "React-jsi", version
  s.dependency "React-logger", version
  s.dependency "React-debug", version
  s.dependency "React-timing", version

  s.resource_bundles = {'React-cxxreact_privacy' => 'PrivacyInfo.xcprivacy'}

  if use_hermes()
    s.dependency 'hermes-engine'
  end

  add_rn_third_party_dependencies(s)
end
