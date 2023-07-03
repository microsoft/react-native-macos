/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "objc/runtime.h"
#import <React/RCTAssert.h>
#import <React/RCTUtils.h>
#import <RCTConvert.h>
#import <RCTHandledKey.h>
#import <RCTViewKeyboardEvent.h>

#if TARGET_OS_OSX // [macOS

@implementation RCTHandledKey

+ (NSArray<NSString *> *)validModifiers {
  // keep in sync with actual properties and RCTViewKeyboardEvent
  return @[@"capsLock", @"shift", @"ctrl", @"alt", @"meta", @"numericPad", @"help", @"function"];
}

+ (BOOL)event:(NSEvent *)event matchesFilter:(NSArray<RCTHandledKey *> *)filter {
  for (RCTHandledKey *key in filter) {
	if ([key matchesEvent:event]) {
	  return YES;
	}
  }

  return NO;
}

+ (BOOL)key:(NSString *)key matchesFilter:(NSArray<RCTHandledKey *> *)filter {
  for (RCTHandledKey *aKey in filter) {
	if ([[aKey key] isEqualToString:key]) {
	  return YES;
	}
  }

  return NO;
}

- (instancetype)initWithKey:(NSString *)key {
  if ((self = [super init])) {
    self.key = key;
  }
  return self;
}

- (BOOL)matchesEvent:(NSEvent *)event
{
  NSEventType type = [event type];
  if (type != NSEventTypeKeyDown && type != NSEventTypeKeyUp) {
    RCTFatal(RCTErrorWithMessage([NSString stringWithFormat:@"Wrong event type (%d) sent to -[RCTHandledKey matchesEvent:]", (int)type]));
    return NO;
  }

  NSDictionary *body = [RCTViewKeyboardEvent bodyFromEvent:event];
  if (![body[@"key"] isEqualToString:self.key]) {
    return NO;
  }

  NSArray<NSString *> *modifiers = [RCTHandledKey validModifiers];
  for (NSString *modifier in modifiers) {
    NSString *modifierKey = [modifier stringByAppendingString:@"Key"];
    NSNumber *myValue = [self valueForKey:modifier];

    if (myValue == nil) {
		continue;
	}

	NSNumber *eventValue = (NSNumber *)body[modifierKey];
	if (eventValue == nil) {
		RCTFatal(RCTErrorWithMessage([NSString stringWithFormat:@"Event body has missing value for %@", modifierKey]));
		return NO;
	}

	if (![eventValue isKindOfClass:[NSNumber class]]) {
		RCTFatal(RCTErrorWithMessage([NSString stringWithFormat:@"Event body has unexpected value of class %@ for %@",
			NSStringFromClass(object_getClass(eventValue)), modifierKey]));
		return NO;
    }

	if (![myValue isEqualToNumber:body[modifierKey]]) {
		return NO;
	}
  }

  return YES;  // keys matched; all present modifiers matched
}

@end

@implementation RCTConvert (RCTHandledKey)

+ (RCTHandledKey *)RCTHandledKey:(id)json
{
  if ([json isKindOfClass:[NSString class]]) {
    return [[RCTHandledKey alloc] initWithKey:(NSString *)json];
  }

  if ([json isKindOfClass:[NSDictionary class]]) {
    NSDictionary *dict = (NSDictionary *)json;
    NSString *key = dict[@"key"];
    if (key == nil) {
      RCTLogConvertError(dict, @"a RCTHandledKey -- must include \"key\"");
      return nil;
    }

	RCTHandledKey *handledKey = [[RCTHandledKey alloc] initWithKey:key];
    NSArray<NSString *> *modifiers = RCTHandledKey.validModifiers;
    for (NSString *key in modifiers) {
      id value = dict[key];
      if (value == nil) {
        continue;
	  }

      if (![value isKindOfClass:[NSNumber class]]) {
        RCTLogConvertError(value, @"a boolean");
        return nil;
      }

      [handledKey setValue:@([(NSNumber *)value boolValue]) forKey:key];
    }

    return handledKey;
  }

  RCTLogConvertError(json, @"a RCTHandledKey -- allowed types are string and object");
  return nil;
}

@end

#endif // macOS]
