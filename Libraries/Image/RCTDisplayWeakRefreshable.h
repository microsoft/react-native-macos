/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

<<<<<<< HEAD
#import <React/RCTPlatformDisplayLink.h> // TODO(macOS ISS#2323203)

@protocol RCTDisplayRefreshable

- (void)displayDidRefresh:(RCTPlatformDisplayLink *)displayLink; // TODO(macOS ISS#2323203)
=======
@protocol RCTDisplayRefreshable

- (void)displayDidRefresh:(CADisplayLink *)displayLink;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

@end

@interface RCTDisplayWeakRefreshable : NSObject

@property (nonatomic, weak) id<RCTDisplayRefreshable> refreshable;

<<<<<<< HEAD
+ (RCTPlatformDisplayLink *)displayLinkWithWeakRefreshable:(id<RCTDisplayRefreshable>)refreshable; // TODO(macOS ISS#2323203)
=======
+ (CADisplayLink *)displayLinkWithWeakRefreshable:(id<RCTDisplayRefreshable>)refreshable;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

@end
