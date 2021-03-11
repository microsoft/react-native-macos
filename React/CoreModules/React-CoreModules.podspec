# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))
version = package['version']

source = { :git => 'https://github.com/facebook/react-native.git' }
if version == '1000.0.0'
  # This is an unpublished version, use the latest commit hash of the react-native repo, which we’re presumably in.
  source[:commit] = `git rev-parse HEAD`.strip
else
  source[:tag] = "v#{version}"
end

folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'
folly_version = '2020.01.13.00'

Pod::Spec.new do |s|
  s.name                   = "React-CoreModules"
  s.version                = version
  s.summary                = "-"  # TODO
  s.homepage               = "https://reactnative.dev/"
  s.license                = package["license"]
  s.author                 = "Facebook, Inc. and its affiliates"
<<<<<<< HEAD
  s.platforms              = { :ios => "10.0", :tvos => "10.0", :osx => "10.13" } # TODO(macOS ISS#2323203)
=======
  s.platforms              = { :ios => "10.0" }
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
  s.compiler_flags         = folly_compiler_flags + ' -Wno-nullability-completeness'
  s.source                 = source
  s.source_files           = "**/*.{c,m,mm,cpp}"
  # [TODO(macOS ISS#2323203)
                             "**/MacOS/*"
  s.osx.exclude_files     =  "{RCTFPSGraph,RCTPerfMonitor,RCTPlatform}.*"
  # ]TODO(macOS ISS#2323203)
  s.header_dir             = "CoreModules"
  s.pod_target_xcconfig    = {
                               "USE_HEADERMAP" => "YES",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++14",
                               "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/React/CoreModules\" \"$(PODS_ROOT)/RCT-Folly\""
                             }

  s.dependency "FBReactNativeSpec", version
  s.dependency "RCT-Folly", folly_version
  s.dependency "RCTTypeSafety", version
  s.dependency "React-Core/CoreModulesHeaders", version
  s.dependency "React-RCTImage", version
  s.dependency "ReactCommon/turbomodule/core", version
  s.dependency "React-jsi", version
end
