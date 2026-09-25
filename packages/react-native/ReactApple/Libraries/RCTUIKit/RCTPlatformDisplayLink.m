/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]
#if TARGET_OS_OSX

#import "RCTPlatformDisplayLink.h"

#import <CoreVideo/CVDisplayLink.h>
#import <CoreVideo/CVHostTime.h>

#import <os/lock.h>

@interface RCTPlatformDisplayLink ()

@property (nonatomic, strong) NSRunLoop *runLoop;

- (void)enqueueTickWithNow:(const CVTimeStamp *)now outputTime:(const CVTimeStamp *)outputTime;
- (void)updateTimestampsWithNow:(const CVTimeStamp *)now outputTime:(const CVTimeStamp *)outputTime;
- (void)tick;

@end

@implementation RCTPlatformDisplayLink {
  CVDisplayLinkRef _displayLink;
  SEL _selector;
  __weak id _target;
  NSRunLoop *_runLoop;
  NSMutableArray<NSRunLoopMode> *_modes;
  os_unfair_lock _lock; // OS_UNFAIR_LOCK_INIT == 0
  CFTimeInterval _timestamp;
  CFTimeInterval _targetTimestamp;
  CFTimeInterval _lastOutputTimestamp;
}

+ (RCTPlatformDisplayLink *)displayLinkWithTarget:(id)target selector:(SEL)sel
{
  RCTPlatformDisplayLink *displayLink = [self.class new];
  displayLink->_target = target;
  displayLink->_selector = sel;
  return displayLink;
}

static CVReturn RCTPlatformDisplayLinkCallBack(
    __unused CVDisplayLinkRef displayLink,
    const __unused CVTimeStamp *now,
    const __unused CVTimeStamp *outputTime,
    __unused CVOptionFlags flagsIn,
    __unused CVOptionFlags *flagsOut,
    void *displayLinkContext)
{
  @autoreleasepool {
    RCTPlatformDisplayLink *rctDisplayLink = (__bridge RCTPlatformDisplayLink *)displayLinkContext;

    [rctDisplayLink enqueueTickWithNow:now outputTime:outputTime];
  }
  return kCVReturnSuccess;
}

- (void)dealloc
{
  if (_displayLink != NULL) {
    CVDisplayLinkStop(_displayLink);
    CVDisplayLinkRelease(_displayLink);
    _displayLink = NULL;
  }
}

- (void)addToRunLoop:(NSRunLoop *)runloop forMode:(NSRunLoopMode)mode
{
  os_unfair_lock_lock(&_lock);
  _runLoop = runloop;

  if (_displayLink != NULL) {
    [_modes addObject:mode];
    os_unfair_lock_unlock(&_lock);
    return;
  }

  _modes = @[ mode ].mutableCopy;
  os_unfair_lock_unlock(&_lock);
  CVReturn ret = CVDisplayLinkCreateWithActiveCGDisplays(&_displayLink);
  if (ret != kCVReturnSuccess) {
    ret = CVDisplayLinkCreateWithCGDisplay(CGMainDisplayID(), &_displayLink);
  }
  NSCAssert(ret == kCVReturnSuccess, @"Cannot create display link");
  CVDisplayLinkSetOutputCallback(_displayLink, &RCTPlatformDisplayLinkCallBack, (__bridge void *)(self));
  CVDisplayLinkStart(_displayLink);
}

- (void)removeFromRunLoop:(__unused NSRunLoop *)runloop forMode:(NSRunLoopMode)mode
{
  [_modes removeObject:mode];
  if (_modes.count == 0) {
    [self invalidate];
  }
}

- (void)invalidate
{
  if (_runLoop != nil) {
    os_unfair_lock_lock(&_lock);
    _runLoop = nil;
    _modes = nil;
    os_unfair_lock_unlock(&_lock);

    // CVDisplayLinkStop attempts to acquire a mutex possibly held during the callback's invocation.
    // Stop the display link outside of the lock to avoid deadlocking here.
    if (_displayLink != NULL) {
      CVDisplayLinkStop(_displayLink);
    }
  }
}

- (void)setPaused:(BOOL)paused
{
  if (paused) {
    CVDisplayLinkStop(_displayLink);
  } else {
    CVDisplayLinkStart(_displayLink);
  }
}

- (BOOL)isPaused
{
  return !CVDisplayLinkIsRunning(_displayLink);
}

- (NSTimeInterval)timestamp
{
  os_unfair_lock_lock(&_lock);
  CFTimeInterval timestamp = _timestamp;
  os_unfair_lock_unlock(&_lock);
  return timestamp;
}

- (NSTimeInterval)targetTimestamp
{
  os_unfair_lock_lock(&_lock);
  CFTimeInterval targetTimestamp = _targetTimestamp;
  os_unfair_lock_unlock(&_lock);
  return targetTimestamp;
}

- (NSTimeInterval)duration
{
  NSTimeInterval duration = 0;
  const CVTime time = CVDisplayLinkGetNominalOutputVideoRefreshPeriod(_displayLink);
  if (!(time.flags & kCVTimeIsIndefinite)) {
    duration = (NSTimeInterval)time.timeValue / (NSTimeInterval)time.timeScale;
  }
  return duration;
}

- (void)updateTimestampsWithNow:(const CVTimeStamp *)now outputTime:(const CVTimeStamp *)outputTime
{
  const NSTimeInterval hostClockFrequency = (NSTimeInterval)CVGetHostClockFrequency();
  const NSTimeInterval callbackTimestamp = (NSTimeInterval)now->hostTime / hostClockFrequency;
  const NSTimeInterval outputTimestamp = (NSTimeInterval)outputTime->hostTime / hostClockFrequency;

  // Match CADisplayLink semantics: timestamp identifies the previous display
  // update and targetTimestamp identifies the update currently being scheduled.
  _timestamp =
      _lastOutputTimestamp > 0 && _lastOutputTimestamp <= outputTimestamp ? _lastOutputTimestamp : callbackTimestamp;
  _targetTimestamp = MAX(outputTimestamp, _timestamp);
  _lastOutputTimestamp = _targetTimestamp;
}

- (void)enqueueTickWithNow:(const CVTimeStamp *)now outputTime:(const CVTimeStamp *)outputTime
{
  os_unfair_lock_lock(&_lock);
  if (_runLoop == nil) {
    os_unfair_lock_unlock(&_lock);
    return;
  }

  [self updateTimestampsWithNow:now outputTime:outputTime];
  CFTimeInterval timestamp = _timestamp;
  CFTimeInterval targetTimestamp = _targetTimestamp;
  CFRunLoopRef cfRunLoop = [_runLoop getCFRunLoop];
  NSArray<NSRunLoopMode> *modes = [_modes copy];
  CFRunLoopPerformBlock(cfRunLoop, (__bridge CFArrayRef)modes, ^{
    @autoreleasepool {
      os_unfair_lock_lock(&self->_lock);
      if (self->_runLoop == nil) {
        os_unfair_lock_unlock(&self->_lock);
        return;
      }
      self->_timestamp = timestamp;
      self->_targetTimestamp = targetTimestamp;
      os_unfair_lock_unlock(&self->_lock);
      [self tick];
    }
  });
  CFRunLoopWakeUp(cfRunLoop);
  os_unfair_lock_unlock(&_lock);
}

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
- (void)tick
{
  if (_selector && [_target respondsToSelector:_selector]) {
    [_target performSelector:_selector withObject:self];
  }
}
#pragma clang diagnostic pop

@end
#endif