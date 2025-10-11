/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/*
 * UIView class for <Paragraph> component.
 */
#if !TARGET_OS_OSX // [macOS]
@interface RCTParagraphComponentView : RCTViewComponentView
#else // [macOS
@interface RCTParagraphComponentView : RCTViewComponentView <ExtensibleNativeMenuProtocol>
#endif // macOS]

/*
 * Returns an `NSAttributedString` representing the content of the component.
 * To be only used by external introspection and debug tools.
 */
@property (nonatomic, nullable, readonly) NSAttributedString *attributedText;

@end

NS_ASSUME_NONNULL_END
