/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "MinimalAppDelegate.h"

@implementation MinimalAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.reactNativeFactory = [[RCTReactNativeFactory alloc] initWithDelegate:self];

  self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 1280, 720)
                                            styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskResizable |
                                                      NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable
                                              backing:NSBackingStoreBuffered
                                                defer:NO];
  self.window.title = @"RNTesterApp (Bazel)";

  [self.reactNativeFactory startReactNativeWithModuleName:@"RNTesterApp"
                                                 inWindow:self.window
                                        initialProperties:@{}
                                            launchOptions:notification.userInfo];
}

- (NSURL *)bundleURL
{
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
}

@end
