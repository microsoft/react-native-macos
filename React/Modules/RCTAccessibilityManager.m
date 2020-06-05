/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTAccessibilityManager.h"

#import "RCTUIManager.h"
#import "RCTBridge.h"
#import "RCTConvert.h"
#import "RCTEventDispatcher.h"
#import "RCTLog.h"

NSString *const RCTAccessibilityManagerDidUpdateMultiplierNotification = @"RCTAccessibilityManagerDidUpdateMultiplierNotification";

#if !TARGET_OS_OSX // TODO(macOS ISS#2323203)

static NSString *UIKitCategoryFromJSCategory(NSString *JSCategory)
{
  static NSDictionary *map = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    map = @{@"extraSmall": UIContentSizeCategoryExtraSmall,
            @"small": UIContentSizeCategorySmall,
            @"medium": UIContentSizeCategoryMedium,
            @"large": UIContentSizeCategoryLarge,
            @"extraLarge": UIContentSizeCategoryExtraLarge,
            @"extraExtraLarge": UIContentSizeCategoryExtraExtraLarge,
            @"extraExtraExtraLarge": UIContentSizeCategoryExtraExtraExtraLarge,
            @"accessibilityMedium": UIContentSizeCategoryAccessibilityMedium,
            @"accessibilityLarge": UIContentSizeCategoryAccessibilityLarge,
            @"accessibilityExtraLarge": UIContentSizeCategoryAccessibilityExtraLarge,
            @"accessibilityExtraExtraLarge": UIContentSizeCategoryAccessibilityExtraExtraLarge,
            @"accessibilityExtraExtraExtraLarge": UIContentSizeCategoryAccessibilityExtraExtraExtraLarge};
  });
  return map[JSCategory];
}

@interface RCTAccessibilityManager ()

@property (nonatomic, copy) NSString *contentSizeCategory;
@property (nonatomic, assign) CGFloat multiplier;

@end

@implementation RCTAccessibilityManager

@synthesize bridge = _bridge;
@synthesize multipliers = _multipliers;

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init
{
  if (self = [super init]) {
    _multiplier = 1.0;

    // TODO: can this be moved out of the startup path?
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(didReceiveNewContentSizeCategory:)
                                                 name:UIContentSizeCategoryDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(accessibilityAnnouncementDidFinish:)
                                                 name:UIAccessibilityAnnouncementDidFinishNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(boldTextStatusDidChange:)
                                                 name:UIAccessibilityBoldTextStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(grayscaleStatusDidChange:)
                                                 name:UIAccessibilityGrayscaleStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(invertColorsStatusDidChange:)
                                                 name:UIAccessibilityInvertColorsStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(reduceMotionStatusDidChange:)
                                                 name:UIAccessibilityReduceMotionStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(reduceTransparencyStatusDidChange:)
                                                 name:UIAccessibilityReduceTransparencyStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(voiceVoiceOverStatusDidChange:)
                                                 name:UIAccessibilityVoiceOverStatusChanged
                                               object:nil];

    self.contentSizeCategory = RCTSharedApplication().preferredContentSizeCategory;
    _isBoldTextEnabled = UIAccessibilityIsBoldTextEnabled(); //Not supported and I don't think it's a thing
    _isGrayscaleEnabled = UIAccessibilityIsGrayscaleEnabled(); //Not supported but is a thing
    _isInvertColorsEnabled = UIAccessibilityIsInvertColorsEnabled(); // https://developer.apple.com/documentation/appkit/nsworkspace/1644068-accessibilitydisplayshouldinvert?language=objc
    _isReduceMotionEnabled = UIAccessibilityIsReduceMotionEnabled(); // https://developer.apple.com/documentation/appkit/nsworkspace/1644069-accessibilitydisplayshouldreduce?language=objc
    _isReduceTransparencyEnabled = UIAccessibilityIsReduceTransparencyEnabled(); // https://developer.apple.com/documentation/appkit/nsworkspace/1533006-accessibilitydisplayshouldreduce?language=objc
    _isVoiceOverEnabled = UIAccessibilityIsVoiceOverRunning(); // https://developer.apple.com/documentation/appkit/nsworkspace/2880317-voiceoverenabled?language=objc
  //Found in MacOS but not RN iOS
  // https://developer.apple.com/documentation/appkit/nsworkspace/1526290-accessibilitydisplayshouldincrea?language=objc
  // [Would be particularly good to enable] https://developer.apple.com/documentation/appkit/nsworkspace/2880322-switchcontrolenabled?language=objc
  
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)didReceiveNewContentSizeCategory:(NSNotification *)note
{
  self.contentSizeCategory = note.userInfo[UIContentSizeCategoryNewValueKey];
}

- (void)accessibilityAnnouncementDidFinish:(__unused NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  // Response dictionary to populate the event with.
  NSDictionary *response = @{@"announcement": userInfo[UIAccessibilityAnnouncementKeyStringValue],
                              @"success": userInfo[UIAccessibilityAnnouncementKeyWasSuccessful]};

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  [_bridge.eventDispatcher sendDeviceEventWithName:@"announcementFinished"
                                              body:response];
#pragma clang diagnostic pop
}

- (void)boldTextStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newBoldTextEnabled = UIAccessibilityIsBoldTextEnabled();
  if (_isBoldTextEnabled != newBoldTextEnabled) {
    _isBoldTextEnabled = newBoldTextEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [_bridge.eventDispatcher sendDeviceEventWithName:@"boldTextChanged"
                                                body:@(_isBoldTextEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)grayscaleStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newGrayscaleEnabled = UIAccessibilityIsGrayscaleEnabled();
  if (_isGrayscaleEnabled != newGrayscaleEnabled) {
    _isGrayscaleEnabled = newGrayscaleEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [_bridge.eventDispatcher sendDeviceEventWithName:@"grayscaleChanged"
                                                body:@(_isGrayscaleEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)invertColorsStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newInvertColorsEnabled = UIAccessibilityIsInvertColorsEnabled();
  if (_isInvertColorsEnabled != newInvertColorsEnabled) {
    _isInvertColorsEnabled = newInvertColorsEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [_bridge.eventDispatcher sendDeviceEventWithName:@"invertColorsChanged"
                                                body:@(_isInvertColorsEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)reduceMotionStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newReduceMotionEnabled = UIAccessibilityIsReduceMotionEnabled();
  if (_isReduceMotionEnabled != newReduceMotionEnabled) {
    _isReduceMotionEnabled = newReduceMotionEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [_bridge.eventDispatcher sendDeviceEventWithName:@"reduceMotionChanged"
                                                body:@(_isReduceMotionEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)reduceTransparencyStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newReduceTransparencyEnabled = UIAccessibilityIsReduceTransparencyEnabled();
  if (_isReduceTransparencyEnabled != newReduceTransparencyEnabled) {
    _isReduceTransparencyEnabled = newReduceTransparencyEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [_bridge.eventDispatcher sendDeviceEventWithName:@"reduceTransparencyChanged"
                                                body:@(_isReduceTransparencyEnabled)];
#pragma clang diagnostic pop
  }
}
// [OG] https://developer.apple.com/documentation/uikit/uiaccessibilityvoiceoverstatuschanged?language=objc
// [Closest example] https://developer.apple.com/documentation/appkit/nsworkspaceaccessibilitydisplayoptionsdidchangenotification?language=objc
// [what it's used for] https://reactnative.dev/docs/accessibilityinfo#addeventlistener
// I don't think there is a similar event that can trigger this.
- (void)voiceVoiceOverStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newIsVoiceOverEnabled = UIAccessibilityIsVoiceOverRunning();
  if (_isVoiceOverEnabled != newIsVoiceOverEnabled) {
    _isVoiceOverEnabled = newIsVoiceOverEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [_bridge.eventDispatcher sendDeviceEventWithName:@"screenReaderChanged"
                                                body:@(_isVoiceOverEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)setContentSizeCategory:(NSString *)contentSizeCategory
{
  if (_contentSizeCategory != contentSizeCategory) {
    _contentSizeCategory = [contentSizeCategory copy];
    [self invalidateMultiplier];
  }
}

- (void)invalidateMultiplier
{
  self.multiplier = [self multiplierForContentSizeCategory:_contentSizeCategory];
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTAccessibilityManagerDidUpdateMultiplierNotification object:self];
}

- (CGFloat)multiplierForContentSizeCategory:(NSString *)category
{
  NSNumber *m = self.multipliers[category];
  if (m.doubleValue <= 0.0) {
    RCTLogError(@"Can't determine multiplier for category %@. Using 1.0.", category);
    m = @1.0;
  }
  return m.doubleValue;
}

- (void)setMultipliers:(NSDictionary<NSString *, NSNumber *> *)multipliers
{
  if (_multipliers != multipliers) {
    _multipliers = [multipliers copy];
    [self invalidateMultiplier];
  }
}

- (NSDictionary<NSString *, NSNumber *> *)multipliers
{
  if (_multipliers == nil) {
    _multipliers = @{UIContentSizeCategoryExtraSmall: @0.823,
                     UIContentSizeCategorySmall: @0.882,
                     UIContentSizeCategoryMedium: @0.941,
                     UIContentSizeCategoryLarge: @1.0,
                     UIContentSizeCategoryExtraLarge: @1.118,
                     UIContentSizeCategoryExtraExtraLarge: @1.235,
                     UIContentSizeCategoryExtraExtraExtraLarge: @1.353,
                     UIContentSizeCategoryAccessibilityMedium: @1.786,
                     UIContentSizeCategoryAccessibilityLarge: @2.143,
                     UIContentSizeCategoryAccessibilityExtraLarge: @2.643,
                     UIContentSizeCategoryAccessibilityExtraExtraLarge: @3.143,
                     UIContentSizeCategoryAccessibilityExtraExtraExtraLarge: @3.571};
  }
  return _multipliers;
}

RCT_EXPORT_METHOD(setAccessibilityContentSizeMultipliers:(NSDictionary *)JSMultipliers)
{
  NSMutableDictionary<NSString *, NSNumber *> *multipliers = [NSMutableDictionary new];
  for (NSString *__nonnull JSCategory in JSMultipliers) {
    NSNumber *m = [RCTConvert NSNumber:JSMultipliers[JSCategory]];
    NSString *UIKitCategory = UIKitCategoryFromJSCategory(JSCategory);
    multipliers[UIKitCategory] = m;
  }
  self.multipliers = multipliers;
}

RCT_EXPORT_METHOD(setAccessibilityFocus:(nonnull NSNumber *)reactTag)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIView *view = [self.bridge.uiManager viewForReactTag:reactTag];
    UIAccessibilityPostNotification(UIAccessibilityLayoutChangedNotification, view);
  });
}

RCT_EXPORT_METHOD(announceForAccessibility:(NSString *)announcement)
{
  UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, announcement);
}

RCT_EXPORT_METHOD(getMultiplier:(RCTResponseSenderBlock)callback)
{
  if (callback) {
    callback(@[ @(self.multiplier) ]);
  }
}

RCT_EXPORT_METHOD(getCurrentBoldTextState:(RCTResponseSenderBlock)callback
                  error:(__unused RCTResponseSenderBlock)error)
{
  callback(@[@(_isBoldTextEnabled)]);
}

RCT_EXPORT_METHOD(getCurrentGrayscaleState:(RCTResponseSenderBlock)callback
                  error:(__unused RCTResponseSenderBlock)error)
{
  callback(@[@(_isGrayscaleEnabled)]);
}

RCT_EXPORT_METHOD(getCurrentInvertColorsState:(RCTResponseSenderBlock)callback
                  error:(__unused RCTResponseSenderBlock)error)
{
  callback(@[@(_isInvertColorsEnabled)]);
}

RCT_EXPORT_METHOD(getCurrentReduceMotionState:(RCTResponseSenderBlock)callback
                  error:(__unused RCTResponseSenderBlock)error)
{
  callback(@[@(_isReduceMotionEnabled)]);
}

RCT_EXPORT_METHOD(getCurrentReduceTransparencyState:(RCTResponseSenderBlock)callback
                  error:(__unused RCTResponseSenderBlock)error)
{
  callback(@[@(_isReduceTransparencyEnabled)]);
}

RCT_EXPORT_METHOD(getCurrentVoiceOverState:(RCTResponseSenderBlock)callback
                  error:(__unused RCTResponseSenderBlock)error)
{
  callback(@[@(_isVoiceOverEnabled)]);
}

@end

@implementation RCTBridge (RCTAccessibilityManager)

- (RCTAccessibilityManager *)accessibilityManager
{
  return [self moduleForClass:[RCTAccessibilityManager class]];
}

@end

#else // TODO(macOS ISS#2323203)

@implementation RCTAccessibilityManager

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init
{
    if (self = [super init]) {
        _isVoiceOverEnabled = [[NSWorkspace sharedWorkspace] isVoiceOverEnabled];
    }
    return self;
}
@end
#endif // TODO(macOS ISS#2323203)
