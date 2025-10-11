/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTTouchHandler.h"

#if !TARGET_OS_OSX // [macOS]
#import <UIKit/UIGestureRecognizerSubclass.h>
#endif // [macOS]
#import <React/RCTUITextField.h> // [macOS]
#import <React/RCTUtils.h> // [macOS]


#import "RCTAssert.h"
#import "RCTBridge.h"
#import "RCTEventDispatcherProtocol.h"
#import "RCTLog.h"
#import "RCTSurfaceView.h"
#import "RCTTouchEvent.h"
#import "RCTUIManager.h"
#import "RCTUtils.h"
#import "UIView+React.h"

#if TARGET_OS_OSX // [macOS
@interface NSApplication (RCTTouchHandlerOverride)
- (NSEvent*)override_nextEventMatchingMask:(NSEventMask)mask
                                 untilDate:(NSDate*)expiration
                                    inMode:(NSRunLoopMode)mode
                                   dequeue:(BOOL)dequeue;
@end

@implementation NSApplication (RCTTouchHandlerOverride)

+ (void)load
{
  RCTSwapInstanceMethods(self, @selector(nextEventMatchingMask:untilDate:inMode:dequeue:), @selector(override_nextEventMatchingMask:untilDate:inMode:dequeue:));
}

- (NSEvent*)override_nextEventMatchingMask:(NSEventMask)mask
                                 untilDate:(NSDate*)expiration
                                    inMode:(NSRunLoopMode)mode
                                   dequeue:(BOOL)dequeue
{
  NSEvent* event = [self override_nextEventMatchingMask:mask
                                              untilDate:expiration
                                                 inMode:mode
                                                dequeue:dequeue];
  if (dequeue && (event.type == NSEventTypeLeftMouseUp || event.type == NSEventTypeRightMouseUp || event.type == NSEventTypeOtherMouseUp)) {
    RCTTouchHandler *targetTouchHandler = [RCTTouchHandler touchHandlerForEvent:event];
    if (!targetTouchHandler) {
      [RCTTouchHandler notifyOutsideViewMouseUp:event];
    } else if ([mode isEqualTo:NSEventTrackingRunLoopMode]) {
      // A tracking loop will deque an event, thereby not submitting it to the touch handler.
      if (event.type == NSEventTypeLeftMouseUp) {
        // NSTextField uses a tracking loop when clicking inside the view bounds. If a view
        // is located above the NSTextField, the mouseUp won't reach the view and break the
        // pressability. This submits the mouse up event on the next run loop to let it go
        // through the touch handler.
        dispatch_async(dispatch_get_main_queue (), ^{
          [targetTouchHandler mouseUp:event];
        });
      }
    }
  }

  return event;
}

@end
#endif // macOS]

@interface RCTTouchHandler () <UIGestureRecognizerDelegate>
@end

// TODO: this class behaves a lot like a module, and could be implemented as a
// module if we were to assume that modules and RootViews had a 1:1 relationship
@implementation RCTTouchHandler {
  __weak id<RCTEventDispatcherProtocol> _eventDispatcher;

  /**
   * Arrays managed in parallel tracking native touch object along with the
   * native view that was touched, and the React touch data dictionary.
   * These must be kept track of because `UIKit` destroys the touch targets
   * if touches are canceled, and we have no other way to recover this info.
   */
  NSMutableOrderedSet *_nativeTouches; // [macOS]
  NSMutableArray<NSMutableDictionary *> *_reactTouches;
  NSMutableArray<RCTPlatformView *> *_touchViews; // [macOS]

#if TARGET_OS_OSX // TODO(macOS ISS#2323203)
  NSEvent* _lastRightMouseDown;
  NSEvent* _lastEvent;
#endif

  __weak RCTPlatformView *_cachedRootView;  // [macOS]

  uint16_t _coalescingKey;
}

static BOOL _notifyOutsideViewEvents = NO;

+ (BOOL)notifyOutsideViewEvents {
  return _notifyOutsideViewEvents;
}

+ (void)setNotifyOutsideViewEvents:(BOOL)newNotifyOutsideViewEvents {
  _notifyOutsideViewEvents = newNotifyOutsideViewEvents;
}

- (instancetype)initWithBridge:(RCTBridge *)bridge
{
  RCTAssertParam(bridge);

  if ((self = [super initWithTarget:nil action:NULL])) {
    _eventDispatcher = bridge.eventDispatcher;

    _nativeTouches = [NSMutableOrderedSet new];
    _reactTouches = [NSMutableArray new];
    _touchViews = [NSMutableArray new];

#if !TARGET_OS_OSX // [macOS]
    // `cancelsTouchesInView` and `delaysTouches*` are needed in order to be used as a top level
    // event delegated recognizer. Otherwise, lower-level components not built
    // using RCT, will fail to recognize gestures.
    self.cancelsTouchesInView = NO;
    self.delaysTouchesBegan = NO; // This is default value.
    self.delaysTouchesEnded = NO;
#else // [macOS
    self.delaysPrimaryMouseButtonEvents = NO; // default is NO.
    self.delaysSecondaryMouseButtonEvents = NO; // default is NO.
    self.delaysOtherMouseButtonEvents = NO; // default is NO.
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(endOutsideViewMouseUp:)
                                                 name:RCTTouchHandlerOutsideViewMouseUpNotification
                                               object:[RCTTouchHandler class]];
#endif // macOS]

    self.delegate = self;
  }

  return self;
}

RCT_NOT_IMPLEMENTED(-(instancetype)initWithTarget : (id)target action : (SEL)action)
#if TARGET_OS_OSX // [macOS
RCT_NOT_IMPLEMENTED(- (instancetype)initWithCoder:(NSCoder *)coder)
#endif // macOS]

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)attachToView:(RCTUIView *)view // [macOS]
{
  RCTAssert(self.view == nil, @"RCTTouchHandler already has attached view.");

  [view addGestureRecognizer:self];
}

- (void)detachFromView:(RCTUIView *)view // [macOS]
{
  RCTAssertParam(view);
  RCTAssert(self.view == view, @"RCTTouchHandler attached to another view.");

  [view removeGestureRecognizer:self];
}

#pragma mark - Bookkeeping for touch indices

- (void)_recordNewTouches:(NSSet *)touches
{
#if !TARGET_OS_OSX // [macOS]
  for (UITouch *touch in touches) {
#else // [macOS
  for (NSEvent *touch in touches) {
#endif // macOS]

    RCTAssert(![_nativeTouches containsObject:touch], @"Touch is already recorded. This is a critical bug.");
#if TARGET_OS_OSX // [macOS]
    // We're starting a new interaction while there is an unterminated RightMouseDown touch. This can
    // happen for example after a right click on secure text fields when not the RightMouseUp nor
    // willShowMenu event can be intercepted
    // (see https://github.com/microsoft/react-native-macos/issues/1209).

    // This means the state machine in Pressability.js on JS side is in a stuck state. Best we can do
    // to get it unstuck is to send touch cancellation.
    if (_lastRightMouseDown != NULL && [_nativeTouches containsObject:_lastRightMouseDown]) {
      if (![RCTTouchHandler notifyOutsideViewEvents]) {
        [self cancelTouchWithEvent:_lastRightMouseDown];
      }
      _lastRightMouseDown = NULL;
    }
    // Keep track of any active RightMouseDown touches. We reset it to NULL if interaction ends correctly
    if (touch.type == NSEventTypeRightMouseDown) {
       _lastRightMouseDown = touch;
    }
#endif

    // Find closest React-managed touchable view

#if !TARGET_OS_OSX // [macOS]
    UIView *targetView = touch.view;
    while (targetView) {
      if (targetView.reactTag && targetView.userInteractionEnabled) {
        break;
      }
      targetView = targetView.superview;
    }

    NSNumber *reactTag = [targetView reactTagAtPoint:[touch locationInView:targetView]];
    if (!reactTag || !targetView.userInteractionEnabled) {
      continue;
    }
#else // [macOS
    // -[NSView hitTest:] takes coordinates in a view's superview coordinate system.
    // The assumption here is that a RCTUIView/RCTSurfaceView will always have a superview.
    NSView *superview = [[self view] superview];
    const CGPoint touchLocationInSuperview = [superview convertPoint:touch.locationInWindow fromView:nil];
    NSView *targetView = [self.view hitTest:touchLocationInSuperview];
    // Don't record clicks on scrollbars.
    if ([targetView isKindOfClass:[NSScroller class]]) {
      continue;
    }
    touchLocation = [targetView convertPoint:touchLocation fromView:self.view.superview];

    while (targetView) {
      BOOL isUserInteractionEnabled = NO;
      if ([((RCTUIView*)targetView) respondsToSelector:@selector(isUserInteractionEnabled)]) { // [macOS]
        isUserInteractionEnabled = ((RCTUIView*)targetView).isUserInteractionEnabled; // [macOS]
      }
      if (targetView.reactTag && isUserInteractionEnabled) {
        break;
      }
      targetView = targetView.superview;
    }

    const CGPoint touchLocationInSelf = [targetView convertPoint:touchLocationInSuperview fromView:self.view.superview];
    NSNumber *reactTag = [targetView reactTagAtPoint:touchLocationInSelf];
    BOOL isUserInteractionEnabled = NO;
    if ([((RCTUIView*)targetView) respondsToSelector:@selector(isUserInteractionEnabled)]) { // [macOS]
      isUserInteractionEnabled = ((RCTUIView*)targetView).isUserInteractionEnabled; // [macOS]
    }
    if (!reactTag || !isUserInteractionEnabled) {
      continue;
    }
#endif // macOS]

    // Get new, unique touch identifier for the react touch
    const NSUInteger RCTMaxTouches = 11; // This is the maximum supported by iDevices
    NSInteger touchID = ([_reactTouches.lastObject[@"identifier"] integerValue] + 1) % RCTMaxTouches;
    for (NSDictionary *reactTouch in _reactTouches) {
      NSInteger usedID = [reactTouch[@"identifier"] integerValue];
      if (usedID == touchID) {
        // ID has already been used, try next value
        touchID++;
      } else if (usedID > touchID) {
        // If usedID > touchID, touchID must be unique, so we can stop looking
        break;
      }
    }

    // Create touch
    NSMutableDictionary *reactTouch = [[NSMutableDictionary alloc] initWithCapacity:RCTMaxTouches];
    reactTouch[@"target"] = reactTag;
    reactTouch[@"identifier"] = @(touchID);

    // Add to arrays
    [_touchViews addObject:targetView];
    [_nativeTouches addObject:touch];
    [_reactTouches addObject:reactTouch];
  }
}

- (void)_recordRemovedTouches:(NSSet *)touches
{
#if !TARGET_OS_OSX // [macOS]
  for (UITouch *touch in touches) {
    NSInteger index = [_nativeTouches indexOfObject:touch];
#else // [macOS
    for (NSEvent *touch in touches) {
      NSInteger index = [_nativeTouches indexOfObjectPassingTest:^BOOL(NSEvent *event, __unused NSUInteger idx, __unused BOOL *stop) {
        return touch.eventNumber == event.eventNumber;
      }];
#endif // macOS]
    if (index == NSNotFound) {
      continue;
    }
#if TARGET_OS_OSX
    if (_lastRightMouseDown != NULL && _lastRightMouseDown.eventNumber == touch.eventNumber) {
      _lastRightMouseDown = NULL;
    }
#endif

    [_touchViews removeObjectAtIndex:index];
    [_nativeTouches removeObjectAtIndex:index];
    [_reactTouches removeObjectAtIndex:index];
  }
}

- (void)_updateReactTouchAtIndex:(NSInteger)touchIndex
{
#if !TARGET_OS_OSX // [macOS]
  UITouch *nativeTouch = _nativeTouches[touchIndex];
  CGPoint windowLocation = [nativeTouch locationInView:nativeTouch.window];
  RCTAssert(_cachedRootView, @"We were unable to find a root view for the touch");
  CGPoint rootViewLocation = [nativeTouch.window convertPoint:windowLocation toView:_cachedRootView];

  UIView *touchView = _touchViews[touchIndex];
  CGPoint touchViewLocation = [nativeTouch.window convertPoint:windowLocation toView:touchView];
#else // [macOS
  NSEvent *nativeTouch = _nativeTouches[touchIndex];
  CGPoint location = nativeTouch.locationInWindow;
  RCTAssert(_cachedRootView, @"We were unable to find a root view for the touch");
  CGPoint rootViewLocation = [_cachedRootView convertPoint:location fromView:nil];

  NSView *touchView = _touchViews[touchIndex];
  CGPoint touchViewLocation = [touchView convertPoint:location fromView:nil];
#endif // macOS]

  NSMutableDictionary *reactTouch = _reactTouches[touchIndex];
  reactTouch[@"pageX"] = @(RCTSanitizeNaNValue(rootViewLocation.x, @"touchEvent.pageX"));
  reactTouch[@"pageY"] = @(RCTSanitizeNaNValue(rootViewLocation.y, @"touchEvent.pageY"));
  reactTouch[@"locationX"] = @(RCTSanitizeNaNValue(touchViewLocation.x, @"touchEvent.locationX"));
  reactTouch[@"locationY"] = @(RCTSanitizeNaNValue(touchViewLocation.y, @"touchEvent.locationY"));
  reactTouch[@"timestamp"] = @(nativeTouch.timestamp * 1000); // in ms, for JS

#if !TARGET_OS_OSX // [macOS]
  // TODO: force for a 'normal' touch is usually 1.0;
  // should we expose a `normalTouchForce` constant somewhere (which would
  // have a value of `1.0 / nativeTouch.maximumPossibleForce`)?
  if (RCTForceTouchAvailable()) {
    reactTouch[@"force"] = @(RCTZeroIfNaN(nativeTouch.force / nativeTouch.maximumPossibleForce));
  } else if (nativeTouch.type == UITouchTypePencil) {
    reactTouch[@"force"] = @(RCTZeroIfNaN(nativeTouch.force / nativeTouch.maximumPossibleForce));
    reactTouch[@"altitudeAngle"] = @(RCTZeroIfNaN(nativeTouch.altitudeAngle));
  }
#else // [macOS
  NSEventModifierFlags modifierFlags = nativeTouch.modifierFlags;
  if (modifierFlags & NSEventModifierFlagShift) {
    reactTouch[@"shiftKey"] = @YES;
  }
  if (modifierFlags & NSEventModifierFlagControl) {
    reactTouch[@"ctrlKey"] = @YES;
  }
  if (modifierFlags & NSEventModifierFlagOption) {
    reactTouch[@"altKey"] = @YES;
  }
  if (modifierFlags & NSEventModifierFlagCommand) {
    reactTouch[@"metaKey"] = @YES;
  }

  NSEventType type = nativeTouch.type;
  if (type == NSEventTypeLeftMouseDown || type == NSEventTypeLeftMouseUp || type == NSEventTypeLeftMouseDragged) {
    reactTouch[@"button"] = @0;
  } else if (type == NSEventTypeRightMouseDown || type == NSEventTypeRightMouseUp || type == NSEventTypeRightMouseDragged) {
    reactTouch[@"button"] = @2;
  }
#endif // macOS]
}

/**
 * Constructs information about touch events to send across the serialized
 * boundary. This data should be compliant with W3C `Touch` objects. This data
 * alone isn't sufficient to construct W3C `Event` objects. To construct that,
 * there must be a simple receiver on the other side of the bridge that
 * organizes the touch objects into `Event`s.
 *
 * We send the data as an array of `Touch`es, the type of action
 * (start/end/move/cancel) and the indices that represent "changed" `Touch`es
 * from that array.
 */
#if !TARGET_OS_OSX // [macOS]
- (void)_updateAndDispatchTouches:(NSSet<UITouch *> *)touches eventName:(NSString *)eventName
#else // [macOS
- (void)_updateAndDispatchTouches:(NSSet<NSEvent *> *)touches eventName:(NSString *)eventName
#endif // macOS]
{
  // Update touches
  NSMutableArray<NSNumber *> *changedIndexes = [NSMutableArray new];
#if !TARGET_OS_OSX // [macOS]
  for (UITouch *touch in touches) {
    NSInteger index = [_nativeTouches indexOfObject:touch];
#else // [macOS
  for (NSEvent *touch in touches) {
    NSInteger index = [_nativeTouches indexOfObjectPassingTest:^BOOL(NSEvent *event, __unused NSUInteger idx, __unused BOOL *stop) {
      return touch.eventNumber == event.eventNumber;
    }];
#endif // macOS]

    if (index == NSNotFound) {
      continue;
    }

#if TARGET_OS_OSX // [macOS
    _nativeTouches[index] = touch;
#endif // macOS]

    [self _updateReactTouchAtIndex:index];
    [changedIndexes addObject:@(index)];
  }

  if (changedIndexes.count == 0) {
    return;
  }

  // Deep copy the touches because they will be accessed from another thread
  // TODO: would it be safer to do this in the bridge or executor, rather than trusting caller?
  NSMutableArray<NSDictionary *> *reactTouches = [[NSMutableArray alloc] initWithCapacity:_reactTouches.count];
  for (NSDictionary *touch in _reactTouches) {
    [reactTouches addObject:[touch copy]];
  }

  BOOL canBeCoalesced = [eventName isEqualToString:@"touchMove"];

  // We increment `_coalescingKey` twice here just for sure that
  // this `_coalescingKey` will not be reused by another (preceding or following) event
  // (yes, even if coalescing only happens (and makes sense) on events of the same type).

  if (!canBeCoalesced) {
    _coalescingKey++;
  }

  RCTTouchEvent *event = [[RCTTouchEvent alloc] initWithEventName:eventName
                                                         reactTag:self.view.reactTag
                                                     reactTouches:reactTouches
                                                   changedIndexes:changedIndexes
                                                    coalescingKey:_coalescingKey];

  if (!canBeCoalesced) {
    _coalescingKey++;
  }

  [_eventDispatcher sendEvent:event];
}

/***
 * To ensure compatibility when using UIManager.measure and RCTTouchHandler, we have to adopt
 * UIManager.measure's behavior in finding a "root view".
 * Usually RCTTouchHandler is already attached to a root view but in some cases (e.g. Modal),
 * we are instead attached to some RCTView subtree. This is also the case when embedding some RN
 * views inside a separate ViewController not controlled by RN.
 * This logic will either find the nearest rootView, or go all the way to the UIWindow.
 * While this is not optimal, it is exactly what UIManager.measure does, and what Touchable.js
 * relies on.
 * We cache it here so that we don't have to repeat it for every touch in the gesture.
 */
- (void)_cacheRootView
{
  RCTPlatformView *rootView = self.view;  // [macOS]
  while (rootView.superview && ![rootView isReactRootView] && ![rootView isKindOfClass:[RCTSurfaceView class]]) {
    rootView = rootView.superview;
  }
  _cachedRootView = rootView;
}

#pragma mark - Gesture Recognizer Delegate Callbacks

#if !TARGET_OS_OSX // [macOS]
static BOOL RCTAllTouchesAreCancelledOrEnded(NSSet *touches) // [macOS]
{
  for (UITouch *touch in touches) {
    if (touch.phase == UITouchPhaseBegan || touch.phase == UITouchPhaseMoved || touch.phase == UITouchPhaseStationary) {
      return NO;
    }
  }
  return YES;
}

static BOOL RCTAnyTouchesChanged(NSSet *touches) // [macOS]
{
  for (UITouch *touch in touches) {
    if (touch.phase == UITouchPhaseBegan || touch.phase == UITouchPhaseMoved) {
      return YES;
    }
  }
  return NO;
}
#endif // [macOS]

#pragma mark - `UIResponder`-ish touch-delivery methods

- (void)interactionsBegan:(NSSet *)touches  // [macOS]
{
  [self _cacheRootView];

  // "start" has to record new touches *before* extracting the event.
  // "end"/"cancel" needs to remove the touch *after* extracting the event.
  [self _recordNewTouches:touches];

  // [macOS Filter out touches that were ignored.
  touches = [touches objectsPassingTest:^(id touch, BOOL *stop) {
    return [_nativeTouches containsObject:touch];
  }]; // macOS]

  [self _updateAndDispatchTouches:touches eventName:@"touchStart"];

  if (self.state == UIGestureRecognizerStatePossible) {
    self.state = UIGestureRecognizerStateBegan;
  } else if (self.state == UIGestureRecognizerStateBegan) {
    self.state = UIGestureRecognizerStateChanged;
  }
}

- (void)interactionsMoved:(NSSet *)touches // [macOS]
{
  [self _updateAndDispatchTouches:touches eventName:@"touchMove"];
  self.state = UIGestureRecognizerStateChanged;
}

- (void)interactionsEnded:(NSSet *)touches withEvent:(UIEvent*)event // [macOS]
{
  [self _updateAndDispatchTouches:touches eventName:@"touchEnd"];
#if !TARGET_OS_OSX // [macOS]
  if (RCTAllTouchesAreCancelledOrEnded(event.allTouches)) {
    self.state = UIGestureRecognizerStateEnded;
  } else if (RCTAnyTouchesChanged(event.allTouches)) {
    self.state = UIGestureRecognizerStateChanged;
  }
#else // [macOS
  self.state = UIGestureRecognizerStateEnded;
#endif // macOS]

  [self _recordRemovedTouches:touches];
}

- (void)interactionsCancelled:(NSSet *)touches withEvent:(UIEvent*)event // [macOS]
{
  [self _updateAndDispatchTouches:touches eventName:@"touchCancel"];
#if !TARGET_OS_OSX // [macOS]
  if (RCTAllTouchesAreCancelledOrEnded(event.allTouches)) {
    self.state = UIGestureRecognizerStateCancelled;
  } else if (RCTAnyTouchesChanged(event.allTouches)) {
    self.state = UIGestureRecognizerStateChanged;
  }
#else // [macOS
  self.state = UIGestureRecognizerStateCancelled;
#endif // macOS]

  [self _recordRemovedTouches:touches];
}

#if !TARGET_OS_OSX // [macOS]
- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesBegan:touches withEvent:event];
  [self interactionsBegan:touches];
}

- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesMoved:touches withEvent:event];
  [self interactionsMoved:touches];
}

- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesEnded:touches withEvent:event];
  [self interactionsEnded:touches withEvent:event];
}

- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesCancelled:touches withEvent:event];
  [self interactionsCancelled:touches withEvent:event];
}
#else // [macOS

- (BOOL)isDuplicateEvent:(NSEvent *)event
{
  if (_lastEvent && (event == _lastEvent || (event.eventNumber == _lastEvent.eventNumber && event.type == _lastEvent.type && NSEqualPoints(event.locationInWindow, _lastEvent.locationInWindow  )))) {
    return YES;
  }

  _lastEvent = event;
  return NO;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event
{
  // This will only be called if the hit-tested view returns YES for acceptsFirstMouse,
  // therefore asking it again would be redundant.
  return YES;
}

- (void)mouseDown:(NSEvent *)event
{
  if ([self isDuplicateEvent:event]) {
    return;
  }

  [super mouseDown:event];
  [self interactionsBegan:[NSSet setWithObject:event]];
}

- (void)rightMouseDown:(NSEvent *)event
{
  if ([self isDuplicateEvent:event]) {
    return;
  }

  [super rightMouseDown:event];
  [self interactionsBegan:[NSSet setWithObject:event]];
}

- (void)mouseDragged:(NSEvent *)event
{
  if ([self isDuplicateEvent:event]) {
    return;
  }

  [super mouseDragged:event];
  [self interactionsMoved:[NSSet setWithObject:event]];
}

- (void)rightMouseDragged:(NSEvent *)event
{
  if ([self isDuplicateEvent:event]) {
    return;
  }

  [super rightMouseDragged:event];
  [self interactionsMoved:[NSSet setWithObject:event]];
}

- (void)mouseUp:(NSEvent *)event
{
  if ([self isDuplicateEvent:event]) {
    return;
  }

  [super mouseUp:event];
  [self interactionsEnded:[NSSet setWithObject:event] withEvent:event];
}

- (void)rightMouseUp:(NSEvent *)event
{
  if ([self isDuplicateEvent:event]) {
    return;
  }

  [super rightMouseUp:event];
  [self interactionsEnded:[NSSet setWithObject:event] withEvent:event];
}

#endif // macOS]

- (BOOL)canPreventGestureRecognizer:(__unused UIGestureRecognizer *)preventedGestureRecognizer
{
  return NO;
}

- (BOOL)canBePreventedByGestureRecognizer:(UIGestureRecognizer *)preventingGestureRecognizer
{
  // We fail in favour of other external gesture recognizers.
  // iOS will ask `delegate`'s opinion about this gesture recognizer little bit later.
  return !RCTUIViewIsDescendantOfView(preventingGestureRecognizer.view, self.view); // macOS
}

- (void)reset
{
  if (_nativeTouches.count != 0) {
    [self _updateAndDispatchTouches:_nativeTouches.set eventName:@"touchCancel"];

    [_nativeTouches removeAllObjects];
    [_reactTouches removeAllObjects];
    [_touchViews removeAllObjects];

    _cachedRootView = nil;
  }
}

#pragma mark - Other

- (void)cancel
{
  self.enabled = NO;
  self.enabled = YES;
}

#if TARGET_OS_OSX // [macOS
+ (instancetype)touchHandlerForEvent:(NSEvent *)event {
  // The window's frame view must be used for hit testing against `locationInWindow`
  NSView *hitView = [event.window.contentView.superview hitTest:event.locationInWindow];
  return [self touchHandlerForView:hitView];
}

+ (instancetype)touchHandlerForView:(NSView *)view {
  if ([view isKindOfClass:[RCTRootView class]]) {
    // The RCTTouchHandler is attached to the contentView.
    view = ((RCTRootView *)view).contentView;
  }

  while (view) {
    for (NSGestureRecognizer *gestureRecognizer in view.gestureRecognizers) {
      if ([gestureRecognizer isKindOfClass:[self class]]) {
        return (RCTTouchHandler *)gestureRecognizer;
      }
    }

    view = view.superview;
  }

  return nil;
}

+ (void)notifyOutsideViewMouseUp:(NSEvent *) event {
  if (![RCTTouchHandler notifyOutsideViewEvents]) {
    return;
  }
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTTouchHandlerOutsideViewMouseUpNotification
                                                      object:self
                                                    userInfo:@{@"event": event}];
}

- (void)endOutsideViewMouseUp:(NSNotification *)notification {
  NSEvent *event = notification.userInfo[@"event"];

  NSInteger index = [_nativeTouches indexOfObjectPassingTest:^BOOL(NSEvent *touch, __unused NSUInteger idx, __unused BOOL *stop) {
    return touch.eventNumber == event.eventNumber;
  }];
  if (index == NSNotFound) {
    // A contextual menu click would generate a mouse up with a diffrent event
    // and leave a touchable/pressable session open. This would cause touch end
    // events from a modal window to end the touchable/pressable session and
    // potentially trigger an onPress event. Hence the need to reset and cancel
    // that session when a mouse up event was detected outside the touch handler
    // view bounds.
    [self reset];
    return;
  }

  if ([self isDuplicateEvent:event]) {
    return;
  }

  [self interactionsEnded:[NSSet setWithObject:event] withEvent:event];
}

// Showing a context menu via RightMouseDown prevents receiving RightMouseUp event
// and propagating touchEnd event to JS side, leaving the Responder state machine
// on JS side (in Pressabity.js) in an intermediate state, that will not be able to
// process the next interaction correctly.

// To avoid this, we end the interaction proactively on RightMouseDown if we know it
// triggers a context menu.

// (Note this is not an issue for left clicks: context menu on left clicks is only shown
// on LeftMouseUp)
- (void)willShowMenuWithEvent:(NSEvent *)event
{
  if ([RCTTouchHandler notifyOutsideViewEvents]) {
    return;
  }

  if (event.type == NSEventTypeRightMouseDown) {
    [self interactionsEnded:[NSSet setWithObject:event] withEvent:event];
  }
}

- (void)willShowMenu
{
  for (NSEvent* event in _nativeTouches) {
    if (event.type == NSEventTypeRightMouseDown) {
      [self willShowMenuWithEvent:event];
      break;
    }
  }
}

- (void)cancelTouchWithEvent:(NSEvent *)event
{
  [self interactionsCancelled:[NSSet setWithObject:event] withEvent:event];
}
#endif // macOS]

#pragma mark - UIGestureRecognizerDelegate

- (BOOL)gestureRecognizer:(__unused UIGestureRecognizer *)gestureRecognizer
    shouldRequireFailureOfGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  // Same condition for `failure of` as for `be prevented by`.
  return [self canBePreventedByGestureRecognizer:otherGestureRecognizer];
}

@end
