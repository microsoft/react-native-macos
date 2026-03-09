/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import <React/RCTUIImage.h>

#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

typedef UIGraphicsImageRendererContext RCTUIGraphicsImageRendererContext;
typedef UIGraphicsImageDrawingActions RCTUIGraphicsImageDrawingActions;
typedef UIGraphicsImageRendererFormat RCTUIGraphicsImageRendererFormat;
typedef UIGraphicsImageRenderer RCTUIGraphicsImageRenderer;

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN
typedef NSGraphicsContext RCTUIGraphicsImageRendererContext;
typedef void (^RCTUIGraphicsImageDrawingActions)(RCTUIGraphicsImageRendererContext *rendererContext);

@interface RCTUIGraphicsImageRendererFormat : NSObject

+ (instancetype)defaultFormat;

@property (nonatomic) CGFloat scale;
@property (nonatomic) BOOL opaque;

@end

@interface RCTUIGraphicsImageRenderer : NSObject

- (instancetype)initWithSize:(CGSize)size;
- (instancetype)initWithSize:(CGSize)size format:(RCTUIGraphicsImageRendererFormat *)format;
- (RCTUIImage *)imageWithActions:(NS_NOESCAPE RCTUIGraphicsImageDrawingActions)actions;

@end
NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
