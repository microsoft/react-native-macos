/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUISlider.h>

@implementation RCTUISlider {}

- (void)setValue:(float)value animated:(__unused BOOL)animated
{
  self.animator.floatValue = value;
}

@end

#endif
