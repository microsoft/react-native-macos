/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#if TARGET_OS_OSX

#import <React/RCTWrappedTextView.h>

#import <React/RCTUITextView.h>
#import <React/RCTTextAttributes.h>

// NSScrollView keeps every scroll it is sent, even one it cannot follow, so a scroll view around a
// multiline input stopped scrolling under the pointer. This one passes on what its text cannot
// follow, deciding once per gesture so that the rest of it, momentum too, goes the same way.
@interface RCTWrappedTextScrollView : RCTUIScrollView
@end

@implementation RCTWrappedTextScrollView {
  BOOL _passesScrollOn;
}

- (void)scrollWheel:(NSEvent *)event
{
  // A wheel's notch has no phase and stands alone; a trackpad gesture starts with MayBegin
  // (fingers down, no direction yet) or Began.
  BOOL startsGesture = event.phase == NSEventPhaseMayBegin || event.phase == NSEventPhaseBegan ||
      (event.phase == NSEventPhaseNone && event.momentumPhase == NSEventPhaseNone);
  if (startsGesture) {
    _passesScrollOn = ![self canFollowScroll:event];
  }

  if (_passesScrollOn) {
    [[self nextResponder] scrollWheel:event];
  } else {
    [super scrollWheel:event];
  }
}

- (BOOL)canFollowScroll:(NSEvent *)event
{
  if (!self.isScrollEnabled) {
    return NO;
  }

  // A positive delta shows what is above or to the left.
  CGFloat up = self.contentView.isFlipped ? -1 : 1;
  CGFloat deltaX = event.scrollingDeltaX;
  CGFloat deltaY = event.scrollingDeltaY;
  if (deltaX == 0 && deltaY == 0) {
    return [self canScrollBy:NSMakePoint(0, up)] || [self canScrollBy:NSMakePoint(0, -up)] ||
        [self canScrollBy:NSMakePoint(1, 0)] || [self canScrollBy:NSMakePoint(-1, 0)];
  }
  return [self canScrollBy:NSMakePoint(deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0, deltaY > 0 ? up : deltaY < 0 ? -up : 0)];
}

- (BOOL)canScrollBy:(NSPoint)step
{
  NSRect bounds = self.contentView.bounds;
  NSRect moved = [self.contentView constrainBoundsRect:NSOffsetRect(bounds, step.x, step.y)];
  return !NSEqualPoints(moved.origin, bounds.origin);
}

@end

@implementation RCTWrappedTextView {
  RCTUITextView *_forwardingTextView;
  RCTUIScrollView *_scrollView;
  RCTClipView *_clipView;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    self.hideVerticalScrollIndicator = NO;

    _scrollView = [[RCTWrappedTextScrollView alloc] initWithFrame:self.bounds];
    _scrollView.backgroundColor = [RCTPlatformColor clearColor];
    _scrollView.drawsBackground = NO;
    _scrollView.borderType = NSNoBorder;
    _scrollView.hasHorizontalRuler = NO;
    _scrollView.hasVerticalRuler = NO;
    _scrollView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [_scrollView setHasVerticalScroller:YES];
    [_scrollView setHasHorizontalScroller:NO];
    
    _clipView = [[RCTClipView alloc] initWithFrame:_scrollView.bounds];
    [_scrollView setContentView:_clipView];
    
    _forwardingTextView = [[RCTUITextView alloc] initWithFrame:_scrollView.bounds];
    _forwardingTextView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _forwardingTextView.delegate = self;
    
    _forwardingTextView.verticallyResizable = YES;
    _forwardingTextView.horizontallyResizable = YES;
    _forwardingTextView.textContainer.containerSize = NSMakeSize(FLT_MAX, FLT_MAX);
    _forwardingTextView.textContainer.widthTracksTextView = YES;
    _forwardingTextView.textInputDelegate = self;
    if ([_forwardingTextView respondsToSelector:@selector(setEnableFocusRing:)]) {
      [_forwardingTextView setEnableFocusRing:YES];
    }
    
    _scrollView.documentView = _forwardingTextView;
    _scrollView.contentView.postsBoundsChangedNotifications = YES;
    
    // Enable the focus ring by default
    _scrollView.enableFocusRing = YES;
    [self addSubview:_scrollView];
    
    // a register for those notifications on the content view.
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(boundsDidChange:)
                                                 name:NSViewBoundsDidChangeNotification
                                               object:_scrollView.contentView];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(scrollViewDidScroll:)
                                                 name:NSViewBoundsDidChangeNotification
                                               object:_scrollView.contentView];
  }

  return self;
}

- (BOOL)isFlipped
{
  return YES;
}

#pragma mark -
#pragma mark Method forwarding to text view

- (void)forwardInvocation:(NSInvocation *)invocation
{
  [invocation invokeWithTarget:_forwardingTextView];
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)selector
{
  if ([_forwardingTextView respondsToSelector:selector]) {
    return [_forwardingTextView methodSignatureForSelector:selector];
  }
  
  return [super methodSignatureForSelector:selector];
}

- (void)boundsDidChange:(NSNotification *)notification
{
}

#pragma mark -
#pragma mark First Responder forwarding

- (NSResponder *)responder
{
  return _forwardingTextView;
}

- (BOOL)acceptsFirstResponder
{
  return _forwardingTextView.acceptsFirstResponder;
}

- (BOOL)becomeFirstResponder
{
  return [_forwardingTextView becomeFirstResponder];
}

- (BOOL)resignFirstResponder
{
  return [_forwardingTextView resignFirstResponder];
}

#pragma mark -
#pragma mark Text Input delegate forwarding

- (id<RCTBackedTextInputDelegate>)textInputDelegate
{
  return _forwardingTextView.textInputDelegate;
}

- (void)setTextInputDelegate:(id<RCTBackedTextInputDelegate>)textInputDelegate
{
  _forwardingTextView.textInputDelegate = textInputDelegate;
}

#pragma mark -
#pragma mark Scrolling control

#if TARGET_OS_OSX // [macOS
- (void)scrollViewDidScroll:(NSNotification *)notification
{
  [self.textInputDelegate scrollViewDidScroll:_scrollView];
}
#endif // macOS]

- (BOOL)scrollEnabled
{
  return _scrollView.isScrollEnabled;
}

- (void)setScrollEnabled:(BOOL)scrollEnabled
{
  _scrollView.scrollEnabled = scrollEnabled;
  [_clipView setConstrainScrolling:!scrollEnabled];
}

- (BOOL)shouldShowVerticalScrollbar
{
  // Hide vertical scrollbar if explicity set to NO
  if (self.hideVerticalScrollIndicator) {
    return NO;
  }

  // Hide vertical scrollbar if attributed text overflows view
  CGSize textViewSize = [_forwardingTextView intrinsicContentSize];
  NSClipView *clipView = (NSClipView *)_scrollView.contentView;
  if (textViewSize.height > clipView.bounds.size.height) {
    return YES;
  };

  return NO;
}

- (void)textInputDidChange
{
  [_scrollView setHasVerticalScroller:[self shouldShowVerticalScrollbar]];
}

- (void)setAttributedText:(NSAttributedString *)attributedText
{
  [_forwardingTextView setAttributedText:attributedText];
  [_scrollView setHasVerticalScroller:[self shouldShowVerticalScrollbar]];
}

#pragma mark -
#pragma mark Text Container Inset override for NSTextView

// This method is there to match the textContainerInset property on RCTUITextField
- (void)setTextContainerInset:(UIEdgeInsets)textContainerInsets
{
  // RCTUITextView has logic in setTextContainerInset[s] to convert the UIEdgeInsets to a valid NSSize struct
  _forwardingTextView.textContainerInsets = textContainerInsets;
}

#pragma mark -
#pragma mark Focus ring

- (BOOL)enableFocusRing
{
  if ([_forwardingTextView respondsToSelector:@selector(enableFocusRing)]) {
    return [_forwardingTextView enableFocusRing];
  }

  return _scrollView.enableFocusRing;
}

- (void)setEnableFocusRing:(BOOL)enableFocusRing 
{
  _scrollView.enableFocusRing = enableFocusRing;
  if ([_forwardingTextView respondsToSelector:@selector(setEnableFocusRing:)]) {
    [_forwardingTextView setEnableFocusRing:enableFocusRing];
  }
}

@end

#endif // TARGET_OS_OSX
