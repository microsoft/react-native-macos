/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDevLoadingView.h>

#import <QuartzCore/QuartzCore.h>

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTAppearance.h>
#import <React/RCTBridge.h>
#import <React/RCTConstants.h>
#import <React/RCTConvert.h>
#import <React/RCTDefines.h>
#import <React/RCTDevSettings.h> // [macOS]
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTUtils.h>
#import <React/RCTUIKit.h> // [macOS]

#import "CoreModulesPlugins.h"

using namespace facebook::react;

static NSString *sRCTDevLoadingViewWindowIdentifier = @"RCTDevLoadingViewWindow";

@interface RCTDevLoadingView () <NativeDevLoadingViewSpec>
@end

#if RCT_DEV_MENU

@implementation RCTDevLoadingView {
  RCTPlatformWindow *_window; // [macOS]
  RCTUILabel *_label; // [macOS]
  RCTUIView *_container; // [macOS]
  NSDate *_showDate;
  BOOL _hiding;
  dispatch_block_t _initialMessageBlock;
}

RCT_EXPORT_MODULE()

- (instancetype)init
{
  if (self = [super init]) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(hide)
                                                 name:RCTJavaScriptDidLoadNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(hide)
                                                 name:RCTJavaScriptDidFailToLoadNotification
                                               object:nil];
  }
  return self;
}

+ (void)setEnabled:(BOOL)enabled
{
  RCTDevLoadingViewSetEnabled(enabled);
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)clearInitialMessageDelay
{
  if (_initialMessageBlock != nil) {
    dispatch_block_cancel(_initialMessageBlock);
    _initialMessageBlock = nil;
  }
}

- (void)showInitialMessageDelayed:(void (^)())initialMessage
{
  _initialMessageBlock = dispatch_block_create(static_cast<dispatch_block_flags_t>(0), initialMessage);

  // We delay the initial loading message to prevent flashing it
  // when loading progress starts quickly. To do that, we
  // schedule the message to be shown in a block, and cancel
  // the block later when the progress starts coming in.
  // If the progress beats this timer, this message is not shown.
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, 0.2 * NSEC_PER_SEC), dispatch_get_main_queue(), self->_initialMessageBlock);
}

- (void)hideBannerAfter:(CGFloat)delay
{
  // Cancel previous hide call after the delay.
  [NSObject cancelPreviousPerformRequestsWithTarget:self selector:@selector(hide) object:nil];
  // Set new hide call after a delay.
  [self performSelector:@selector(hide) withObject:nil afterDelay:delay];
}

- (void)showMessage:(NSString *)message color:(RCTUIColor *)color backgroundColor:(RCTUIColor *)backgroundColor // [macOS]
{
  if (!RCTDevLoadingViewGetEnabled() || _hiding) {
    return;
  }

  // Input validation
  if (message == nil || [message isEqualToString:@""]) {
    NSLog(@"Error: message cannot be nil or empty");
    return;
  }
  if (color == nil) {
    NSLog(@"Error: color cannot be nil");
    return;
  }
  if (backgroundColor == nil) {
    NSLog(@"Error: backgroundColor cannot be nil");
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    if (RCTRunningInTestEnvironment()) {
      return;
    }

    self->_showDate = [NSDate date];

#if !TARGET_OS_OSX // [macOS]
    UIWindow *mainWindow = RCTKeyWindow();
    self->_window = [[UIWindow alloc] initWithWindowScene:mainWindow.windowScene];
    self->_window.windowLevel = UIWindowLevelStatusBar + 1;
    self->_window.rootViewController = [UIViewController new];
#else // [macOS
    self->_window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 375, 20)
                                               styleMask:NSWindowStyleMaskBorderless
                                                 backing:NSBackingStoreBuffered
                                                   defer:YES];
    [self->_window setIdentifier:sRCTDevLoadingViewWindowIdentifier];
#endif // macOS]

    self->_container = [[RCTUIView alloc] init]; // [macOS]
    self->_container.backgroundColor = backgroundColor;
    self->_container.translatesAutoresizingMaskIntoConstraints = NO;

    self->_label = [[RCTUILabel alloc] init]; // [macOS]
    self->_label.translatesAutoresizingMaskIntoConstraints = NO;
    self->_label.font = [UIFont monospacedDigitSystemFontOfSize:12.0 weight:UIFontWeightRegular];
    self->_label.textAlignment = NSTextAlignmentCenter;
    self->_label.textColor = color;
    self->_label.text = message;

#if !TARGET_OS_OSX // [macOS]
    [self->_window.rootViewController.view addSubview:self->_container];
#else // [macOS
    [self->_window.contentViewController.view addSubview:self->_container];
#endif // macOS]
    [self->_container addSubview:self->_label];

#if !TARGET_OS_OSX // [macOS]
    CGFloat topSafeAreaHeight = mainWindow.safeAreaInsets.top;
    CGFloat height = topSafeAreaHeight + 25;
    self->_window.frame = CGRectMake(0, 0, mainWindow.frame.size.width, height);

    self->_window.hidden = NO;

    [self->_window layoutIfNeeded];

    [NSLayoutConstraint activateConstraints:@[
      // Container constraints
      [self->_container.topAnchor constraintEqualToAnchor:self->_window.rootViewController.view.topAnchor],
      [self->_container.leadingAnchor constraintEqualToAnchor:self->_window.rootViewController.view.leadingAnchor],
      [self->_container.trailingAnchor constraintEqualToAnchor:self->_window.rootViewController.view.trailingAnchor],
      [self->_container.heightAnchor constraintEqualToConstant:height],

      // Label constraints
      [self->_label.centerXAnchor constraintEqualToAnchor:self->_container.centerXAnchor],
      [self->_label.bottomAnchor constraintEqualToAnchor:self->_container.bottomAnchor constant:-5],
    ]];
#else // [macOS
    if (![[RCTKeyWindow() sheets] doesContain:self->_window]) {
      [RCTKeyWindow() beginSheet:self->_window completionHandler:^(NSModalResponse returnCode) {
        [self->_window orderOut:self];
      }];
    }
#endif // macOS]

    [self hideBannerAfter:15.0];
  });
}

RCT_EXPORT_METHOD(showMessage
                  : (NSString *)message withColor
                  : (NSNumber *__nonnull)color withBackgroundColor
                  : (NSNumber *__nonnull)backgroundColor)
{
  [self showMessage:message color:[RCTConvert UIColor:color] backgroundColor:[RCTConvert UIColor:backgroundColor]];
}

RCT_EXPORT_METHOD(hide)
{
  if (!RCTDevLoadingViewGetEnabled()) {
    return;
  }

  // Cancel the initial message block so it doesn't display later and get stuck.
  [self clearInitialMessageDelay];

  dispatch_async(dispatch_get_main_queue(), ^{
    self->_hiding = YES;
#if !TARGET_OS_OSX // [macOS]
    const NSTimeInterval MIN_PRESENTED_TIME = 0.6;
    NSTimeInterval presentedTime = [[NSDate date] timeIntervalSinceDate:self->_showDate];
    NSTimeInterval delay = MAX(0, MIN_PRESENTED_TIME - presentedTime);
    CGRect windowFrame = self->_window.frame;
    [UIView animateWithDuration:0.25
        delay:delay
        options:0
        animations:^{
          self->_window.frame = CGRectOffset(windowFrame, 0, -windowFrame.size.height);
        }
        completion:^(__unused BOOL finished) {
          self->_window.frame = windowFrame;
          self->_window.hidden = YES;
          self->_window = nil;
          self->_hiding = false;
        }];
#else // [macOS]
    for (NSWindow *window in [RCTKeyWindow() sheets]) {
      if ([[window identifier] isEqualToString:sRCTDevLoadingViewWindowIdentifier]) {
        [RCTKeyWindow() endSheet:window];
      }
    }
    self->_window = nil;
    self->_hiding = false;
#endif // macOS]
  });
}

- (void)showProgressMessage:(NSString *)message
{
  if (_window != nil) {
    // This is an optimization. Since the progress can come in quickly,
    // we want to do the minimum amount of work to update the UI,
    // which is to only update the label text.
    _label.text = message;
    return;
  }

  RCTUIColor *color = [RCTUIColor whiteColor]; // [macOS]
  RCTUIColor *backgroundColor = [RCTUIColor colorWithHue:105 saturation:0 brightness:.25 alpha:1]; // [macOS]

  if ([self isDarkModeEnabled]) {
    color = [RCTUIColor colorWithHue:208 saturation:0.03 brightness:.14 alpha:1]; // [macOS]
    backgroundColor = [RCTUIColor colorWithHue:0 saturation:0 brightness:0.98 alpha:1]; // [macOS]
  }

  [self showMessage:message color:color backgroundColor:backgroundColor];
}

- (void)showOfflineMessage
{
  // [macOS isDarkModeEnabled should only be run on the main thread
  __weak __typeof(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    RCTUIColor *color = [RCTUIColor whiteColor]; // [macOS]
    RCTUIColor *backgroundColor = [RCTUIColor blackColor]; // [macOS]

    if ([weakSelf isDarkModeEnabled]) {
      color = [RCTUIColor blackColor]; // [macOS]
      backgroundColor = [RCTUIColor whiteColor]; // [macOS]
    }

    NSString *message = [NSString stringWithFormat:@"Connect to %@ to develop JavaScript.", RCT_PACKAGER_NAME];
    [weakSelf showMessage:message color:color backgroundColor:backgroundColor];
  });
  // macOS]
}

- (BOOL)isDarkModeEnabled
{
  // We pass nil here to match the behavior of the native module.
  // If we were to pass a view, then it's possible that this native
  // banner would have a different color than the JavaScript banner
  // (which always passes nil). This would result in an inconsistent UI.
  return [RCTColorSchemePreference(nil) isEqualToString:@"dark"];
}
- (void)showWithURL:(NSURL *)URL
{
  if (URL.fileURL) {
    // If dev mode is not enabled, we don't want to show this kind of notification.
#if !RCT_DEV
    return;
#endif
    [self showOfflineMessage];
  } else {
    [self showInitialMessageDelayed:^{
      NSString *message = [NSString stringWithFormat:@"Loading from %@\u2026", RCT_PACKAGER_NAME];
      [self showProgressMessage:message];
    }];
  }
}

- (void)updateProgress:(RCTLoadingProgress *)progress
{
  if (!progress) {
    return;
  }

  // Cancel the initial message block so it's not flashed before progress.
  [self clearInitialMessageDelay];

  dispatch_async(dispatch_get_main_queue(), ^{
    [self showProgressMessage:[progress description]];
  });
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeDevLoadingViewSpecJSI>(params);
}

@end

#else

@implementation RCTDevLoadingView

+ (NSString *)moduleName
{
  return nil;
}
+ (void)setEnabled:(BOOL)enabled
{
}
- (void)showMessage:(NSString *)message color:(RCTUIColor *)color backgroundColor:(RCTUIColor *)backgroundColor // [macOS] RCTUIColor
{
}
- (void)showMessage:(NSString *)message withColor:(NSNumber *)color withBackgroundColor:(NSNumber *)backgroundColor
{
}
- (void)showWithURL:(NSURL *)URL
{
}
- (void)updateProgress:(RCTLoadingProgress *)progress
{
}
- (void)hide
{
}
- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeDevLoadingViewSpecJSI>(params);
}

@end

#endif

Class RCTDevLoadingViewCls(void)
{
  return RCTDevLoadingView.class;
}
