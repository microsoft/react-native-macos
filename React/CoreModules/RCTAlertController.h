/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

<<<<<<< HEAD
#import <React/RCTUIKit.h> // TODO(macOS ISS#2323203)

#if TARGET_OS_OSX // [TODO(macOS ISS#2323203)
@interface RCTAlertController : NSViewController
#else
@interface RCTAlertController : UIAlertController
#endif // ]TODO(macOS ISS#2323203)

#if !TARGET_OS_OSX // [TODO(macOS ISS#2323203)
- (void)show:(BOOL)animated completion:(void (^)(void))completion;
#endif // ]TODO(macOS ISS#2323203)

@end
=======
#import <UIKit/UIKit.h>

@interface RCTAlertController : UIAlertController

- (void)show:(BOOL)animated completion:(void (^)(void))completion;

@end
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
