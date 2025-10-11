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

@interface RCTAppDelegate () <RCTComponentViewFactoryComponentProvider, RCTHostDelegate>
@end

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
  self.rootViewFactory.bridgeAdapter = bridgeAdapter;
}

#pragma mark - RCTTurboModuleManagerDelegate

- (Class)getModuleClassFromName:(const char *)name
{
#if RN_DISABLE_OSS_PLUGIN_HEADER
  return RCTTurboModulePluginClassProvider(name);
#else
  return RCTCoreModulesClassProvider(name);
#endif
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  return facebook::react::DefaultTurboModules::getTurboModule(name, jsInvoker);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                     initParams:
                                                         (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return nullptr;
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

#pragma mark - RCTComponentViewFactoryComponentProvider

- (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
  return @{};
}

- (RCTRootViewFactory *)createRCTRootViewFactory
{
  __weak __typeof(self) weakSelf = self;
  RCTBundleURLBlock bundleUrlBlock = ^{
    RCTAppDelegate *strongSelf = weakSelf;
    return strongSelf.bundleURL;
  };

  RCTRootViewFactoryConfiguration *configuration =
      [[RCTRootViewFactoryConfiguration alloc] initWithBundleURLBlock:bundleUrlBlock
                                                       newArchEnabled:self.fabricEnabled
                                                   turboModuleEnabled:self.turboModuleEnabled
                                                    bridgelessEnabled:self.bridgelessEnabled];

  configuration.createRootViewWithBridge = ^RCTPlatformView *(RCTBridge *bridge, NSString *moduleName, NSDictionary *initProps) { // [macOS]
    return [weakSelf createRootViewWithBridge:bridge moduleName:moduleName initProps:initProps];
  };

  configuration.createBridgeWithDelegate = ^RCTBridge *(id<RCTBridgeDelegate> delegate, NSDictionary *launchOptions) {
    return [weakSelf createBridgeWithDelegate:delegate launchOptions:launchOptions];
  };

  configuration.customizeRootView = ^(RCTPlatformView *_Nonnull rootView) { // [macOS]
    [weakSelf customizeRootView:(RCTRootView *)rootView];
  };

  configuration.sourceURLForBridge = ^NSURL *_Nullable(RCTBridge *_Nonnull bridge)
  {
    return [weakSelf sourceURLForBridge:bridge];
  };

  configuration.hostDidStartBlock = ^(RCTHost *_Nonnull host) {
    [weakSelf hostDidStart:host];
  };

  configuration.hostDidReceiveJSErrorStackBlock =
      ^(RCTHost *_Nonnull host,
        NSArray<NSDictionary<NSString *, id> *> *_Nonnull stack,
        NSString *_Nonnull message,
        NSUInteger exceptionId,
        BOOL isFatal) {
        [weakSelf host:host didReceiveJSErrorStack:stack message:message exceptionId:exceptionId isFatal:isFatal];
      };

  if ([self respondsToSelector:@selector(extraModulesForBridge:)]) {
    configuration.extraModulesForBridge = ^NSArray<id<RCTBridgeModule>> *_Nonnull(RCTBridge *_Nonnull bridge)
    {
      return [weakSelf extraModulesForBridge:bridge];
    };
  }

  if ([self respondsToSelector:@selector(extraLazyModuleClassesForBridge:)]) {
    configuration.extraLazyModuleClassesForBridge =
        ^NSDictionary<NSString *, Class> *_Nonnull(RCTBridge *_Nonnull bridge)
    {
      return [weakSelf extraLazyModuleClassesForBridge:bridge];
    };
  }

  if ([self respondsToSelector:@selector(bridge:didNotFindModule:)]) {
    configuration.bridgeDidNotFindModule = ^BOOL(RCTBridge *_Nonnull bridge, NSString *_Nonnull moduleName) {
      return [weakSelf bridge:bridge didNotFindModule:moduleName];
    };
  }

  return [[RCTRootViewFactory alloc] initWithConfiguration:configuration andTurboModuleManagerDelegate:self];
}

#pragma mark - Feature Flags

class RCTAppDelegateBridgelessFeatureFlags : public ReactNativeFeatureFlagsDefaults {
 public:
  bool enableBridgelessArchitecture() override
  {
    return true;
  }
  bool enableFabricRenderer() override
  {
    return true;
  }
  bool useTurboModules() override
  {
    return true;
  }
  bool useNativeViewConfigsInBridgelessMode() override
  {
    return true;
  }
};

- (void)_setUpFeatureFlags
{
  if ([self bridgelessEnabled]) {
    facebook::react::ReactNativeFeatureFlags::override(std::make_unique<RCTAppDelegateBridgelessFeatureFlags>());
  }
}

@end
