/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTKeyWindowValuesProxy.h"
#import <React/RCTAssert.h>
#import <React/RCTUtils.h>
#import <mutex>

#import <React/RCTConstants.h>

static NSString *const kFrameKeyPath = @"frame";

@implementation RCTKeyWindowValuesProxy {
  BOOL _isObserving;
  std::mutex _mutex;
  CGSize _currentWindowSize;
#if !TARGET_OS_OSX // [macOS]
  UIInterfaceOrientation _currentInterfaceOrientation;
#endif // [macOS]

}

+ (instancetype)sharedInstance
{
  static RCTKeyWindowValuesProxy *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [RCTKeyWindowValuesProxy new];
  });
  return sharedInstance;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _isObserving = NO;
    RCTPlatformWindow *mainWindow = RCTKeyWindow(); // [macOS]
  #if !TARGET_OS_OSX // [macOS]
  #if !TARGET_OS_VISION // [visionOS]
    _currentWindowSize = mainWindow ? mainWindow.bounds.size : UIScreen.mainScreen.bounds.size;
  #else // [visionOS
    _currentWindowSize = mainWindow.bounds.size;
  #endif // [visionOS]
  #else // [macOS
    _currentWindowSize = mainWindow ? mainWindow.frame.size : NSScreen.mainScreen.frame.size;
  #endif // macOS]
  }
  return self;
}

- (void)startObservingWindowSizeIfNecessary
{
  // Accesing _isObserving must be done under the lock to avoid a race condition.
  // We can't hold the lock while calling RCTUnsafeExecuteOnMainQueueSync.
  // Therefore, reading/writing _isObserving is kept separate from calling RCTUnsafeExecuteOnMainQueueSync.
  {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_isObserving) {
      return;
    }
    _isObserving = YES;
  }

  // For backwards compatibility, we register for notifications from the main thread only.
  // On the new architecture, we are already on the main thread and RCTUnsafeExecuteOnMainQueueSync will simply call
  // the block.
  RCTUnsafeExecuteOnMainQueueSync(^{
    [RCTKeyWindow() addObserver:self forKeyPath:kFrameKeyPath options:NSKeyValueObservingOptionNew context:nil];
  });

#if !TARGET_OS_OSX // [macOS]
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(_interfaceOrientationDidChange)
                                               name:UIApplicationDidBecomeActiveNotification
                                             object:nil];
#endif // [macOS]
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary *)change
                       context:(void *)context
{
  if ([keyPath isEqualToString:kFrameKeyPath]) {
    [[NSNotificationCenter defaultCenter] postNotificationName:RCTWindowFrameDidChangeNotification object:self];
    {
      std::lock_guard<std::mutex> lock(_mutex);
      _currentWindowSize = RCTKeyWindow().frame.size; // [macOS]
    }
  }
}

- (CGSize)windowSize
{
  {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_isObserving) {
      return _currentWindowSize;
    }
  }

  __block CGSize size;
  RCTUnsafeExecuteOnMainQueueSync(^{
    size = RCTKeyWindow().frame.size; // [macOS]
  });
  return size;
}

#if !TARGET_OS_OSX // [macOS]
- (UIInterfaceOrientation)currentInterfaceOrientation
{
  {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_isObserving) {
      return _currentInterfaceOrientation;
    }
  }

  __block UIInterfaceOrientation interfaceOrientation;
  RCTUnsafeExecuteOnMainQueueSync(^{
    interfaceOrientation = RCTKeyWindow().windowScene.interfaceOrientation;
  });
  return interfaceOrientation;
}

- (void)_interfaceOrientationDidChange
{
  std::lock_guard<std::mutex> lock(_mutex);
  _currentInterfaceOrientation = RCTKeyWindow().windowScene.interfaceOrientation;
}
#endif // [macOS]

@end
