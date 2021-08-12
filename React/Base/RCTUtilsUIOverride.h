/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#if TARGET_OS_OSX // TODO(macOS GH#774)
#import <React/RCTUIKit.h>
#else // [TODO(macOS GH#774)
#import <UIKit/UIKit.h>
#endif // ]TODO(macOS GH#774)

@interface RCTUtilsUIOverride : NSObject
/**
 Set the global presented view controller instance override.
 */
+ (void)setPresentedViewController:(UIViewController *)presentedViewController;
+ (UIViewController *)presentedViewController;
+ (BOOL)hasPresentedViewController;

@end
