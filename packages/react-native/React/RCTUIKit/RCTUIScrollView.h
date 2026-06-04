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

#import <UIKit/UIKit.h>

@compatibility_alias RCTUIScrollView UIScrollView;
#define RCTUIScrollViewDelegate UIScrollViewDelegate

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

@class RCTUIScrollView;

/**
 * Protocol for objects that want to listen to scroll events on macOS.
 * This mirrors the relevant parts of UIScrollViewDelegate for cross-platform compatibility.
 */
@protocol RCTUIScrollViewDelegate <NSObject>
@optional
- (void)scrollViewDidScroll:(RCTUIScrollView *)scrollView;
@end

@interface RCTUIScrollView : NSScrollView

// UIScrollView properties missing in NSScrollView
@property (nonatomic, assign) CGPoint contentOffset;
@property (nonatomic, assign) UIEdgeInsets contentInset;
@property (nonatomic, assign) CGSize contentSize;
@property (nonatomic, assign) BOOL showsHorizontalScrollIndicator;
@property (nonatomic, assign) BOOL showsVerticalScrollIndicator;
@property (nonatomic, assign) UIEdgeInsets scrollIndicatorInsets;
@property(nonatomic, assign) CGFloat minimumZoomScale;
@property(nonatomic, assign) CGFloat maximumZoomScale;
@property (nonatomic, assign) CGFloat zoomScale;
@property (nonatomic, assign) BOOL alwaysBounceHorizontal;
@property (nonatomic, assign) BOOL alwaysBounceVertical;
// macOS specific properties
@property (nonatomic, assign) BOOL enableFocusRing;
@property (nonatomic, assign, getter=isScrollEnabled) BOOL scrollEnabled;
@property (nonatomic, weak, nullable) id<RCTUIScrollViewDelegate> delegate;

- (void)setContentOffset:(CGPoint)contentOffset animated:(BOOL)animated;

@end

@interface RCTClipView : NSClipView

@property (nonatomic, assign) BOOL constrainScrolling;

@end

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
