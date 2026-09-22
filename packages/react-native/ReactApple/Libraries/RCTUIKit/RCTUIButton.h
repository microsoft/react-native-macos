/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import "RCTUIKitCompat.h"

#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <AppKit/AppKit.h>
#endif

NS_ASSUME_NONNULL_BEGIN

#if !TARGET_OS_OSX

@compatibility_alias RCTUIButton UIButton;
#define RCTUIControlStateNormal UIControlStateNormal
#define RCTUIControlStateHighlighted UIControlStateHighlighted
typedef UIControlState RCTUIControlState;

#else // TARGET_OS_OSX [

typedef NS_OPTIONS(NSUInteger, RCTUIControlState) {
  RCTUIControlStateNormal = 0,
  RCTUIControlStateHighlighted = 1 << 0,
};

@interface RCTUIButtonTitleProxy : NSObject

@property (nonatomic, strong, nullable) UIFont *font;
@property (nonatomic, assign) NSLineBreakMode lineBreakMode;
@property (nonatomic, assign) NSTextAlignment textAlignment;

@end

@interface RCTUIButton : NSButton

@property (nonatomic, readonly) RCTUIButtonTitleProxy *titleLabel;
@property (nonatomic, copy, nullable) RCTUIColor *backgroundColor;

- (void)setTitle:(nullable NSString *)title forState:(RCTUIControlState)state;
- (void)setTitleColor:(nullable RCTUIColor *)color forState:(RCTUIControlState)state;

@end

#endif // ] TARGET_OS_OSX

typedef void (^RCTUIActionHandler)(void);

@interface RCTUIAction : NSObject

+ (instancetype)actionWithHandler:(RCTUIActionHandler)handler;
@property (nonatomic, readonly, copy) RCTUIActionHandler handler;

@end

@interface RCTUIButton (RCTUIAction)

- (void)rct_setPrimaryAction:(RCTUIAction *)action;

@end

NS_ASSUME_NONNULL_END
