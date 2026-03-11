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

// MARK: - Color

#if !TARGET_OS_OSX
@compatibility_alias RCTPlatformColor UIColor;
@compatibility_alias RCTUIColor UIColor;
#else
@compatibility_alias RCTPlatformColor NSColor;
@compatibility_alias RCTUIColor NSColor;
#endif

// MARK: - Event types

#if TARGET_OS_OSX
#define UIEvent NSEvent
#define UITouchType NSTouchType
#define UIEventButtonMask NSEventButtonMask
#define UIKeyModifierFlags NSEventModifierFlags
#endif

// MARK: - Application notifications

#if TARGET_OS_OSX
#define UIApplicationDidBecomeActiveNotification      NSApplicationDidBecomeActiveNotification
#define UIApplicationDidEnterBackgroundNotification   NSApplicationDidHideNotification
#define UIApplicationDidFinishLaunchingNotification   NSApplicationDidFinishLaunchingNotification
#define UIApplicationWillResignActiveNotification     NSApplicationWillResignActiveNotification
#define UIApplicationWillEnterForegroundNotification  NSApplicationWillUnhideNotification
#endif

// MARK: - Font constants

#if TARGET_OS_OSX

#define UIFontDescriptorFamilyAttribute          NSFontFamilyAttribute;
#define UIFontDescriptorNameAttribute            NSFontNameAttribute;
#define UIFontDescriptorFaceAttribute            NSFontFaceAttribute;
#define UIFontDescriptorSizeAttribute            NSFontSizeAttribute

#define UIFontDescriptorTraitsAttribute          NSFontTraitsAttribute
#define UIFontDescriptorFeatureSettingsAttribute NSFontFeatureSettingsAttribute

#define UIFontSymbolicTrait                      NSFontSymbolicTrait
#define UIFontWeightTrait                        NSFontWeightTrait
#define UIFontFeatureTypeIdentifierKey           NSFontFeatureTypeIdentifierKey
#define UIFontFeatureSelectorIdentifierKey       NSFontFeatureSelectorIdentifierKey

#define UIFontWeightUltraLight                   NSFontWeightUltraLight
#define UIFontWeightThin                         NSFontWeightThin
#define UIFontWeightLight                        NSFontWeightLight
#define UIFontWeightRegular                      NSFontWeightRegular
#define UIFontWeightMedium                       NSFontWeightMedium
#define UIFontWeightSemibold                     NSFontWeightSemibold
#define UIFontWeightBold                         NSFontWeightBold
#define UIFontWeightHeavy                        NSFontWeightHeavy
#define UIFontWeightBlack                        NSFontWeightBlack

#define UIFontDescriptorSystemDesign             NSFontDescriptorSystemDesign
#define UIFontDescriptorSystemDesignDefault      NSFontDescriptorSystemDesignDefault
#define UIFontDescriptorSystemDesignSerif        NSFontDescriptorSystemDesignSerif
#define UIFontDescriptorSystemDesignRounded      NSFontDescriptorSystemDesignRounded
#define UIFontDescriptorSystemDesignMonospaced   NSFontDescriptorSystemDesignMonospaced

#endif // TARGET_OS_OSX

// MARK: - Font type compatibility

#if !TARGET_OS_OSX

UIKIT_STATIC_INLINE UIFont *UIFontWithSize(UIFont *font, CGFloat pointSize)
{
  return [font fontWithSize:pointSize];
}

UIKIT_STATIC_INLINE CGFloat UIFontLineHeight(UIFont *font)
{
  return font.lineHeight;
}

#else // TARGET_OS_OSX

// Both NSFont and UIFont are toll-free bridged to CTFontRef
@compatibility_alias UIFont NSFont;
@compatibility_alias UIFontDescriptor NSFontDescriptor;
typedef NSFontSymbolicTraits UIFontDescriptorSymbolicTraits;
typedef NSFontWeight UIFontWeight;

NS_INLINE NSFont *UIFontWithSize(NSFont *font, CGFloat pointSize)
{
  return [NSFont fontWithDescriptor:font.fontDescriptor size:pointSize];
}

NS_INLINE CGFloat UIFontLineHeight(NSFont *font)
{
  return ceilf(font.ascender + ABS(font.descender) + font.leading);
}

#endif // TARGET_OS_OSX

// MARK: - View controller

#if TARGET_OS_OSX
@compatibility_alias UIViewController NSViewController;
#endif

// MARK: - Geometry

#if TARGET_OS_OSX

#define UIEdgeInsetsZero NSEdgeInsetsZero
typedef NSEdgeInsets UIEdgeInsets;

NS_INLINE NSEdgeInsets UIEdgeInsetsMake(CGFloat top, CGFloat left, CGFloat bottom, CGFloat right)
{
  return NSEdgeInsetsMake(top, left, bottom, right);
}

#endif // TARGET_OS_OSX

// MARK: - Misc constants

#if TARGET_OS_OSX
#define UIActivityIndicatorView NSProgressIndicator
#define UIViewNoIntrinsicMetric -1
#define UIUserInterfaceLayoutDirection NSUserInterfaceLayoutDirection
#endif

// MARK: - Enums

#if TARGET_OS_OSX

// UIGestureRecognizer states
enum
{
  UIGestureRecognizerStatePossible    = NSGestureRecognizerStatePossible,
  UIGestureRecognizerStateBegan       = NSGestureRecognizerStateBegan,
  UIGestureRecognizerStateChanged     = NSGestureRecognizerStateChanged,
  UIGestureRecognizerStateEnded       = NSGestureRecognizerStateEnded,
  UIGestureRecognizerStateCancelled   = NSGestureRecognizerStateCancelled,
  UIGestureRecognizerStateFailed      = NSGestureRecognizerStateFailed,
  UIGestureRecognizerStateRecognized  = NSGestureRecognizerStateRecognized,
};

// UIFontDescriptor symbolic traits
enum
{
  UIFontDescriptorTraitItalic    = NSFontItalicTrait,
  UIFontDescriptorTraitBold      = NSFontBoldTrait,
  UIFontDescriptorTraitCondensed = NSFontCondensedTrait,
};

// UIView autoresizing
enum : NSUInteger
{
  UIViewAutoresizingNone                 = NSViewNotSizable,
  UIViewAutoresizingFlexibleLeftMargin   = NSViewMinXMargin,
  UIViewAutoresizingFlexibleWidth        = NSViewWidthSizable,
  UIViewAutoresizingFlexibleRightMargin  = NSViewMaxXMargin,
  UIViewAutoresizingFlexibleTopMargin    = NSViewMinYMargin,
  UIViewAutoresizingFlexibleHeight       = NSViewHeightSizable,
  UIViewAutoresizingFlexibleBottomMargin = NSViewMaxYMargin,
};

// UIViewContentMode
typedef NS_ENUM(NSInteger, UIViewContentMode) {
  UIViewContentModeScaleAspectFill = NSViewLayerContentsPlacementScaleProportionallyToFill,
  UIViewContentModeScaleAspectFit  = NSViewLayerContentsPlacementScaleProportionallyToFit,
  UIViewContentModeScaleToFill     = NSViewLayerContentsPlacementScaleAxesIndependently,
  UIViewContentModeCenter          = NSViewLayerContentsPlacementCenter,
  UIViewContentModeTopLeft         = NSViewLayerContentsPlacementTopLeft,
};

// UIUserInterfaceLayoutDirection
enum : NSInteger
{
	UIUserInterfaceLayoutDirectionLeftToRight = NSUserInterfaceLayoutDirectionLeftToRight,
	UIUserInterfaceLayoutDirectionRightToLeft = NSUserInterfaceLayoutDirectionRightToLeft,
};

// UIActivityIndicatorViewStyle
typedef NS_ENUM(NSInteger, UIActivityIndicatorViewStyle) {
  UIActivityIndicatorViewStyleLarge,
  UIActivityIndicatorViewStyleMedium,
};

#endif // TARGET_OS_OSX

// MARK: - Gesture recognizer

#if !TARGET_OS_OSX
@compatibility_alias RCTPlatformPanGestureRecognizer UIPanGestureRecognizer;
@compatibility_alias RCTUIPanGestureRecognizer UIPanGestureRecognizer;
#else
#define UIGestureRecognizer NSGestureRecognizer
#define UIGestureRecognizerDelegate NSGestureRecognizerDelegate
@compatibility_alias RCTPlatformPanGestureRecognizer NSPanGestureRecognizer;
@compatibility_alias RCTUIPanGestureRecognizer NSPanGestureRecognizer;
@compatibility_alias UIApplication NSApplication;
#endif

// MARK: - Cross-platform typedefs

#if !TARGET_OS_OSX
@compatibility_alias RCTPlatformApplication UIApplication;
@compatibility_alias RCTPlatformWindow UIWindow;
@compatibility_alias RCTPlatformViewController UIViewController;
@compatibility_alias RCTUIApplication UIApplication;
#else
@compatibility_alias RCTPlatformApplication NSApplication;
@compatibility_alias RCTPlatformWindow NSWindow;
@compatibility_alias RCTPlatformViewController NSViewController;
@compatibility_alias RCTUIApplication NSApplication;
#endif

NS_ASSUME_NONNULL_END
