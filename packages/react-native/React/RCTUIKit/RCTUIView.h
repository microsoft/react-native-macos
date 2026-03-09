/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import <React/RCTUIKitCompat.h>

#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

UIKIT_STATIC_INLINE RCTPlatformView *RCTUIViewHitTestWithEvent(RCTPlatformView *view, CGPoint point, __unused UIEvent *__nullable event)
{
  return [view hitTest:point withEvent:event];
}

UIKIT_STATIC_INLINE void RCTUIViewSetContentModeRedraw(UIView *view)
{
  view.contentMode = UIViewContentModeRedraw;
}

UIKIT_STATIC_INLINE BOOL RCTUIViewIsDescendantOfView(RCTPlatformView *view, RCTPlatformView *parent)
{
  return [view isDescendantOfView:parent];
}

NS_ASSUME_NONNULL_END

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

// UIView
#define RCTPlatformView NSView

@interface RCTUIView : RCTPlatformView

@property (nonatomic, readonly) BOOL canBecomeFirstResponder;
- (BOOL)becomeFirstResponder;
@property(nonatomic, readonly) BOOL isFirstResponder;

@property (nonatomic, getter=isUserInteractionEnabled) BOOL userInteractionEnabled;

- (NSView *)hitTest:(CGPoint)point withEvent:(UIEvent *_Nullable)event;
- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event;

- (void)insertSubview:(NSView *)view atIndex:(NSInteger)index;

- (void)didMoveToWindow;

- (void)setNeedsLayout;
- (void)layoutIfNeeded;

- (void)layoutSubviews;

- (void)setNeedsDisplay;

@property (nonatomic, copy) NSColor *backgroundColor;
@property (nonatomic) CGAffineTransform transform;

/**
 * Specifies whether the view should receive the mouse down event when the
 * containing window is in the background.
 */
@property (nonatomic, assign) BOOL acceptsFirstMouse;

@property (nonatomic, assign) BOOL mouseDownCanMoveWindow;

/**
 * Specifies whether the view participates in the key view loop as user tabs through different controls
 * This is equivalent to acceptsFirstResponder on mac OS.
 */
@property (nonatomic, assign) BOOL focusable;
/**
 * Specifies whether focus ring should be drawn when the view has the first responder status.
 */
@property (nonatomic, assign) BOOL enableFocusRing;

// [macOS
/**
 * iOS compatibility shim. On macOS, this forwards to accessibilityChildren.
 */
@property (nonatomic, copy) NSArray *accessibilityElements;
// macOS]

@end


NS_INLINE RCTPlatformView *RCTUIViewHitTestWithEvent(RCTPlatformView *view, CGPoint point, __unused UIEvent *__nullable event)
{
  // [macOS IMPORTANT -- point is in local coordinate space, but OSX expects super coordinate space for hitTest:
  NSView *superview = [view superview];
  NSPoint pointInSuperview = superview != nil ? [view convertPoint:point toView:superview] : point;
  return [view hitTest:pointInSuperview];
}

NS_INLINE void RCTUIViewSetContentModeRedraw(RCTPlatformView *view)
{
  view.layerContentsRedrawPolicy = NSViewLayerContentsRedrawDuringViewResize;
}

NS_INLINE BOOL RCTUIViewIsDescendantOfView(RCTPlatformView *view, RCTPlatformView *parent)
{
  return [view isDescendantOf:parent];
}

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
