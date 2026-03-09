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

// UIView
#define RCTPlatformView UIView
#define RCTUIView UIView
#define RCTUIScrollView UIScrollView
#define RCTUIScrollViewDelegate UIScrollViewDelegate
#define RCTPlatformImage UIImage
#define RCTUIImage UIImage
#define RCTUIPanGestureRecognizer UIPanGestureRecognizer

// UIColor.h
#define RCTUIColor UIColor

NS_ASSUME_NONNULL_END

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

#define RCTPlatformImage NSImage

//
// semantically equivalent constants
//

// UIApplication.h/NSApplication.h
#define UIApplicationDidBecomeActiveNotification      NSApplicationDidBecomeActiveNotification
#define UIApplicationDidEnterBackgroundNotification   NSApplicationDidHideNotification
#define UIApplicationDidFinishLaunchingNotification   NSApplicationDidFinishLaunchingNotification
#define UIApplicationWillResignActiveNotification     NSApplicationWillResignActiveNotification
#define UIApplicationWillEnterForegroundNotification  NSApplicationWillUnhideNotification  

// UIFontDescriptor.h/NSFontDescriptor.h
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


// RCTActivityIndicatorView.h
#define UIActivityIndicatorView NSProgressIndicator


// UIGeometry.h/NSGeometry.h
#define UIEdgeInsetsZero NSEdgeInsetsZero

// UIView.h/NSLayoutConstraint.h
#define UIViewNoIntrinsicMetric -1
// NSViewNoIntrinsicMetric is defined to -1 but is only available on macOS 10.11 and higher.  On previous versions it was NSViewNoInstrinsicMetric (misspelled) and also defined to -1.

// UIInterface.h/NSUserInterfaceLayout.h
#define UIUserInterfaceLayoutDirection NSUserInterfaceLayoutDirection

//
// semantically equivalent enums
//

// UIGestureRecognizer.h/NSGestureRecognizer.h
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

// UIFontDescriptor.h/NSFontDescriptor.h
enum
{
  UIFontDescriptorTraitItalic    = NSFontItalicTrait,
  UIFontDescriptorTraitBold      = NSFontBoldTrait,
  UIFontDescriptorTraitCondensed = NSFontCondensedTrait,
};

// UIView.h/NSView.h
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

// UIView/NSView.h
typedef NS_ENUM(NSInteger, UIViewContentMode) {
  UIViewContentModeScaleAspectFill = NSViewLayerContentsPlacementScaleProportionallyToFill,
  UIViewContentModeScaleAspectFit  = NSViewLayerContentsPlacementScaleProportionallyToFit,
  UIViewContentModeScaleToFill     = NSViewLayerContentsPlacementScaleAxesIndependently,
  UIViewContentModeCenter          = NSViewLayerContentsPlacementCenter,
  UIViewContentModeTopLeft         = NSViewLayerContentsPlacementTopLeft,
};

// UIInterface.h/NSUserInterfaceLayout.h
enum : NSInteger
{
	UIUserInterfaceLayoutDirectionLeftToRight = NSUserInterfaceLayoutDirectionLeftToRight,
	UIUserInterfaceLayoutDirectionRightToLeft = NSUserInterfaceLayoutDirectionRightToLeft,
};

// RCTActivityIndicatorView.h
typedef NS_ENUM(NSInteger, UIActivityIndicatorViewStyle) {
  UIActivityIndicatorViewStyleLarge,
  UIActivityIndicatorViewStyleMedium,
};

// UIColor.h/NSColor.h
#define RCTUIColor NSColor

// UIFont.h/NSFont.h
// Both NSFont and UIFont are toll-free bridged to CTFontRef so we'll assume they're semantically equivalent
@compatibility_alias UIFont NSFont;

// UIViewController.h/NSViewController.h
@compatibility_alias UIViewController NSViewController;

NS_INLINE NSFont *UIFontWithSize(NSFont *font, CGFloat pointSize)
{
  return [NSFont fontWithDescriptor:font.fontDescriptor size:pointSize];
}

NS_INLINE CGFloat UIFontLineHeight(NSFont *font)
{
  return ceilf(font.ascender + ABS(font.descender) + font.leading);
}

// UIFontDescriptor.h/NSFontDescriptor.h
// Both NSFontDescriptor and UIFontDescriptor are toll-free bridged to CTFontDescriptorRef so we'll assume they're semantically equivalent
@compatibility_alias UIFontDescriptor NSFontDescriptor;
typedef NSFontSymbolicTraits UIFontDescriptorSymbolicTraits;
typedef NSFontWeight UIFontWeight;

// UIGeometry.h/NSGeometry.h
typedef NSEdgeInsets UIEdgeInsets;

NS_INLINE NSEdgeInsets UIEdgeInsetsMake(CGFloat top, CGFloat left, CGFloat bottom, CGFloat right)
{
  return NSEdgeInsetsMake(top, left, bottom, right);
}

//
// functionally equivalent types
//

// These types have the same purpose but may differ semantically. Use with care!

#define UIEvent NSEvent
#define UITouchType NSTouchType
#define UIEventButtonMask NSEventButtonMask
#define UIKeyModifierFlags NSEventModifierFlags

// UIGestureRecognizer
#define UIGestureRecognizer NSGestureRecognizer
#define UIGestureRecognizerDelegate NSGestureRecognizerDelegate
#define RCTUIPanGestureRecognizer NSPanGestureRecognizer

// UIApplication
#define UIApplication NSApplication

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX

//
// Cross-platform typedefs
//

#if !TARGET_OS_OSX
typedef UIApplication RCTUIApplication;
typedef UIWindow RCTPlatformWindow;
typedef UIViewController RCTPlatformViewController;
#else
typedef NSApplication RCTUIApplication;
typedef NSWindow RCTPlatformWindow;
typedef NSViewController RCTPlatformViewController;
#endif
