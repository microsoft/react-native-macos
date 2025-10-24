/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "HostPlatformColor.h"

#import <Foundation/Foundation.h>
#import <React/RCTUIKit.h> // [macOS]
#import <objc/runtime.h>
#import <react/renderer/graphics/RCTPlatformColorUtils.h>
#import <react/utils/ManagedObjectWrapper.h>
#import <string>

using namespace facebook::react;

NS_ASSUME_NONNULL_BEGIN

namespace facebook::react {

namespace {

bool UIColorIsP3ColorSpace(const std::shared_ptr<void> &uiColor)
{
  RCTUIColor *color = unwrapManagedObject(uiColor); // [macOS]
  CGColorSpaceRef colorSpace = CGColorGetColorSpace(color.CGColor);

  if (CGColorSpaceGetModel(colorSpace) == kCGColorSpaceModelRGB) {
    CFStringRef name = CGColorSpaceGetName(colorSpace);
    if (name != NULL && CFEqual(name, kCGColorSpaceDisplayP3)) {
      return true;
    }
  }
  return false;
}

RCTUIColor *_Nullable UIColorFromInt32(int32_t intColor) // [macOS]
{
  CGFloat a = CGFloat((intColor >> 24) & 0xFF) / 255.0;
  CGFloat r = CGFloat((intColor >> 16) & 0xFF) / 255.0;
  CGFloat g = CGFloat((intColor >> 8) & 0xFF) / 255.0;
  CGFloat b = CGFloat(intColor & 0xFF) / 255.0;

  RCTUIColor *color = [RCTUIColor colorWithRed:r green:g blue:b alpha:a]; // [macOS]
  return color;
}

RCTUIColor *_Nullable UIColorFromDynamicColor(const facebook::react::DynamicColor &dynamicColor) // [macOS]
{
  int32_t light = dynamicColor.lightColor;
  int32_t dark = dynamicColor.darkColor;
  int32_t highContrastLight = dynamicColor.highContrastLightColor;
  int32_t highContrastDark = dynamicColor.highContrastDarkColor;

  RCTUIColor *lightColor = UIColorFromInt32(light); // [macOS]
  RCTUIColor *darkColor = UIColorFromInt32(dark); // [macOS]
  RCTUIColor *highContrastLightColor = UIColorFromInt32(highContrastLight); // [macOS]
  RCTUIColor *highContrastDarkColor = UIColorFromInt32(highContrastDark); // [macOS]

  if (lightColor != nil && darkColor != nil) {
#if !TARGET_OS_OSX // [macOS]
    UIColor *color = [UIColor colorWithDynamicProvider:^UIColor *_Nonnull(UITraitCollection *_Nonnull collection) {
      if (collection.userInterfaceStyle == UIUserInterfaceStyleDark) {
        if (collection.accessibilityContrast == UIAccessibilityContrastHigh && highContrastDark != 0) {
          return highContrastDarkColor;
        } else {
          return darkColor;
        }
      } else {
        if (collection.accessibilityContrast == UIAccessibilityContrastHigh && highContrastLight != 0) {
          return highContrastLightColor;
        } else {
          return lightColor;
        }
      }
    }];
    return color;
#else // [macOS
    NSColor *color = [NSColor colorWithName:nil dynamicProvider:^NSColor * _Nonnull(NSAppearance * _Nonnull appearance) {
      NSMutableArray<NSAppearanceName> *appearances = [NSMutableArray arrayWithArray:@[NSAppearanceNameAqua,NSAppearanceNameDarkAqua]];
      if (highContrastLightColor != nil) {
        [appearances addObject:NSAppearanceNameAccessibilityHighContrastAqua];
      }
      if (highContrastDarkColor != nil) {
        [appearances addObject:NSAppearanceNameAccessibilityHighContrastDarkAqua];
      }
      NSAppearanceName bestMatchingAppearance = [appearance bestMatchFromAppearancesWithNames:appearances];
      if (bestMatchingAppearance == NSAppearanceNameAqua) {
        return lightColor;
      } else if (bestMatchingAppearance == NSAppearanceNameDarkAqua) {
        return darkColor;
      } else if (bestMatchingAppearance == NSAppearanceNameAccessibilityHighContrastAqua) {
        return highContrastLightColor;
      } else if (bestMatchingAppearance == NSAppearanceNameAccessibilityHighContrastDarkAqua) {
        return highContrastDarkColor;
      } else {
        return lightColor;
      }
    }];
    return color;
#endif // macOS]
  } else {
    return nil;
  }

  return nil;
}

int32_t ColorFromColorComponents(const facebook::react::ColorComponents &components)
{
  float ratio = 255;
  auto color = ((int32_t)round((float)components.alpha * ratio) & 0xff) << 24 |
      ((int)round((float)components.red * ratio) & 0xff) << 16 |
      ((int)round((float)components.green * ratio) & 0xff) << 8 | ((int)round((float)components.blue * ratio) & 0xff);
  return color;
}

int32_t ColorFromUIColor(RCTUIColor *color) // [macOS]
{
  CGFloat rgba[4];
  [color getRed:&rgba[0] green:&rgba[1] blue:&rgba[2] alpha:&rgba[3]];
  return ColorFromColorComponents({(float)rgba[0], (float)rgba[1], (float)rgba[2], (float)rgba[3]});
}

#if !TARGET_OS_OSX // [macOS]
int32_t ColorFromUIColorForSpecificTraitCollection(
    const std::shared_ptr<void> &uiColor,
    UITraitCollection *traitCollection)
{
  RCTUIColor *color = (RCTUIColor *)unwrapManagedObject(uiColor); // [macOS]
  if (color) {
    color = [color resolvedColorWithTraitCollection:traitCollection];
    return ColorFromUIColor(color);
  }

  return 0;
}
#endif // [macOS]

int32_t ColorFromUIColor(const std::shared_ptr<void> &uiColor)
{
#if !TARGET_OS_OSX // [macOS]
  return ColorFromUIColorForSpecificTraitCollection(uiColor, [UITraitCollection currentTraitCollection]);
#else // [macOS
  RCTUIColor *color = (RCTUIColor *)unwrapManagedObject(uiColor);
  return ColorFromUIColor(color);
#endif // macOS]
}

RCTUIColor *_Nullable UIColorFromComponentsColor(const facebook::react::ColorComponents &components) // [macOS]
{
  RCTUIColor *uiColor = nil; // [macOS]
  if (components.colorSpace == ColorSpace::DisplayP3) {
    uiColor = [RCTUIColor colorWithDisplayP3Red:components.red // [macOS]
                                       green:components.green
                                        blue:components.blue
                                       alpha:components.alpha];
  } else {
    uiColor = [RCTUIColor colorWithRed:components.red green:components.green blue:components.blue alpha:components.alpha]; // [macOS]
  }

  return uiColor;
}

int32_t hashFromUIColor(const std::shared_ptr<void> &uiColor)
{
  if (uiColor == nullptr) {
    return 0;
  }

#if TARGET_OS_OSX // [macOS]
  return ColorFromUIColor(uiColor);
#else // [macOS
  static UITraitCollection *darkModeTraitCollection =
      [UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleDark];
  auto darkColor = ColorFromUIColorForSpecificTraitCollection(uiColor, darkModeTraitCollection);

  static UITraitCollection *lightModeTraitCollection =
      [UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleLight];
  auto lightColor = ColorFromUIColorForSpecificTraitCollection(uiColor, lightModeTraitCollection);

  static UITraitCollection *darkModeAccessibilityContrastTraitCollection =
      [UITraitCollection traitCollectionWithTraitsFromCollections:@[
        darkModeTraitCollection,
        [UITraitCollection traitCollectionWithAccessibilityContrast:UIAccessibilityContrastHigh]
      ]];
  auto darkAccessibilityContrastColor =
      ColorFromUIColorForSpecificTraitCollection(uiColor, darkModeAccessibilityContrastTraitCollection);

  static UITraitCollection *lightModeAccessibilityContrastTraitCollection =
      [UITraitCollection traitCollectionWithTraitsFromCollections:@[
        lightModeTraitCollection,
        [UITraitCollection traitCollectionWithAccessibilityContrast:UIAccessibilityContrastHigh]
      ]];
  auto lightAccessibilityContrastColor =
      ColorFromUIColorForSpecificTraitCollection(uiColor, lightModeAccessibilityContrastTraitCollection);
  return facebook::react::hash_combine(
      darkColor,
      lightColor,
      darkAccessibilityContrastColor,
      lightAccessibilityContrastColor,
      UIColorIsP3ColorSpace(uiColor));
#endif // macOS]
}

} // anonymous namespace

Color::Color(int32_t color)
{
  uiColor_ = wrapManagedObject(UIColorFromInt32(color));
  uiColorHashValue_ = facebook::react::hash_combine(color, 0);
}

Color::Color(const DynamicColor &dynamicColor)
{
  uiColor_ = wrapManagedObject(UIColorFromDynamicColor(dynamicColor));
  uiColorHashValue_ = facebook::react::hash_combine(
      dynamicColor.darkColor,
      dynamicColor.lightColor,
      dynamicColor.highContrastDarkColor,
      dynamicColor.highContrastLightColor,
      0);
}

Color::Color(const ColorComponents &components)
{
  uiColor_ = wrapManagedObject(UIColorFromComponentsColor(components));
  uiColorHashValue_ = facebook::react::hash_combine(
      ColorFromColorComponents(components), components.colorSpace == ColorSpace::DisplayP3);
}

Color::Color(std::shared_ptr<void> uiColor)
{
  RCTUIColor *color = ((RCTUIColor *)unwrapManagedObject(uiColor)); // [macOS]
  if (color) {
    auto colorHash = hashFromUIColor(uiColor);
    uiColorHashValue_ = colorHash;
  }
  uiColor_ = std::move(uiColor);
}

bool Color::operator==(const Color &other) const
{
  return (!uiColor_ && !other.uiColor_) ||
      (uiColor_ && other.uiColor_ && (uiColorHashValue_ == other.uiColorHashValue_));
}

bool Color::operator!=(const Color &other) const
{
  return !(*this == other);
}

int32_t Color::getColor() const
{
  return ColorFromUIColor(uiColor_);
}

float Color::getChannel(int channelId) const
{
  CGFloat rgba[4];
  RCTUIColor *color = (__bridge RCTUIColor *)getUIColor().get(); // [macOS]
  [color getRed:&rgba[0] green:&rgba[1] blue:&rgba[2] alpha:&rgba[3]];
  return static_cast<float>(rgba[channelId]);
}

int32_t Color::getUIColorHash() const
{
  return uiColorHashValue_;
}

Color Color::createSemanticColor(std::vector<std::string> &semanticItems)
{
  auto semanticColor = RCTPlatformColorFromSemanticItems(semanticItems);
  return Color(wrapManagedObject(semanticColor));
}

} // namespace facebook::react

NS_ASSUME_NONNULL_END
