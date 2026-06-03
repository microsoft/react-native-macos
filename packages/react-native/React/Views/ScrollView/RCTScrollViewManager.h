/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTConvert.h>
#import <React/RCTViewManager.h>

#ifndef RCT_REMOVE_LEGACY_ARCH
#if !TARGET_OS_OSX // [macOS]
__attribute__((deprecated("This API will be removed along with the legacy architecture.")))
@interface RCTConvert(UIScrollView)

#if TARGET_OS_IOS // [visionOS]
+ (UIScrollViewKeyboardDismissMode)UIScrollViewKeyboardDismissMode:(id)json;
#endif // [visionOS]

@end
#endif // [macOS]

__attribute__((deprecated("This API will be removed along with the legacy architecture.")))
@interface RCTScrollViewManager : RCTViewManager

@end

#endif // RCT_REMOVE_LEGACY_ARCH
