/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTAccessibilityManager.h"
#import "RCTAccessibilityManager+Internal.h"

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTBridge.h>
#import <React/RCTConvert.h>
#import <React/RCTEventDispatcherProtocol.h>
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>

#import "CoreModulesPlugins.h"

NSString *const RCTAccessibilityManagerDidUpdateMultiplierNotification =
    @"RCTAccessibilityManagerDidUpdateMultiplierNotification";

static void *AccessibilityVoiceOverChangeContext = &AccessibilityVoiceOverChangeContext; // [macOS]

@interface RCTAccessibilityManager () <NativeAccessibilityManagerSpec>

@property (nonatomic, copy) NSString *contentSizeCategory;
@property (nonatomic, assign) CGFloat multiplier;

@end

@implementation RCTAccessibilityManager

@synthesize viewRegistry_DEPRECATED = _viewRegistry_DEPRECATED;
@synthesize moduleRegistry = _moduleRegistry;
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

#if !TARGET_OS_OSX // [macOS]
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
                                             selector:@selector(darkerSystemColorsDidChange:)
                                                 name:UIAccessibilityDarkerSystemColorsStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(reduceTransparencyStatusDidChange:)
                                                 name:UIAccessibilityReduceTransparencyStatusDidChangeNotification
                                               object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(voiceVoiceOverStatusDidChange:)
                                                 name:UIAccessibilityVoiceOverStatusDidChangeNotification
                                               object:nil];
#else // [macOS
        [[NSWorkspace sharedWorkspace] addObserver:self
                                        forKeyPath:@"voiceOverEnabled"
                                           options:(NSKeyValueObservingOptionNew | NSKeyValueObservingOptionOld)
                                           context:AccessibilityVoiceOverChangeContext];
        [[[NSWorkspace sharedWorkspace] notificationCenter] addObserver:self
                                                 selector:@selector(accessibilityDisplayOptionsChange:)
                                                     name:NSWorkspaceAccessibilityDisplayOptionsDidChangeNotification
                                                   object:nil];
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
    self.contentSizeCategory = RCTSharedApplication().preferredContentSizeCategory;
    _isBoldTextEnabled = UIAccessibilityIsBoldTextEnabled();
    _isGrayscaleEnabled = UIAccessibilityIsGrayscaleEnabled();
    _isInvertColorsEnabled = UIAccessibilityIsInvertColorsEnabled();
    _isReduceMotionEnabled = UIAccessibilityIsReduceMotionEnabled();
    _isDarkerSystemColorsEnabled = UIAccessibilityDarkerSystemColorsEnabled();
    _isReduceTransparencyEnabled = UIAccessibilityIsReduceTransparencyEnabled();
    _isVoiceOverEnabled = UIAccessibilityIsVoiceOverRunning();
    _isHighContrastEnabled = UIAccessibilityDarkerSystemColorsEnabled(); // [macOS] Implement high Contrast for iOS
#else // [macOS
    NSWorkspace *sharedWorkspace = [NSWorkspace sharedWorkspace];
    _isInvertColorsEnabled = [sharedWorkspace accessibilityDisplayShouldInvertColors];
    _isReduceMotionEnabled = [sharedWorkspace accessibilityDisplayShouldReduceMotion];
    _isReduceTransparencyEnabled = [sharedWorkspace accessibilityDisplayShouldReduceTransparency];
    _isVoiceOverEnabled = [sharedWorkspace isVoiceOverEnabled];
    _isHighContrastEnabled = [sharedWorkspace accessibilityDisplayShouldIncreaseContrast];
#endif // macOS]
  }
  return self;
}

#if TARGET_OS_OSX // [macOS
- (void)dealloc
{
  [[NSWorkspace sharedWorkspace] removeObserver:self
                                     forKeyPath:@"voiceOverEnabled"
                                        context:AccessibilityVoiceOverChangeContext];
}
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
- (void)didReceiveNewContentSizeCategory:(NSNotification *)note
{
  self.contentSizeCategory = note.userInfo[UIContentSizeCategoryNewValueKey];
}

- (void)accessibilityAnnouncementDidFinish:(__unused NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  // Response dictionary to populate the event with.
  NSDictionary *response = @{
    @"announcement" : userInfo[UIAccessibilityAnnouncementKeyStringValue],
    @"success" : userInfo[UIAccessibilityAnnouncementKeyWasSuccessful]
  };

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"announcementFinished" body:response];
#pragma clang diagnostic pop
}

- (void)boldTextStatusDidChange:(__unused NSNotification *)notification
{
  BOOL newBoldTextEnabled = UIAccessibilityIsBoldTextEnabled();
  if (_isBoldTextEnabled != newBoldTextEnabled) {
    _isBoldTextEnabled = newBoldTextEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"boldTextChanged"
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
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"grayscaleChanged"
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
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"invertColorsChanged"
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
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"reduceMotionChanged"
                                                                          body:@(_isReduceMotionEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)darkerSystemColorsDidChange:(__unused NSNotification *)notification
{
  BOOL newDarkerSystemColorsEnabled = UIAccessibilityDarkerSystemColorsEnabled();
  if (_isDarkerSystemColorsEnabled != newDarkerSystemColorsEnabled) {
    _isDarkerSystemColorsEnabled = newDarkerSystemColorsEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"darkerSystemColorsChanged"
                                                                          body:@(_isDarkerSystemColorsEnabled)];
    // [macOS Also fire the highContrastChanged event for iOS
    _isHighContrastEnabled = newDarkerSystemColorsEnabled;
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"highContrastChanged"
                                                                          body:@(_isDarkerSystemColorsEnabled)];
    // macOS]

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
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"reduceTransparencyChanged"
                                                                          body:@(_isReduceTransparencyEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)voiceVoiceOverStatusDidChange:(__unused NSNotification *)notification
{
  BOOL isVoiceOverEnabled = UIAccessibilityIsVoiceOverRunning();
  [self _setIsVoiceOverEnabled:isVoiceOverEnabled];
}
#else // [macOS
- (void)accessibilityDisplayOptionsChange:(NSNotification *)notification
{
  BOOL newInvertColorsEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldInvertColors];
  BOOL newReduceMotionEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldReduceMotion];
  BOOL newReduceTransparencyEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldReduceTransparency];
  BOOL newHighContrastEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldIncreaseContrast];
  

  if (_isHighContrastEnabled != newHighContrastEnabled) {
    _isHighContrastEnabled = newHighContrastEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"highContrastChanged"
                                                                          body:@(_isHighContrastEnabled)];
#pragma clang diagnostic pop
  }
  if (_isInvertColorsEnabled != newInvertColorsEnabled) {
    _isInvertColorsEnabled = newInvertColorsEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"invertColorsChanged"
                                                                          body:@(_isInvertColorsEnabled)];
#pragma clang diagnostic pop
  }
  if (_isReduceMotionEnabled != newReduceMotionEnabled) {
    _isReduceMotionEnabled = newReduceMotionEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"reduceMotionChanged"
                                                                          body:@(_isReduceMotionEnabled)];
#pragma clang diagnostic pop
  }
  if (_isReduceTransparencyEnabled != newReduceTransparencyEnabled) {
    _isReduceTransparencyEnabled = newReduceTransparencyEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"reduceTransparencyChanged"
                                                                          body:@(_isReduceTransparencyEnabled)];
#pragma clang diagnostic pop
  }
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary *)change
                       context:(void *)context {
  if (context == AccessibilityVoiceOverChangeContext) {
    BOOL newIsVoiceOverEnabled = [[NSWorkspace sharedWorkspace] isVoiceOverEnabled];
    if (_isVoiceOverEnabled != newIsVoiceOverEnabled) {
      _isVoiceOverEnabled = newIsVoiceOverEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"screenReaderChanged"
                                                                            body:@(_isVoiceOverEnabled)];
#pragma clang diagnostic pop
    }
  } else {
    [super observeValueForKeyPath:keyPath
                         ofObject:object
                           change:change
                          context:context];
  }
}
#endif // macOS]

- (void)_setIsVoiceOverEnabled:(BOOL)isVoiceOverEnabled
{
  if (_isVoiceOverEnabled != isVoiceOverEnabled) {
    _isVoiceOverEnabled = isVoiceOverEnabled;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"screenReaderChanged"
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
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTAccessibilityManagerDidUpdateMultiplierNotification
                                                      object:self];
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
#if !TARGET_OS_OSX // [macOS]
  if (_multipliers == nil) {
    _multipliers = @{
      UIContentSizeCategoryExtraSmall : @0.823,
      UIContentSizeCategorySmall : @0.882,
      UIContentSizeCategoryMedium : @0.941,
      UIContentSizeCategoryLarge : @1.0,
      UIContentSizeCategoryExtraLarge : @1.118,
      UIContentSizeCategoryExtraExtraLarge : @1.235,
      UIContentSizeCategoryExtraExtraExtraLarge : @1.353,
      UIContentSizeCategoryAccessibilityMedium : @1.786,
      UIContentSizeCategoryAccessibilityLarge : @2.143,
      UIContentSizeCategoryAccessibilityExtraLarge : @2.643,
      UIContentSizeCategoryAccessibilityExtraExtraLarge : @3.143,
      UIContentSizeCategoryAccessibilityExtraExtraExtraLarge : @3.571
    };
  }
#endif // [macOS]
  return _multipliers;
}

RCT_EXPORT_METHOD(setAccessibilityContentSizeMultipliers
                  : (JS::NativeAccessibilityManager::SpecSetAccessibilityContentSizeMultipliersJSMultipliers &)
                      JSMultipliers)
{
  NSMutableDictionary<NSString *, NSNumber *> *multipliers = [NSMutableDictionary new];
#if !TARGET_OS_OSX // [macOS]
  setMultipliers(multipliers, UIContentSizeCategoryExtraSmall, JSMultipliers.extraSmall());
  setMultipliers(multipliers, UIContentSizeCategorySmall, JSMultipliers.small());
  setMultipliers(multipliers, UIContentSizeCategoryMedium, JSMultipliers.medium());
  setMultipliers(multipliers, UIContentSizeCategoryLarge, JSMultipliers.large());
  setMultipliers(multipliers, UIContentSizeCategoryExtraLarge, JSMultipliers.extraLarge());
  setMultipliers(multipliers, UIContentSizeCategoryExtraExtraLarge, JSMultipliers.extraExtraLarge());
  setMultipliers(multipliers, UIContentSizeCategoryExtraExtraExtraLarge, JSMultipliers.extraExtraExtraLarge());
  setMultipliers(multipliers, UIContentSizeCategoryAccessibilityMedium, JSMultipliers.accessibilityMedium());
  setMultipliers(multipliers, UIContentSizeCategoryAccessibilityLarge, JSMultipliers.accessibilityLarge());
  setMultipliers(multipliers, UIContentSizeCategoryAccessibilityExtraLarge, JSMultipliers.accessibilityExtraLarge());
  setMultipliers(
      multipliers, UIContentSizeCategoryAccessibilityExtraExtraLarge, JSMultipliers.accessibilityExtraExtraLarge());
  setMultipliers(
      multipliers,
      UIContentSizeCategoryAccessibilityExtraExtraExtraLarge,
      JSMultipliers.accessibilityExtraExtraExtraLarge());
#endif // [macOS]
  self.multipliers = multipliers;
}

static void setMultipliers(
    NSMutableDictionary<NSString *, NSNumber *> *multipliers,
    NSString *key,
    std::optional<double> optionalDouble)
{
  if (optionalDouble.has_value()) {
    multipliers[key] = @(optionalDouble.value());
  }
}

RCT_EXPORT_METHOD(setAccessibilityFocus : (double)reactTag)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    RCTPlatformView *view = [self.viewRegistry_DEPRECATED viewForReactTag:@(reactTag)]; // [macOS]
#if !TARGET_OS_OSX // [macOS]
    UIAccessibilityPostNotification(UIAccessibilityLayoutChangedNotification, view);
#else // [macOS
    [[view window] makeFirstResponder:view];
    NSAccessibilityPostNotification(view, NSAccessibilityLayoutChangedNotification);
#endif // macOS]
  });
}

RCT_EXPORT_METHOD(announceForAccessibility : (NSString *)announcement)
{
#if !TARGET_OS_OSX // [macOS]
  UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, announcement);
#else // [macOS
  dispatch_async(dispatch_get_main_queue(), ^{
    NSAccessibilityPostNotificationWithUserInfo(
                                                NSApp,
                                                NSAccessibilityAnnouncementRequestedNotification,
                                                @{NSAccessibilityAnnouncementKey : announcement,
                                                  NSAccessibilityPriorityKey : @(NSAccessibilityPriorityHigh)
                                                }
                                                );
  });
#endif // macOS]
}

RCT_EXPORT_METHOD(announceForAccessibilityWithOptions
                  : (NSString *)announcement options
                  : (JS::NativeAccessibilityManager::SpecAnnounceForAccessibilityWithOptionsOptions &)options)
{
#if !TARGET_OS_OSX // [macOS]
  NSMutableDictionary<NSString *, NSNumber *> *attrsDictionary = [NSMutableDictionary new];
  if (options.queue()) {
    attrsDictionary[UIAccessibilitySpeechAttributeQueueAnnouncement] = @(*(options.queue()) ? YES : NO);
  }

  if (attrsDictionary.count > 0) {
    NSAttributedString *announcementWithAttrs = [[NSAttributedString alloc] initWithString:announcement
                                                                                attributes:attrsDictionary];
    UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, announcementWithAttrs);
  } else {
    UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, announcement);
  }
#else // [macOS
  NSAccessibilityPriorityLevel announcementPriority = options.queue() ? NSAccessibilityPriorityLow : NSAccessibilityPriorityHigh;
  dispatch_async(dispatch_get_main_queue(), ^{
    NSAccessibilityPostNotificationWithUserInfo(
                                                NSApp,
                                                NSAccessibilityAnnouncementRequestedNotification,
                                                @{NSAccessibilityAnnouncementKey : announcement,
                                                  NSAccessibilityPriorityKey : @(announcementPriority)
                                                }
                                                );
  });
#endif // macOS]
}

RCT_EXPORT_METHOD(getMultiplier : (RCTResponseSenderBlock)callback)
{
  if (callback) {
    callback(@[ @(self.multiplier) ]);
  }
}

RCT_EXPORT_METHOD(getCurrentBoldTextState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isBoldTextEnabled) ]);
}

RCT_EXPORT_METHOD(getCurrentGrayscaleState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isGrayscaleEnabled) ]);
}

RCT_EXPORT_METHOD(getCurrentInvertColorsState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isInvertColorsEnabled) ]);
}

RCT_EXPORT_METHOD(getCurrentReduceMotionState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isReduceMotionEnabled) ]);
}

RCT_EXPORT_METHOD(getCurrentDarkerSystemColorsState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isDarkerSystemColorsEnabled) ]);
}

RCT_EXPORT_METHOD(getCurrentPrefersCrossFadeTransitionsState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
#if !TARGET_OS_OSX // [macOS]
  if (@available(iOS 14.0, *)) {
    onSuccess(@[ @(UIAccessibilityPrefersCrossFadeTransitions()) ]);
  } else {
    onSuccess(@[ @(false) ]);
  }
#else // [macOS
  onSuccess(@[ @(false) ]); // iOS only
#endif // macOS]
}

RCT_EXPORT_METHOD(getCurrentReduceTransparencyState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isReduceTransparencyEnabled) ]);
}

RCT_EXPORT_METHOD(getCurrentVoiceOverState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isVoiceOverEnabled) ]);
}

// [macOS Implement for both iOS and macOS
RCT_EXPORT_METHOD(getCurrentHighContrastState
                  : (RCTResponseSenderBlock)onSuccess onError
                  : (__unused RCTResponseSenderBlock)onError)
{
  onSuccess(@[ @(_isHighContrastEnabled) ]);
}
// macOS]


- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAccessibilityManagerSpecJSI>(params);
}

#pragma mark - Internal

void RCTAccessibilityManagerSetIsVoiceOverEnabled(
    RCTAccessibilityManager *accessibilityManager,
    BOOL isVoiceOverEnabled)
{
  [accessibilityManager _setIsVoiceOverEnabled:isVoiceOverEnabled];
}

@end

@implementation RCTBridge (RCTAccessibilityManager)

- (RCTAccessibilityManager *)accessibilityManager
{
  return [self moduleForClass:[RCTAccessibilityManager class]];
}

@end

@implementation RCTBridgeProxy (RCTAccessibilityManager)

- (RCTAccessibilityManager *)accessibilityManager
{
  return [self moduleForClass:[RCTAccessibilityManager class]];
}

@end

Class RCTAccessibilityManagerCls(void)
{
  return RCTAccessibilityManager.class;
}
