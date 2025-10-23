/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTPlatform.h"

#import <React/RCTUIKit.h> // [macOS]

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTInitializing.h>
#import <React/RCTUtils.h>
#import <React/RCTVersion.h>

#import "CoreModulesPlugins.h"

#import <optional>

using namespace facebook::react;

#if !TARGET_OS_OSX // [macOS]
static NSString *interfaceIdiom(UIUserInterfaceIdiom idiom)
{
  switch (idiom) {
    case UIUserInterfaceIdiomPhone:
      return @"phone";
    case UIUserInterfaceIdiomPad:
      return @"pad";
    case UIUserInterfaceIdiomTV:
      return @"tv";
    case UIUserInterfaceIdiomCarPlay:
      return @"carplay";
#if TARGET_OS_VISION
    case UIUserInterfaceIdiomVision:
      return @"vision";
#endif
    default:
      return @"unknown";
  }
}
#else // [macOS
static NSString *interfaceIdiom() {
  return @"mac";
}
#endif // macOS]

@interface RCTPlatform () <NativePlatformConstantsIOSSpec, RCTInitializing>
@end

@implementation RCTPlatform {
  ModuleConstants<JS::NativePlatformConstantsIOS::Constants> _constants;
}

RCT_EXPORT_MODULE(PlatformConstants)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (void)initialize
{
#if !TARGET_OS_OSX // [macOS]
  UIDevice *device = [UIDevice currentDevice];
#else // [macOS]
  NSProcessInfo *processInfo = [NSProcessInfo processInfo];
  NSOperatingSystemVersion osVersion = [[NSProcessInfo processInfo] operatingSystemVersion];
#endif // [macOS]
  auto versions = RCTGetReactNativeVersion();
  _constants = typedConstants<JS::NativePlatformConstantsIOS::Constants>({
      .forceTouchAvailable = RCTForceTouchAvailable() ? true : false,
#if !TARGET_OS_OSX // [macOS]
      .osVersion = [device systemVersion],
      .systemName = [device systemName],
      .interfaceIdiom = interfaceIdiom([device userInterfaceIdiom]),
#else // [macOS
      .osVersion = [NSString stringWithFormat:@"%ld.%ld.%ld", osVersion.majorVersion, osVersion.minorVersion, osVersion.patchVersion],
      .systemName = [processInfo operatingSystemVersionString],
      .interfaceIdiom = interfaceIdiom(),
#endif // macOS]
      .isTesting = RCTRunningInTestEnvironment() ? true : false,
      .reactNativeVersion = JS::NativePlatformConstantsIOS::ConstantsReactNativeVersion::Builder(
          {.minor = [versions[@"minor"] doubleValue],
           .major = [versions[@"major"] doubleValue],
           .patch = [versions[@"patch"] doubleValue],
           .prerelease = [versions[@"prerelease"] isKindOfClass:[NSNull class]] ? nullptr : versions[@"prerelease"]}),
#if TARGET_OS_MACCATALYST
      .isMacCatalyst = true,
#else
      .isMacCatalyst = false,
#endif
  });
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

// TODO: Use the generated struct return type.
- (ModuleConstants<JS::NativePlatformConstantsIOS::Constants>)constantsToExport
{
  return _constants;
}

- (ModuleConstants<JS::NativePlatformConstantsIOS::Constants>)getConstants
{
  return _constants;
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativePlatformConstantsIOSSpecJSI>(params);
}

@end

Class RCTPlatformCls(void)
{
  return RCTPlatform.class;
}
