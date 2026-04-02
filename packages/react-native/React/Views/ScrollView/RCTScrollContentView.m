/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTScrollContentView.h"

#import <React/RCTAssert.h>
#import <React/UIView+React.h>

#import "RCTScrollView.h"

@implementation RCTScrollContentView
#if TARGET_OS_OSX // [macOS
- (BOOL)isFlipped
{
  return !self.inverted;
}
#endif // macOS]

- (void)reactSetFrame:(CGRect)frame
{
  [super reactSetFrame:frame];

#if !TARGET_OS_OSX // [macOS]
  RCTScrollView *scrollView = (RCTScrollView *)self.superview.superview;
#else // [macOS
  // macOS also has a NSClipView in its hierarchy
  RCTScrollView *scrollView = (RCTScrollView *)self.superview.superview.superview;
#endif // macOS]

  if (!scrollView) {
    return;
  }

  RCTAssert([scrollView isKindOfClass:[RCTScrollView class]], @"Unexpected view hierarchy of RCTScrollView component.");

  [scrollView updateContentSizeIfNeeded];
#if TARGET_OS_OSX // [macOS
  NSScrollView *platformScrollView = [scrollView scrollView];
  if ([platformScrollView accessibilityRole] == NSAccessibilityTableRole) {
      NSMutableArray *subViews = [[NSMutableArray alloc] initWithCapacity:[[self subviews] count]];
      for (NSView *view in [self subviews]) {
          if ([view isKindOfClass:[RCTView class]]) {
            [subViews addObject:view];
          }
      }

      [platformScrollView setAccessibilityRows:subViews];
  }

#endif // macOS]
}

@end
