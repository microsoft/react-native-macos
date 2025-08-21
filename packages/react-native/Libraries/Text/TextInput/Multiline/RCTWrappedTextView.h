/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX // [macOS

#import <React/RCTUIKit.h>

#import "RCTTextUIKit.h"

#import <React/RCTBackedTextInputDelegate.h>
#import <React/RCTBackedTextInputViewProtocol.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTWrappedTextView : RCTPlatformView <RCTBackedTextInputViewProtocol>

@property (nonatomic, weak) id<RCTBackedTextInputDelegate> textInputDelegate;
@property (assign) BOOL hideVerticalScrollIndicator;

@end

NS_ASSUME_NONNULL_END

#endif // macOS]
