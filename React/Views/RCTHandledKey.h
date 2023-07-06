/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX // [macOS
#import <React/RCTConvert.h>

@interface RCTHandledKey : NSObject

+ (BOOL)event:(NSEvent *)event matchesFilter:(NSArray<RCTHandledKey *> *)filter;
+ (BOOL)key:(NSString *)key matchesFilter:(NSArray<RCTHandledKey *> *)filter;

- (instancetype)initWithKey:(NSString *)key;
- (BOOL)matchesEvent:(NSEvent *)event;

@property (nonatomic, copy) NSString *key;
@property (nonatomic, assign) NSNumber *altKey; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *ctrlKey; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *metaKey; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *shiftKey; // boolean; nil == don't care

@end

@interface RCTConvert (RCTHandledKey)

+ (RCTHandledKey *)RCTHandledKey:(id)json;

@end

#endif // macOS]
