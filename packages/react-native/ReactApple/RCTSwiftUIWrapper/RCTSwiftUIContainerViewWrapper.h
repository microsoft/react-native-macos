/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#if TARGET_OS_OSX // [macOS
#import <AppKit/AppKit.h>
#else // macOS]
#import <UIKit/UIKit.h>
#endif // [macOS]

NS_ASSUME_NONNULL_BEGIN

@interface RCTSwiftUIContainerViewWrapper : NSObject

#if !TARGET_OS_OSX // [macOS]
- (UIView *_Nullable)contentView;
#else // [macOS
- (NSView *_Nullable)contentView;
#endif // macOS]
- (void)updateBlurRadius:(NSNumber *)radius;
- (void)updateGrayscale:(NSNumber *)grayscale;
#if !TARGET_OS_OSX // [macOS]
- (void)updateDropShadow:(NSNumber *)standardDeviation x:(NSNumber *)x y:(NSNumber *)y color:(UIColor *)color;
#else // [macOS
- (void)updateDropShadow:(NSNumber *)standardDeviation x:(NSNumber *)x y:(NSNumber *)y color:(NSColor *)color;
#endif // macOS]
- (void)updateSaturation:(NSNumber *)saturation;
- (void)updateContrast:(NSNumber *)contrast;
- (void)updateHueRotate:(NSNumber *)degrees;
#if !TARGET_OS_OSX // [macOS]
- (void)updateContentView:(UIView *)view;
- (UIView *_Nullable)hostingView;
#else // [macOS
- (void)updateContentView:(NSView *)view;
- (NSView *_Nullable)hostingView;
#endif // macOS]
- (void)resetStyles;
- (void)updateLayoutWithBounds:(CGRect)bounds;

@end

NS_ASSUME_NONNULL_END
