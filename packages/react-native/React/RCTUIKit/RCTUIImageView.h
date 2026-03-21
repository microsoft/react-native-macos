/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import <React/RCTUIKitCompat.h>
#import <React/RCTUIImage.h>

#if !TARGET_OS_OSX
@compatibility_alias RCTUIImageView UIImageView;
#else
@interface RCTUIImageView : NSImageView
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, strong) RCTPlatformColor *tintColor;
@property (nonatomic, assign) UIViewContentMode contentMode;
NS_ASSUME_NONNULL_END
@end
#endif
