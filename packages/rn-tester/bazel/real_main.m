/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h>

#import "AppDelegate.h"

// rn-tester's own main.m uses NSApplicationMain (nib-driven). This slice wires the
// real AppDelegate programmatically so no MainMenu.nib is required in the bundle.
int main(int argc, const char *argv[])
{
  @autoreleasepool {
    NSApplication *application = [NSApplication sharedApplication];
    AppDelegate *delegate = [AppDelegate new];
    application.delegate = (id<NSApplicationDelegate>)delegate;
    CFBridgingRetain(delegate);
    [application run];
  }
  return 0;
}
