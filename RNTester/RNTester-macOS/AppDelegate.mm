//
//  AppDelegate.m
//  RNTester-macOS
//
//  Created by Jeff Cruikshank on 6/5/17.
//  Copyright © 2017 Facebook. All rights reserved.
//

#import "AppDelegate.h"

#import <React/JSCExecutorFactory.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTJavaScriptLoader.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTImageLoader.h>
#import <React/RCTLocalAssetImageLoader.h>
#import <React/RCTGIFImageDecoder.h>
#import <React/RCTNetworking.h>
#import <React/RCTHTTPRequestHandler.h>
#import <React/RCTDataRequestHandler.h>
#import <React/RCTFileRequestHandler.h>
#import <React/RCTRootView.h>

#import <cxxreact/JSExecutor.h>

#if !TARGET_OS_TV && !TARGET_OS_UIKITFORMAC
#import <React/RCTPushNotificationManager.h>
#endif

#ifdef RN_FABRIC_ENABLED
#import <React/RCTSurfacePresenter.h>
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#endif

#import <ReactCommon/RCTTurboModuleManager.h>
#import <React/RCTTextAttributes.h> // TODO(OSS Candidate ISS#2710739)

#import "RNTesterTurboModuleProvider.h"

NSString *kBundleNameJS = @"RNTesterApp";

@interface AppDelegate () <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate, NSUserNotificationCenterDelegate>
{
#ifdef RN_FABRIC_ENABLED
  RCTSurfacePresenter *_surfacePresenter;
#endif

  RCTTurboModuleManager *_turboModuleManager;
}
@end

@implementation AppDelegate
{
  NSMutableArray *_mainWindows;
}

- (void)awakeFromNib
{
	[super awakeFromNib];
 
   RCTEnableTurboModule(YES);

	_bridge = [[RCTBridge alloc] initWithDelegate:self
																	launchOptions:nil];

  // Optionally set the global `fontSmoothing` setting.
  // If not explicitly set, the default is subpixel-antialiased
  [RCTTextAttributes setFontSmoothingDefault:RCTFontSmoothingSubpixelAntialiased];
}

- (void)applicationWillFinishLaunching:(NSNotification *)__unused aNotification
{
  [NSUserNotificationCenter defaultUserNotificationCenter].delegate = self;
  
	// initialize the url event listeners for Linking module
	// note that you will need to add a URL type to your app’s info.plist
	// this sample registers the rntester scheme
	[[NSAppleEventManager sharedAppleEventManager] setEventHandler:[RCTLinkingManager class]
                                                     andSelector:@selector(getUrlEventHandler:withReplyEvent:)
                                                   forEventClass:kInternetEventClass
                                                      andEventID:kAEGetURL];

}

-(IBAction)newDocument:(id)__unused sender
{
  if (_mainWindows == nil) {
    _mainWindows = [NSMutableArray new];
  }
  
  NSWindowController *windowController = [[NSStoryboard storyboardWithName:@"Main" bundle:nil] instantiateControllerWithIdentifier:@"MainWindow"];
  [_mainWindows addObject:windowController];
  [windowController showWindow:self];
}

#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(__unused RCTBridge *)bridge
{
	NSString *jsBundlePath = [NSString stringWithFormat:@"RNTester/js/%@.macos",kBundleNameJS];
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:jsBundlePath
                                                        fallbackResource:nil];
}

#pragma mark - RCTCxxBridgeDelegate Methods

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                             delegate:self
                                                            jsInvoker:bridge.jsCallInvoker];
  __weak __typeof(self) weakSelf = self;
  return std::make_unique<facebook::react::JSCExecutorFactory>(
    facebook::react::RCTJSIExecutorRuntimeInstaller([weakSelf, bridge](facebook::jsi::Runtime &runtime) {
      if (!bridge) {
        return;
      }
      __typeof(self) strongSelf = weakSelf;
      if (strongSelf) {
        [strongSelf->_turboModuleManager installJSBindingWithRuntime:&runtime];
      }
    })
  );
}

#pragma mark RCTTurboModuleManagerDelegate

- (Class)getModuleClassFromName:(const char *)name
{
  return facebook::react::RNTesterTurboModuleClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  return facebook::react::RNTesterTurboModuleProvider(name, jsInvoker);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                       instance:(id<RCTTurboModule>)instance
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
                                                      nativeInvoker:(std::shared_ptr<facebook::react::CallInvoker>)nativeInvoker
                                                      perfLogger:(id<RCTTurboModulePerformanceLogger>)perfLogger
{
  return facebook::react::RNTesterTurboModuleProvider(name, instance, jsInvoker, nativeInvoker, perfLogger);
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  if (moduleClass == RCTImageLoader.class) {
    return [[moduleClass alloc] initWithRedirectDelegate:nil loadersProvider:^NSArray<id<RCTImageURLLoader>> *{
      return @[[RCTLocalAssetImageLoader new]];
    } decodersProvider:^NSArray<id<RCTImageDataDecoder>> *{
      return @[[RCTGIFImageDecoder new]];
    }];
  } else if (moduleClass == RCTNetworking.class) {
    return [[moduleClass alloc] initWithHandlersProvider:^NSArray<id<RCTURLRequestHandler>> *{
      return @[
        [RCTHTTPRequestHandler new],
        [RCTDataRequestHandler new],
        [RCTFileRequestHandler new],
      ];
    }];
  }
  // No custom initializer here.
  return [moduleClass new];
}

# pragma mark - Push Notifications

// Required for the remoteNotificationsRegistered event.
- (void)application:(NSApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RCTPushNotificationManager didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Required for the remoteNotificationRegistrationError event.
- (void)application:(NSApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [RCTPushNotificationManager didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the remoteNotificationReceived event.
- (void)application:(NSApplication *)application didReceiveRemoteNotification:(NSDictionary<NSString *,id> *)userInfo
{
  [RCTPushNotificationManager didReceiveRemoteNotification:userInfo];
}

- (void)userNotificationCenter:(NSUserNotificationCenter *)center didDeliverNotification:(NSUserNotification *)notification
{
  
}

- (void)userNotificationCenter:(NSUserNotificationCenter *)center didActivateNotification:(NSUserNotification *)notification
{
  [RCTPushNotificationManager didReceiveUserNotification:notification];
}

- (BOOL)userNotificationCenter:(NSUserNotificationCenter *)center shouldPresentNotification:(NSUserNotification *)notification
{
  return YES;
}

@end