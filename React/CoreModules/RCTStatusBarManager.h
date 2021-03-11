/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // TODO(macOS ISS#2323203)

#import <React/RCTConvert.h>
#import <React/RCTEventEmitter.h>

@interface RCTConvert (UIStatusBar)

<<<<<<< HEAD
#if !TARGET_OS_TV && !TARGET_OS_OSX // TODO(macOS ISS#2323203)
=======
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
+ (UIStatusBarStyle)UIStatusBarStyle:(id)json;
+ (UIStatusBarAnimation)UIStatusBarAnimation:(id)json;

@end

@interface RCTStatusBarManager : RCTEventEmitter

@end
