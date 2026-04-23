/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#ifndef RCT_REMOVE_LEGACY_ARCH

#import <React/RCTView.h>

__attribute__((deprecated("This API will be removed along with the legacy architecture.")))
@interface RCTScrollContentView : RCTView

#if TARGET_OS_OSX // [macOS
@property (nonatomic, assign, getter=isInverted) BOOL inverted;
#endif // macOS]

@end

#endif // RCT_REMOVE_LEGACY_ARCH
