/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h>

#import "MinimalAppDelegate.h"

int main(int argc, const char *argv[])
{
  @autoreleasepool {
    NSApplication *application = [NSApplication sharedApplication];
    MinimalAppDelegate *delegate = [MinimalAppDelegate new];
    // Retain the delegate for the lifetime of the app.
    application.delegate = (id<NSApplicationDelegate>)delegate;
    CFBridgingRetain(delegate);
    [application run];
  }
  return 0;
}
