/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // TODO(macOS GH#774)

#import <React/RCTComponent.h>

@interface RCTSwitch : RCTUISwitch

#if !TARGET_OS_OSX // TODO(macOS GH#774)
@property (nonatomic, assign) BOOL wasOn;
#endif // TODO(macOS GH#774)
@property (nonatomic, copy) RCTBubblingEventBlock onChange;

@end
