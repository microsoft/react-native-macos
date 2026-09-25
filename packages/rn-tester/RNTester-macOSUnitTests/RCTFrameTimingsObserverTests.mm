/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <XCTest/XCTest.h>

#import <CoreVideo/CVHostTime.h>
#import <React/RCTFrameTimingsObserver.h>
#import <React/RCTPlatformDisplayLink.h>
#import <React/RCTUIKit.h>

#import <optional>
#import <vector>

using namespace facebook::react;

static NSWindow *RCTFrameTimingsObserverTestWindow(void)
{
  NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 80, 40)
                                                 styleMask:NSWindowStyleMaskBorderless
                                                   backing:NSBackingStoreBuffered
                                                     defer:NO];
  NSView *contentView = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 80, 40)];
  contentView.wantsLayer = YES;
  contentView.layer.backgroundColor = NSColor.systemBlueColor.CGColor;
  window.contentView = contentView;
  return window;
}

@interface RCTPlatformDisplayLink (RCTFrameTimingsObserverTests)
- (void)updateTimestampsWithNow:(const CVTimeStamp *)now outputTime:(const CVTimeStamp *)outputTime;
@end

@interface RCTFrameTimingsObserver (RCTFrameTimingsObserverTests)
- (RCTPlatformDisplayLink *)_createDisplayLink;
- (RCTPlatformImage *)_captureScreenshot;
- (std::optional<std::vector<uint8_t>>)_encodeScreenshot:(RCTPlatformImage *)image;
- (RCTPlatformWindow *)_getKeyWindow;
@end

@interface RCTFrameTimingsObserverTestDisplayLink : RCTPlatformDisplayLink
@property (nonatomic) NSUInteger addCount;
@property (nonatomic) NSUInteger invalidationCount;
@end

@implementation RCTFrameTimingsObserverTestDisplayLink

- (void)addToRunLoop:(NSRunLoop *)runloop forMode:(NSRunLoopMode)mode
{
  self.addCount++;
}

- (void)invalidate
{
  self.invalidationCount++;
}

@end

@interface RCTFrameTimingsObserverTestObserver : RCTFrameTimingsObserver
@property (nonatomic, strong) RCTFrameTimingsObserverTestDisplayLink *testDisplayLink;
@property (nonatomic, strong, nullable) NSWindow *testWindow;
@end

@implementation RCTFrameTimingsObserverTestObserver

- (RCTPlatformDisplayLink *)_createDisplayLink
{
  return self.testDisplayLink;
}

- (RCTPlatformWindow *)_getKeyWindow
{
  return self.testWindow;
}

@end

@interface RCTFrameTimingsObserverTests : XCTestCase
@end

@implementation RCTFrameTimingsObserverTests

- (void)testDisplayLinkUsesCallbackOutputTimestamps
{
  RCTPlatformDisplayLink *displayLink = [RCTPlatformDisplayLink new];
  const double frequency = CVGetHostClockFrequency();
  CVTimeStamp now = {};
  CVTimeStamp output = {};
  now.hostTime = static_cast<uint64_t>(10.0 * frequency);
  output.hostTime = static_cast<uint64_t>(10.016 * frequency);

  [displayLink updateTimestampsWithNow:&now outputTime:&output];

  XCTAssertEqualWithAccuracy(displayLink.timestamp, 10.0, 0.000001);
  XCTAssertEqualWithAccuracy(displayLink.targetTimestamp, 10.016, 0.000001);

  now.hostTime = static_cast<uint64_t>(10.015 * frequency);
  output.hostTime = static_cast<uint64_t>(10.033 * frequency);
  [displayLink updateTimestampsWithNow:&now outputTime:&output];

  XCTAssertEqualWithAccuracy(displayLink.timestamp, 10.016, 0.000001);
  XCTAssertEqualWithAccuracy(displayLink.targetTimestamp, 10.033, 0.000001);
}

- (void)testStartAndStopAreIdempotent
{
  RCTFrameTimingsObserverTestDisplayLink *displayLink = [RCTFrameTimingsObserverTestDisplayLink new];
  RCTFrameTimingsObserverTestObserver *observer = [[RCTFrameTimingsObserverTestObserver alloc]
      initWithScreenshotsEnabled:NO
                        callback:^(jsinspector_modern::tracing::FrameTimingSequence /*sequence*/){
                        }];
  observer.testDisplayLink = displayLink;

  [observer start];
  [observer start];
  XCTAssertEqual(displayLink.addCount, 1U);

  [observer stop];
  [observer stop];
  XCTAssertEqual(displayLink.invalidationCount, 1U);
}

- (void)testCaptureProducesJPEGAndSuppressesDuplicates
{
  NSWindow *window = RCTFrameTimingsObserverTestWindow();

  RCTFrameTimingsObserverTestObserver *observer = [[RCTFrameTimingsObserverTestObserver alloc]
      initWithScreenshotsEnabled:YES
                        callback:^(jsinspector_modern::tracing::FrameTimingSequence /*sequence*/){
                        }];
  observer.testWindow = window;

  RCTPlatformImage *image = [observer _captureScreenshot];
  XCTAssertNotNil(image);
  NSBitmapImageRep *representation = (NSBitmapImageRep *)image.representations.firstObject;
  XCTAssertTrue([representation isKindOfClass:[NSBitmapImageRep class]]);
  XCTAssertEqual(representation.pixelsWide, lround(80 * window.backingScaleFactor));
  XCTAssertEqual(representation.pixelsHigh, lround(40 * window.backingScaleFactor));

  auto jpeg = [observer _encodeScreenshot:image];
  XCTAssertTrue(jpeg.has_value());
  XCTAssertGreaterThan(jpeg->size(), 4U);
  XCTAssertEqual((*jpeg)[0], 0xff);
  XCTAssertEqual((*jpeg)[1], 0xd8);
  XCTAssertEqual((*jpeg)[jpeg->size() - 2], 0xff);
  XCTAssertEqual((*jpeg)[jpeg->size() - 1], 0xd9);
  XCTAssertNotNil([[NSImage alloc] initWithData:[NSData dataWithBytes:jpeg->data() length:jpeg->size()]]);

  XCTAssertNil([observer _captureScreenshot]);
}

- (void)testStartRecordsFrameSequenceWithJPEG
{
  XCTestExpectation *expectation = [self expectationWithDescription:@"Frame sequence recorded"];
  RCTFrameTimingsObserverTestObserver *observer = [[RCTFrameTimingsObserverTestObserver alloc]
      initWithScreenshotsEnabled:YES
                        callback:^(jsinspector_modern::tracing::FrameTimingSequence sequence) {
                          XCTAssertEqual(sequence.id, 0U);
                          XCTAssertTrue(sequence.screenshot.has_value());
                          XCTAssertGreaterThan(sequence.screenshot->size(), 4U);
                          XCTAssertEqual((*sequence.screenshot)[0], 0xff);
                          XCTAssertEqual((*sequence.screenshot)[1], 0xd8);
                          [expectation fulfill];
                        }];
  observer.testDisplayLink = [RCTFrameTimingsObserverTestDisplayLink new];
  observer.testWindow = RCTFrameTimingsObserverTestWindow();

  [observer start];
  [self waitForExpectations:@[ expectation ] timeout:2];
  [observer stop];
}

- (void)testMissingWindowEmitsTimingWithoutScreenshot
{
  XCTestExpectation *expectation = [self expectationWithDescription:@"Timing emitted"];
  RCTFrameTimingsObserverTestObserver *observer = [[RCTFrameTimingsObserverTestObserver alloc]
      initWithScreenshotsEnabled:YES
                        callback:^(jsinspector_modern::tracing::FrameTimingSequence sequence) {
                          XCTAssertFalse(sequence.screenshot.has_value());
                          [expectation fulfill];
                        }];
  observer.testDisplayLink = [RCTFrameTimingsObserverTestDisplayLink new];
  observer.testWindow = nil;

  [observer start];
  [self waitForExpectations:@[ expectation ] timeout:2];
  [observer stop];
}

@end
