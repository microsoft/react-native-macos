/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <RCTDefaultReactNativeFactoryDelegate.h>
#import <RCTReactNativeFactory.h>
#import <React/RCTUIKit.h>

// A minimal macOS host for the Bazel slice. It boots the React Native runtime via
// RCTReactNativeFactory and loads the Metro bundle embedded in the app's Resources.
// Unlike rn-tester's full AppDelegate it intentionally omits the rn-tester-specific
// native example modules (NativeCxxModuleExample / RNTMyNativeView) so the app links
// against only the prebuilt XCFrameworks.
@interface MinimalAppDelegate : RCTDefaultReactNativeFactoryDelegate <NSApplicationDelegate>

@property (nonatomic, strong, nonnull) RCTPlatformWindow *window;
@property (nonatomic, strong, nonnull) RCTReactNativeFactory *reactNativeFactory;

@end
