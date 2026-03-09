/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUIImageView.h>

#import <CoreImage/CIFilter.h>

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
