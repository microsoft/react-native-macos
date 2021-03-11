/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUtils.h>

#import "RCTAlertController.h"

@interface RCTAlertController ()

<<<<<<< HEAD
#if !TARGET_OS_OSX // [TODO(macOS ISS#2323203)
@property (nonatomic, strong) UIWindow *alertWindow;
#endif // ]TODO(macOS ISS#2323203)
=======
@property (nonatomic, strong) UIWindow *alertWindow;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

@end

@implementation RCTAlertController

<<<<<<< HEAD
#if !TARGET_OS_OSX // [TODO(macOS ISS#2323203)
=======
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
- (UIWindow *)alertWindow
{
  if (_alertWindow == nil) {
    _alertWindow = [[UIWindow alloc] initWithFrame:RCTSharedApplication().keyWindow.bounds];
    _alertWindow.rootViewController = [UIViewController new];
    _alertWindow.windowLevel = UIWindowLevelAlert + 1;
  }
  return _alertWindow;
}

- (void)show:(BOOL)animated completion:(void (^)(void))completion
{
  [self.alertWindow makeKeyAndVisible];
  [self.alertWindow.rootViewController presentViewController:self animated:animated completion:completion];
}
<<<<<<< HEAD
#endif // ]TODO(macOS ISS#2323203)
=======
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

@end
