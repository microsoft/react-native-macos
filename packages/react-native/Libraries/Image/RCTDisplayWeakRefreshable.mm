/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTDisplayWeakRefreshable.h"

@implementation RCTDisplayWeakRefreshable

+ (RCTPlatformDisplayLink *)displayLinkWithWeakRefreshable:(id<RCTDisplayRefreshable>)refreshable // [macOS]
{
#if !TARGET_OS_OSX // [macOS]
  RCTDisplayWeakRefreshable *target = [[RCTDisplayWeakRefreshable alloc] initWithRefreshable:refreshable];
  return [RCTPlatformDisplayLink displayLinkWithTarget:target selector:@selector(displayDidRefresh:)]; // [macOS]
#else // [macOS
  // CADisplayLink retains its target, so on iOS the weak proxy above is needed to avoid a retain cycle.
  // RCTPlatformDisplayLink only holds its target weakly, so the proxy would have no owner and be
  // deallocated immediately, and the refreshable would never be called. Target the refreshable directly.
  return [RCTPlatformDisplayLink displayLinkWithTarget:refreshable selector:@selector(displayDidRefresh:)];
#endif // macOS]
}

- (instancetype)initWithRefreshable:(id<RCTDisplayRefreshable>)refreshable
{
  if (self = [super init]) {
    _refreshable = refreshable;
  }
  return self;
}

- (void)displayDidRefresh:(RCTPlatformDisplayLink *)displayLink // [macOS]
{
  [_refreshable displayDidRefresh:displayLink];
}

@end
