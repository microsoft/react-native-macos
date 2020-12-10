/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewKeyboardEvent.h"
#import <React/RCTAssert.h>

@implementation RCTViewKeyboardEvent

+ (instancetype)keyDownEventWithReactTag:(NSNumber *)reactTag characters:(NSString *)characters modifier:(NSUInteger)modifier {
  RCTViewKeyboardEvent *event = [[self alloc] initWithName:@"keyDown"
                                                  viewTag:reactTag
                                                     body:@{ @"characters" : characters,
                                                             @"modifier" : @(modifier) }];
  return event;
}

+ (instancetype)keyUpEventWithReactTag:(NSNumber *)reactTag characters:(NSString *)characters modifier:(NSUInteger)modifier {
  RCTViewKeyboardEvent *event = [[self alloc] initWithName:@"keyUp"
                                                  viewTag:reactTag
                                                     body:@{ @"characters" : characters,
                                                             @"modifier" : @(modifier) }];
  return event;
}

@end
