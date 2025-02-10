/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]
#import "RCTReactNativeFactory.h"

NS_ASSUME_NONNULL_BEGIN

/**
 * Default delegate for RCTReactNativeFactory.
 * Contains default implementation of RCTReactNativeFactoryDelegate methods.
 */

#if !TARGET_OS_OSX // [macOS]
@interface RCTDefaultReactNativeFactoryDelegate : UIResponder <RCTReactNativeFactoryDelegate>
#else // [macOS
@interface RCTDefaultReactNativeFactoryDelegate : NSResponder <RCTReactNativeFactoryDelegate>
#endif // macOS]
@end

NS_ASSUME_NONNULL_END
