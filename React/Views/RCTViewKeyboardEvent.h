/*
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import <React/RCTComponentEvent.h>

@interface RCTViewKeyboardEvent : RCTComponentEvent

+ (instancetype)keyDownEventWithReactTag:(NSNumber *)reactTag characters:(NSString *)characters modifier:(NSUInteger)modifier;
+ (instancetype)keyUpEventWithReactTag:(NSNumber *)reactTag characters:(NSString *)characters modifier:(NSUInteger)modifier;

@end
