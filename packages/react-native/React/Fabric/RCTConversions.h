/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // [macOS]

#import <react/renderer/components/view/AccessibilityPrimitives.h>
#import <react/renderer/components/view/primitives.h>
#import <react/renderer/core/LayoutPrimitives.h>
#import <react/renderer/graphics/Color.h>
#import <react/renderer/graphics/RCTPlatformColorUtils.h>
#import <react/renderer/graphics/Transform.h>

#if TARGET_OS_OSX // [macOS
#import <react/renderer/components/iostextinput/primitives.h>
#endif // macOS]

NS_ASSUME_NONNULL_BEGIN

inline NSString *RCTNSStringFromString(
    const std::string &string,
    const NSStringEncoding &encoding = NSUTF8StringEncoding)
{
  return [NSString stringWithCString:string.c_str() encoding:encoding] ?: @"";
}

inline NSString *_Nullable RCTNSStringFromStringNilIfEmpty(
    const std::string &string,
    const NSStringEncoding &encoding = NSUTF8StringEncoding)
{
  return string.empty() ? nil : RCTNSStringFromString(string, encoding);
}

inline std::string RCTStringFromNSString(NSString *string)
{
  return std::string{string.UTF8String ?: ""};
}

inline RCTUIColor *_Nullable RCTUIColorFromSharedColor(const facebook::react::SharedColor &sharedColor) // [macOS]
{
  return RCTPlatformColorFromColor(*sharedColor);
}

inline CF_RETURNS_RETAINED CGColorRef _Nullable RCTCreateCGColorRefFromSharedColor(
    const facebook::react::SharedColor &sharedColor)
{
  return CGColorRetain(RCTUIColorFromSharedColor(sharedColor).CGColor);
}

inline CGPoint RCTCGPointFromPoint(const facebook::react::Point &point)
{
  return {point.x, point.y};
}

inline CGSize RCTCGSizeFromSize(const facebook::react::Size &size)
{
  return {size.width, size.height};
}

inline CGRect RCTCGRectFromRect(const facebook::react::Rect &rect)
{
  return {RCTCGPointFromPoint(rect.origin), RCTCGSizeFromSize(rect.size)};
}

inline UIEdgeInsets RCTUIEdgeInsetsFromEdgeInsets(const facebook::react::EdgeInsets &edgeInsets)
{
  return {edgeInsets.top, edgeInsets.left, edgeInsets.bottom, edgeInsets.right};
}

#if !TARGET_OS_OSX // [macOS]
const UIAccessibilityTraits AccessibilityTraitSwitch = 0x20000000000001;
#endif // [macOS]

// [macOS
inline RCTUIAccessibilityTraits RCTUIAccessibilityTraitsFromAccessibilityTraits(
    facebook::react::AccessibilityTraits accessibilityTraits)
{
  using AccessibilityTraits = facebook::react::AccessibilityTraits;
  RCTUIAccessibilityTraits result = RCTUIAccessibilityTraitNone;
  if ((accessibilityTraits & AccessibilityTraits::Button) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitButton;
  }
  if ((accessibilityTraits & AccessibilityTraits::Link) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitLink;
  }
  if ((accessibilityTraits & AccessibilityTraits::Image) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitImage;
  }
  if ((accessibilityTraits & AccessibilityTraits::Selected) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitSelected;
  }
  if ((accessibilityTraits & AccessibilityTraits::PlaysSound) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitPlaysSound;
  }
  if ((accessibilityTraits & AccessibilityTraits::KeyboardKey) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitKeyboardKey;
  }
  if ((accessibilityTraits & AccessibilityTraits::StaticText) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitStaticText;
  }
  if ((accessibilityTraits & AccessibilityTraits::SummaryElement) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitSummaryElement;
  }
  if ((accessibilityTraits & AccessibilityTraits::NotEnabled) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitNotEnabled;
  }
  if ((accessibilityTraits & AccessibilityTraits::UpdatesFrequently) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitUpdatesFrequently;
  }
  if ((accessibilityTraits & AccessibilityTraits::SearchField) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitSearchField;
  }
  if ((accessibilityTraits & AccessibilityTraits::StartsMediaSession) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitStartsMediaSession;
  }
  if ((accessibilityTraits & AccessibilityTraits::Adjustable) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitAdjustable;
  }
  if ((accessibilityTraits & AccessibilityTraits::AllowsDirectInteraction) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitAllowsDirectInteraction;
  }
  if ((accessibilityTraits & AccessibilityTraits::CausesPageTurn) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitCausesPageTurn;
  }
  if ((accessibilityTraits & AccessibilityTraits::Header) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitHeader;
  }
  if ((accessibilityTraits & AccessibilityTraits::Switch) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitSwitch;
  }
  if ((accessibilityTraits & AccessibilityTraits::TabBar) != AccessibilityTraits::None) {
    result |= RCTUIAccessibilityTraitTabBar;
  }
  return result;
}
// macOS]

inline CATransform3D RCTCATransform3DFromTransformMatrix(const facebook::react::Transform &transformMatrix)
{
  return {
      (CGFloat)transformMatrix.matrix[0],
      (CGFloat)transformMatrix.matrix[1],
      (CGFloat)transformMatrix.matrix[2],
      (CGFloat)transformMatrix.matrix[3],
      (CGFloat)transformMatrix.matrix[4],
      (CGFloat)transformMatrix.matrix[5],
      (CGFloat)transformMatrix.matrix[6],
      (CGFloat)transformMatrix.matrix[7],
      (CGFloat)transformMatrix.matrix[8],
      (CGFloat)transformMatrix.matrix[9],
      (CGFloat)transformMatrix.matrix[10],
      (CGFloat)transformMatrix.matrix[11],
      (CGFloat)transformMatrix.matrix[12],
      (CGFloat)transformMatrix.matrix[13],
      (CGFloat)transformMatrix.matrix[14],
      (CGFloat)transformMatrix.matrix[15]};
}

inline facebook::react::Point RCTPointFromCGPoint(const CGPoint &point)
{
  return {.x = point.x, .y = point.y};
}

inline facebook::react::Float RCTFloatFromCGFloat(CGFloat value)
{
  if (value == CGFLOAT_MAX) {
    return std::numeric_limits<facebook::react::Float>::infinity();
  }
  return value;
}

inline facebook::react::Size RCTSizeFromCGSize(const CGSize &size)
{
  return {.width = RCTFloatFromCGFloat(size.width), .height = RCTFloatFromCGFloat(size.height)};
}

inline facebook::react::Rect RCTRectFromCGRect(const CGRect &rect)
{
  return {.origin = RCTPointFromCGPoint(rect.origin), .size = RCTSizeFromCGSize(rect.size)};
}

inline facebook::react::EdgeInsets RCTEdgeInsetsFromUIEdgeInsets(const UIEdgeInsets &edgeInsets)
{
  return {edgeInsets.left, edgeInsets.top, edgeInsets.right, edgeInsets.bottom};
}

inline facebook::react::LayoutDirection RCTLayoutDirection(BOOL isRTL)
{
  return isRTL ? facebook::react::LayoutDirection::RightToLeft : facebook::react::LayoutDirection::LeftToRight;
}

#if TARGET_OS_OSX // [macOS
inline NSArray<NSPasteboardType> *RCTPasteboardTypeArrayFromProps(const std::vector<facebook::react::PastedTypesType> &pastedTypes)
{
  NSMutableArray<NSPasteboardType> *types = [NSMutableArray new];
  
  for (const auto &type : pastedTypes) {
    switch (type) {
      case facebook::react::PastedTypesType::FileUrl:
        [types addObjectsFromArray:@[NSFilenamesPboardType]];
        break;
      case facebook::react::PastedTypesType::Image:
        [types addObjectsFromArray:@[NSPasteboardTypePNG, NSPasteboardTypeTIFF]];
        break;
      case facebook::react::PastedTypesType::String:
        [types addObjectsFromArray:@[NSPasteboardTypeString]];
        break;
      default:
        break;
    }
  }
    
  return [types copy];
}
#endif // macOS]

NS_ASSUME_NONNULL_END
