/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

UIKIT_STATIC_INLINE UIBezierPath *UIBezierPathWithRoundedRect(CGRect rect, CGFloat cornerRadius)
{
  return [UIBezierPath bezierPathWithRoundedRect:rect cornerRadius:cornerRadius];
}

UIKIT_STATIC_INLINE void UIBezierPathAppendPath(UIBezierPath *path, UIBezierPath *appendPath)
{
  [path appendPath:appendPath];
}

NS_ASSUME_NONNULL_END

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

#ifdef __cplusplus
extern "C" {
#endif

// UIGraphics.h
CGContextRef UIGraphicsGetCurrentContext(void);

#ifdef __cplusplus
}
#endif // __cpusplus

// UIBezierPath
@compatibility_alias UIBezierPath NSBezierPath;

UIBezierPath *UIBezierPathWithRoundedRect(CGRect rect, CGFloat cornerRadius);

void UIBezierPathAppendPath(UIBezierPath *path, UIBezierPath *appendPath);

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
