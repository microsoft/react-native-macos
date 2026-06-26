/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTComponentData.h>
#import <React/RCTViewManager.h>
#import <XCTest/XCTest.h>

@interface RCTComponentDataTestViewManager : RCTViewManager
@end

@implementation RCTComponentDataTestViewManager

+ (NSArray<NSString *> *)propConfig_customInt
{
  return @[ @"int" ];
}

+ (NSString *)moduleName
{
  return @"RCTComponentDataTestView";
}

- (RCTPlatformView *)view
{
  return [RCTPlatformView new];
}

@end

@interface RCTComponentDataNoGetterTarget : NSObject
@property (nonatomic, assign, readonly) int storedValue;
@property (nonatomic, assign, readonly) NSInteger setterCallCount;
@end

@implementation RCTComponentDataNoGetterTarget {
  int _storedValue;
  NSInteger _setterCallCount;
}

- (void)setCustomInt:(int)value
{
  _storedValue = value;
  _setterCallCount += 1;
}

- (int)storedValue
{
  return _storedValue;
}

- (NSInteger)setterCallCount
{
  return _setterCallCount;
}

- (NSNumber *)reactTag
{
  return @1;
}

@end

@interface RCTComponentDataGetterTarget : NSObject
@property (nonatomic, assign, readonly) int storedValue;
@end

@implementation RCTComponentDataGetterTarget {
  int _storedValue;
}

- (void)setCustomInt:(int)value
{
  _storedValue = value;
}

- (int)customInt
{
  return _storedValue;
}

- (int)storedValue
{
  return _storedValue;
}

- (NSNumber *)reactTag
{
  return @2;
}

@end

@interface RCTComponentDataTests : XCTestCase
@end

@implementation RCTComponentDataTests

- (RCTComponentData *)makeComponentData
{
  return [[RCTComponentData alloc] initWithManagerClass:[RCTComponentDataTestViewManager class]
                                                 bridge:nil
                                        eventDispatcher:nil];
}

- (void)testNoGetterResetsToZeroAfterNonNullSet
{
  RCTComponentData *componentData = [self makeComponentData];
  RCTComponentDataNoGetterTarget *target = [RCTComponentDataNoGetterTarget new];

  [componentData setProps:@{ @"customInt" : @42 } forView:(id)target];
  XCTAssertEqual(target.storedValue, 42);

  XCTAssertNoThrow([
      componentData setProps:@{ @"customInt" : [NSNull null] } forView:(id)target]);
  XCTAssertEqual(target.storedValue, 0);
}

- (void)testFirstNullIsNoOpForNoGetter
{
  RCTComponentData *componentData = [self makeComponentData];
  RCTComponentDataNoGetterTarget *target = [RCTComponentDataNoGetterTarget new];

  [target setCustomInt:7];
  NSInteger callCountBefore = target.setterCallCount;

  [componentData setProps:@{ @"customInt" : [NSNull null] } forView:(id)target];

  XCTAssertEqual(target.storedValue, 7);
  XCTAssertEqual(target.setterCallCount, callCountBefore);
}

- (void)testGetterPathStillRestoresOriginalDefault
{
  RCTComponentData *componentData = [self makeComponentData];
  RCTComponentDataGetterTarget *target = [RCTComponentDataGetterTarget new];

  [target setCustomInt:9];

  [componentData setProps:@{ @"customInt" : @42 } forView:(id)target];
  XCTAssertEqual(target.storedValue, 42);

  [componentData setProps:@{ @"customInt" : [NSNull null] } forView:(id)target];
  XCTAssertEqual(target.storedValue, 9);
}

@end
