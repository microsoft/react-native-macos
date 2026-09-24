/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDefines.h>
#import <React/RCTUIKit.h> // [macOS]

#import "RCTRedBox+Internal.h"
#import "RCTRedBox.h"

#if RCT_DEV_MENU

@interface RCTRedBoxController
    : RCTPlatformViewController <RCTRedBoxControlling, RCTUITableViewDelegate, RCTUITableViewDataSource> // [macOS]

@property (nonatomic, weak) id<RCTRedBoxControllerActionDelegate> actionDelegate;

- (instancetype)initWithCustomButtonTitles:(NSArray<NSString *> *)customButtonTitles
                      customButtonHandlers:(NSArray<RCTRedBoxButtonPressHandler> *)customButtonHandlers;

- (void)showErrorMessage:(NSString *)message
               withStack:(NSArray<RCTJSStackFrame *> *)stack
                isUpdate:(BOOL)isUpdate
             errorCookie:(int)errorCookie;

- (void)dismiss;

@end

#endif
