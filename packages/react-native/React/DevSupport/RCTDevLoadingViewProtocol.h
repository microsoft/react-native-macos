/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

@class RCTLoadingProgress;

@protocol RCTDevLoadingViewProtocol <NSObject>
+ (void)setEnabled:(BOOL)enabled;
- (void)showMessage:(NSString *)message
              color:(RCTPlatformColor *)color // [macOS]
    backgroundColor:(RCTPlatformColor *)backgroundColor // [macOS]
      dismissButton:(BOOL)dismissButton;
- (void)showWithURL:(NSURL *)URL;
- (void)updateProgress:(RCTLoadingProgress *)progress;
- (void)hide;
@end
