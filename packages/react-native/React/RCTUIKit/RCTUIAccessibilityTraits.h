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

// [macOS RCTUIAccessibilityTraits - typedef to UIAccessibilityTraits on iOS
static const UIAccessibilityTraits RCTUIAccessibilityTraitSwitch = 0x20000000000001;

typedef UIAccessibilityTraits RCTUIAccessibilityTraits;
#define RCTUIAccessibilityTraitNone UIAccessibilityTraitNone
#define RCTUIAccessibilityTraitButton UIAccessibilityTraitButton
#define RCTUIAccessibilityTraitLink UIAccessibilityTraitLink
#define RCTUIAccessibilityTraitImage UIAccessibilityTraitImage
#define RCTUIAccessibilityTraitSelected UIAccessibilityTraitSelected
#define RCTUIAccessibilityTraitPlaysSound UIAccessibilityTraitPlaysSound
#define RCTUIAccessibilityTraitKeyboardKey UIAccessibilityTraitKeyboardKey
#define RCTUIAccessibilityTraitStaticText UIAccessibilityTraitStaticText
#define RCTUIAccessibilityTraitSummaryElement UIAccessibilityTraitSummaryElement
#define RCTUIAccessibilityTraitNotEnabled UIAccessibilityTraitNotEnabled
#define RCTUIAccessibilityTraitUpdatesFrequently UIAccessibilityTraitUpdatesFrequently
#define RCTUIAccessibilityTraitSearchField UIAccessibilityTraitSearchField
#define RCTUIAccessibilityTraitStartsMediaSession UIAccessibilityTraitStartsMediaSession
#define RCTUIAccessibilityTraitAdjustable UIAccessibilityTraitAdjustable
#define RCTUIAccessibilityTraitAllowsDirectInteraction UIAccessibilityTraitAllowsDirectInteraction
#define RCTUIAccessibilityTraitCausesPageTurn UIAccessibilityTraitCausesPageTurn
#define RCTUIAccessibilityTraitHeader UIAccessibilityTraitHeader
#define RCTUIAccessibilityTraitTabBar UIAccessibilityTraitTabBar
// macOS]

NS_ASSUME_NONNULL_END

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

// UIAccessibility.h/NSAccessibility.h
@compatibility_alias UIAccessibilityCustomAction NSAccessibilityCustomAction;

// [macOS RCTUIAccessibilityTraits - define as bitmask type for macOS
// On macOS these don't directly map to behavior, but allow code to compile
// The actual accessibility role mapping is done in RCTViewAccessibilityElement
typedef uint64_t RCTUIAccessibilityTraits;

// Trait constants matching iOS UIAccessibilityConstants.h
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitNone = 0;
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitButton = (1ULL << 0);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitLink = (1ULL << 1);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitImage = (1ULL << 2);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitSelected = (1ULL << 3);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitPlaysSound = (1ULL << 4);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitKeyboardKey = (1ULL << 5);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitStaticText = (1ULL << 6);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitSummaryElement = (1ULL << 7);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitNotEnabled = (1ULL << 8);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitUpdatesFrequently = (1ULL << 9);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitSearchField = (1ULL << 10);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitStartsMediaSession = (1ULL << 11);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitAdjustable = (1ULL << 12);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitAllowsDirectInteraction = (1ULL << 13);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitCausesPageTurn = (1ULL << 14);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitHeader = (1ULL << 15);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitTabBar = (1ULL << 16);
static const RCTUIAccessibilityTraits RCTUIAccessibilityTraitSwitch = (1ULL << 17);

// Convert RCTUIAccessibilityTraits to NSAccessibilityRole for macOS
NS_INLINE NSAccessibilityRole RCTAccessibilityRoleFromTraits(RCTUIAccessibilityTraits traits)
{
  if (traits & RCTUIAccessibilityTraitSwitch) {
    return NSAccessibilityCheckBoxRole;
  }
  if (traits & RCTUIAccessibilityTraitButton) {
    return NSAccessibilityButtonRole;
  }
  if (traits & RCTUIAccessibilityTraitLink) {
    return NSAccessibilityLinkRole;
  }
  if (traits & RCTUIAccessibilityTraitImage) {
    return NSAccessibilityImageRole;
  }
  if (traits & RCTUIAccessibilityTraitKeyboardKey) {
    return NSAccessibilityButtonRole;
  }
  if (traits & RCTUIAccessibilityTraitHeader) {
    return NSAccessibilityStaticTextRole;
  }
  if (traits & RCTUIAccessibilityTraitStaticText) {
    return NSAccessibilityStaticTextRole;
  }
  if (traits & RCTUIAccessibilityTraitSummaryElement) {
    return NSAccessibilityStaticTextRole;
  }
  if (traits & RCTUIAccessibilityTraitSearchField) {
    return NSAccessibilityTextFieldRole;
  }
  if (traits & RCTUIAccessibilityTraitAdjustable) {
    return NSAccessibilitySliderRole;
  }
  if (traits & RCTUIAccessibilityTraitUpdatesFrequently) {
    return NSAccessibilityProgressIndicatorRole;
  }
  if (traits & RCTUIAccessibilityTraitTabBar) {
    return NSAccessibilityTabGroupRole;
  }
  return NSAccessibilityUnknownRole;
}
// macOS]

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
