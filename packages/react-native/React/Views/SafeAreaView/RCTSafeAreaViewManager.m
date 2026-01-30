/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if !TARGET_OS_OSX // [macOS]
#import "RCTSafeAreaViewManager.h"

#ifndef RCT_REMOVE_LEGACY_ARCH

#import "RCTSafeAreaShadowView.h"
#import "RCTSafeAreaView.h"
#import "RCTUIManager.h"

@implementation RCTSafeAreaViewManager

RCT_EXPORT_MODULE()

- (UIView *)view
{
  return [[RCTSafeAreaView alloc] initWithBridge:self.bridge];
}

- (RCTSafeAreaShadowView *)shadowView
{
  return [RCTSafeAreaShadowView new];
}

@end
#endif // RCT_REMOVE_LEGACY_ARCH

#endif // [macOS]
