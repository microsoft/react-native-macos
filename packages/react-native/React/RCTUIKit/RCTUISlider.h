/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import <React/RCTUIKitCompat.h>

#if !TARGET_OS_OSX
@compatibility_alias RCTUISlider UISlider;
#else
@protocol RCTUISliderDelegate;

@interface RCTUISlider : NSSlider
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, weak) id<RCTUISliderDelegate> delegate;
@property (nonatomic, readonly) BOOL pressed;
@property (nonatomic, assign) float value;
@property (nonatomic, assign) float minimumValue;
@property (nonatomic, assign) float maximumValue;
@property (nonatomic, strong) NSColor *minimumTrackTintColor;
@property (nonatomic, strong) NSColor *maximumTrackTintColor;

- (void)setValue:(float)value animated:(BOOL)animated;
NS_ASSUME_NONNULL_END
@end
#endif

#if TARGET_OS_OSX // [macOS
@protocol RCTUISliderDelegate <NSObject>
@optional
NS_ASSUME_NONNULL_BEGIN
- (void)slider:(RCTUISlider *)slider didPress:(BOOL)press;
NS_ASSUME_NONNULL_END
@end
#endif // macOS]
