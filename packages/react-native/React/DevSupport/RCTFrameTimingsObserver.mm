/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTFrameTimingsObserver.h"

#import <React/RCTPlatformDisplayLink.h> // [macOS]
#import <React/RCTUIKit.h> // [macOS]

#import <mach/thread_act.h>
#import <pthread.h>

#import <atomic>
#import <chrono>
#import <mutex>
#import <optional>
#import <vector>

#import <react/timing/primitives.h>

using namespace facebook::react;

#if !TARGET_OS_OSX // [macOS]
static constexpr CGFloat kScreenshotScaleFactor = 1.0;
#endif // macOS]
static constexpr CGFloat kScreenshotJPEGQuality = 0.8;

namespace {

// Stores a captured frame screenshot and its associated metadata, used for
// buffering frames during dynamic sampling.
struct FrameData {
  RCTPlatformImage *image; // [macOS]
  uint64_t frameId;
  jsinspector_modern::tracing::ThreadId threadId;
  HighResTimeStamp beginTimestamp;
  HighResTimeStamp endTimestamp;
};

} // namespace

@implementation RCTFrameTimingsObserver {
  BOOL _screenshotsEnabled;
  RCTFrameTimingCallback _callback;
  RCTPlatformDisplayLink *_displayLink; // [macOS]
  uint64_t _frameCounter;
  // Serial queue for encoding work (single background thread). We limit to 1
  // thread to minimize the performance impact of screenshot recording.
  dispatch_queue_t _encodingQueue;
  std::atomic<bool> _running;
  uint64_t _lastScreenshotHash;

  // Stores the most recently captured frame to opportunistically encode after
  // the current frame. Replaced frames are emitted as timings without
  // screenshots.
  std::mutex _lastFrameMutex;
  std::optional<FrameData> _lastFrameData;

  std::atomic<bool> _encodingInProgress;
}

- (instancetype)initWithScreenshotsEnabled:(BOOL)screenshotsEnabled callback:(RCTFrameTimingCallback)callback
{
  if (self = [super init]) {
    _screenshotsEnabled = screenshotsEnabled;
    _callback = [callback copy];
    _frameCounter = 0;
    _encodingQueue = dispatch_queue_create("com.facebook.react.frame-timings-observer", DISPATCH_QUEUE_SERIAL);
    _running.store(false);
    _lastScreenshotHash = 0;
    _encodingInProgress.store(false);
  }
  return self;
}

- (void)start
{
  bool expected = false;
  if (!_running.compare_exchange_strong(expected, true, std::memory_order_relaxed)) {
    return;
  }

  _frameCounter = 0;
  _lastScreenshotHash = 0;
  _encodingInProgress.store(false, std::memory_order_relaxed);
  {
    std::lock_guard<std::mutex> lock(_lastFrameMutex);
    _lastFrameData.reset();
  }

  // Emit initial frame event
  auto now = HighResTimeStamp::now();
  [self _emitFrameTimingWithBeginTimestamp:now endTimestamp:now];

  _displayLink = [self _createDisplayLink]; // [macOS]
  [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)stop
{
  if (!_running.exchange(false, std::memory_order_relaxed)) {
    return;
  }

  [_displayLink invalidate];
  _displayLink = nil;
  {
    std::lock_guard<std::mutex> lock(_lastFrameMutex);
    _lastFrameData.reset();
  }
}

- (RCTPlatformDisplayLink *)_createDisplayLink // [macOS]
{
  return [RCTPlatformDisplayLink displayLinkWithTarget:self selector:@selector(_displayLinkTick:)];
}

- (void)_displayLinkTick:(RCTPlatformDisplayLink *)sender // [macOS]
{
  // CADisplayLink.timestamp and targetTimestamp are in the same timebase as
  // CACurrentMediaTime() / mach_absolute_time(), which on Apple platforms maps
  // to CLOCK_UPTIME_RAW — the same clock backing std::chrono::steady_clock.
  auto beginNanos = static_cast<int64_t>(sender.timestamp * 1e9);
  auto endNanos = static_cast<int64_t>(sender.targetTimestamp * 1e9);

  auto beginTimestamp = HighResTimeStamp::fromChronoSteadyClockTimePoint(
      std::chrono::steady_clock::time_point(std::chrono::nanoseconds(beginNanos)));
  auto endTimestamp = HighResTimeStamp::fromChronoSteadyClockTimePoint(
      std::chrono::steady_clock::time_point(std::chrono::nanoseconds(endNanos)));

  [self _emitFrameTimingWithBeginTimestamp:beginTimestamp endTimestamp:endTimestamp];
}

- (void)_emitFrameTimingWithBeginTimestamp:(HighResTimeStamp)beginTimestamp endTimestamp:(HighResTimeStamp)endTimestamp
{
  uint64_t frameId = _frameCounter++;
  auto threadId = static_cast<jsinspector_modern::tracing::ThreadId>(pthread_mach_thread_np(pthread_self()));

  if (!_screenshotsEnabled) {
    // Screenshots disabled - emit without screenshot
    [self _emitFrameEventWithFrameId:frameId
                            threadId:threadId
                      beginTimestamp:beginTimestamp
                        endTimestamp:endTimestamp
                          screenshot:std::nullopt];
    return;
  }

  RCTPlatformImage *image = [self _captureScreenshot]; // [macOS]
  if (image == nil) {
    // Failed to capture (e.g. no window, duplicate hash) - emit without screenshot
    [self _emitFrameEventWithFrameId:frameId
                            threadId:threadId
                      beginTimestamp:beginTimestamp
                        endTimestamp:endTimestamp
                          screenshot:std::nullopt];
    return;
  }

  FrameData frameData{image, frameId, threadId, beginTimestamp, endTimestamp};

  bool expected = false;
  if (_encodingInProgress.compare_exchange_strong(expected, true)) {
    // Not encoding - encode this frame immediately
    [self _encodeFrame:std::move(frameData)];
  } else {
    // Encoding thread busy - store current screenshot in buffer for tail-capture
    std::optional<FrameData> oldFrame;
    {
      std::lock_guard<std::mutex> lock(_lastFrameMutex);
      oldFrame = std::move(_lastFrameData);
      _lastFrameData = std::move(frameData);
    }
    if (oldFrame.has_value()) {
      // Skipped frame - emit event without screenshot
      [self _emitFrameEventWithFrameId:oldFrame->frameId
                              threadId:oldFrame->threadId
                        beginTimestamp:oldFrame->beginTimestamp
                          endTimestamp:oldFrame->endTimestamp
                            screenshot:std::nullopt];
    }
  }
}

- (void)_emitFrameEventWithFrameId:(uint64_t)frameId
                          threadId:(jsinspector_modern::tracing::ThreadId)threadId
                    beginTimestamp:(HighResTimeStamp)beginTimestamp
                      endTimestamp:(HighResTimeStamp)endTimestamp
                        screenshot:(std::optional<std::vector<uint8_t>>)screenshot
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
    if (!self->_running.load(std::memory_order_relaxed)) {
      return;
    }
    jsinspector_modern::tracing::FrameTimingSequence sequence{
        frameId, threadId, beginTimestamp, endTimestamp, std::move(screenshot)};
    self->_callback(std::move(sequence));
  });
}

- (void)_encodeFrame:(FrameData)frameData
{
  dispatch_async(_encodingQueue, ^{
    if (!self->_running.load(std::memory_order_relaxed)) {
      return;
    }

    auto screenshot = [self _encodeScreenshot:frameData.image];
    [self _emitFrameEventWithFrameId:frameData.frameId
                            threadId:frameData.threadId
                      beginTimestamp:frameData.beginTimestamp
                        endTimestamp:frameData.endTimestamp
                          screenshot:std::move(screenshot)];

    // Clear encoding flag early, allowing new frames to start fresh encoding
    // sessions
    self->_encodingInProgress.store(false, std::memory_order_release);

    // Opportunistically encode tail frame (if present) without blocking new
    // frames
    std::optional<FrameData> tailFrame;
    {
      std::lock_guard<std::mutex> lock(self->_lastFrameMutex);
      tailFrame = std::move(self->_lastFrameData);
      self->_lastFrameData.reset();
    }
    if (tailFrame.has_value()) {
      if (!self->_running.load(std::memory_order_relaxed)) {
        return;
      }
      auto tailScreenshot = [self _encodeScreenshot:tailFrame->image];
      [self _emitFrameEventWithFrameId:tailFrame->frameId
                              threadId:tailFrame->threadId
                        beginTimestamp:tailFrame->beginTimestamp
                          endTimestamp:tailFrame->endTimestamp
                            screenshot:std::move(tailScreenshot)];
    }
  });
}

// Captures a screenshot of the current window. Must be called on the main
// thread. Returns nil if capture fails or if the frame content is unchanged.
- (RCTPlatformImage *)_captureScreenshot // [macOS]
{
  RCTPlatformWindow *keyWindow = [self _getKeyWindow]; // [macOS]
  if (keyWindow == nil) {
    return nil;
  }

#if !TARGET_OS_OSX // [macOS]
  UIView *rootView = keyWindow.rootViewController.view ?: keyWindow;
  CGSize viewSize = rootView.bounds.size;
  CGSize scaledSize = CGSizeMake(viewSize.width * kScreenshotScaleFactor, viewSize.height * kScreenshotScaleFactor);

  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
  format.scale = 1.0;
  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:scaledSize format:format];

  UIImage *image = [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
    [rootView drawViewHierarchyInRect:CGRectMake(0, 0, scaledSize.width, scaledSize.height) afterScreenUpdates:NO];
  }];
#else // [macOS
  NSView *rootView = keyWindow.contentViewController.view ?: keyWindow.contentView;
  NSRect bounds = rootView.bounds;
  if (NSIsEmptyRect(bounds)) {
    return nil;
  }

  NSBitmapImageRep *bitmap = [rootView bitmapImageRepForCachingDisplayInRect:bounds];
  if (bitmap == nil) {
    return nil;
  }
  [rootView cacheDisplayInRect:bounds toBitmapImageRep:bitmap];

  RCTUIImage *image = [[RCTUIImage alloc] initWithSize:bounds.size];
  [image addRepresentation:bitmap];
#endif // macOS]

  // Skip duplicate frames via sampled FNV-1a pixel hash
  CGImageRef cgImage = UIImageGetCGImageRef(image); // [macOS]
  CGDataProviderRef dataProvider = cgImage == nil ? nil : CGImageGetDataProvider(cgImage); // [macOS]
  if (dataProvider == nil) { // [macOS]
    return nil; // [macOS]
  } // [macOS]
  CFDataRef pixelData = CGDataProviderCopyData(dataProvider); // [macOS]
  if (pixelData == nil) { // [macOS]
    return nil; // [macOS]
  } // [macOS]
  uint64_t hash = 0xcbf29ce484222325ULL;
  const uint8_t *ptr = CFDataGetBytePtr(pixelData);
  CFIndex length = CFDataGetLength(pixelData);
  // Use prime stride to prevent row alignment on power-of-2 pixel widths
  for (CFIndex i = 0; i < length; i += 67) {
    hash ^= ptr[i];
    hash *= 0x100000001b3ULL;
  }
  CFRelease(pixelData);

  if (hash == _lastScreenshotHash) {
    return nil;
  }
  _lastScreenshotHash = hash;

  return image;
}

- (std::optional<std::vector<uint8_t>>)_encodeScreenshot:(RCTPlatformImage *)image // [macOS]
{
#if !TARGET_OS_OSX // [macOS]
  NSData *jpegData = UIImageJPEGRepresentation(image, kScreenshotJPEGQuality);
#else // [macOS
  NSImageRep *imageRep = image.representations.firstObject;
  if (![imageRep isKindOfClass:[NSBitmapImageRep class]]) {
    return std::nullopt;
  }
  NSData *jpegData =
      [(NSBitmapImageRep *)imageRep representationUsingType:NSBitmapImageFileTypeJPEG
                                                 properties:@{NSImageCompressionFactor : @(kScreenshotJPEGQuality)}];
#endif // macOS]
  if (jpegData == nil) {
    return std::nullopt;
  }

  const auto *bytes = static_cast<const uint8_t *>(jpegData.bytes);
  return std::vector<uint8_t>(bytes, bytes + jpegData.length);
}

- (RCTPlatformWindow *)_getKeyWindow // [macOS]
{
#if !TARGET_OS_OSX // [macOS]
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (scene.activationState == UISceneActivationStateForegroundActive &&
        [scene isKindOfClass:[UIWindowScene class]]) {
      auto windowScene = (UIWindowScene *)scene;
      for (UIWindow *window = nullptr in windowScene.windows) {
        if (window.isKeyWindow) {
          return window;
        }
      }
    }
  }
  return nil;
#else // [macOS
  NSMutableOrderedSet<NSWindow *> *windows = [NSMutableOrderedSet new];
  if (NSApp.mainWindow != nil) {
    [windows addObject:NSApp.mainWindow];
  }
  if (NSApp.keyWindow != nil) {
    [windows addObject:NSApp.keyWindow];
  }
  [windows addObjectsFromArray:NSApp.orderedWindows];

  for (NSWindow *window in windows) {
    NSView *contentView = window.contentViewController.view ?: window.contentView;
    if (window.isVisible && !window.isMiniaturized && window.screen != nil && contentView.window == window &&
        !NSIsEmptyRect(contentView.bounds)) {
      return window;
    }
  }
  return nil;
#endif // macOS]
}

@end
