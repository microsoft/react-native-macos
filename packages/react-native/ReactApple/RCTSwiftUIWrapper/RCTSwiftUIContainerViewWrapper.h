/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import <RCTUIKit/RCTUIKit.h> // [macOS]

NS_ASSUME_NONNULL_BEGIN

@interface RCTSwiftUIContainerViewWrapper : NSObject

- (RCTPlatformView *_Nullable)contentView;
- (void)updateBlurRadius:(NSNumber *)radius;
- (void)updateGrayscale:(NSNumber *)grayscale;
- (void)updateDropShadow:(NSNumber *)standardDeviation x:(NSNumber *)x y:(NSNumber *)y color:(RCTPlatformColor *)color; // [macOS]
- (void)updateSaturation:(NSNumber *)saturation;
- (void)updateContrast:(NSNumber *)contrast;
- (void)updateHueRotate:(NSNumber *)degrees;
- (void)updateContentView:(RCTPlatformView *)view; // [macOS]
- (RCTPlatformView *_Nullable)hostingView; // [macOS]
- (void)resetStyles;
- (void)updateLayoutWithBounds:(CGRect)bounds;

@end

NS_ASSUME_NONNULL_END
