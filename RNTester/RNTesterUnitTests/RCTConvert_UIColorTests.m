/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

#import <XCTest/XCTest.h>

#import <React/RCTConvert.h>

@interface RCTConvert_NSColorTests : XCTestCase

@end

@implementation RCTConvert_NSColorTests

- (void)testColor
{
  id json = RCTJSONParse(@"{ \"semantic\": \"lightTextColor\" }", nil);
  UIColor *value = [RCTConvert UIColor:json];
  XCTAssertEqualObjects(value, [UIColor lightTextColor]);
}

- (void)testColorFailure
{
  id json = RCTJSONParse(@"{ \"semantic\": \"bogusColor\" }", nil);

  __block NSString *errorMessage = nil;
  RCTLogFunction defaultLogFunction = RCTGetLogFunction();
  RCTSetLogFunction(^(__unused RCTLogLevel level, __unused RCTLogSource source, __unused NSString *fileName, __unused NSNumber *lineNumber, NSString *message) {
    errorMessage = message;
  });

  UIColor *value = [RCTConvert UIColor:json];

  RCTSetLogFunction(defaultLogFunction);

  XCTAssertEqualObjects(value, nil);
  XCTAssertTrue([errorMessage containsString:@"labelColor"]); // the RedBox message will contain a list of the valid color names.
}

- (void)testFallbackColor
{
  id json = RCTJSONParse(@"{ \"semantic\": \"unitTestFallbackColor\" }", nil);
  UIColor *value = [RCTConvert UIColor:json];
  XCTAssertEqualObjects(value, [UIColor systemBlueColor]);
}

- (void)testDynamicColor
{
  // 0        == 0x00000000 == black
  // 16777215 == 0x00FFFFFF == white
  id json = RCTJSONParse(@"{ \"dynamic\": { \"light\":0, \"dark\":16777215 } }", nil);
  UIColor *value = [RCTConvert UIColor:json];
  XCTAssertNotNil(value);

  if (@available(iOS 13.0, *)) {
    id savedTraitCollection = [UITraitCollection currentTraitCollection];
    
    [UITraitCollection setCurrentTraitCollection:[UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleLight]];
    CGFloat rgba[4];
    RCTGetRGBAColorComponents([value CGColor], rgba);
    XCTAssertEqual(rgba[0], 0);
    XCTAssertEqual(rgba[1], 0);
    XCTAssertEqual(rgba[2], 0);
    XCTAssertEqual(rgba[3], 0);
    
    [UITraitCollection setCurrentTraitCollection:[UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleDark]];
    RCTGetRGBAColorComponents([value CGColor], rgba);
    XCTAssertEqual(rgba[0], 1);
    XCTAssertEqual(rgba[1], 1);
    XCTAssertEqual(rgba[2], 1);
    XCTAssertEqual(rgba[3], 0);
    
    [UITraitCollection setCurrentTraitCollection:savedTraitCollection];
  }
}

- (void)testCompositeDynamicColor
{
  id json = RCTJSONParse(@"{ \"dynamic\": { \"light\": { \"semantic\": \"systemRedColor\" }, \"dark\":{ \"semantic\": \"systemBlueColor\" } } }", nil);
  UIColor *value = [RCTConvert UIColor:json];
  XCTAssertNotNil(value);

  if (@available(iOS 13.0, *)) {
    id savedTraitCollection = [UITraitCollection currentTraitCollection];
    
    [UITraitCollection setCurrentTraitCollection:[UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleLight]];
    
    CGFloat rgba1[4];
    CGFloat rgba2[4];
    RCTGetRGBAColorComponents([value CGColor], rgba1);
    RCTGetRGBAColorComponents([[UIColor systemRedColor] CGColor], rgba2);
    XCTAssertEqual(rgba1[0], rgba2[0]);
    XCTAssertEqual(rgba1[1], rgba2[1]);
    XCTAssertEqual(rgba1[2], rgba2[2]);
    XCTAssertEqual(rgba1[3], rgba2[3]);
    
    [UITraitCollection setCurrentTraitCollection:[UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleDark]];
    
    RCTGetRGBAColorComponents([value CGColor], rgba1);
    RCTGetRGBAColorComponents([[UIColor systemBlueColor] CGColor], rgba2);
    XCTAssertEqual(rgba1[0], rgba2[0]);
    XCTAssertEqual(rgba1[1], rgba2[1]);
    XCTAssertEqual(rgba1[2], rgba2[2]);
    XCTAssertEqual(rgba1[3], rgba2[3]);
    
    [UITraitCollection setCurrentTraitCollection:savedTraitCollection];
  }
}

- (void)testGenerateFallbacks
{
  NSDictionary<NSString *, NSNumber*>* semanticColors = @{
    // https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
    // Label Colors
    @"labelColor": @(0x000000FF),
    @"secondaryLabelColor": @(0x3c3c4399),
    @"tertiaryLabelColor": @(0x3c3c434c),
    @"quaternaryLabelColor": @(0x3c3c432d),
    // Fill Colors
    @"systemFillColor": @(0x78788033),
    @"secondarySystemFillColor": @(0x78788028),
    @"tertiarySystemFillColor": @(0x7676801e),
    @"quaternarySystemFillColor": @(0x74748014),
    // Text Colors
    @"placeholderTextColor": @(0x3c3c434c),
    // Standard Content Background Colors
    @"systemBackgroundColor": @(0xffffffFF),
    @"secondarySystemBackgroundColor": @(0xf2f2f7FF),
    @"tertiarySystemBackgroundColor": @(0xffffffFF),
    // Grouped Content Background Colors
    @"systemGroupedBackgroundColor": @(0xf2f2f7FF),
    @"secondarySystemGroupedBackgroundColor": @(0xffffffFF),
    @"tertiarySystemGroupedBackgroundColor": @(0xf2f2f7FF),
    // Separator Colors
    @"separatorColor": @(0x3c3c4349),
    @"opaqueSeparatorColor": @(0xc6c6c8FF),
    // Link Color
    @"linkColor": @(0x007affFF),
    // Nonadaptable Colors
    @"darkTextColor": @(0x000000FF),
    @"lightTextColor": @(0xffffff99),
    // https://developer.apple.com/documentation/uikit/uicolor/standard_colors
    // Adaptable Colors
    @"systemBlueColor": @(0x007affFF),
    @"systemBrownColor": @(0xa2845eFF),
    @"systemGreenColor": @(0x34c759FF),
    @"systemIndigoColor": @(0x5856d6FF),
    @"systemOrangeColor": @(0xff9500FF),
    @"systemPinkColor": @(0xff2d55FF),
    @"systemPurpleColor": @(0xaf52deFF),
    @"systemRedColor": @(0xff3b30FF),
    @"systemTealColor": @(0x5ac8faFF),
    @"systemYellowColor": @(0xffcc00FF),
    // Adaptable Gray Colors
    @"systemGrayColor": @(0x8e8e93FF),
    @"systemGray2Color": @(0xaeaeb2FF),
    @"systemGray3Color": @(0xc7c7ccFF),
    @"systemGray4Color": @(0xd1d1d6FF),
    @"systemGray5Color": @(0xe5e5eaFF),
    @"systemGray6Color": @(0xf2f2f7FF),
  };
  
  id savedTraitCollection = nil;
  if (@available(iOS 13.0, *)) {
    savedTraitCollection = [UITraitCollection currentTraitCollection];
    
    [UITraitCollection setCurrentTraitCollection:[UITraitCollection traitCollectionWithUserInterfaceStyle:UIUserInterfaceStyleLight]];
  }

  for (NSString *semanticColor in semanticColors) {
    id json = RCTJSONParse([NSString stringWithFormat:@"{ \"semantic\": \"%@\" }", semanticColor], nil);
    UIColor *value = [RCTConvert UIColor:json];
    XCTAssertNotNil(value);

    NSNumber *fallback = [semanticColors objectForKey:semanticColor];
    NSUInteger rgbValue = [fallback unsignedIntegerValue];
    NSUInteger red1 = ((rgbValue & 0xFF000000) >> 24);
    NSUInteger green1 = ((rgbValue & 0x00FF0000) >> 16);
    NSUInteger blue1 = ((rgbValue & 0x0000FF00) >> 8);
    NSUInteger alpha1 = ((rgbValue & 0x000000FF) >> 0);

    CGFloat rgba[4];
    RCTGetRGBAColorComponents([value CGColor], rgba);
    NSUInteger red2 = rgba[0] * 255;
    NSUInteger green2 = rgba[1] * 255;
    NSUInteger blue2 = rgba[2] * 255;
    NSUInteger alpha2 = rgba[3] * 255;

    XCTAssertEqual(red1, red2);
    XCTAssertEqual(green1, green2);
    XCTAssertEqual(blue1, blue2);
    XCTAssertEqual(alpha1, alpha2);
  }
  
  if (@available(iOS 13.0, *)) {
    [UITraitCollection setCurrentTraitCollection:savedTraitCollection];
  }
}

@end
