/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#import <React/RCTDefines.h>

NS_ASSUME_NONNULL_BEGIN

#if !TARGET_OS_OSX // [macOS]
RCT_EXTERN UIFont *__nullable RCTGetLegacyDefaultFont(CGFloat fontSize, UIFontWeight fontWeight);
#else // [macOS
RCT_EXTERN NSFont *__nullable RCTGetLegacyDefaultFont(CGFloat fontSize, NSFontWeight fontWeight);
#endif // macOS]

NS_ASSUME_NONNULL_END
