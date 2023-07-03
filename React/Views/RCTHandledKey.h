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
@property (nonatomic, assign) NSNumber *capsLock; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *shift; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *ctrl; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *alt; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *meta; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *numericPad; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *help; // boolean; nil == don't care
@property (nonatomic, assign) NSNumber *function; // boolean; nil == don't care

@end

@interface RCTConvert (RCTHandledKey)

+ (RCTHandledKey *)RCTHandledKey:(id)json;

@end

#endif // macOS]
