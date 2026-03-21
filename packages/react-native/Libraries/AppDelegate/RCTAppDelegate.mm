/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTAppDelegate.h"
#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <React/RCTUtils.h>
#import <ReactCommon/RCTHost.h>
#include <React/RCTUIKit.h>
#import <objc/runtime.h>
#import "RCTAppSetupUtils.h"
#import "RCTDependencyProvider.h"

#if RN_DISABLE_OSS_PLUGIN_HEADER
#import <RCTTurboModulePlugin/RCTTurboModulePlugin.h>
#else
#import <React/CoreModulesPlugins.h>
#endif
#import <React/RCTComponentViewFactory.h>
#import <React/RCTComponentViewProtocol.h>
#import <react/nativemodule/defaults/DefaultTurboModules.h>

using namespace facebook::react;

#if TARGET_OS_OSX // [macOS
static NSString *sRCTAppDelegateMainWindowFrameAutoSaveName = @"RCTAppDelegateMainWindow";
#endif // macOS]

@implementation RCTAppDelegate

- (instancetype)init
{
  if (self = [super init]) {
    _automaticallyLoadReactNativeWindow = YES;
  }
  return self;
}

#if !TARGET_OS_OSX // [macOS]
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#else // [macOS
- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
    NSApplication *application = [notification object];
    NSDictionary *launchOptions = [notification userInfo];
#endif // macOS]
  self.reactNativeFactory = [[RCTReactNativeFactory alloc] initWithDelegate:self];

  if (self.automaticallyLoadReactNativeWindow) {
    [self loadReactNativeWindow:launchOptions];
  }

#if !TARGET_OS_OSX // [macOS]
  return YES;
#endif // macOS]
}

- (void)loadReactNativeWindow:(NSDictionary *)launchOptions
{
  RCTPlatformView *rootView = [self.rootViewFactory viewWithModuleName:self.moduleName // [macOS]
                                                     initialProperties:self.initialProps
                                                         launchOptions:launchOptions];

#if !TARGET_OS_OSX // [macOS]
#if !TARGET_OS_VISION // [visionOS]
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
#else
  self.window = [[UIWindow alloc] initWithFrame:CGRectMake(0, 0, 1280, 720)];
#endif // [visionOS]
  UIViewController *rootViewController = [self createRootViewController];
  [self setRootView:rootView toRootViewController:rootViewController];
  _window.rootViewController = rootViewController;
  [_window makeKeyAndVisible];
#else // [macOS
  NSRect frame = NSMakeRect(0,0,1280,720);
  self.window = [[NSWindow alloc] initWithContentRect:NSZeroRect
											styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskResizable | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable
											  backing:NSBackingStoreBuffered
												defer:NO];
  self.window.title = self.moduleName;
  self.window.autorecalculatesKeyViewLoop = YES;
  NSViewController *rootViewController = [NSViewController new];
  rootViewController.view = rootView;
  rootView.frame = frame;
  self.window.contentViewController = rootViewController;
  [self.window makeKeyAndOrderFront:self];
  if (![self.window setFrameUsingName:sRCTAppDelegateMainWindowFrameAutoSaveName]) {
    [self.window center];
  }
  [self.window setFrameAutosaveName:sRCTAppDelegateMainWindowFrameAutoSaveName];
#endif // macOS]
}

- (RCTRootViewFactory *)rootViewFactory
{
  return self.reactNativeFactory.rootViewFactory;
}

- (RCTBridge *)bridge
{
  return self.rootViewFactory.bridge;
}

- (RCTSurfacePresenterBridgeAdapter *)bridgeAdapter
{
  return self.rootViewFactory.bridgeAdapter;
}

- (void)setBridge:(RCTBridge *)bridge
{
  self.reactNativeFactory.rootViewFactory.bridge = bridge;
}

- (void)setBridgeAdapter:(RCTSurfacePresenterBridgeAdapter *)bridgeAdapter
{
  self.reactNativeFactory.rootViewFactory.bridgeAdapter = bridgeAdapter;
}

@end
