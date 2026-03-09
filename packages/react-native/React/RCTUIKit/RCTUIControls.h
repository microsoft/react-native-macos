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

// RCTUISlider

#if !TARGET_OS_OSX
typedef UISlider RCTUISlider;
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

// RCTUILabel

#if !TARGET_OS_OSX
typedef UILabel RCTUILabel;
#else
@interface RCTUILabel : NSTextField
NS_ASSUME_NONNULL_BEGIN
@property(nonatomic, copy) NSString* _Nullable text;
@property(nonatomic, assign) NSInteger numberOfLines;
@property(nonatomic, assign) NSTextAlignment textAlignment;
NS_ASSUME_NONNULL_END
@end
#endif

// RCTUISwitch

#if !TARGET_OS_OSX
typedef UISwitch RCTUISwitch;
#else
@interface RCTUISwitch : NSSwitch
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, getter=isOn) BOOL on;

- (void)setOn:(BOOL)on animated:(BOOL)animated;

NS_ASSUME_NONNULL_END
@end
#endif

// RCTUIActivityIndicatorView

#if !TARGET_OS_OSX
typedef UIActivityIndicatorView RCTUIActivityIndicatorView;
#else
@interface RCTUIActivityIndicatorView : NSProgressIndicator
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, assign) UIActivityIndicatorViewStyle activityIndicatorViewStyle;
@property (nonatomic, assign) BOOL hidesWhenStopped;
@property (nullable, readwrite, nonatomic, strong) RCTUIColor *color;
@property (nonatomic, readonly, getter=isAnimating) BOOL animating;

- (void)startAnimating;
- (void)stopAnimating;
NS_ASSUME_NONNULL_END
@end

#endif

// RCTUITouch

#if !TARGET_OS_OSX
typedef UITouch RCTUITouch;
#else
@interface RCTUITouch : NSEvent
@end
#endif

// RCTUIImageView

#if !TARGET_OS_OSX
typedef UIImageView RCTUIImageView;
#else
@interface RCTUIImageView : NSImageView
NS_ASSUME_NONNULL_BEGIN
@property (nonatomic, strong) RCTUIColor *tintColor;
@property (nonatomic, assign) UIViewContentMode contentMode;
NS_ASSUME_NONNULL_END
@end
#endif
