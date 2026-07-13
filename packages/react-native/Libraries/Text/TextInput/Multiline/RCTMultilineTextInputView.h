/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTBaseTextInputView.h"

#ifndef RCT_REMOVE_LEGACY_ARCH

NS_ASSUME_NONNULL_BEGIN

__attribute__((deprecated("This API will be removed along with the legacy architecture.")))
@interface RCTMultilineTextInputView : RCTBaseTextInputView

#if TARGET_OS_OSX // [macOS

@property (nonatomic, assign) BOOL scrollEnabled;

- (void)setReadablePasteBoardTypes:(NSArray<NSPasteboardType> *)readablePasteboardTypes;
@property (nonatomic, assign) BOOL hideVerticalScrollIndicator;
#endif // macOS]

@end

NS_ASSUME_NONNULL_END

#endif // RCT_REMOVE_LEGACY_ARCH
