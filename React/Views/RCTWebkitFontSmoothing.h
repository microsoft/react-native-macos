/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO(OSS Candidate ISS#2710739)

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, RCTWebkitFontSmoothing) {
  RCTWebkitFontSmoothingAuto = 0,
  RCTWebkitFontSmoothingNone,
  RCTWebkitFontSmoothingAntialiased,
  RCTWebkitFontSmoothingSubpixelAntialiased,
};