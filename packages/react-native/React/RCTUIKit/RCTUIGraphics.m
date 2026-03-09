/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUIGraphics.h>

#import <objc/runtime.h>

static char RCTGraphicsContextSizeKey;

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

// UIBezierPath
UIBezierPath *UIBezierPathWithRoundedRect(CGRect rect, CGFloat cornerRadius)
{
  return [NSBezierPath bezierPathWithRoundedRect:rect xRadius:cornerRadius yRadius:cornerRadius];
}

void UIBezierPathAppendPath(UIBezierPath *path, UIBezierPath *appendPath)
{
  return [path appendBezierPath:appendPath];
}

#endif
