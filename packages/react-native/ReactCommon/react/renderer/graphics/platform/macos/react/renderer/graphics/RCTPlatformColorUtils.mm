/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import "RCTPlatformColorUtils.h"

#import <Foundation/Foundation.h>
#import <React/RCTUIKit.h>
#import <react/renderer/graphics/HostPlatformColor.h>
#import <react/utils/ManagedObjectWrapper.h>

#include <string>

NS_ASSUME_NONNULL_BEGIN

static NSString *const kColorSuffix = @"Color";
static NSString *const kFallbackARGBKey = @"fallback-argb";
static NSString *const kFallbackKey = @"fallback";
static NSString *const kSelectorKey = @"selector";
static NSString *const kIndexKey = @"index";

static NSDictionary<NSString *, NSDictionary *> *_PlatformColorSelectorsDict()
{
  static NSDictionary<NSString *, NSDictionary *> *dict;
  static dispatch_once_t once_token;
  dispatch_once(&once_token, ^(void) {
    NSMutableDictionary<NSString *, NSDictionary *> *map = [@{
      // https://developer.apple.com/documentation/appkit/nscolor/ui_element_colors
      // Label Colors
      @"labelColor": @{}, // 10_10
      @"secondaryLabelColor": @{}, // 10_10
      @"tertiaryLabelColor": @{}, // 10_10
      @"quaternaryLabelColor": @{}, // 10_10
      // Text Colors
      @"textColor": @{},
      @"placeholderTextColor": @{}, // 10_10
      @"selectedTextColor": @{},
      @"textBackgroundColor": @{},
      @"selectedTextBackgroundColor": @{},
      @"keyboardFocusIndicatorColor": @{},
      @"unemphasizedSelectedTextColor": @{ // 10_14
        kFallbackKey: @"selectedTextColor"
      },
      @"unemphasizedSelectedTextBackgroundColor": @{ // 10_14
        kFallbackKey: @"textBackgroundColor"
      },
      // Content Colors
      @"linkColor": @{}, // 10_10
      @"separatorColor": @{ // 10_14
        kFallbackKey: @"gridColor"
      },
      @"selectedContentBackgroundColor": @{ // 10_14
        kFallbackKey: @"alternateSelectedControlColor"
      },
      @"unemphasizedSelectedContentBackgroundColor": @{ // 10_14
        kFallbackKey: @"secondarySelectedControlColor"
      },
      // Menu Colors
      @"selectedMenuItemTextColor": @{},
      // Table Colors
      @"gridColor": @{},
      @"headerTextColor": @{},
      @"alternatingEvenContentBackgroundColor": @{ // 10_14
        kSelectorKey: @"alternatingContentBackgroundColors",
        kIndexKey: @0,
        kFallbackKey: @"controlAlternatingRowBackgroundColors"
      },
      @"alternatingOddContentBackgroundColor": @{ // 10_14
        kSelectorKey: @"alternatingContentBackgroundColors",
        kIndexKey: @1,
        kFallbackKey: @"controlAlternatingRowBackgroundColors"
      },
      // Control Colors
      @"controlAccentColor": @{ // 10_14
        kFallbackKey: @"controlColor"
      },
      @"controlColor": @{},
      @"controlBackgroundColor": @{},
      @"controlTextColor": @{},
      @"disabledControlTextColor": @{},
      @"selectedControlColor": @{},
      @"selectedControlTextColor": @{},
      @"alternateSelectedControlTextColor": @{},
      @"scrubberTexturedBackgroundColor": @{}, // 10_12_2
      // Window Colors
      @"windowBackgroundColor": @{},
      @"windowFrameTextColor": @{},
      @"underPageBackgroundColor": @{}, // 10_8
      // Highlights and Shadows
      @"findHighlightColor": @{ // 10_13
        kFallbackKey: @"highlightColor"
      },
      @"highlightColor": @{},
      @"shadowColor": @{},
      // https://developer.apple.com/documentation/appkit/nscolor/standard_colors
      // Standard Colors
      @"systemBlueColor": @{},   // 10_10
      @"systemBrownColor": @{},  // 10_10
      @"systemGrayColor": @{},   // 10_10
      @"systemGreenColor": @{},  // 10_10
      @"systemOrangeColor": @{}, // 10_10
      @"systemPinkColor": @{},   // 10_10
      @"systemPurpleColor": @{}, // 10_10
      @"systemRedColor": @{},    // 10_10
      @"systemYellowColor": @{}, // 10_10
      // Transparent Color
      @"clearColor" : @{},
    } mutableCopy];
    
    // Create aliases for Swift-style names (without "Color" suffix)
    NSMutableDictionary<NSString *, NSDictionary *> *aliases = [NSMutableDictionary new];
    for (NSString *objcSelector in map) {
      NSMutableDictionary *entry = [map[objcSelector] mutableCopy];
      if ([entry objectForKey:kSelectorKey] == nil) {
        entry[kSelectorKey] = objcSelector;
      }
      if ([objcSelector hasSuffix:kColorSuffix]) {
        NSString *swiftSelector = [objcSelector substringToIndex:[objcSelector length] - [kColorSuffix length]];
        aliases[swiftSelector] = entry;
      }
    }
    [map addEntriesFromDictionary:aliases];
    
    dict = [map copy];
  });
  return dict;
}

static RCTUIColor *_UIColorFromHexValue(NSNumber *hexValue)
{
  NSUInteger hexIntValue = [hexValue unsignedIntegerValue];

  CGFloat red = ((CGFloat)((hexIntValue & 0xFF000000) >> 24)) / 255.0;
  CGFloat green = ((CGFloat)((hexIntValue & 0xFF0000) >> 16)) / 255.0;
  CGFloat blue = ((CGFloat)((hexIntValue & 0xFF00) >> 8)) / 255.0;
  CGFloat alpha = ((CGFloat)(hexIntValue & 0xFF)) / 255.0;

  return [RCTUIColor colorWithRed:red green:green blue:blue alpha:alpha];
}

static RCTUIColor *_Nullable _UIColorFromSemanticString(NSString *semanticString)
{
  NSString *platformColorString = [semanticString hasSuffix:kColorSuffix]
      ? [semanticString substringToIndex:[semanticString length] - [kColorSuffix length]]
      : semanticString;
  NSDictionary<NSString *, NSDictionary *> *platformColorSelectorsDict = _PlatformColorSelectorsDict();
  NSDictionary<NSString *, id> *colorInfo = platformColorSelectorsDict[platformColorString];
  if (colorInfo) {
    // Get the selector name, defaulting to the platform color string
    NSString *selectorName = colorInfo[kSelectorKey];
    if (selectorName == nil) {
      selectorName = [platformColorString stringByAppendingString:kColorSuffix];
    }
    
    SEL objcColorSelector = NSSelectorFromString(selectorName);
    if (![RCTUIColor respondsToSelector:objcColorSelector]) {
      // Try fallback ARGB value
      NSNumber *fallbackRGB = colorInfo[kFallbackARGBKey];
      if (fallbackRGB) {
        return _UIColorFromHexValue(fallbackRGB);
      }
      // Try fallback color name
      NSString *fallbackColorName = colorInfo[kFallbackKey];
      if (fallbackColorName) {
        return _UIColorFromSemanticString(fallbackColorName);
      }
    } else {
      Class colorClass = [RCTUIColor class];
      IMP imp = [colorClass methodForSelector:objcColorSelector];
      id (*getColor)(id, SEL) = ((id(*)(id, SEL))imp);
      id colorObject = getColor(colorClass, objcColorSelector);
      
      // Handle array results (like alternatingContentBackgroundColors)
      if ([colorObject isKindOfClass:[NSArray class]]) {
        NSNumber *index = colorInfo[kIndexKey];
        if (index != nil) {
          NSArray *colors = colorObject;
          NSUInteger idx = [index unsignedIntegerValue];
          if (idx < colors.count) {
            colorObject = colors[idx];
          }
        }
      }
      
      if ([colorObject isKindOfClass:[RCTUIColor class]]) {
        return colorObject;
      }
    }
  }
  return nil;
}

static inline NSString *_NSStringFromCString(
    const std::string &string,
    const NSStringEncoding &encoding = NSUTF8StringEncoding)
{
  return [NSString stringWithCString:string.c_str() encoding:encoding];
}

static inline facebook::react::ColorComponents _ColorComponentsFromUIColor(RCTUIColor *color)
{
  CGFloat rgba[4];
  color = [color colorUsingColorSpace:[NSColorSpace genericRGBColorSpace]];
  [color getRed:&rgba[0] green:&rgba[1] blue:&rgba[2] alpha:&rgba[3]];
  return {(float)rgba[0], (float)rgba[1], (float)rgba[2], (float)rgba[3]};
}

facebook::react::ColorComponents RCTPlatformColorComponentsFromSemanticItems(std::vector<std::string> &semanticItems)
{
  return _ColorComponentsFromUIColor(RCTPlatformColorFromSemanticItems(semanticItems));
}

RCTUIColor *RCTPlatformColorFromSemanticItems(std::vector<std::string> &semanticItems)
{
  for (const auto &semanticCString : semanticItems) {
    NSString *semanticNSString = _NSStringFromCString(semanticCString);
    RCTUIColor *uiColor = [RCTUIColor colorNamed:semanticNSString];
    if (uiColor != nil) {
      return uiColor;
    }
    uiColor = _UIColorFromSemanticString(semanticNSString);
    if (uiColor != nil) {
      return uiColor;
    }
  }

  return RCTUIColor.clearColor;
}

RCTUIColor *RCTPlatformColorFromColor(const facebook::react::Color &color)
{
  return (RCTUIColor *)facebook::react::unwrapManagedObject(color.getUIColor());
}

NS_ASSUME_NONNULL_END
