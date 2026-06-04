/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <AppKit/AppKit.h>
#endif

NS_ASSUME_NONNULL_BEGIN

// MARK: - UIGraphicsGetCurrentContext

#if TARGET_OS_OSX
#ifdef __cplusplus
extern "C" {
#endif

CGContextRef UIGraphicsGetCurrentContext(void);

#ifdef __cplusplus
}
#endif
#endif // TARGET_OS_OSX

// MARK: - UIBezierPath helpers

#if TARGET_OS_OSX
@compatibility_alias UIBezierPath NSBezierPath;
#endif

#if !TARGET_OS_OSX

UIKIT_STATIC_INLINE UIBezierPath *UIBezierPathWithRoundedRect(CGRect rect, CGFloat cornerRadius)
{
  return [UIBezierPath bezierPathWithRoundedRect:rect cornerRadius:cornerRadius];
}

UIKIT_STATIC_INLINE void UIBezierPathAppendPath(UIBezierPath *path, UIBezierPath *appendPath)
{
  [path appendPath:appendPath];
}

#else // TARGET_OS_OSX

UIBezierPath *UIBezierPathWithRoundedRect(CGRect rect, CGFloat cornerRadius);

void UIBezierPathAppendPath(UIBezierPath *path, UIBezierPath *appendPath);

#endif

NS_ASSUME_NONNULL_END
