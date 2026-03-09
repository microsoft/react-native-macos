/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUIImage.h>

// UIImage

CGFloat UIImageGetScale(NSImage *image)
{
  if (image == nil) {
    return 0.0;
  }
  
  NSCAssert(image.representations.count == 1, @"The scale can only be derived if the image has one representation.");

  NSImageRep *imageRep = image.representations.firstObject;
  if (imageRep != nil) {
    NSSize imageSize = image.size;
    NSSize repSize = CGSizeMake(imageRep.pixelsWide, imageRep.pixelsHigh);

    return round(fmax(repSize.width / imageSize.width, repSize.height / imageSize.height));
  }

  return 1.0;
}

// RCTUIImage - NSImage subclass with cached CGImage

@implementation RCTUIImage {
  CGImageRef _cachedCGImage;
}

- (void)dealloc {
  if (_cachedCGImage != NULL) {
    CGImageRelease(_cachedCGImage);
  }
}

- (CGImageRef)CGImage {
  if (_cachedCGImage == NULL) {
    CGImageRef cgImage = [self CGImageForProposedRect:NULL context:NULL hints:NULL];
    if (cgImage != NULL) {
      _cachedCGImage = CGImageRetain(cgImage);
    }
  }
  return _cachedCGImage;
}

- (CGFloat)scale {
  return UIImageGetScale(self);
}

@end

CGImageRef __nullable UIImageGetCGImageRef(NSImage *image)
{
  // If it's an RCTUIImage, use the cached CGImage property
  if ([image isKindOfClass:[RCTUIImage class]]) {
    return ((RCTUIImage *)image).CGImage;
  }
  
  // Otherwise, fall back to the standard NSImage method
  // Note: This returns an autoreleased CGImageRef
  return [image CGImageForProposedRect:NULL context:NULL hints:NULL];
}

static NSData *NSImageDataForFileType(NSImage *image, NSBitmapImageFileType fileType, NSDictionary<NSString *, id> *properties)
{
  NSCAssert(image.representations.count == 1, @"Expected only a single representation since UIImage only supports one.");

  NSBitmapImageRep *imageRep = (NSBitmapImageRep *)image.representations.firstObject;
  if (![imageRep isKindOfClass:[NSBitmapImageRep class]]) {
    NSCAssert([imageRep isKindOfClass:[NSBitmapImageRep class]], @"We need an NSBitmapImageRep to create an image.");
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

#endif
