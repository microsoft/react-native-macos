/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX 

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

#endif // TARGET_OS_OSX
