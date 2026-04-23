/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#ifndef RCT_REMOVE_LEGACY_ARCH

@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

#if !TARGET_OS_OSX // [macOS]
__attribute__((deprecated("This API will be removed along with the legacy architecture.")))
@interface RCTWrapperReactRootViewController : UIViewController
#else
@interface RCTWrapperReactRootViewController : NSViewController
#endif // [macOS]

- (instancetype)initWithBridge:(RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END

#endif // RCT_REMOVE_LEGACY_ARCH
