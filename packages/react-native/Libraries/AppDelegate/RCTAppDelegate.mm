/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTAppDelegate.h"
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <React/RCTUtils.h>
#import <objc/runtime.h>
#import <react/featureflags/ReactNativeFeatureFlags.h>
#import <react/featureflags/ReactNativeFeatureFlagsDefaults.h>
#import <react/renderer/graphics/ColorComponents.h>
#import "RCTAppDelegate+Protected.h"
#import "RCTAppSetupUtils.h"

#if RN_DISABLE_OSS_PLUGIN_HEADER
#import <RCTTurboModulePlugin/RCTTurboModulePlugin.h>
#else
#import <React/CoreModulesPlugins.h>
#endif
#import <React/RCTBundleURLProvider.h>
#import <React/RCTComponentViewFactory.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTFabricSurface.h>
#import <React/RCTSurfaceHostingProxyRootView.h>
#import <React/RCTSurfacePresenter.h>
#import <ReactCommon/RCTContextContainerHandling.h>
#if USE_HERMES
#import <ReactCommon/RCTHermesInstance.h>
#else
#import <ReactCommon/RCTJscInstance.h>
#endif
#import <ReactCommon/RCTHost+Internal.h>
#import <ReactCommon/RCTHost.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <react/config/ReactNativeConfig.h>
#import <react/renderer/runtimescheduler/RuntimeScheduler.h>
#import <react/renderer/runtimescheduler/RuntimeSchedulerCallInvoker.h>
#import <react/runtime/JSRuntimeFactory.h>

@interface RCTAppDelegate () <RCTComponentViewFactoryComponentProvider, RCTTurboModuleManagerDelegate>
@end

@implementation RCTAppDelegate

#if !TARGET_OS_OSX // [macOS]
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#else // [macOS
- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
    NSApplication *application = [notification object];
    NSDictionary *launchOptions = [notification userInfo];
#endif // macOS]
  [self _setUpFeatureFlags];

  RCTSetNewArchEnabled([self newArchEnabled]);
  RCTAppSetupPrepareApp(application, self.turboModuleEnabled);

  self.rootViewFactory = [self createRCTRootViewFactory];

  // TODO SAAD: Implement on macOS
  RCTPlatformView *rootView = [self.rootViewFactory viewWithModuleName:self.moduleName
                                            initialProperties:self.initialProps
                                                launchOptions:launchOptions];

  if (self.newArchEnabled || self.fabricEnabled) {
    [RCTComponentViewFactory currentComponentViewFactory].thirdPartyFabricComponentsProvider = self;
  }
  [self _logWarnIfCreateRootViewWithBridgeIsOverridden];

#if !TARGET_OS_OSX // [macOS]
#if !TARGET_OS_VISION // [visionOS]
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
#else
  self.window = [[UIWindow alloc] initWithFrame:CGRectMake(0, 0, 1280, 720)];
#endif // [visionOS]
  UIViewController *rootViewController = [self createRootViewController];
  [self setRootView:rootView toRootViewController:rootViewController];
  self.window.rootViewController = rootViewController;
  self.window.windowScene.delegate = self;
  [self.window makeKeyAndVisible];

  return YES;
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
  [self.window center];
#endif // macOS]
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  // Noop
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  [NSException raise:@"RCTBridgeDelegate::sourceURLForBridge not implemented"
              format:@"Subclasses must implement a valid sourceURLForBridge method"];
  return nil;
}

- (RCTBridge *)createBridgeWithDelegate:(id<RCTBridgeDelegate>)delegate launchOptions:(NSDictionary *)launchOptions
{
  return [[RCTBridge alloc] initWithDelegate:delegate launchOptions:launchOptions];
}

- (RCTPlatformView *)createRootViewWithBridge:(RCTBridge *)bridge // [macOS]
                          moduleName:(NSString *)moduleName
                           initProps:(NSDictionary *)initProps
{
  BOOL enableFabric = self.fabricEnabled;
  RCTPlatformView *rootView = RCTAppSetupDefaultRootView(bridge, moduleName, initProps, enableFabric); // [macOS]

#if !TARGET_OS_OSX // [macOS]
  rootView.backgroundColor = [UIColor systemBackgroundColor];
#else // [macOS
  rootView.layer.backgroundColor = [[NSColor windowBackgroundColor] CGColor];
#endif // macOS]

  return rootView;
}

// TODO T173939093 - Remove _logWarnIfCreateRootViewWithBridgeIsOverridden after 0.74 is cut
- (void)_logWarnIfCreateRootViewWithBridgeIsOverridden
{
  SEL selector = @selector(createRootViewWithBridge:moduleName:initProps:);
  IMP baseClassImp = method_getImplementation(class_getInstanceMethod([RCTAppDelegate class], selector));
  IMP currentClassImp = method_getImplementation(class_getInstanceMethod([self class], selector));
  if (currentClassImp != baseClassImp) {
    NSString *warnMessage =
        @"If you are using the `createRootViewWithBridge` to customize the root view appearence,"
         "for example to set the backgroundColor, please migrate to `customiseView` method.\n"
         "The `createRootViewWithBridge` method is not invoked in bridgeless.";
    RCTLogWarn(@"%@", warnMessage);
  }
}

- (RCTUIViewController *)createRootViewController
{
  return [RCTUIViewController new];
}

- (void)setRootView:(RCTPlatformView *)rootView toRootViewController:(UIViewController *)rootViewController // [macOS]
{
  rootViewController.view = rootView;
}

- (void)customizeRootView:(RCTRootView *)rootView
{
  // Override point for customization after application launch.
}

#pragma mark - UISceneDelegate
#if !TARGET_OS_OSX // [macOS]
- (void)windowScene:(UIWindowScene *)windowScene
    didUpdateCoordinateSpace:(id<UICoordinateSpace>)previousCoordinateSpace
        interfaceOrientation:(UIInterfaceOrientation)previousInterfaceOrientation
             traitCollection:(UITraitCollection *)previousTraitCollection API_AVAILABLE(ios(13.0))
{
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTWindowFrameDidChangeNotification object:self];
}
#endif // [macOS]

#pragma mark - New Arch Enabled settings

- (BOOL)newArchEnabled
{
#if RCT_NEW_ARCH_ENABLED
  return YES;
#else
  return NO;
#endif
}

- (BOOL)turboModuleEnabled
{
  return [self newArchEnabled];
}

- (BOOL)fabricEnabled
{
  return [self newArchEnabled];
}

- (BOOL)bridgelessEnabled
{
  return [self newArchEnabled];
}

- (NSURL *)bundleURL
{
  [NSException raise:@"RCTAppDelegate::bundleURL not implemented"
              format:@"Subclasses must implement a valid getBundleURL method"];
  return nullptr;
}

#pragma mark - Bridge and Bridge Adapter properties

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
  self.rootViewFactory.bridge = bridge;
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
  return nullptr;
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

  configuration.createRootViewWithBridge = ^RCTPlatformView *(RCTBridge *bridge, NSString *moduleName, NSDictionary *initProps) // [macOS]
  {
    return [weakSelf createRootViewWithBridge:bridge moduleName:moduleName initProps:initProps];
  };

  configuration.createBridgeWithDelegate = ^RCTBridge *(id<RCTBridgeDelegate> delegate, NSDictionary *launchOptions)
  {
    return [weakSelf createBridgeWithDelegate:delegate launchOptions:launchOptions];
  };

  configuration.customizeRootView = ^(RCTPlatformView *_Nonnull rootView) { // [macOS]
    [weakSelf customizeRootView:(RCTRootView *)rootView];
  };

  return [[RCTRootViewFactory alloc] initWithConfiguration:configuration andTurboModuleManagerDelegate:self];
}

#pragma mark - Feature Flags

class RCTAppDelegateBridgelessFeatureFlags : public facebook::react::ReactNativeFeatureFlagsDefaults {
 public:
  bool useModernRuntimeScheduler() override
  {
    return true;
  }
  bool enableMicrotasks() override
  {
    return true;
  }
  bool batchRenderingUpdatesInEventLoop() override
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
