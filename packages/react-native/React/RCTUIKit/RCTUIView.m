/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <QuartzCore/QuartzCore.h>
#import <React/RCTUIView.h>

// UIView

@implementation RCTUIView
{
@private
  NSColor *_backgroundColor;
  BOOL _clipsToBounds;
  BOOL _userInteractionEnabled;
  BOOL _mouseDownCanMoveWindow;
  BOOL _respondsToDisplayLayer;
  CATransform3D _transform3D;
  BOOL _hasCustomTransform3D;
}

+ (NSSet<NSString *> *)keyPathsForValuesAffectingValueForKey:(NSString *)key
{
  NSSet<NSString *> *keyPaths = [super keyPathsForValuesAffectingValueForKey:key];
  NSString *alternatePath = nil;

  // alpha is a wrapper for alphaValue
  if ([key isEqualToString:@"alpha"]) {
    alternatePath = @"alphaValue";
  // isAccessibilityElement is a wrapper for accessibilityElement
  } else if ([key isEqualToString:@"isAccessibilityElement"]) {
    alternatePath = @"accessibilityElement";
  }

  if (alternatePath != nil) {
    keyPaths = keyPaths != nil ? [keyPaths setByAddingObject:alternatePath] : [NSSet setWithObject:alternatePath];
  }

  return keyPaths;
}

static RCTUIView *RCTUIViewCommonInit(RCTUIView *self)
{
  if (self != nil) {
    self.wantsLayer = YES;
    self->_userInteractionEnabled = YES;
    self->_enableFocusRing = YES;
    self->_mouseDownCanMoveWindow = YES;
    self->_respondsToDisplayLayer = [self respondsToSelector:@selector(displayLayer:)];
    self->_transform3D = CATransform3DIdentity;
    self->_hasCustomTransform3D = NO;
  }
  return self;
}

- (instancetype)initWithFrame:(NSRect)frameRect
{
  return RCTUIViewCommonInit([super initWithFrame:frameRect]);
}

- (instancetype)initWithCoder:(NSCoder *)coder
{
  return RCTUIViewCommonInit([super initWithCoder:coder]);
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event
{
  if (self.acceptsFirstMouse || [super acceptsFirstMouse:event]) {
    return YES;
  }

  // If any RCTUIView view above has acceptsFirstMouse set, then return YES here.
  NSView *view = self;
  while ((view = view.superview)) {
    if ([view isKindOfClass:[RCTUIView class]] && [(RCTUIView *)view acceptsFirstMouse]) {
      return YES;
    }
  }

  return NO;
}

- (BOOL)acceptsFirstResponder
{
  return [self canBecomeFirstResponder];
}

- (BOOL)isFirstResponder {
  return [[self window] firstResponder] == self;
}

- (void)viewDidMoveToWindow
{
  [self didMoveToWindow];
}

- (BOOL)mouseDownCanMoveWindow{
	return _mouseDownCanMoveWindow;
}

- (void)setMouseDownCanMoveWindow:(BOOL)mouseDownCanMoveWindow{
	_mouseDownCanMoveWindow = mouseDownCanMoveWindow;
}

- (BOOL)isFlipped
{
  return YES;
}

- (CGFloat)alpha
{
  return self.alphaValue;
}

- (void)setAlpha:(CGFloat)alpha
{
  self.alphaValue = alpha;
}


- (CGAffineTransform)transform
{
  return self.layer.affineTransform;
}

- (void)setTransform:(CGAffineTransform)transform
{
  self.transform3D = CATransform3DMakeAffineTransform(transform);
}

- (CATransform3D)transform3D
{
  return _transform3D;
}

- (void)setTransform3D:(CATransform3D)transform3D
{
  // On macOS, layer.anchorPoint defaults to {0, 0} instead of {0.5, 0.5} on iOS.
  // Compensate so transforms are applied from the view's center as expected.
  CGPoint anchorPoint = self.layer.anchorPoint;
  if (CGPointEqualToPoint(anchorPoint, CGPointZero) && !CATransform3DEqualToTransform(transform3D, CATransform3DIdentity)) {
    CATransform3D originAdjust = CATransform3DTranslate(CATransform3DIdentity, self.frame.size.width / 2, self.frame.size.height / 2, 0);
    transform3D = CATransform3DConcat(CATransform3DConcat(CATransform3DInvert(originAdjust), transform3D), originAdjust);
  }

  _transform3D = transform3D;
  _hasCustomTransform3D = !CATransform3DEqualToTransform(transform3D, CATransform3DIdentity);
  self.layer.transform = transform3D;
}

- (NSView *)hitTest:(NSPoint)point
{
  // NSView's hitTest: receives a point in superview coordinates. Convert to local
  // coordinates using CALayer, which correctly accounts for layer.transform.
  // NSView's convertPoint:fromView: does NOT account for layer transforms.
  CGPoint localPoint;
  if (self.layer.superlayer) {
    localPoint = [self.layer convertPoint:point fromLayer:self.layer.superlayer];
  } else {
    localPoint = point;
  }
  return [self hitTest:localPoint withEvent:nil];
}

- (BOOL)wantsUpdateLayer
{
  return _respondsToDisplayLayer || _hasCustomTransform3D;
}

- (void)updateLayer
{
  CALayer *layer = [self layer];
  if (_backgroundColor) {
    // updateLayer will be called when the view's current appearance changes.
    // The layer's backgroundColor is a CGColor which is not appearance aware
    // so it has to be reset from the view's NSColor ivar.
    [layer setBackgroundColor:[_backgroundColor CGColor]];
  }

  // On macOS, AppKit's layer-backed view system resets layer.transform to identity
  // during its layout/display cycle because NSView has no built-in transform property
  // (unlike UIView on iOS). We must re-apply the stored transform after each cycle.
  if (_hasCustomTransform3D && !CATransform3DEqualToTransform(layer.transform, _transform3D)) {
    layer.transform = _transform3D;
  }

  if (_respondsToDisplayLayer) {
    [(id<CALayerDelegate>)self displayLayer:layer];
  }
}

- (void)drawRect:(CGRect)rect
{
  if (_backgroundColor) {
    [_backgroundColor set];
    NSRectFill(rect);
  }
  [super drawRect:rect];
}

- (void)layout
{
  [super layout];
  if (self.window != nil) {
    [self layoutSubviews];
  }
}

- (BOOL)canBecomeFirstResponder
{
  return [super acceptsFirstResponder];
}

- (BOOL)becomeFirstResponder
{
  return [[self window] makeFirstResponder:self];
}

@synthesize userInteractionEnabled = _userInteractionEnabled;

- (NSArray *)accessibilityElements
{
  return self.accessibilityChildren;
}

- (void)setAccessibilityElements:(NSArray *)accessibilityElements
{
  self.accessibilityChildren = accessibilityElements;
}

- (NSView *)hitTest:(CGPoint)point withEvent:(__unused UIEvent *)event
{
// [macOS
  // IMPORTANT point is expected to be passed in local coordinates, but OSX expects point to be super 
  NSView *superview = [self superview];
  NSPoint pointInSuperview = superview != nil ? [self convertPoint:point toView:superview] : point;
  return self.userInteractionEnabled ? [super hitTest:pointInSuperview] : nil;
}

- (BOOL)pointInside:(CGPoint)point withEvent:(__unused UIEvent *)event
{
  return self.userInteractionEnabled ? NSPointInRect(NSPointFromCGPoint(point), self.bounds) : NO;
}

- (void)insertSubview:(NSView *)view atIndex:(NSInteger)index
{
  NSArray<__kindof NSView *> *subviews = self.subviews;
  if ((NSUInteger)index == subviews.count) {
    [self addSubview:view];
  } else {
    [self addSubview:view positioned:NSWindowBelow relativeTo:subviews[index]];
  }
}

- (void)didMoveToWindow
{
  [super viewDidMoveToWindow];
}

- (void)setNeedsLayout
{
  self.needsLayout = YES;
}

- (void)layoutIfNeeded
{
  if ([self needsLayout]) {
    [self layout];
  }
}

- (void)layoutSubviews
{
  [super layout];
}

- (void)setNeedsDisplay
{
  self.needsDisplay = YES;
}

@synthesize clipsToBounds = _clipsToBounds;

@synthesize backgroundColor = _backgroundColor;

- (void)setBackgroundColor:(NSColor *)backgroundColor
{
  if (_backgroundColor != backgroundColor && ![_backgroundColor isEqual:backgroundColor])
  {
    _backgroundColor = [backgroundColor copy];
    [self setNeedsDisplay:YES];
  }
}

// We purposely don't use RCTCursor for the parameter type here because it would introduce an import cycle:
// RCTUIKit > RCTCursor > RCTConvert > RCTUIKit
- (void)setCursor:(NSInteger)cursor
{
  // This method is required to be defined due to [RCTVirtualTextViewManager view] returning a RCTUIView.
}

@end

#endif
