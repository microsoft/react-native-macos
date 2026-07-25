/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDefines.h>

#import "RCTRedBox+Internal.h"

#if RCT_DEV_MENU

typedef void (^RCTRedBox2ButtonPressHandler)(void);

#if !TARGET_OS_OSX // [macOS]
@interface RCTRedBox2Controller : UIViewController <RCTRedBox2Controlling, UITableViewDelegate, UITableViewDataSource>
#else // [macOS
@interface RCTRedBox2Controller : NSViewController <RCTRedBox2Controlling, NSTableViewDelegate, NSTableViewDataSource>
#endif // macOS]

@property (nonatomic, weak) id<RCTRedBoxControllerActionDelegate> actionDelegate;

- (instancetype)initWithCustomButtonTitles:(NSArray<NSString *> *)customButtonTitles
                      customButtonHandlers:(NSArray<RCTRedBox2ButtonPressHandler> *)customButtonHandlers;

- (void)showErrorMessage:(NSString *)message
               withStack:(NSArray<RCTJSStackFrame *> *)stack
                isUpdate:(BOOL)isUpdate
             errorCookie:(int)errorCookie;

/// The bundle URL used by the app, for the native HMR connection.
@property (nonatomic, strong, nullable) NSURL *bundleURL;

- (void)dismiss;
@end

#endif
