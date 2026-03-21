/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <RCTDefaultReactNativeFactoryDelegate.h>
#import <RCTReactNativeFactory.h>
#import <React/RCTUIKit.h> // [macOS]

#if !TARGET_OS_OSX // [macOS]
@interface AppDelegate : RCTDefaultReactNativeFactoryDelegate <UIApplicationDelegate>
#else // [macOS
@interface AppDelegate : RCTDefaultReactNativeFactoryDelegate <NSApplicationDelegate>
#endif // macOS]

@property (nonatomic, strong, nonnull) RCTPlatformWindow *window; // [macOS]
@property (nonatomic, strong, nonnull) RCTReactNativeFactory *reactNativeFactory;

@end
