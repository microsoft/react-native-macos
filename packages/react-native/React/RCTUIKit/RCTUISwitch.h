/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import <React/RCTUIKitCompat.h>

#if !TARGET_OS_OSX
typedef UISwitch RCTUISwitch;
#else
@interface RCTUISwitch : NSSwitch
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, getter=isOn) BOOL on;

- (void)setOn:(BOOL)on animated:(BOOL)animated;

NS_ASSUME_NONNULL_END
@end
#endif
