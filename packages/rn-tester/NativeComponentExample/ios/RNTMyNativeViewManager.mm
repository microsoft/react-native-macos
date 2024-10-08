/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTLog.h>
#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>
#import "UIView+ColorOverlays.h"

@interface RNTMyNativeViewManager : RCTViewManager
@end

@implementation RNTMyNativeViewManager

RCT_EXPORT_MODULE(RNTMyNativeView)

RCT_EXPORT_VIEW_PROPERTY(backgroundColor, UIColor)

RCT_EXPORT_VIEW_PROPERTY(onIntArrayChanged, RCTBubblingEventBlock)

RCT_EXPORT_VIEW_PROPERTY(values, NSArray *)

RCT_EXPORT_METHOD(callNativeMethodToChangeBackgroundColor : (nonnull NSNumber *)reactTag color : (NSString *)color)
{
  [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
	RCTUIView *view = (RCTUIView *)viewRegistry[reactTag]; // [macOS]
    if (!view || ![view isKindOfClass:[RCTUIView class]]) { // [macOS]
      RCTLogError(@"Cannot find NativeView with tag #%@", reactTag);
      return;
    }

    [view setBackgroundColorWithColorString:color];
  }];
}

- (RCTPlatformView *)view // [macOS]
{
  return [[RCTPlatformView alloc] init]; // [macOS]
}

@end
