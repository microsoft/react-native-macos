/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import <TargetConditionals.h>
#if TARGET_OS_OSX // [macOS]

#import <React/RCTLinkingManager.h>

#import <FBReactNativeSpec/FBReactNativeSpec.h>

#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>

#import "RCTLinkingPlugins.h"

NSString *const RCTOpenURLNotification = @"RCTOpenURLNotification";

static NSString *initialURL = nil;
static BOOL moduleInitalized = NO;
static BOOL alwaysForegroundLastWindow = YES;

@interface RCTLinkingManager () <NativeLinkingManagerSpec>
@end

static void postNotificationWithURL(NSString *url, id sender)
{
  NSDictionary<NSString *, id> *payload = @{@"url": url};
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTOpenURLNotification
                                                        object:sender
                                                      userInfo:payload];
}

@implementation RCTLinkingManager

RCT_EXPORT_MODULE()

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)startObserving
{
    moduleInitalized = YES;

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleOpenURLNotification:)
                                                 name:RCTOpenURLNotification
                                               object:nil];
}

- (void)stopObserving
{
    moduleInitalized = NO;
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[@"url"];
}

+ (void)setAlwaysForegroundLastWindow:(BOOL)alwaysForeground
{
    alwaysForegroundLastWindow = alwaysForeground;
}

+ (void)getUrlEventHandler:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)replyEvent
{
    // extract url value from the event
    NSString* url = [[event paramDescriptorForKeyword:keyDirectObject] stringValue];

    // If the application was launched via URL, this handler will be called before
    // the module is initialized by the bridge. Store the initial URL, becase we are not listening to the notification yet.
    if (!moduleInitalized && initialURL == nil) {
        initialURL = url;
    }

    postNotificationWithURL(url, self);
}

- (void)handleOpenURLNotification:(NSNotification *)notification
{
    // Activate app, because [NSApp mainWindow] returns nil when the app is hidden and another app is maximized
    [NSApp activateIgnoringOtherApps:YES];
    // foreground top level window
    if (alwaysForegroundLastWindow) {      
      NSWindow *lastWindow = [[NSApp windows] lastObject];
      [lastWindow makeKeyAndOrderFront:nil];
    }
    [self sendEventWithName:@"url" body:notification.userInfo];
}

RCT_EXPORT_METHOD(openURL:(NSURL *)URL
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    BOOL result = [[NSWorkspace sharedWorkspace] openURL:URL];
    if (result) {
        resolve(@YES);
    } else {
        reject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", URL], nil);
    }
}

RCT_EXPORT_METHOD(canOpenURL:(NSURL *)URL
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(__unused RCTPromiseRejectBlock)reject)
{
    resolve(@YES);
}

RCT_EXPORT_METHOD(getInitialURL:(RCTPromiseResolveBlock)resolve
                  reject:(__unused RCTPromiseRejectBlock)reject)
{
    resolve(RCTNullIfNil(initialURL));
}

RCT_EXPORT_METHOD(openSettings:(RCTPromiseResolveBlock)resolve
                  reject:(__unused RCTPromiseRejectBlock)reject)
{
  // macOS doesn't have a direct equivalent of UIApplicationOpenSettingsURLString
  // Open System Preferences instead
  [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"x-apple.systempreferences:"]];
  resolve(nil);
}

RCT_EXPORT_METHOD(sendIntent:(NSString *)action
                  extras:(NSArray *_Nullable)extras
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  RCTLogError(@"Not implemented: %@", NSStringFromSelector(_cmd));
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeLinkingManagerSpecJSI>(params);
}

@end

Class RCTLinkingManagerCls(void) {
  return RCTLinkingManager.class;
}

#endif // TARGET_OS_OSX [macOS]
