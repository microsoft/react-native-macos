/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTConvert.h>

typedef NS_ENUM(NSInteger, RCTResizeMode) {
#if !TARGET_OS_OSX // [macOS]
  RCTResizeModeCover = UIViewContentModeScaleAspectFill,
  RCTResizeModeContain = UIViewContentModeScaleAspectFit,
  RCTResizeModeStretch = UIViewContentModeScaleToFill,
  RCTResizeModeCenter = UIViewContentModeCenter,
  RCTResizeModeRepeat = -1, // Use negative values to avoid
  RCTResizeModeNone = UIViewContentModeTopLeft,
#else // [macOS
  RCTResizeModeCover = -2, // Not supported by NSImageView
  RCTResizeModeContain = NSImageScaleProportionallyUpOrDown,
  RCTResizeModeStretch = NSImageScaleAxesIndependently,
  RCTResizeModeCenter = -3, // assumes NSImageAlignmentCenter
  RCTResizeModeRepeat = -1,
  RCTResizeModeNone = NSImageScaleNone,
#endif // macOS]
};

static inline RCTResizeMode RCTResizeModeFromUIViewContentMode(UIViewContentMode mode)
{
  switch (mode) {
    case UIViewContentModeScaleToFill:
      return RCTResizeModeStretch;
    case UIViewContentModeScaleAspectFit:
      return RCTResizeModeContain;
    case UIViewContentModeScaleAspectFill:
      return RCTResizeModeCover;
    case UIViewContentModeTopLeft:
      return RCTResizeModeNone;
#if !TARGET_OS_OSX // [macOS]
    case UIViewContentModeRedraw:
    case UIViewContentModeTop:
    case UIViewContentModeBottom:
    case UIViewContentModeLeft:
    case UIViewContentModeRight:
    case UIViewContentModeTopRight:
    case UIViewContentModeBottomLeft:
    case UIViewContentModeBottomRight:
      return RCTResizeModeRepeat;
#endif // [macOS]
    case UIViewContentModeCenter:
    default:
      return RCTResizeModeCenter;
  }
};

@interface RCTConvert (RCTResizeMode)

+ (RCTResizeMode)RCTResizeMode:(id)json;

@end