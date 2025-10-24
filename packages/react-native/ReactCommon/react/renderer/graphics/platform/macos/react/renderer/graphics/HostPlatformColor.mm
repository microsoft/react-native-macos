/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import "HostPlatformColor.h"

#import <Foundation/Foundation.h>
#import <React/RCTUIKit.h>
#import <objc/runtime.h>
#import <react/renderer/graphics/RCTPlatformColorUtils.h>
#import <react/utils/ManagedObjectWrapper.h>
#import <string>

using namespace facebook::react;

NS_ASSUME_NONNULL_BEGIN

namespace facebook::react {

RCTUIColor *_Nullable UIColorFromColorWithSystemEffect(
    RCTUIColor *baseColor,
    const std::string &systemEffectString)
{
  if (baseColor == nil) {
    return nil;
  }
  
  NSColor *colorWithEffect = baseColor;
  if (!systemEffectString.empty()) {
    if (systemEffectString == "none") {
      colorWithEffect = [baseColor colorWithSystemEffect:NSColorSystemEffectNone];
    } else if (systemEffectString == "pressed") {
      colorWithEffect = [baseColor colorWithSystemEffect:NSColorSystemEffectPressed];
    } else if (systemEffectString == "deepPressed") {
      colorWithEffect = [baseColor colorWithSystemEffect:NSColorSystemEffectDeepPressed];
    } else if (systemEffectString == "disabled") {
      colorWithEffect = [baseColor colorWithSystemEffect:NSColorSystemEffectDisabled];
    } else if (systemEffectString == "rollover") {
      colorWithEffect = [baseColor colorWithSystemEffect:NSColorSystemEffectRollover];
    }
  }
  return colorWithEffect;
}

} // namespace facebook::react

NS_ASSUME_NONNULL_END
