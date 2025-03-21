/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUIKit.h>

#import <React/RCTAssert.h>
#import <UIView+React.h>

#import <objc/runtime.h>

#import <CoreImage/CIFilter.h>
#import <CoreImage/CIVector.h>

static char RCTGraphicsContextSizeKey;

//
// semantically equivalent functions
//

// UIGraphics.h

CGContextRef UIGraphicsGetCurrentContext(void)
{
	return [[NSGraphicsContext currentContext] CGContext];
}

NSImage *UIGraphicsGetImageFromCurrentImageContext(void)
{
	NSImage *image = nil;
	NSGraphicsContext *graphicsContext = [NSGraphicsContext currentContext];

	NSValue *sizeValue = objc_getAssociatedObject(graphicsContext, &RCTGraphicsContextSizeKey);
	if (sizeValue != nil) {
		CGImageRef cgImage = CGBitmapContextCreateImage([graphicsContext CGContext]);

		if (cgImage != NULL) {
			NSBitmapImageRep *imageRep = [[NSBitmapImageRep alloc] initWithCGImage:cgImage];
			image = [[NSImage alloc] initWithSize:[sizeValue sizeValue]];
			[image addRepresentation:imageRep];
			CFRelease(cgImage);
		}
	}

	return image;
}

//
// functionally equivalent types
//

// UIImage

CGFloat UIImageGetScale(NSImage *image)
{
  if (image == nil) {
    return 0.0;
  }
  
  RCTAssert(image.representations.count == 1, @"The scale can only be derived if the image has one representation.");

  NSImageRep *imageRep = image.representations.firstObject;
  if (imageRep != nil) {
    NSSize imageSize = image.size;
    NSSize repSize = CGSizeMake(imageRep.pixelsWide, imageRep.pixelsHigh);

    return round(fmax(repSize.width / imageSize.width, repSize.height / imageSize.height));
  }

  return 1.0;
}

CGImageRef __nullable UIImageGetCGImageRef(NSImage *image)
{
  return [image CGImageForProposedRect:NULL context:NULL hints:NULL];
}

static NSData *NSImageDataForFileType(NSImage *image, NSBitmapImageFileType fileType, NSDictionary<NSString *, id> *properties)
{
  RCTAssert(image.representations.count == 1, @"Expected only a single representation since UIImage only supports one.");

  NSBitmapImageRep *imageRep = (NSBitmapImageRep *)image.representations.firstObject;
  if (![imageRep isKindOfClass:[NSBitmapImageRep class]]) {
    RCTAssert([imageRep isKindOfClass:[NSBitmapImageRep class]], @"We need an NSBitmapImageRep to create an image.");
    return nil;
  }

  return [imageRep representationUsingType:fileType properties:properties];
}

NSData *UIImagePNGRepresentation(NSImage *image) {
  return NSImageDataForFileType(image, NSBitmapImageFileTypePNG, @{});
}

NSData *UIImageJPEGRepresentation(NSImage *image, CGFloat compressionQuality) {
  return NSImageDataForFileType(image,
                                NSBitmapImageFileTypeJPEG,
                                @{NSImageCompressionFactor: @(compressionQuality)});
}

// UIBezierPath
UIBezierPath *UIBezierPathWithRoundedRect(CGRect rect, CGFloat cornerRadius)
{
  return [NSBezierPath bezierPathWithRoundedRect:rect xRadius:cornerRadius yRadius:cornerRadius];
}

void UIBezierPathAppendPath(UIBezierPath *path, UIBezierPath *appendPath)
{
  return [path appendBezierPath:appendPath];
}

CGPathRef UIBezierPathCreateCGPathRef(UIBezierPath *bezierPath)
{
  CGPathRef immutablePath = NULL;
  
  // Draw the path elements.
  NSInteger numElements = [bezierPath elementCount];
  if (numElements > 0)
  {
    CGMutablePathRef    path = CGPathCreateMutable();
    NSPoint             points[3];
    BOOL                didClosePath = YES;
    
    for (NSInteger i = 0; i < numElements; i++)
    {
      switch ([bezierPath elementAtIndex:i associatedPoints:points])
      {
        case NSBezierPathElementMoveTo:
          CGPathMoveToPoint(path, NULL, points[0].x, points[0].y);
          break;
          
        case NSBezierPathElementLineTo:
          CGPathAddLineToPoint(path, NULL, points[0].x, points[0].y);
          didClosePath = NO;
          break;
          
        case NSBezierPathElementCurveTo:
          CGPathAddCurveToPoint(path, NULL, points[0].x, points[0].y,
                                points[1].x, points[1].y,
                                points[2].x, points[2].y);
          didClosePath = NO;
          break;
          
        case NSBezierPathElementClosePath:
          CGPathCloseSubpath(path);
          didClosePath = YES;
          break;
      }
    }
    
    // Be sure the path is closed or Quartz may not do valid hit detection.
    if (!didClosePath)
      CGPathCloseSubpath(path);
    
    immutablePath = CGPathCreateCopy(path);
    CGPathRelease(path);
  }
  
  return immutablePath;
}

//
// substantially different types
//

// UIView


@implementation RCTUIView
{
@private
  NSColor *_backgroundColor;
  BOOL _clipsToBounds;
  BOOL _hasMouseOver;
  BOOL _userInteractionEnabled;
  NSTrackingArea *_trackingArea;
  BOOL _mouseDownCanMoveWindow;
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
  // Subscribe to view bounds changed notification so that the view can be notified when a
  // scroll event occurs either due to trackpad/gesture based scrolling or a scrollwheel event
  // both of which would not cause the mouseExited to be invoked.

  if ([self window] == nil) {
    [[NSNotificationCenter defaultCenter] removeObserver:self
                                                    name:NSViewBoundsDidChangeNotification
                                                  object:nil];
  }
  else if ([[self enclosingScrollView] contentView] != nil) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(viewBoundsChanged:)
                                                 name:NSViewBoundsDidChangeNotification
                                               object:[[self enclosingScrollView] contentView]];
  }

  [self reactViewDidMoveToWindow]; // [macOS] Github#1412

  [self didMoveToWindow];
}

- (void)viewBoundsChanged:(NSNotification*)__unused inNotif
{
  // When an enclosing scrollview is scrolled using the scrollWheel or trackpad,
  // the mouseExited: event does not get called on the view where mouseEntered: was previously called.
  // This creates an unnatural pairing of mouse enter and exit events and can cause problems.
  // We therefore explicitly check for this here and handle them by calling the appropriate callbacks.

  if (!_hasMouseOver && self.onMouseEnter)
  {
    NSPoint locationInWindow = [[self window] mouseLocationOutsideOfEventStream];
    NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];

    if (NSPointInRect(locationInView, [self bounds]))
    {
      _hasMouseOver = YES;

      [self sendMouseEventWithBlock:self.onMouseEnter
                       locationInfo:[self locationInfoFromDraggingLocation:locationInWindow]
                      modifierFlags:0
                     additionalData:nil];
    }
  }
  else if (_hasMouseOver && self.onMouseLeave)
  {
    NSPoint locationInWindow = [[self window] mouseLocationOutsideOfEventStream];
    NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];

    if (!NSPointInRect(locationInView, [self bounds]))
    {
      _hasMouseOver = NO;

      [self sendMouseEventWithBlock:self.onMouseLeave
                       locationInfo:[self locationInfoFromDraggingLocation:locationInWindow]
                      modifierFlags:0
                     additionalData:nil];
    }
  }
}

- (BOOL)hasMouseHoverEvent
{
  // This can be overridden by subclasses as needed.
  // e.g., RCTTextView, which consolidates its JS children into a single gigantic NSAttributedString
  return self.onMouseEnter || self.onMouseLeave;
}

- (NSDictionary*)locationInfoFromDraggingLocation:(NSPoint)locationInWindow
{
  NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];

  return @{@"screenX": @(locationInWindow.x),
           @"screenY": @(locationInWindow.y),
           @"clientX": @(locationInView.x),
           @"clientY": @(locationInView.y)
           };
}

- (NSDictionary*)locationInfoFromEvent:(NSEvent*)event
{
  NSPoint locationInWindow = event.locationInWindow;
  NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];

  return @{@"screenX": @(locationInWindow.x),
           @"screenY": @(locationInWindow.y),
           @"clientX": @(locationInView.x),
           @"clientY": @(locationInView.y)
           };
}

- (void)mouseEntered:(NSEvent *)event
{
  _hasMouseOver = YES;
  [self sendMouseEventWithBlock:self.onMouseEnter
                   locationInfo:[self locationInfoFromEvent:event]
                  modifierFlags:event.modifierFlags
                 additionalData:nil];
}

- (void)mouseExited:(NSEvent *)event
{
  _hasMouseOver = NO;
  [self sendMouseEventWithBlock:self.onMouseLeave
                   locationInfo:[self locationInfoFromEvent:event]
                  modifierFlags:event.modifierFlags
                 additionalData:nil];
}

- (void)sendMouseEventWithBlock:(RCTDirectEventBlock)block
                   locationInfo:(NSDictionary*)locationInfo
                  modifierFlags:(NSEventModifierFlags)modifierFlags
                 additionalData:(NSDictionary* __nullable)additionalData
{
  if (block == nil) {
    return;
  }

  NSMutableDictionary *body = [NSMutableDictionary new];

  if (modifierFlags & NSEventModifierFlagShift) {
    body[@"shiftKey"] = @YES;
  }
  if (modifierFlags & NSEventModifierFlagControl) {
    body[@"ctrlKey"] = @YES;
  }
  if (modifierFlags & NSEventModifierFlagOption) {
    body[@"altKey"] = @YES;
  }
  if (modifierFlags & NSEventModifierFlagCommand) {
    body[@"metaKey"] = @YES;
  }

  if (locationInfo) {
    [body addEntriesFromDictionary:locationInfo];
  }

  if (additionalData) {
    [body addEntriesFromDictionary:additionalData];
  }

  block(body);
}

- (void)updateTrackingAreas
{
  BOOL hasMouseHoverEvent = [self hasMouseHoverEvent];
  BOOL wouldRecreateIdenticalTrackingArea = hasMouseHoverEvent && _trackingArea && NSEqualRects(self.bounds, [_trackingArea rect]);

  if (!wouldRecreateIdenticalTrackingArea) {
    if (_trackingArea) {
      [self removeTrackingArea:_trackingArea];
    }

    if (hasMouseHoverEvent) {
      _trackingArea = [[NSTrackingArea alloc] initWithRect:self.bounds
                                                   options:NSTrackingActiveAlways|NSTrackingMouseEnteredAndExited
                                                     owner:self
                                                  userInfo:nil];
      [self addTrackingArea:_trackingArea];
    }
  }

  [super updateTrackingAreas];
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
  self.layer.affineTransform = transform;
}

- (NSView *)hitTest:(NSPoint)point
{
  // IMPORTANT point is passed in super coordinates by OSX, but expected to be passed in local coordinates
  NSView *superview = [self superview];
  NSPoint pointInSelf = superview != nil ? [self convertPoint:point fromView:superview] : point;
  return [self hitTest:pointInSelf withEvent:nil];
}

- (BOOL)wantsUpdateLayer
{
  return [self respondsToSelector:@selector(displayLayer:)];
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
  [(id<CALayerDelegate>)self displayLayer:layer];
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

// RCTUIScrollView

@implementation RCTUIScrollView

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.scrollEnabled = YES;
    self.drawsBackground = NO;
  }
  
  return self;
}

- (void)setEnableFocusRing:(BOOL)enableFocusRing {
  if (_enableFocusRing != enableFocusRing) {
    _enableFocusRing = enableFocusRing;
  }

  if (enableFocusRing) {
    // NSTextView has no focus ring by default so let's use the standard Aqua focus ring.
    [self setFocusRingType:NSFocusRingTypeExterior];
  } else {
    [self setFocusRingType:NSFocusRingTypeNone];
  }
}

// UIScrollView properties missing from NSScrollView
- (CGPoint)contentOffset
{
  return self.documentVisibleRect.origin;
}

- (void)setContentOffset:(CGPoint)contentOffset
{
  [self.documentView scrollPoint:contentOffset];
}

- (void)setContentOffset:(CGPoint)contentOffset animated:(BOOL)animated
{
    if (animated) {
        [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
            context.duration = 0.3; // Set the duration of the animation
            [self.documentView.animator scrollPoint:contentOffset];
        } completionHandler:nil];
    } else {
        [self.documentView scrollPoint:contentOffset];
    }
}

- (UIEdgeInsets)contentInset
{
  return super.contentInsets;
}

- (void)setContentInset:(UIEdgeInsets)insets
{
  super.contentInsets = insets;
}

- (CGSize)contentSize
{
  return self.documentView.frame.size;
}

- (void)setContentSize:(CGSize)contentSize
{
  CGRect frame = self.documentView.frame;
  frame.size = contentSize;
  self.documentView.frame = frame;
}

- (BOOL)showsHorizontalScrollIndicator
{
	return self.hasHorizontalScroller;
}

- (void)setShowsHorizontalScrollIndicator:(BOOL)show
{
	self.hasHorizontalScroller = show;
}

- (BOOL)showsVerticalScrollIndicator
{
	return self.hasVerticalScroller;
}

- (void)setShowsVerticalScrollIndicator:(BOOL)show
{
	self.hasVerticalScroller = show;
}

- (UIEdgeInsets)scrollIndicatorInsets
{
	return self.scrollerInsets;
}

- (void)setScrollIndicatorInsets:(UIEdgeInsets)insets
{
	self.scrollerInsets = insets;
}

- (CGFloat)zoomScale
{
  return self.magnification;
}

- (void)setZoomScale:(CGFloat)zoomScale
{
  self.magnification = zoomScale;
}

- (CGFloat)maximumZoomScale
{
  return self.maxMagnification;
}

- (void)setMaximumZoomScale:(CGFloat)maximumZoomScale
{
  self.maxMagnification = maximumZoomScale;
}

- (CGFloat)minimumZoomScale
{
  return self.minMagnification;
}

- (void)setMinimumZoomScale:(CGFloat)minimumZoomScale
{
  self.minMagnification = minimumZoomScale;
}


- (BOOL)alwaysBounceHorizontal
{
  return self.horizontalScrollElasticity != NSScrollElasticityNone;
}

- (void)setAlwaysBounceHorizontal:(BOOL)alwaysBounceHorizontal
{
  self.horizontalScrollElasticity = alwaysBounceHorizontal ? NSScrollElasticityAllowed : NSScrollElasticityNone;
}

- (BOOL)alwaysBounceVertical
{
  return self.verticalScrollElasticity != NSScrollElasticityNone;
}

- (void)setAlwaysBounceVertical:(BOOL)alwaysBounceVertical
{
  self.verticalScrollElasticity = alwaysBounceVertical ? NSScrollElasticityAllowed : NSScrollElasticityNone;
}

@end

BOOL RCTUIViewSetClipsToBounds(RCTPlatformView *view)
{
  // NSViews are always clipped to bounds
  BOOL clipsToBounds = YES;

  // But see if UIView overrides that behavior
  if ([view respondsToSelector:@selector(clipsToBounds)])
  {
    clipsToBounds = [(id)view clipsToBounds];
  }

  return clipsToBounds;
}

@implementation RCTClipView

- (instancetype)initWithFrame:(NSRect)frameRect
{
   if (self = [super initWithFrame:frameRect]) {
    self.constrainScrolling = NO;
    self.drawsBackground = NO;
  }
  
  return self;
}

- (NSRect)constrainBoundsRect:(NSRect)proposedBounds
{
  if (self.constrainScrolling) {
    return NSMakeRect(0, 0, 0, 0);
  }
  
  return [super constrainBoundsRect:proposedBounds];
}

@end

// RCTUISlider

@implementation RCTUISlider {}

- (void)setValue:(float)value animated:(__unused BOOL)animated
{
  self.animator.floatValue = value;
}

@end


// RCTUILabel

@implementation RCTUILabel {}

- (instancetype)initWithFrame:(NSRect)frameRect
{
  if (self = [super initWithFrame:frameRect]) {
    [self setBezeled:NO];
    [self setDrawsBackground:NO];
    [self setEditable:NO];
    [self setSelectable:NO];
    [self setWantsLayer:YES];
  }
  
  return self;
}

- (void)setText:(NSString *)text
{
  [self setStringValue:text];
}

@end

@implementation RCTUISwitch

- (BOOL)isOn
{
	return self.state == NSControlStateValueOn;
}

- (void)setOn:(BOOL)on
{
	[self setOn:on animated:NO];
}

- (void)setOn:(BOOL)on animated:(BOOL)animated {
	self.state = on ? NSControlStateValueOn : NSControlStateValueOff;
}

@end

// RCTUIActivityIndicatorView

@interface RCTUIActivityIndicatorView ()
@property (nonatomic, readwrite, getter=isAnimating) BOOL animating;
@end

@implementation RCTUIActivityIndicatorView {}

- (instancetype)initWithFrame:(CGRect)frame
{
  if ((self = [super initWithFrame:frame])) {
    self.displayedWhenStopped = NO;
    self.style = NSProgressIndicatorStyleSpinning;
  }
  return self;
}

- (void)startAnimating
{
  // `wantsLayer` gets reset after the animation is stopped. We have to
  // reset it in order for CALayer filters to take effect.
  [self setWantsLayer:YES];
  [self startAnimation:self];
}

- (void)stopAnimating
{
  [self stopAnimation:self];
}

- (void)startAnimation:(id)sender
{
  [super startAnimation:sender];
  self.animating = YES;
}

- (void)stopAnimation:(id)sender
{
  [super stopAnimation:sender];
  self.animating = NO;
}

- (void)setActivityIndicatorViewStyle:(UIActivityIndicatorViewStyle)activityIndicatorViewStyle
{
  _activityIndicatorViewStyle = activityIndicatorViewStyle;
  
  switch (activityIndicatorViewStyle) {
    case UIActivityIndicatorViewStyleLarge:
      self.controlSize = NSControlSizeLarge;
      break;
    case UIActivityIndicatorViewStyleMedium:
      self.controlSize = NSControlSizeRegular;
      break;
    default:
      break;
  }
}

- (void)setColor:(RCTUIColor*)color
{
  if (_color != color) {
    _color = color;
    [self setNeedsDisplay:YES];
  }
}

- (void)updateLayer
{
  [super updateLayer];
  if (_color != nil) {
    CGFloat r, g, b, a;
    [[_color colorUsingColorSpace:[NSColorSpace genericRGBColorSpace]] getRed:&r green:&g blue:&b alpha:&a];

    CIFilter *colorPoly = [CIFilter filterWithName:@"CIColorPolynomial"];
    [colorPoly setDefaults];
    
    CIVector *redVector = [CIVector vectorWithX:r Y:0 Z:0 W:0];
    CIVector *greenVector = [CIVector vectorWithX:g Y:0 Z:0 W:0];
    CIVector *blueVector = [CIVector vectorWithX:b Y:0 Z:0 W:0];
    [colorPoly setValue:redVector forKey:@"inputRedCoefficients"];
    [colorPoly setValue:greenVector forKey:@"inputGreenCoefficients"];
    [colorPoly setValue:blueVector forKey:@"inputBlueCoefficients"];
    
    [[self layer] setFilters:@[colorPoly]];
  } else {
    [[self layer] setFilters:nil];
  }
}

- (void)setHidesWhenStopped:(BOOL)hidesWhenStopped
{
  self.displayedWhenStopped = !hidesWhenStopped;
}

- (BOOL)hidesWhenStopped
{
  return !self.displayedWhenStopped;
}

- (void)setHidden:(BOOL)hidden
{
  if ([self hidesWhenStopped] && ![self isAnimating]) {
    [super setHidden:YES];
  } else {
    [super setHidden:hidden];
  }
}

@end

// RCTUIImageView

@implementation RCTUIImageView {
  CALayer *_tintingLayer;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    [self setLayer:[[CALayer alloc] init]];
    [self setWantsLayer:YES];
  }
  
  return self;
}

- (BOOL)clipsToBounds
{
  return [[self layer] masksToBounds];
}

- (void)setClipsToBounds:(BOOL)clipsToBounds
{
  [[self layer] setMasksToBounds:clipsToBounds];
}

- (void)setContentMode:(UIViewContentMode)contentMode
{
  _contentMode = contentMode;
  
  CALayer *layer = [self layer];
  switch (contentMode) {
    case UIViewContentModeScaleAspectFill:
      [layer setContentsGravity:kCAGravityResizeAspectFill];
      break;
      
    case UIViewContentModeScaleAspectFit:
      [layer setContentsGravity:kCAGravityResizeAspect];
      break;
      
    case UIViewContentModeScaleToFill:
      [layer setContentsGravity:kCAGravityResize];
      break;
      
    case UIViewContentModeCenter:
      [layer setContentsGravity:kCAGravityCenter];
      break;
    
    default:
      break;
  }
}

- (UIImage *)image
{
  return [[self layer] contents];
}

- (void)setImage:(UIImage *)image
{
  CALayer *layer = [self layer];
  
  if ([layer contents] != image || [layer backgroundColor] != nil) {
    if (_tintColor) {
      if (!_tintingLayer) {
        _tintingLayer = [CALayer new];
        [_tintingLayer setFrame:self.bounds];
        [_tintingLayer setAutoresizingMask:kCALayerWidthSizable | kCALayerHeightSizable];
        [_tintingLayer setZPosition:1.0];
        CIFilter *sourceInCompositingFilter = [CIFilter filterWithName:@"CISourceInCompositing"];
        [sourceInCompositingFilter setDefaults];
        [_tintingLayer setCompositingFilter:sourceInCompositingFilter];
        [layer addSublayer:_tintingLayer];
      }
      [_tintingLayer setBackgroundColor:_tintColor.CGColor];
    } else {
      [_tintingLayer removeFromSuperlayer];
      _tintingLayer = nil;
    }
    
    if (image != nil && [image resizingMode] == NSImageResizingModeTile) {
      [layer setContents:nil];
      [layer setBackgroundColor:[NSColor colorWithPatternImage:image].CGColor];
    } else {
      [layer setContents:image];
      [layer setBackgroundColor:nil];
    }
  }
}

@end

@implementation RCTUIGraphicsImageRendererFormat

+ (nonnull instancetype)defaultFormat {
    RCTUIGraphicsImageRendererFormat *format = [RCTUIGraphicsImageRendererFormat new];
    return format;
}

@end

@implementation RCTUIGraphicsImageRenderer
{
    CGSize _size;
    RCTUIGraphicsImageRendererFormat *_format;
}

- (nonnull instancetype)initWithSize:(CGSize)size {
    if (self = [super init]) {
        self->_size = size;
    }
    return self;
}

- (nonnull instancetype)initWithSize:(CGSize)size format:(nonnull RCTUIGraphicsImageRendererFormat *)format {
    if (self = [super init]) {
        self->_size = size;
        self->_format = format;
    }
    return self;
}

- (nonnull NSImage *)imageWithActions:(NS_NOESCAPE RCTUIGraphicsImageDrawingActions)actions {

    NSImage *image = [NSImage imageWithSize:_size
                                    flipped:YES
                             drawingHandler:^BOOL(NSRect dstRect) {
        
        RCTUIGraphicsImageRendererContext *context = [NSGraphicsContext currentContext];
        if (self->_format.opaque) {
            CGContextSetAlpha([context CGContext], 1.0);
        }
        actions(context);
        return YES;
    }];
    return image;
}

@end

#endif
