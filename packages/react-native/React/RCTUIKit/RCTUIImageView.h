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
typedef UIImageView RCTUIImageView;
#else
@interface RCTUIImageView : NSImageView
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, strong) RCTUIColor *tintColor;
@property (nonatomic, assign) UIViewContentMode contentMode;
NS_ASSUME_NONNULL_END
@end
#endif
