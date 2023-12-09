/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX // [macOS

#import <React/RCTWrappedTextView.h>

#import <React/RCTUITextView.h>
#import <React/RCTTextAttributes.h>

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

    _scrollView = [[RCTUIScrollView alloc] initWithFrame:self.bounds];
    _scrollView.backgroundColor = [RCTUIColor clearColor];
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
  }

  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
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

- (BOOL)scrollEnabled
{
  return _scrollView.isScrollEnabled;
}

- (void)setScrollEnabled:(BOOL)scrollEnabled
{
  if (scrollEnabled) {
    _scrollView.scrollEnabled = YES;
    [_clipView setConstrainScrolling:NO];
  } else {
    _scrollView.scrollEnabled = NO;
    [_clipView setConstrainScrolling:YES];
  }
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
  // RCTUITextView has logic in setTextContainerInset[s] to convert th UIEdgeInsets to a valid NSSize struct
  _forwardingTextView.textContainerInsets = textContainerInsets;
}

#pragma mark -
#pragma mark Focus ring

- (BOOL)enableFocusRing
{
  return _scrollView.enableFocusRing;
}

- (void)setEnableFocusRing:(BOOL)enableFocusRing 
{
  _scrollView.enableFocusRing = enableFocusRing;
}

@end

#endif // macOS]
