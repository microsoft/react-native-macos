/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUIControls.h>

#import <CoreImage/CIFilter.h>
#import <CoreImage/CIVector.h>

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

- (RCTPlatformImage *)image
{
  return [[self layer] contents];
}

- (void)setImage:(RCTPlatformImage *)image
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

#endif
