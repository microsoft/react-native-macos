/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

<<<<<<< HEAD
#import <React/RCTUIKit.h> // TODO(macOS ISS#2323203)
=======
#import <UIKit/UIKit.h>
#import "RCTLogBoxView.h"
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

@interface RCTLogBox : NSObject

#if RCT_DEV_MENU

- (void)setRCTLogBoxView:(RCTLogBoxView *)view;

#endif

@end
