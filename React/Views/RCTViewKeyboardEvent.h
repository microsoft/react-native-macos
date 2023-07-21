/*
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import <React/RCTComponentEvent.h>

#if TARGET_OS_OSX // [macOS

@interface RCTViewKeyboardEvent : RCTComponentEvent

+ (instancetype)keyEventFromEvent:(NSEvent *)event reactTag:(NSNumber *)reactTag;
+ (NSString *)keyFromEvent:(NSEvent *)event;
+ (NSDictionary *)bodyFromEvent:(NSEvent *)event;


@end

#endif // macOS]
