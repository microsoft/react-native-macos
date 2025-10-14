/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX // [macOS
#import "RCTAppearanceProxy.h"

#import <React/RCTConstants.h>
#import <React/RCTUtils.h>

#import <mutex>

@implementation RCTAppearanceProxy {
  BOOL _isObserving;
  std::mutex _mutex;
  NSAppearance *_currentAppearance;
}

+ (instancetype)sharedInstance
{
  static RCTAppearanceProxy *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [RCTAppearanceProxy new];
  });
  return sharedInstance;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _isObserving = NO;
    _currentAppearance = [NSApp effectiveAppearance];
  }
  return self;
}

- (void)startObservingAppearance
{
  RCTAssertMainQueue();
  std::lock_guard<std::mutex> lock(_mutex);
  if (!_isObserving) {
    _isObserving = YES;
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(_appearanceDidChange:)
                                                 name:RCTUserInterfaceStyleDidChangeNotification
                                               object:nil];
  }
}

- (NSAppearance *)currentAppearance
{
  {
    std::lock_guard<std::mutex> lock(_mutex);
    if (_isObserving) {
      return _currentAppearance;
    }
  }

  __block NSAppearance *appearance = nil;
  if (RCTIsMainQueue()) {
    appearance = [NSApp effectiveAppearance];
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      appearance = [NSApp effectiveAppearance];
    });
  }
  return appearance;
}

- (void)_appearanceDidChange:(NSNotification *)notification
{
  std::lock_guard<std::mutex> lock(_mutex);

  NSDictionary *userInfo = [notification userInfo];
  if (userInfo) {
    NSAppearance *appearance = userInfo[RCTUserInterfaceStyleDidChangeNotificationAppearanceKey];
    if (appearance != nil) {
      _currentAppearance = appearance;
      return;
    }
  }

  _currentAppearance = [NSApp effectiveAppearance];
}

@end
#endif // macOS]
