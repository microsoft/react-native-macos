/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewFinder.h"
#include <React/RCTViewComponentView.h>

@implementation RCTViewFinder

+ (RCTPlatformView *)findView:(RCTPlatformView *)root withNativeId:(NSString *)nativeId // [macOS]
{
  if (!nativeId) {
    return nil;
  }

  if ([root isKindOfClass:[RCTViewComponentView class]] &&
      [nativeId isEqualToString:((RCTViewComponentView *)root).nativeId]) {
    return root;
  }

  for (RCTPlatformView *subview in root.subviews) { // [macOS]
    RCTPlatformView *result = [RCTViewFinder findView:subview withNativeId:nativeId]; // [macOS]
    if (result) {
      return result;
    }
  }

  return nil;
}

@end
