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

UIKIT_STATIC_INLINE CGFloat UIImageGetScale(UIImage *image)
{
  return image.scale;
}

UIKIT_STATIC_INLINE CGImageRef UIImageGetCGImageRef(UIImage *image)
{
	return image.CGImage;
}

UIKIT_STATIC_INLINE UIImage *UIImageWithContentsOfFile(NSString *filePath)
{
  return [UIImage imageWithContentsOfFile:filePath];
}

UIKIT_STATIC_INLINE UIImage *UIImageWithData(NSData *imageData)
{
  return [UIImage imageWithData:imageData];
}

NS_ASSUME_NONNULL_END

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * An NSImage subclass that caches its CGImage representation.
 *
 * RCTUIImage solves an issue where NSImage's `CGImageForProposedRect:` returns a new
 * autoreleased CGImage each time it's called. When assigned to `CALayer.contents`, these
 * autoreleased CGImages get deallocated when the autorelease pool drains, causing rendering
 * issues (e.g., blank borders and shadows).
 *
 * @warning Treat RCTUIImage instances as immutable after creation. Do not modify the image's
 * representations or properties after accessing the CGImage property.
 */
@interface RCTUIImage : NSImage

@property (nonatomic, readonly, nullable) CGImageRef CGImage;

@property (nonatomic, readonly) CGFloat scale;

@end

typedef NS_ENUM(NSInteger, UIImageRenderingMode) {
    UIImageRenderingModeAlwaysOriginal,
    UIImageRenderingModeAlwaysTemplate,
};

#ifdef __cplusplus
extern "C" {
#endif

CGFloat UIImageGetScale(NSImage *image);
CGImageRef __nullable UIImageGetCGImageRef(NSImage *image);

#ifdef __cplusplus
}
#endif

NS_INLINE NSImage *UIImageWithContentsOfFile(NSString *filePath)
{
  return [[NSImage alloc] initWithContentsOfFile:filePath];
}

NS_INLINE NSImage *UIImageWithData(NSData *imageData)
{
  return [[NSImage alloc] initWithData:imageData];
}

NSData *UIImagePNGRepresentation(NSImage *image);
NSData *UIImageJPEGRepresentation(NSImage *image, CGFloat compressionQuality);

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
