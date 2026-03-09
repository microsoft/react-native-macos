/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUIGraphicsImageRenderer.h>
#import <React/RCTUIImage.h>

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

- (nonnull RCTUIImage *)imageWithActions:(NS_NOESCAPE RCTUIGraphicsImageDrawingActions)actions {
    RCTUIImage *image = [RCTUIImage imageWithSize:_size
                                           flipped:YES
                                    drawingHandler:^BOOL(NSRect dstRect) {
        
        RCTUIGraphicsImageRendererContext *context = [NSGraphicsContext currentContext];
        if (self->_format.opaque) {
            CGContextSetAlpha([context CGContext], 1.0);
        }
        actions(context);
        return YES;
    }];

    // Calling these in succession forces the image to render its contents immediately,
    // rather than deferring until later.
    [image lockFocus];
    [image unlockFocus];
    
    return image;
}

@end

#endif
