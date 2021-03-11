/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTPickerManager.h"

#import <React/RCTUIManager.h>
#import "RCTBridge.h"
#import "RCTFont.h"
#import "RCTPicker.h"

@implementation RCTPickerManager

RCT_EXPORT_MODULE()

- (RCTPlatformView *)view // TODO(macOS ISS#2323203)
{
  return [RCTPicker new];
}

RCT_EXPORT_VIEW_PROPERTY(items, NSArray<NSDictionary *>)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSInteger)
RCT_REMAP_VIEW_PROPERTY(accessibilityLabel, reactAccessibilityElement.accessibilityLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(color, UIColor)
RCT_EXPORT_VIEW_PROPERTY(textAlign, NSTextAlignment)
RCT_CUSTOM_VIEW_PROPERTY(fontSize, NSNumber, RCTPicker)
{
  view.font = [RCTFont updateFont:view.font withSize:json ?: @(defaultView.font.pointSize)];
}
RCT_CUSTOM_VIEW_PROPERTY(fontWeight, NSString, __unused RCTPicker)
{
  view.font = [RCTFont updateFont:view.font withWeight:json]; // defaults to normal
}
RCT_CUSTOM_VIEW_PROPERTY(fontStyle, NSString, __unused RCTPicker)
{
  view.font = [RCTFont updateFont:view.font withStyle:json]; // defaults to normal
}
RCT_CUSTOM_VIEW_PROPERTY(fontFamily, NSString, RCTPicker)
{
  view.font = [RCTFont updateFont:view.font withFamily:json ?: defaultView.font.familyName];
}

RCT_EXPORT_METHOD(setNativeSelectedIndex : (nonnull NSNumber *)viewTag toIndex : (nonnull NSNumber *)index)
{
  [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) { // TODO(macOS ISS#2323203)
    RCTPlatformView *view = viewRegistry[viewTag]; // TODO(macOS ISS#2323203)

    if ([view isKindOfClass:[RCTPicker class]]) {
      [(RCTPicker *)view setSelectedIndex:index.integerValue];
    } else {
      // This component is used in Fabric through LegacyInteropLayer.
      // `RCTPicker` view is subview of `RCTLegacyViewManagerInteropComponentView`.
      // `viewTag` passed as parameter to this method is tag of the `RCTLegacyViewManagerInteropComponentView`.
<<<<<<< HEAD
      RCTPlatformView *subview = view.subviews.firstObject; // TODO(macOS ISS#2323203)
=======
      UIView *subview = [uiManager viewForReactTag:viewTag].subviews.firstObject;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
      if ([subview isKindOfClass:[RCTPicker class]]) {
        [(RCTPicker *)subview setSelectedIndex:index.integerValue];
      } else {
        RCTLogError(@"view type must be RCTPicker");
      }
    }
  }];
}

@end
