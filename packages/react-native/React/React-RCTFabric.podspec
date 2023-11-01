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

folly_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1'
folly_compiler_flags = folly_flags + ' ' + '-Wno-comma -Wno-shorten-64-to-32'
folly_version = '2023.08.07.00'
boost_compiler_flags = '-Wno-documentation'

header_search_paths = [
  "\"$(PODS_TARGET_SRCROOT)/ReactCommon\"",
  "\"$(PODS_ROOT)/boost\"",
  "\"$(PODS_ROOT)/DoubleConversion\"",
  "\"$(PODS_ROOT)/fmt/include\"",
  "\"$(PODS_ROOT)/RCT-Folly\"",
  "\"$(PODS_ROOT)/Headers/Private/React-Core\"",
  "\"$(PODS_ROOT)/Headers/Private/Yoga\"",
  "\"$(PODS_ROOT)/Headers/Public/React-Codegen\"",
  "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Codegen-macOS/React_Codegen.framework/Headers\"",
]

if ENV['USE_FRAMEWORKS']
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Fabric-macOS/React_Fabric.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-FabricImage-macOS/React_FabricImage.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Fabric-macOS/React_Fabric.framework/Headers/react/renderer/textlayoutmanager/platform/ios\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Fabric-macOS/React_Fabric.framework/Headers/react/renderer/components/textinput/iostextinput\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Fabric-macOS/React_Fabric.framework/Headers/react/renderer/components/view/platform/cxx\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Fabric-macOS/React_Fabric.framework/Headers/react/renderer/imagemanager/platform/ios\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-nativeconfig-macOS/React_nativeconfig.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-graphics-macOS/React_graphics.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-graphics-macOS/React_graphics.framework/Headers/react/renderer/graphics/platform/ios\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-ImageManager-macOS/React_ImageManager.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-RCTFabric-macOS/RCTFabric.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-debug-macOS/React_debug.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-utils-macOS/React_utils.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-rendererdebug-macOS/React_rendererdebug.framework/Headers\""
  header_search_paths << "\"${PODS_CONFIGURATION_BUILD_DIR}/React-runtimescheduler-macOS/React_runtimescheduler.framework/Headers\""
end

Pod::Spec.new do |s|
  s.name                   = "React-RCTFabric"
  s.version                = version
  s.summary                = "RCTFabric for React Native."
  s.homepage               = "https://reactnative.dev/"
  s.license                = package["license"]
  s.author                 = "Meta Platforms, Inc. and its affiliates"
  s.platforms              = min_supported_versions
  s.source                 = source
  s.source_files           = "Fabric/**/*.{c,h,m,mm,S,cpp}"
  s.exclude_files          = "**/tests/*",
                             "**/android/*",
  s.compiler_flags         = folly_compiler_flags + ' ' + boost_compiler_flags
  s.header_dir             = "React"
  s.module_name            = "RCTFabric"
  s.ios.framework          = ["JavaScriptCore", "MobileCoreServices"] # [macOS] Restrict MobileCoreServices to iOS
  s.osx.framework          = ["JavaScriptCore"] # [macOS] Restrict MobileCoreServices to iOS
  s.pod_target_xcconfig    = {
    "HEADER_SEARCH_PATHS" => header_search_paths,
    "OTHER_CFLAGS" => "$(inherited) -DRN_FABRIC_ENABLED" + " " + folly_flags,
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20"
  }.merge!(ENV['USE_FRAMEWORKS'] != nil ? {
    "PUBLIC_HEADERS_FOLDER_PATH" => "$(CONTENTS_FOLDER_PATH)/Headers/React"
  }: {})

  s.dependency "React-Core", version
  s.dependency "React-Fabric", version
  s.dependency "React-RCTImage", version
  s.dependency "React-ImageManager"
  s.dependency "React-graphics"
  s.dependency "RCT-Folly/Fabric", folly_version
  s.dependency "glog"
  s.dependency "Yoga"
  s.dependency "React-RCTText"
  s.dependency "React-FabricImage"
  s.dependency "React-debug"
  s.dependency "React-utils"
  s.dependency "React-rendererdebug"
  s.dependency "React-nativeconfig"
  s.dependency "React-runtimescheduler"

  if ENV["USE_HERMES"] == nil || ENV["USE_HERMES"] == "1"
    s.dependency "hermes-engine"
  else
    s.dependency "React-jsi"
  end

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = "Tests/**/*.{mm}"
    test_spec.framework = "XCTest"
  end
end
