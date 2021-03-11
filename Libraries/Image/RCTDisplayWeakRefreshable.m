/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTDisplayWeakRefreshable.h"

@implementation RCTDisplayWeakRefreshable

<<<<<<< HEAD
+ (RCTPlatformDisplayLink *)displayLinkWithWeakRefreshable:(id<RCTDisplayRefreshable>)refreshable { // TODO(macOS ISS#2323203)
  RCTDisplayWeakRefreshable *target = [[RCTDisplayWeakRefreshable alloc] initWithRefreshable:refreshable];
  return [RCTPlatformDisplayLink displayLinkWithTarget:target selector:@selector(displayDidRefresh:)]; // TODO(macOS ISS#2323203)
=======
+ (CADisplayLink *)displayLinkWithWeakRefreshable:(id<RCTDisplayRefreshable>)refreshable {
  RCTDisplayWeakRefreshable *target = [[RCTDisplayWeakRefreshable alloc] initWithRefreshable:refreshable];
  return [CADisplayLink displayLinkWithTarget:target selector:@selector(displayDidRefresh:)];
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
}

- (instancetype)initWithRefreshable:(id<RCTDisplayRefreshable>)refreshable
{
  if (self = [super init]) {
    _refreshable = refreshable;
  }
  return self;
}

<<<<<<< HEAD
- (void)displayDidRefresh:(RCTPlatformDisplayLink *)displayLink { // TODO(macOS ISS#2323203)
=======
- (void)displayDidRefresh:(CADisplayLink *)displayLink {
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
  [_refreshable displayDidRefresh:displayLink];
}

@end
