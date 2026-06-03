/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#ifndef RCT_REMOVE_LEGACY_ARCH

typedef CGSize (^RCTWrapperMeasureBlock)(CGSize minimumSize, CGSize maximumSize)
    __attribute__((deprecated("This API will be removed along with the legacy architecture.")));

@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

__attribute__((deprecated("This API will be removed along with the legacy architecture.")))
@interface RCTWrapperView : RCTPlatformView // [macOS]

@property (nonatomic, retain, nullable) RCTPlatformView *contentView; // [macOS]
@property (nonatomic, readonly) RCTWrapperMeasureBlock measureBlock;

- (instancetype)initWithBridge:(RCTBridge *)bridge NS_DESIGNATED_INITIALIZER;

#pragma mark - Restrictions

- (instancetype)init NS_UNAVAILABLE;
- (instancetype)initWithFrame:(CGRect)frame NS_UNAVAILABLE;
- (instancetype)initWithCoder:(NSCoder *)decoder NS_UNAVAILABLE;

- (void)addSubview:(RCTPlatformView *)view NS_UNAVAILABLE; // [macOS]
- (void)insertSubview:(RCTPlatformView *)view atIndex:(NSInteger)index NS_UNAVAILABLE; // [macOS]
- (void)insertSubview:(RCTPlatformView *)view aboveSubview:(RCTPlatformView *)siblingSubview NS_UNAVAILABLE; // [macOS]
- (void)insertSubview:(RCTPlatformView *)view belowSubview:(RCTPlatformView *)siblingSubview NS_UNAVAILABLE; // [macOS]

@end

NS_ASSUME_NONNULL_END

#endif // RCT_REMOVE_LEGACY_ARCH
