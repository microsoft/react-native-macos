/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTPickerManager.h"

#import "RCTBridge.h"
#import "RCTPicker.h"
#import "RCTFont.h"

@implementation RCTPickerManager

RCT_EXPORT_MODULE()

- (RCTPlatformView *)view // TODO(macOS ISS#2323203)
{
  return [RCTPicker new];
}

RCT_EXPORT_VIEW_PROPERTY(items, NSArray<NSDictionary *>)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(color, UIColor)
RCT_EXPORT_VIEW_PROPERTY(textAlign, NSTextAlignment)
RCT_CUSTOM_VIEW_PROPERTY(fontSize, NSNumber, RCTPicker)
{
  view.fontStyle = [RCTFont updateFont:view.fontStyle withSize:json ?: @(defaultView.fontStyle.pointSize)];
}
RCT_CUSTOM_VIEW_PROPERTY(fontWeight, NSString, __unused RCTPicker)
{
  view.fontStyle = [RCTFont updateFont:view.fontStyle withWeight:json]; // defaults to normal
}
RCT_CUSTOM_VIEW_PROPERTY(fontStyle, NSString, __unused RCTPicker)
{
  view.fontStyle = [RCTFont updateFont:view.fontStyle withStyle:json]; // defaults to normal
}
RCT_CUSTOM_VIEW_PROPERTY(fontFamily, NSString, RCTPicker)
{
  view.fontStyle = [RCTFont updateFont:view.fontStyle withFamily:json ?: defaultView.fontStyle.familyName];
}

@end
