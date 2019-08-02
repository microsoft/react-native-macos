/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "ARTSurfaceView.h"

#import <React/RCTLog.h>

#import "ARTNode.h"

@implementation ARTSurfaceView

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.opaque = NO;
  }

  return self;
}

- (void)insertReactSubview:(RCTUIView *)subview atIndex:(NSInteger)atIndex // TODO(macOS ISS#3536887)
{
  [super insertReactSubview:subview atIndex:atIndex];
#if TARGET_OS_OSX // TODO(macOS ISS#2323203)
  NSArray<__kindof NSView *> *subviews = self.subviews;
  if ((NSUInteger)index == subviews.count) {
    [self addSubview:subview];
  } else {
    [self addSubview:subview positioned:NSWindowBelow relativeTo:subviews[atIndex]];
  }
#else
  [self insertSubview:subview atIndex:atIndex];
#endif // TODO(macOS ISS#2323203)
  [self invalidate];
}

- (void)removeReactSubview:(RCTUIView *)subview // TODO(macOS ISS#3536887)
{
  [super removeReactSubview:subview];
  [self invalidate];
}

- (void)didUpdateReactSubviews
{
  // Do nothing, as subviews are inserted by insertReactSubview:
}

- (void)invalidate
{
#if TARGET_OS_OSX // ISS:3532364
  [self setNeedsDisplay:YES];
#else
  [self setNeedsDisplay];
#endif // ISS:3532364
}

- (void)drawRect:(CGRect)rect
{
#if TARGET_OS_OSX // [TODO(macOS ISS#2323203)
  [super drawRect:rect];
#endif // ]TODO(macOS ISS#2323203)
  CGContextRef context = UIGraphicsGetCurrentContext();
  for (ARTNode *node in self.subviews) {
    [node renderTo:context];
  }
}

@end
