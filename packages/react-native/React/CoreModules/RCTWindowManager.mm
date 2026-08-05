/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTWindowManager.h"

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTConvert.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>

#import "CoreModulesPlugins.h"

#if TARGET_OS_OSX // [macOS
#import <React/RCTRootView.h>
#endif // macOS]

@interface RCTWindowManager () <NativeWindowManagerMacOSSpec>

@end

#if TARGET_OS_OSX // [macOS

/**
 * `RCTRootViewFactory` lives in the `React-RCTAppDelegate` pod, which itself depends on
 * `React-Core` (and therefore on `React-CoreModules`). Importing `RCTRootViewFactory.h` here
 * would create a circular pod dependency, so we instead redeclare just the two members we need
 * as local protocols. Objective-C dispatches by selector, so a plain message send against these
 * protocol types reaches the real `RCTAppDelegate`/`RCTRootViewFactory` implementations while
 * keeping this file free of any compile-time dependency on that pod. Both call sites are guarded
 * by `respondsToSelector:`.
 */
@protocol RCTWindowManagerRootViewFactory <NSObject>
- (RCTPlatformView *)viewWithModuleName:(NSString *)moduleName
                      initialProperties:(NSDictionary *)initialProperties
                          launchOptions:(NSDictionary *)launchOptions;
@end

@protocol RCTWindowManagerRootViewFactoryProvider <NSObject>
- (id<RCTWindowManagerRootViewFactory>)rootViewFactory;
@end

@class RCTWindowHost;

/**
 * Forward declaration of the `RCTWindowHost` callback methods implemented further down on
 * `RCTWindowManager`, so that `RCTWindowHost` (declared next) can call them.
 */
@interface RCTWindowManager (RCTWindowHostCallbacks)
- (void)windowHostWillClose:(RCTWindowHost *)host;
- (void)windowHostDidBecomeKey:(RCTWindowHost *)host;
- (void)windowHostDidResignKey:(RCTWindowHost *)host;
- (void)windowHostDidResize:(RCTWindowHost *)host;
@end

/**
 * Private helper object that owns one extra `NSWindow` and the React root view hosted inside
 * it. Acts as the window's delegate so it can notify `RCTWindowManager` about lifecycle and
 * focus events.
 */
@interface RCTWindowHost : NSObject <NSWindowDelegate>

@property (nonatomic, copy) NSString *key;
@property (nonatomic, copy) NSString *moduleName;
@property (nonatomic, strong) NSWindow *window;
@property (nonatomic, strong) RCTPlatformView *rootView;
@property (nonatomic, weak) RCTWindowManager *manager;

@end

@implementation RCTWindowHost

- (void)windowWillClose:(NSNotification *)notification
{
  [self.manager windowHostWillClose:self];
}

- (void)windowDidBecomeKey:(NSNotification *)notification
{
  [self.manager windowHostDidBecomeKey:self];
}

- (void)windowDidResignKey:(NSNotification *)notification
{
  [self.manager windowHostDidResignKey:self];
}

- (void)windowDidResize:(NSNotification *)notification
{
  [self.manager windowHostDidResize:self];
}

@end

#endif // macOS]

@implementation RCTWindowManager {
#if TARGET_OS_OSX // [macOS
  NSMutableDictionary<NSString *, RCTWindowHost *> *_windows;
  BOOL _hasListeners;
#endif // macOS]
}

RCT_EXPORT_MODULE(WindowManagerMacOS)

- (instancetype)init
{
  if (self = [super init]) {
#if TARGET_OS_OSX // [macOS
    _windows = [NSMutableDictionary new];
#endif // macOS]
  }
  return self;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"windowDidOpen", @"windowDidClose", @"windowDidFocus", @"windowDidBlur", @"windowDidResize" ];
}

- (void)startObserving
{
#if TARGET_OS_OSX // [macOS
  _hasListeners = YES;
#endif // macOS]
}

- (void)stopObserving
{
#if TARGET_OS_OSX // [macOS
  _hasListeners = NO;
#endif // macOS]
}

#if TARGET_OS_OSX // [macOS

#pragma mark - Helpers

- (void)emit:(NSString *)name body:(NSDictionary *)body
{
  if (!_hasListeners) {
    return;
  }
  [self sendEventWithName:name body:body];
}

- (NSDictionary *)infoForHost:(RCTWindowHost *)host
{
  NSWindow *window = host.window;
  return @{
    @"key" : host.key,
    @"moduleName" : host.moduleName,
    @"title" : window.title ?: @"",
    @"width" : @(window.contentLayoutRect.size.width),
    @"height" : @(window.contentLayoutRect.size.height),
    @"x" : @(window.frame.origin.x),
    @"y" : @(window.frame.origin.y),
    @"isKey" : @(window.isKeyWindow),
    @"isVisible" : @(window.isVisible),
  };
}

/**
 * Creates a React root view for `moduleName`, preferring the app delegate's
 * `RCTRootViewFactory` (works for old architecture, Fabric, and bridgeless alike, since
 * `RCTRootViewFactory` guards bridge/host creation internally and can safely be invoked more
 * than once), and falling back to `-[RCTRootView initWithBridge:moduleName:initialProperties:]`
 * when only a bridge is available. Never uses `-initWithBundleURL:`, which would create a
 * second bridge.
 */
- (RCTPlatformView *)rootViewForModuleName:(NSString *)moduleName
                          initialProperties:(NSDictionary *)initialProperties
                                       error:(NSString **)errorOut
{
  id delegate = [NSApp delegate];
  if ([delegate respondsToSelector:@selector(rootViewFactory)]) {
    id<RCTWindowManagerRootViewFactory> factory =
        [(id<RCTWindowManagerRootViewFactoryProvider>)delegate rootViewFactory];

    if ([factory respondsToSelector:@selector(viewWithModuleName:initialProperties:launchOptions:)]) {
      return [factory viewWithModuleName:moduleName initialProperties:initialProperties launchOptions:nil];
    }
  }

  if (self.bridge != nil) {
    return [[RCTRootView alloc] initWithBridge:self.bridge moduleName:moduleName initialProperties:initialProperties];
  }

  if (errorOut != NULL) {
    *errorOut =
        @"Could not obtain a React root view: no RCTRootViewFactory on the app delegate and no bridge available.";
  }
  return nil;
}

#pragma mark - RCTWindowHost callbacks

- (void)windowHostWillClose:(RCTWindowHost *)host
{
  host.window.delegate = nil;
  [_windows removeObjectForKey:host.key];
  NSString *key = host.key;
  NSString *moduleName = host.moduleName;
  host.rootView = nil;
  [self emit:@"windowDidClose" body:@{@"key" : key, @"moduleName" : moduleName}];
}

- (void)windowHostDidBecomeKey:(RCTWindowHost *)host
{
  [self emit:@"windowDidFocus" body:[self infoForHost:host]];
}

- (void)windowHostDidResignKey:(RCTWindowHost *)host
{
  [self emit:@"windowDidBlur" body:[self infoForHost:host]];
}

- (void)windowHostDidResize:(RCTWindowHost *)host
{
  [self emit:@"windowDidResize" body:[self infoForHost:host]];
}

#pragma mark - RCTInvalidating

- (void)invalidate
{
  NSArray<RCTWindowHost *> *hosts = [_windows.allValues copy];
  for (RCTWindowHost *host in hosts) {
    host.window.delegate = nil;
    [host.window close];
  }
  [_windows removeAllObjects];
  [super invalidate];
}

#pragma mark - Exported methods

RCT_EXPORT_METHOD(open : (NSDictionary *)options resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  NSString *moduleName = [RCTConvert NSString:options[@"moduleName"]];
  if (moduleName.length == 0) {
    reject(@"E_INVALID_ARGS", @"`moduleName` is required", nil);
    return;
  }

  NSString *key = [RCTConvert NSString:options[@"key"]] ?: moduleName;

  RCTWindowHost *existingHost = _windows[key];
  if (existingHost != nil) {
    BOOL focus = options[@"focus"] == nil ? YES : [RCTConvert BOOL:options[@"focus"]];
    if (focus) {
      [existingHost.window makeKeyAndOrderFront:nil];
    }
    resolve([self infoForHost:existingHost]);
    return;
  }

  NSDictionary *initialProps = [RCTConvert NSDictionary:options[@"initialProps"]] ?: @{};
  NSString *title = [RCTConvert NSString:options[@"title"]] ?: moduleName;
  double width = options[@"width"] != nil ? [RCTConvert double:options[@"width"]] : 640;
  double height = options[@"height"] != nil ? [RCTConvert double:options[@"height"]] : 480;
  double minWidth = options[@"minWidth"] != nil ? [RCTConvert double:options[@"minWidth"]] : 0;
  double minHeight = options[@"minHeight"] != nil ? [RCTConvert double:options[@"minHeight"]] : 0;
  BOOL hasPosition = options[@"x"] != nil && options[@"y"] != nil;
  double x = hasPosition ? [RCTConvert double:options[@"x"]] : 0;
  double y = hasPosition ? [RCTConvert double:options[@"y"]] : 0;
  BOOL resizable = options[@"resizable"] == nil ? YES : [RCTConvert BOOL:options[@"resizable"]];
  BOOL closable = options[@"closable"] == nil ? YES : [RCTConvert BOOL:options[@"closable"]];
  BOOL minimizable = options[@"minimizable"] == nil ? YES : [RCTConvert BOOL:options[@"minimizable"]];
  BOOL titlebarAppearsTransparent = [RCTConvert BOOL:options[@"titlebarAppearsTransparent"]];
  BOOL hidesOnDeactivate = [RCTConvert BOOL:options[@"hidesOnDeactivate"]];
  BOOL alwaysOnTop = [RCTConvert BOOL:options[@"alwaysOnTop"]];
  BOOL rememberFrame = [RCTConvert BOOL:options[@"rememberFrame"]];
  BOOL focus = options[@"focus"] == nil ? YES : [RCTConvert BOOL:options[@"focus"]];

  NSString *rootViewError = nil;
  RCTPlatformView *rootView = [self rootViewForModuleName:moduleName
                                          initialProperties:initialProps
                                                       error:&rootViewError];
  if (rootView == nil) {
    reject(@"E_NO_ROOT_VIEW", rootViewError, nil);
    return;
  }

  NSWindowStyleMask styleMask = NSWindowStyleMaskTitled;
  if (resizable) {
    styleMask |= NSWindowStyleMaskResizable;
  }
  if (closable) {
    styleMask |= NSWindowStyleMaskClosable;
  }
  if (minimizable) {
    styleMask |= NSWindowStyleMaskMiniaturizable;
  }

  NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, width, height)
                                                  styleMask:styleMask
                                                    backing:NSBackingStoreBuffered
                                                      defer:NO];
  // Required: we hold `window` in a strong property on `RCTWindowHost`, so AppKit must not
  // additionally release it when the user closes it, or we'd over-release.
  window.releasedWhenClosed = NO;
  window.title = title;
  window.autorecalculatesKeyViewLoop = YES;

  if (minWidth > 0 || minHeight > 0) {
    window.contentMinSize = NSMakeSize(minWidth, minHeight);
  }

  if (titlebarAppearsTransparent) {
    window.titlebarAppearsTransparent = YES;
  }
  if (hidesOnDeactivate) {
    window.hidesOnDeactivate = YES;
  }
  if (alwaysOnTop) {
    window.level = NSFloatingWindowLevel;
  }

  rootView.frame = NSMakeRect(0, 0, width, height);
  NSViewController *rootViewController = [NSViewController new];
  rootViewController.view = rootView;
  window.contentViewController = rootViewController;

  NSString *frameAutosaveName = [@"RCTWindowManager." stringByAppendingString:key];
  BOOL frameRestored = NO;
  if (rememberFrame) {
    frameRestored = [window setFrameUsingName:frameAutosaveName];
  }
  if (!frameRestored) {
    if (hasPosition) {
      [window setFrameOrigin:NSMakePoint(x, y)];
    } else {
      [window center];
    }
  }
  if (rememberFrame) {
    [window setFrameAutosaveName:frameAutosaveName];
  }

  RCTWindowHost *host = [RCTWindowHost new];
  host.key = key;
  host.moduleName = moduleName;
  host.window = window;
  host.rootView = rootView;
  host.manager = self;
  window.delegate = host;

  _windows[key] = host;

  if (focus) {
    [window makeKeyAndOrderFront:nil];
  } else {
    [window orderFront:nil];
  }

  NSDictionary *info = [self infoForHost:host];
  resolve(info);
  [self emit:@"windowDidOpen" body:info];
}

RCT_EXPORT_METHOD(close : (NSString *)key resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  RCTWindowHost *host = _windows[key];
  if (host == nil) {
    resolve(@NO);
    return;
  }
  [host.window close];
  resolve(@YES);
}

RCT_EXPORT_METHOD(focus : (NSString *)key resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  RCTWindowHost *host = _windows[key];
  if (host == nil) {
    resolve(@NO);
    return;
  }
  [NSApp activateIgnoringOtherApps:YES];
  [host.window makeKeyAndOrderFront:nil];
  resolve(@YES);
}

RCT_EXPORT_METHOD(setTitle : (NSString *)key title : (NSString *)title resolve : (RCTPromiseResolveBlock)resolve
                       reject : (RCTPromiseRejectBlock)reject)
{
  RCTWindowHost *host = _windows[key];
  if (host == nil) {
    resolve(@NO);
    return;
  }
  host.window.title = title;
  resolve(@YES);
}

RCT_EXPORT_METHOD(isOpen : (NSString *)key resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  resolve(@(_windows[key] != nil));
}

RCT_EXPORT_METHOD(getWindows : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  NSMutableArray<NSDictionary *> *result = [NSMutableArray arrayWithCapacity:_windows.count];
  for (RCTWindowHost *host in _windows.allValues) {
    [result addObject:[self infoForHost:host]];
  }
  resolve(result);
}

#else // [macOS] iOS is not supported: fulfil protocol conformance but always reject.

RCT_EXPORT_METHOD(open : (NSDictionary *)options resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  reject(@"E_UNSUPPORTED_PLATFORM", @"WindowManagerMacOS is only available on macOS", nil);
}

RCT_EXPORT_METHOD(close : (NSString *)key resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  reject(@"E_UNSUPPORTED_PLATFORM", @"WindowManagerMacOS is only available on macOS", nil);
}

RCT_EXPORT_METHOD(focus : (NSString *)key resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  reject(@"E_UNSUPPORTED_PLATFORM", @"WindowManagerMacOS is only available on macOS", nil);
}

RCT_EXPORT_METHOD(setTitle : (NSString *)key title : (NSString *)title resolve : (RCTPromiseResolveBlock)resolve
                       reject : (RCTPromiseRejectBlock)reject)
{
  reject(@"E_UNSUPPORTED_PLATFORM", @"WindowManagerMacOS is only available on macOS", nil);
}

RCT_EXPORT_METHOD(isOpen : (NSString *)key resolve : (RCTPromiseResolveBlock)resolve reject
                   : (RCTPromiseRejectBlock)reject)
{
  reject(@"E_UNSUPPORTED_PLATFORM", @"WindowManagerMacOS is only available on macOS", nil);
}

RCT_EXPORT_METHOD(getWindows : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  reject(@"E_UNSUPPORTED_PLATFORM", @"WindowManagerMacOS is only available on macOS", nil);
}

#endif // macOS]

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeWindowManagerMacOSSpecJSI>(params);
}

@end

Class RCTWindowManagerCls(void)
{
  return RCTWindowManager.class;
}
