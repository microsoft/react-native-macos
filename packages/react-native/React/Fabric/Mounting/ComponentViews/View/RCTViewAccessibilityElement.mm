/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewAccessibilityElement.h"

@implementation RCTViewAccessibilityElement
{
#if TARGET_OS_OSX // [macOS
  RCTUIAccessibilityTraits _accessibilityTraits;
#endif // macOS]
}

- (instancetype)initWithView:(RCTViewComponentView *)view
{
#if !TARGET_OS_OSX // [macOS]
  if (self = [super initWithAccessibilityContainer:view]) {
#else // [macOS
  if (self = [super init]) {
    [self setAccessibilityParent:view];
    _accessibilityTraits = RCTUIAccessibilityTraitNone;
#endif // macOS]
    _view = view;
  }
  return self;
}

- (CGRect)accessibilityFrame
{
#if !TARGET_OS_OSX // [macOS]
  return UIAccessibilityConvertFrameToScreenCoordinates(_view.bounds, _view);
#else // [macOS
  NSRect boundsInWindow = [_view convertRect:_view.bounds toView:nil];
  return [_view.window convertRectToScreen:boundsInWindow];
#endif // macOS]
}

#if TARGET_OS_OSX // [macOS
- (id)accessibilityParent
{
  return _view;
}
#endif // macOS]

#pragma mark - Forwarding to _view

- (NSString *)accessibilityLabel
{
  return _view.accessibilityLabel;
}

- (NSString *)accessibilityValue
{
  return _view.accessibilityValue;
}

#if !TARGET_OS_OSX // [macOS]
- (UIAccessibilityTraits)accessibilityTraits
{
  return _view.accessibilityTraits;
}

- (NSString *)accessibilityHint
{
  return _view.accessibilityHint;
}

- (BOOL)accessibilityIgnoresInvertColors
{
  return _view.accessibilityIgnoresInvertColors;
}

- (BOOL)shouldGroupAccessibilityChildren
{
  return _view.shouldGroupAccessibilityChildren;
}

- (NSArray<UIAccessibilityCustomAction *> *)accessibilityCustomActions
{
  return _view.accessibilityCustomActions;
}

- (NSString *)accessibilityLanguage
{
  return _view.accessibilityLanguage;
}

- (BOOL)accessibilityViewIsModal
{
  return _view.accessibilityViewIsModal;
}

- (BOOL)accessibilityElementsHidden
{
  return _view.accessibilityElementsHidden;
}

- (BOOL)accessibilityRespondsToUserInteraction
{
  return _view.accessibilityRespondsToUserInteraction;
}
#else // [macOS
- (RCTUIAccessibilityTraits)accessibilityTraits
{
  return _accessibilityTraits;
}

- (void)setAccessibilityTraits:(RCTUIAccessibilityTraits)accessibilityTraits
{
  if (_accessibilityTraits == accessibilityTraits) {
    return;
  }
  _accessibilityTraits = accessibilityTraits;

  // Map traits to AppKit accessibility role
  // Order matters - more specific traits should be checked first
  NSAccessibilityRole role = NSAccessibilityUnknownRole;

  if (accessibilityTraits & RCTUIAccessibilityTraitSwitch) {
    role = NSAccessibilityCheckBoxRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitButton) {
    role = NSAccessibilityButtonRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitLink) {
    role = NSAccessibilityLinkRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitImage) {
    role = NSAccessibilityImageRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitKeyboardKey) {
    role = NSAccessibilityButtonRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitHeader) {
    role = NSAccessibilityStaticTextRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitStaticText) {
    role = NSAccessibilityStaticTextRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitSummaryElement) {
    role = NSAccessibilityStaticTextRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitSearchField) {
    role = NSAccessibilityTextFieldRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitAdjustable) {
    role = NSAccessibilitySliderRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitUpdatesFrequently) {
    role = NSAccessibilityProgressIndicatorRole;
  } else if (accessibilityTraits & RCTUIAccessibilityTraitTabBar) {
    role = NSAccessibilityTabGroupRole;
  }

  [self setAccessibilityRole:role];

  // State traits
  // Selected trait -> accessibilitySelected
  [self setAccessibilitySelected:(accessibilityTraits & RCTUIAccessibilityTraitSelected) != 0];

  // NotEnabled trait -> accessibilityEnabled (inverted)
  [self setAccessibilityEnabled:(accessibilityTraits & RCTUIAccessibilityTraitNotEnabled) == 0];

  // Behavior traits that don't need AppKit mapping:
  // - RCTUIAccessibilityTraitPlaysSound
  // - RCTUIAccessibilityTraitStartsMediaSession
  // - RCTUIAccessibilityTraitAllowsDirectInteraction
  // - RCTUIAccessibilityTraitCausesPageTurn
}

- (NSString *)accessibilityHelp
{
  return _view.accessibilityHelp;
}

- (BOOL)isAccessibilityElement
{
  return _view.isAccessibilityElement;
}

- (void)setIsAccessibilityElement:(BOOL)isAccessibilityElement
{
  self.accessibilityElement = isAccessibilityElement;
}

- (NSArray *)accessibilityChildren
{
  return _view.accessibilityChildren;
}
#endif // macOS]

@end
