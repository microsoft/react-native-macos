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
#else
#import <AppKit/AppKit.h>
#endif

NS_ASSUME_NONNULL_BEGIN

// MARK: - NSValue geometry helpers

#if !TARGET_OS_OSX

UIKIT_STATIC_INLINE NSValue *NSValueWithCGRect(CGRect rect)
{
  return [NSValue valueWithCGRect:rect];
}

UIKIT_STATIC_INLINE NSValue *NSValueWithCGSize(CGSize size)
{
  return [NSValue valueWithCGSize:size];
}

UIKIT_STATIC_INLINE CGRect CGRectValue(NSValue *value)
{
  return [value CGRectValue];
}

#else // TARGET_OS_OSX

NS_INLINE NSValue *NSValueWithCGRect(CGRect rect)
{
  return [NSValue valueWithBytes:&rect objCType:@encode(CGRect)];
}

NS_INLINE NSValue *NSValueWithCGSize(CGSize size)
{
  return [NSValue valueWithBytes:&size objCType:@encode(CGSize)];
}

NS_INLINE CGRect CGRectValue(NSValue *value)
{
  CGRect rect = CGRectZero;
  [value getValue:&rect];
  return rect;
}

#endif

// MARK: - macOS-only UIKit geometry shims

#if TARGET_OS_OSX

NS_INLINE CGRect UIEdgeInsetsInsetRect(CGRect rect, NSEdgeInsets insets)
{
	rect.origin.x    += insets.left;
	rect.origin.y    += insets.top;
	rect.size.width  -= (insets.left + insets.right);
	rect.size.height -= (insets.top  + insets.bottom);
	return rect;
}

NS_INLINE BOOL UIEdgeInsetsEqualToEdgeInsets(NSEdgeInsets insets1, NSEdgeInsets insets2)
{
	return NSEdgeInsetsEqual(insets1, insets2);
}

NS_INLINE NSString *NSStringFromCGSize(CGSize size)
{
	return NSStringFromSize(NSSizeFromCGSize(size));
}

NS_INLINE NSString *NSStringFromCGRect(CGRect rect)
{
	return NSStringFromRect(NSRectFromCGRect(rect));
}

#endif // TARGET_OS_OSX

NS_ASSUME_NONNULL_END
