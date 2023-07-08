/*
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import <React/RCTComponentEvent.h>

#if TARGET_OS_OSX // [macOS

@interface RCTHandledKeyboardEvent : NSObject

@property (nonatomic, copy) NSString *key;
@property (nonatomic, assign) BOOL capsLockKey;
@property (nonatomic, assign) BOOL shiftKey;
@property (nonatomic, assign) BOOL ctrlKey;
@property (nonatomic, assign) BOOL altKey;
@property (nonatomic, assign) BOOL metaKey;
@property (nonatomic, assign) BOOL numericPadKey;
@property (nonatomic, assign) BOOL helpKey;
@property (nonatomic, assign) BOOL functionKey;

@end

@interface RCTViewKeyboardEvent : RCTComponentEvent

+ (instancetype)keyEventFromEvent:(NSEvent *)event reactTag:(NSNumber *)reactTag;
+ (NSString *)keyFromEvent:(NSEvent *)event;
+ (NSDictionary *)bodyFromEvent:(NSEvent *)event;


@end

#endif // macOS]
