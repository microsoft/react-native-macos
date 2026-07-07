# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))
version = package['version']

source = { :git => 'https://github.com/facebook/react-native.git' }
if version == '1000.0.0'
  # This is an unpublished version, use the latest commit hash of the react-native repo, which we’re presumably in.
  source[:commit] = `git rev-parse HEAD`.strip if system("git rev-parse --git-dir > /dev/null 2>&1")
else
  source[:tag] = "v#{version}"
end

Pod::Spec.new do |s|
  s.name                   = "ReactCommon"
  s.module_name            = "ReactCommon"
  s.version                = version
  s.summary                = "-"  # TODO
  s.homepage               = "https://reactnative.dev/"
  s.license                = package["license"]
  s.author                 = "Meta Platforms, Inc. and its affiliates"
  s.platforms              = min_supported_versions
  s.source                 = source
  s.header_dir             = "ReactCommon" # Use global header_dir for all subspecs for use_frameworks! compatibility
  s.pod_target_xcconfig    = { "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/Headers/Private/React-Core\"",
                               "USE_HEADERMAP" => "YES",
                               "DEFINES_MODULE" => "YES",
                               "CLANG_CXX_LANGUAGE_STANDARD" => rct_cxx_language_standard(),
                               "GCC_WARN_PEDANTIC" => "YES" }
  if ENV['USE_FRAMEWORKS']
    s.header_mappings_dir     = './'
  end

  add_rn_third_party_dependencies(s)

  # TODO (T48588859): Restructure this target to align with dir structure: "react/nativemodule/..."
  # Note: Update this only when ready to minimize breaking changes.
  s.subspec "turbomodule" do |ss|
    ss.dependency "React-callinvoker", version
    ss.dependency "React-perflogger", version
    ss.dependency "React-cxxreact", version
    ss.dependency "React-jsi", version
    ss.dependency "React-logger", version
    if use_hermes()
      ss.dependency "hermes-engine"
    end

    ss.subspec "bridging" do |sss|
      sss.dependency           "React-jsi", version
      sss.source_files         = podspec_sources("react/bridging/**/*.{cpp,h}", "react/bridging/**/*.h")
      sss.exclude_files        = "react/bridging/tests"
      sss.header_dir           = "react/bridging"
      sss.pod_target_xcconfig  = { "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/ReactCommon\"" }
      if use_hermes()
        sss.dependency "hermes-engine"
      end
    end

    ss.subspec "core" do |sss|
      sss.source_files = podspec_sources("react/nativemodule/core/ReactCommon/**/*.{cpp,h}", "react/nativemodule/core/ReactCommon/**/*.h")
      # [macOS] Generate per-platform-suffixed framework header search paths so headers
      # resolve in multi-platform (iOS/macOS/visionOS) use_frameworks! workspaces.
      core_framework_header_search_paths = ["\"$(PODS_TARGET_SRCROOT)/ReactCommon\""]
        .concat(create_header_search_path_for_frameworks("React-debug", framework_name: "React_debug").map { |search_path| "\"#{search_path}\"" })
        .concat(create_header_search_path_for_frameworks("React-featureflags", framework_name: "React_featureflags").map { |search_path| "\"#{search_path}\"" })
        .concat(create_header_search_path_for_frameworks("React-utils", framework_name: "React_utils").map { |search_path| "\"#{search_path}\"" })
      sss.pod_target_xcconfig  = { "HEADER_SEARCH_PATHS" => core_framework_header_search_paths.join(" ") }
      sss.dependency "React-debug", version
      sss.dependency "React-featureflags", version
      sss.dependency "React-utils", version
    end
  end
end
