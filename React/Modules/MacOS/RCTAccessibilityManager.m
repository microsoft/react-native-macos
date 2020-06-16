/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTAccessibilityManager.h"

#import "RCTBridge.h"
#import "RCTConvert.h"
#import "RCTEventDispatcher.h"
#import "RCTLog.h"
#import "RCTUIManager.h"

NSString *const RCTAccessibilityManagerDidUpdateMultiplierNotification =
    @"RCTAccessibilityManagerDidUpdateMultiplierNotification";

@implementation RCTAccessibilityManager
@synthesize bridge = _bridge;

RCT_EXPORT_MODULE()

static void *AccessibilityVoiceOverChangeContext = &AccessibilityVoiceOverChangeContext;

+ (BOOL)requiresMainQueueSetup 
{
  return NO;
}

- (instancetype)init 
{
  if (self = [super init]) {
    [[NSWorkspace sharedWorkspace] addObserver:self
                                    forKeyPath:@"voiceOverEnabled"
                                       options:(NSKeyValueObservingOptionNew | NSKeyValueObservingOptionOld)
                                       context:AccessibilityVoiceOverChangeContext];
    [[[NSWorkspace sharedWorkspace] notificationCenter] addObserver:self
                                             selector:@selector(AccessibilityDisplayOptionsChange:)
                                                 name:NSWorkspaceAccessibilityDisplayOptionsDidChangeNotification
                                               object:nil];
    _isInvertColorsEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldInvertColors];
    _isReduceMotionEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldReduceMotion];
    _isReduceTransparencyEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldReduceTransparency];
    _isVoiceOverEnabled = [[NSWorkspace sharedWorkspace] isVoiceOverEnabled];
    
  }
  return self;
}

- (void)dealloc
{
  [[NSWorkspace sharedWorkspace] removeObserver:self
                                     forKeyPath:@"voiceOverEnabled"
                                        context:AccessibilityVoiceOverChangeContext];
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
  BOOL isVoiceOverEnabled = [[NSWorkspace sharedWorkspace] isVoiceOverEnabled];
  callback(@[ @(isVoiceOverEnabled) ]);
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
      [_bridge.eventDispatcher sendDeviceEventWithName:@"screenReaderChanged"
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

- (void)AccessibilityDisplayOptionsChange:(NSNotification *)notification
{
  BOOL newInvertColorsEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldInvertColors];
  BOOL newReduceMotionEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldReduceMotion];
  BOOL newReduceTransparencyEnabled = [[NSWorkspace sharedWorkspace] accessibilityDisplayShouldReduceTransparency];
  if (_isInvertColorsEnabled != newInvertColorsEnabled) {
    _isInvertColorsEnabled = newInvertColorsEnabled;
    [_bridge.eventDispatcher sendDeviceEventWithName:@"invertColorsChanged"
                                                body:@(_isInvertColorsEnabled)];
  }
  if (_isReduceMotionEnabled != newReduceMotionEnabled) {
    _isReduceMotionEnabled = newReduceMotionEnabled;
    [_bridge.eventDispatcher sendDeviceEventWithName:@"reduceMotionChanged"
                                                body:@(_isReduceMotionEnabled)];
  }
  if (_isReduceTransparencyEnabled != newReduceTransparencyEnabled) {
    _isReduceTransparencyEnabled = newReduceTransparencyEnabled;
    [_bridge.eventDispatcher sendDeviceEventWithName:@"reduceTransparencyChanged"
                                                body:@(_isReduceTransparencyEnabled)];
  }
}

@end
