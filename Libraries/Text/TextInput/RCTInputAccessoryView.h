/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUIKit.h> // TODO(macOS ISS#2323203)

@class RCTBridge;
@class RCTInputAccessoryViewContent;

@interface RCTInputAccessoryView : UIView

- (instancetype)initWithBridge:(RCTBridge *)bridge;

@end
