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
@compatibility_alias RCTUILabel UILabel;
#else
@interface RCTUILabel : NSTextField
NS_ASSUME_NONNULL_BEGIN
@property(nonatomic, copy) NSString* _Nullable text;
@property(nonatomic, assign) NSInteger numberOfLines;
@property(nonatomic, assign) NSTextAlignment textAlignment;
NS_ASSUME_NONNULL_END
@end
#endif
