/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

NS_ASSUME_NONNULL_BEGIN

@interface RCTKeyWindowValuesProxy : NSObject

+ (instancetype)sharedInstance;

@property (assign, readonly) CGSize windowSize;
#if !TARGET_OS_OSX // [macOS]
@property (assign, readonly) UIInterfaceOrientation currentInterfaceOrientation;
#endif // [macOS]

- (void)startObservingWindowSizeIfNecessary;

@end

NS_ASSUME_NONNULL_END
