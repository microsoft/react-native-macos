/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTSurfaceTouchHandler.h"

#import <React/RCTIdentifierPool.h>
#import <React/RCTUtils.h>
#import <React/RCTViewComponentView.h>
#import <React/RCTUIKit.h>
#if TARGET_OS_OSX // [macOS
#import <React/RCTSurfaceHostingView.h>
#endif // macOS]


#import "RCTConversions.h"
#import "RCTSurfacePointerHandler.h"
#import "RCTTouchableComponentViewProtocol.h"


#if TARGET_OS_OSX // [macOS
@interface RCTSurfaceTouchHandler (Private)
- (void)endFromEventTrackingLeftMouseUp:(NSEvent *)event;
- (void)endFromEventTrackingRightMouseUp:(NSEvent *)event;
@end

@interface NSApplication (RCTSurfaceTouchHandlerOverride)
- (NSEvent*)override_surface_nextEventMatchingMask:(NSEventMask)mask
                                 untilDate:(NSDate*)expiration
                                    inMode:(NSRunLoopMode)mode
                                   dequeue:(BOOL)dequeue;
@end

@implementation NSApplication (RCTSurfaceTouchHandlerOverride)

+ (void)load
{
  RCTSwapInstanceMethods(self, @selector(nextEventMatchingMask:untilDate:inMode:dequeue:), @selector(override_surface_nextEventMatchingMask:untilDate:inMode:dequeue:));
}

- (NSEvent*)override_surface_nextEventMatchingMask:(NSEventMask)mask
                                 untilDate:(NSDate*)expiration
                                    inMode:(NSRunLoopMode)mode
                                   dequeue:(BOOL)dequeue
{
  NSEvent* event = [self override_surface_nextEventMatchingMask:mask
                                              untilDate:expiration
                                                 inMode:mode
                                                dequeue:dequeue];
  if (dequeue && (event.type == NSEventTypeLeftMouseUp || event.type == NSEventTypeRightMouseUp || event.type == NSEventTypeOtherMouseUp)) {
    RCTSurfaceTouchHandler *targetSurfaceTouchHandler = [RCTSurfaceTouchHandler surfaceTouchHandlerForEvent:event];
    if (!targetSurfaceTouchHandler) {
      [RCTSurfaceTouchHandler notifyOutsideViewMouseUp:event];
    } else if (event.type == NSEventTypeRightMouseUp && [mode isEqualTo:NSEventTrackingRunLoopMode]) {
      // If the event is consumed by an event tracking loop, we won't get the mouse up event
      if (event.type == NSEventTypeLeftMouseUp) {
        [targetSurfaceTouchHandler endFromEventTrackingLeftMouseUp:event];
      } else if (event.type == NSEventTypeRightMouseUp) {
        [targetSurfaceTouchHandler endFromEventTrackingRightMouseUp:event];
      }
    }
  }

  return event;
}

@end
#endif // macOS]

using namespace facebook::react;

typedef NS_ENUM(NSInteger, RCTTouchEventType) {
  RCTTouchEventTypeTouchStart,
  RCTTouchEventTypeTouchMove,
  RCTTouchEventTypeTouchEnd,
  RCTTouchEventTypeTouchCancel,
};

struct ActiveTouch {
  Touch touch;
  SharedTouchEventEmitter eventEmitter;

  /*
   * A component view on which the touch was begun.
   */
  __strong RCTUIView<RCTComponentViewProtocol> *componentView = nil; // [macOS]

  struct Hasher {
    size_t operator()(const ActiveTouch &activeTouch) const
    {
      return std::hash<decltype(activeTouch.touch.identifier)>()(activeTouch.touch.identifier);
    }
  };

  struct Comparator {
    bool operator()(const ActiveTouch &lhs, const ActiveTouch &rhs) const
    {
      return lhs.touch.identifier == rhs.touch.identifier;
    }
  };
};

static void UpdateActiveTouchWithUITouch(
    ActiveTouch &activeTouch,
    RCTUITouch *uiTouch, // [macOS]
    RCTUIView *rootComponentView,  // [macOS]
    CGPoint rootViewOriginOffset) // [macOS]
{
#if !TARGET_OS_OSX // [macOS]
  CGPoint offsetPoint = [uiTouch locationInView:activeTouch.componentView];
  CGPoint pagePoint = [uiTouch locationInView:rootComponentView];
#if !TARGET_OS_VISION // [visionOS]
  CGPoint screenPoint = [rootComponentView convertPoint:pagePoint
                                      toCoordinateSpace:rootComponentView.window.screen.coordinateSpace];
#else // [visionOS
  CGPoint screenPoint = CGPointZero;
#endif // visionOS]
  pagePoint = CGPointMake(pagePoint.x + rootViewOriginOffset.x, pagePoint.y + rootViewOriginOffset.y);
#else // [macOS
  CGPoint offsetPoint = [activeTouch.componentView convertPoint:uiTouch.locationInWindow fromView:nil];
  CGPoint screenPoint = uiTouch.locationInWindow;
  CGPoint pagePoint = CGPointMake(screenPoint.x, CGRectGetHeight(rootComponentView.window.frame) - screenPoint.y);
#endif // macOS]

  activeTouch.touch.offsetPoint = RCTPointFromCGPoint(offsetPoint);
  activeTouch.touch.screenPoint = RCTPointFromCGPoint(screenPoint);
  activeTouch.touch.pagePoint = RCTPointFromCGPoint(pagePoint);

  activeTouch.touch.timestamp = uiTouch.timestamp;

#if !TARGET_OS_OSX // [macOS]
  if (RCTForceTouchAvailable()) {
    activeTouch.touch.force = RCTZeroIfNaN(uiTouch.force / uiTouch.maximumPossibleForce);
  }
#else // [macOS
  NSEventType type = uiTouch.type;
  if (type == NSEventTypeLeftMouseDown || type == NSEventTypeLeftMouseUp || type == NSEventTypeLeftMouseDragged) {
    activeTouch.touch.button = 0;
  } else if (type == NSEventTypeRightMouseDown || type == NSEventTypeRightMouseUp || type == NSEventTypeRightMouseDragged) {
    activeTouch.touch.button = 2;
  }

  NSEventModifierFlags modifierFlags = uiTouch.modifierFlags;
  if (modifierFlags & NSEventModifierFlagOption) {
    activeTouch.touch.altKey = true;
  }
  if (modifierFlags & NSEventModifierFlagControl) {
    activeTouch.touch.ctrlKey = true;
  }
  if (modifierFlags & NSEventModifierFlagShift) {
    activeTouch.touch.shiftKey = true;
  }
  if (modifierFlags & NSEventModifierFlagCommand) {
    activeTouch.touch.metaKey = true;
  }
#endif // macOS]
}

static ActiveTouch CreateTouchWithUITouch(RCTUITouch *uiTouch, RCTUIView *rootComponentView, CGPoint rootViewOriginOffset) // [macOS]
{
  ActiveTouch activeTouch = {};

  // Find closest Fabric-managed touchable view
#if !TARGET_OS_OSX // [macOS]
  RCTUIView *componentView = uiTouch.view; // [macOS]
#else // [macOS
  CGPoint touchLocation = [rootComponentView.superview convertPoint:uiTouch.locationInWindow fromView:nil];
  RCTUIView *componentView = (RCTUIView *) [rootComponentView hitTest:touchLocation]; // [macOS]
#endif // macOS]
  while (componentView) {
#if !TARGET_OS_OSX // [macOS]
    CGPoint offsetPoint = [uiTouch locationInView:componentView];
#else // [macOS
    CGPoint offsetPoint = [componentView convertPoint:uiTouch.locationInWindow fromView:nil];
#endif // macOS]
    if ([componentView respondsToSelector:@selector(touchEventEmitterAtPoint:)]) {
      activeTouch.eventEmitter = [(id<RCTTouchableComponentViewProtocol>)componentView
          touchEventEmitterAtPoint:offsetPoint];
#if !TARGET_OS_OSX // [macOS]
      activeTouch.touch.target = (Tag)componentView.tag;
#else // [macOS
      activeTouch.touch.target = (Tag)(componentView.reactTag.intValue);
#endif // macOS]
      activeTouch.componentView = componentView;
      break;
    }
    componentView = componentView.superview;
  }

  UpdateActiveTouchWithUITouch(activeTouch, uiTouch, rootComponentView, rootViewOriginOffset);
  return activeTouch;
}

#if !TARGET_OS_OSX // [macOS]
static BOOL AllTouchesAreCancelledOrEnded(NSSet<UITouch *> *touches)
{
  for (RCTUITouch *touch in touches) { // [macOS]
    if (touch.phase == UITouchPhaseBegan || touch.phase == UITouchPhaseMoved || touch.phase == UITouchPhaseStationary) {
      return NO;
    }
  }
  return YES;
}

static BOOL AnyTouchesChanged(NSSet<RCTUITouch *> *touches) // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
    if (touch.phase == UITouchPhaseBegan || touch.phase == UITouchPhaseMoved) {
      return YES;
    }
  }
  return NO;
}
#endif // [macOS]

/**
 * Surprisingly, `__unsafe_unretained id` pointers are not regular pointers
 * and `std::hash<>` cannot hash them.
 * This is quite trivial but decent implementation of hasher function
 * inspired by this research: https://stackoverflow.com/a/21062520/496389.
 */
template <typename PointerT>
struct PointerHasher {
  constexpr std::size_t operator()(const PointerT &value) const
  {
    return reinterpret_cast<size_t>(value);
  }
};

@interface RCTSurfaceTouchHandler () <UIGestureRecognizerDelegate>
@end

@implementation RCTSurfaceTouchHandler {
#if !TARGET_OS_OSX // [macOS]
  std::unordered_map<__unsafe_unretained RCTUITouch *, ActiveTouch, PointerHasher<__unsafe_unretained RCTUITouch *>>
      _activeTouches;
#else // [macOS
  std::unordered_map<NSInteger, ActiveTouch> _activeTouches;
#endif // macOS]

  /*
   * We hold the view weakly to prevent a retain cycle.
   */
  __weak RCTUIView *_rootComponentView; // [macOS]
  RCTIdentifierPool<11> _identifierPool;

  RCTSurfacePointerHandler *_pointerHandler;
}

- (instancetype)init
{
  if (self = [super initWithTarget:nil action:nil]) {
    // `cancelsTouchesInView` and `delaysTouches*` are needed in order
    // to be used as a top level event delegated recognizer.
    // Otherwise, lower-level components not built using React Native,
    // will fail to recognize gestures.
#if !TARGET_OS_OSX // [macOS]
    self.cancelsTouchesInView = NO;
    self.delaysTouchesBegan = NO; // This is default value.
    self.delaysTouchesEnded = NO;
#else // [macOS
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(endOutsideViewMouseUp:)
                                                 name:RCTSurfaceTouchHandlerOutsideViewMouseUpNotification
                                               object:[RCTSurfaceTouchHandler class]];
#endif // macOS]


    self.delegate = self;

    if (RCTGetDispatchW3CPointerEvents()) {
      _pointerHandler = [[RCTSurfacePointerHandler alloc] init];
    }
  }

  return self;
}

RCT_NOT_IMPLEMENTED(-(instancetype)initWithTarget : (id)target action : (SEL)action)

- (void)attachToView:(RCTUIView *)view // [macOS]
{
  RCTAssert(self.view == nil, @"RCTTouchHandler already has attached view.");

  [view addGestureRecognizer:self];
  _rootComponentView = view;

  if (_pointerHandler != nil) {
    [_pointerHandler attachToView:view];
  }
}

- (void)detachFromView:(RCTUIView *)view // [macOS]
{
  RCTAssertParam(view);
  RCTAssert(self.view == view, @"RCTTouchHandler attached to another view.");

  [view removeGestureRecognizer:self];
  _rootComponentView = nil;

  if (_pointerHandler != nil) {
    [_pointerHandler detachFromView:view];
  }
}

- (void)_registerTouches:(NSSet<RCTUITouch *> *)touches // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
		auto activeTouch = CreateTouchWithUITouch(touch, _rootComponentView, _viewOriginOffset);
    activeTouch.touch.identifier = _identifierPool.dequeue();
#if !TARGET_OS_OSX // [macOS]
    _activeTouches.emplace(touch, activeTouch);
#else // [macOS
    _activeTouches.emplace(touch.eventNumber, activeTouch);
#endif // macOS]
  }
}

- (void)_updateTouches:(NSSet<RCTUITouch *> *)touches // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
#if !TARGET_OS_OSX // [macOS]
    auto iterator = _activeTouches.find(touch);
#else // [macOS
    auto iterator = _activeTouches.find(touch.eventNumber);
#endif // macOS]
    RCTAssert(iterator != _activeTouches.end(), @"Inconsistency between local and UIKit touch registries");
    if (iterator == _activeTouches.end()) {
      continue;
    }

    UpdateActiveTouchWithUITouch(iterator->second, touch, _rootComponentView, _viewOriginOffset);
  }
}

- (void)_unregisterTouches:(NSSet<RCTUITouch *> *)touches // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
#if !TARGET_OS_OSX // [macOS]
    auto iterator = _activeTouches.find(touch);
#else // [macOS
    auto iterator = _activeTouches.find(touch.eventNumber);
#endif // macOS]
    RCTAssert(iterator != _activeTouches.end(), @"Inconsistency between local and UIKit touch registries");
    if (iterator == _activeTouches.end()) {
      continue;
    }
    auto &activeTouch = iterator->second;
    _identifierPool.enqueue(activeTouch.touch.identifier);
#if !TARGET_OS_OSX // [macOS]
    _activeTouches.erase(touch);
#else // [macOS
    _activeTouches.erase(touch.eventNumber);
#endif // macOS]
  }
}

- (std::vector<ActiveTouch>)_activeTouchesFromTouches:(NSSet<RCTUITouch *> *)touches // [macOS]
{
  std::vector<ActiveTouch> activeTouches;
  activeTouches.reserve(touches.count);

  for (RCTUITouch *touch in touches) {
#if !TARGET_OS_OSX // [macOS]
    auto iterator = _activeTouches.find(touch);
#else // [macOS
    auto iterator = _activeTouches.find(touch.eventNumber);
#endif // macOS]
    RCTAssert(iterator != _activeTouches.end(), @"Inconsistency between local and UIKit touch registries");
    if (iterator == _activeTouches.end()) {
      continue;
    }
    activeTouches.push_back(iterator->second);
  }

  return activeTouches;
}

- (void)_dispatchActiveTouches:(std::vector<ActiveTouch>)activeTouches eventType:(RCTTouchEventType)eventType
{
  TouchEvent event = {};
  std::unordered_set<ActiveTouch, ActiveTouch::Hasher, ActiveTouch::Comparator> changedActiveTouches = {};
  std::unordered_set<SharedTouchEventEmitter> uniqueEventEmitters = {};
  BOOL isEndishEventType = eventType == RCTTouchEventTypeTouchEnd || eventType == RCTTouchEventTypeTouchCancel;

  for (const auto &activeTouch : activeTouches) {
    if (!activeTouch.eventEmitter) {
      continue;
    }

    changedActiveTouches.insert(activeTouch);
    event.changedTouches.insert(activeTouch.touch);
    uniqueEventEmitters.insert(activeTouch.eventEmitter);
  }

  for (const auto &pair : _activeTouches) {
    if (!pair.second.eventEmitter) {
      continue;
    }

    if (isEndishEventType && event.changedTouches.find(pair.second.touch) != event.changedTouches.end()) {
      continue;
    }

    event.touches.insert(pair.second.touch);
  }

  for (const auto &eventEmitter : uniqueEventEmitters) {
    event.targetTouches.clear();

    for (const auto &pair : _activeTouches) {
      if (pair.second.eventEmitter == eventEmitter) {
        event.targetTouches.insert(pair.second.touch);
      }
    }

    switch (eventType) {
      case RCTTouchEventTypeTouchStart:
        eventEmitter->onTouchStart(event);
        break;
      case RCTTouchEventTypeTouchMove:
        eventEmitter->onTouchMove(event);
        break;
      case RCTTouchEventTypeTouchEnd:
        eventEmitter->onTouchEnd(event);
        break;
      case RCTTouchEventTypeTouchCancel:
        eventEmitter->onTouchCancel(event);
        break;
    }
  }
}

#pragma mark - `UIResponder`-ish touch-delivery methods

#if !TARGET_OS_OSX // [macOS]

- (void)touchesBegan:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  [super touchesBegan:touches withEvent:event];

  [self _registerTouches:touches];
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchStart];

  if (self.state == UIGestureRecognizerStatePossible) {
    self.state = UIGestureRecognizerStateBegan;
  } else if (self.state == UIGestureRecognizerStateBegan) {
    self.state = UIGestureRecognizerStateChanged;
  }
}

- (void)touchesMoved:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesMoved:touches withEvent:event];

  [self _updateTouches:touches];
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchMove];

  self.state = UIGestureRecognizerStateChanged;
}

- (void)touchesEnded:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesEnded:touches withEvent:event];

  [self _updateTouches:touches];
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchEnd];
  [self _unregisterTouches:touches];

  if (AllTouchesAreCancelledOrEnded(event.allTouches)) {
    self.state = UIGestureRecognizerStateEnded;
  } else if (AnyTouchesChanged(event.allTouches)) {
    self.state = UIGestureRecognizerStateChanged;
  }
}

- (void)touchesCancelled:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesCancelled:touches withEvent:event];

  [self _updateTouches:touches];
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchCancel];
  [self _unregisterTouches:touches];

  if (AllTouchesAreCancelledOrEnded(event.allTouches)) {
    self.state = UIGestureRecognizerStateCancelled;
  } else if (AnyTouchesChanged(event.allTouches)) {
    self.state = UIGestureRecognizerStateChanged;
  }
}

#else // [macOS

- (BOOL)acceptsFirstMouse:(NSEvent *)event
{
  // This will only be called if the hit-tested view returns YES for acceptsFirstMouse,
  // therefore asking it again would be redundant.
  return YES;
}

- (void)mouseDown:(NSEvent *)event
{
  [super mouseDown:event];

  {
    NSSet* touches = [NSSet setWithObject:event];
    [self _registerTouches:touches]; // [macOS]
    [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchStart];

    if (self.state == NSGestureRecognizerStatePossible) {
      self.state = NSGestureRecognizerStateBegan;
    } else if (self.state == NSGestureRecognizerStateBegan) {
      self.state = NSGestureRecognizerStateChanged;
    }
  }
}

- (void)rightMouseDown:(NSEvent *)event
{
  [super rightMouseDown:event];

  {
    NSSet* touches = [NSSet setWithObject:event];
		[self _registerTouches:touches]; // [macOS]
    [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchStart];

    if (self.state == NSGestureRecognizerStatePossible) {
      self.state = NSGestureRecognizerStateBegan;
    } else if (self.state == NSGestureRecognizerStateBegan) {
      self.state = NSGestureRecognizerStateChanged;
    }
  }
}

- (void)mouseDragged:(NSEvent *)event
{
  [super mouseDragged:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches]; // [macOS]
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchMove];

  self.state = NSGestureRecognizerStateChanged;
}

- (void)rightMouseDragged:(NSEvent *)event
{
  [super rightMouseDragged:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches]; // [macOS]
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchMove];

  self.state = NSGestureRecognizerStateChanged;
}

- (void)mouseUp:(NSEvent *)event
{
  [super mouseUp:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches]; // [macOS]
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchEnd];
  [self _unregisterTouches:touches];

  self.state = NSGestureRecognizerStateEnded;
}

- (void)rightMouseUp:(NSEvent *)event
{
  [super rightMouseUp:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches]; // [macOS]
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchEnd];
  [self _unregisterTouches:touches];

  self.state = NSGestureRecognizerStateEnded;
}

#endif // macOS]

- (void)reset
{
  [super reset];

  if (!_activeTouches.empty()) {
    std::vector<ActiveTouch> activeTouches;
    activeTouches.reserve(_activeTouches.size());

    for (const auto &pair : _activeTouches) {
      activeTouches.push_back(pair.second);
    }

    [self _dispatchActiveTouches:activeTouches eventType:RCTTouchEventTypeTouchCancel];

    // Force-unregistering all the touches.
    _activeTouches.clear();
    _identifierPool.reset();
  }
}

- (BOOL)canPreventGestureRecognizer:(__unused UIGestureRecognizer *)preventedGestureRecognizer
{
  return NO;
}

- (BOOL)canBePreventedByGestureRecognizer:(UIGestureRecognizer *)preventingGestureRecognizer
{
#if !TARGET_OS_OSX // [macOS]
  // We fail in favour of other external gesture recognizers.
  // iOS will ask `delegate`'s opinion about this gesture recognizer little bit later.
  return ![preventingGestureRecognizer.view isDescendantOfView:self.view];
#else  // [macOS
  return NO;
#endif // macOS]
}

#pragma mark - UIGestureRecognizerDelegate

- (BOOL)gestureRecognizer:(__unused UIGestureRecognizer *)gestureRecognizer
    shouldRequireFailureOfGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  // Same condition for `failure of` as for `be prevented by`.
  return [self canBePreventedByGestureRecognizer:otherGestureRecognizer];
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  BOOL canBePrevented = [self canBePreventedByGestureRecognizer:otherGestureRecognizer];
  if (canBePrevented) {
    [self _cancelTouches];
  }
  return NO;
}

#pragma mark -

- (void)_cancelTouches
{
  [self setEnabled:NO];
  [self setEnabled:YES];
}


#if TARGET_OS_OSX // [macOS

#pragma mark - macOS

+ (instancetype)surfaceTouchHandlerForEvent:(NSEvent *)event {
  RCTPlatformView *hitView = [event.window.contentView.superview hitTest:event.locationInWindow];
  return [self surfaceTouchHandlerForView:hitView];
}

+ (instancetype)surfaceTouchHandlerForView:(RCTPlatformView *)view {
  if ([view isKindOfClass:[RCTSurfaceHostingView class]]) {
    // The RCTSurfaceTouchHandler is attached to surface's view.
    view = (RCTPlatformView *)(((RCTSurfaceHostingView *)view).surface.view);
  }

  while (view) {
    for (NSGestureRecognizer *gestureRecognizer in view.gestureRecognizers) {
      if ([gestureRecognizer isKindOfClass:[self class]]) {
        return (RCTSurfaceTouchHandler *)gestureRecognizer;
      }
    }

    view = view.superview;
  }

  return nil;
}

+ (void)notifyOutsideViewMouseUp:(NSEvent *)event {
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTSurfaceTouchHandlerOutsideViewMouseUpNotification
                                                      object:self
                                                    userInfo:@{@"event": event}];
}

- (void)endOutsideViewMouseUp:(NSNotification *)notification {
  NSEvent *event = notification.userInfo[@"event"];

  auto iterator = _activeTouches.find(event.eventNumber);
  if (iterator == _activeTouches.end()) {
    // A contextual menu click would generate a mouse up with a diffrent event
    // and leave a touchable/pressable session open. This would cause touch end
    // events from a modal window to end the touchable/pressable session and
    // potentially trigger an onPress event. Hence the need to reset and cancel
    // that session when a mouse up event was detected outside the touch handler
    // view bounds.
    [self reset];
    return;
  }

  [self cancelTouchWithEvent:event];
}

- (void)endFromEventTrackingRightMouseUp:(NSEvent *)event
{
  auto iterator = _activeTouches.find(event.eventNumber);
  if (iterator == _activeTouches.end()) {
    return;
  }

  [self cancelTouchWithEvent:event];
}

- (void)cancelTouchWithEvent:(NSEvent *)event
{
  NSSet *touches = [NSSet setWithObject:event];
  [self _updateTouches:touches];
  [self _dispatchActiveTouches:[self _activeTouchesFromTouches:touches] eventType:RCTTouchEventTypeTouchCancel];
  [self _unregisterTouches:touches];

  self.state = NSGestureRecognizerStateCancelled;
}
#endif // macOS]

#if !TARGET_OS_OSX
- (void)hovering:(UIHoverGestureRecognizer *)recognizer API_AVAILABLE(ios(13.0))
{
  RCTUIView *listenerView = recognizer.view; // [macOS]
  CGPoint clientLocation = [recognizer locationInView:listenerView];
  CGPoint screenLocation = [listenerView convertPoint:clientLocation
                                    toCoordinateSpace:listenerView.window.screen.coordinateSpace];

  RCTUIView *targetView = [listenerView hitTest:clientLocation withEvent:nil]; // [macOS]
  targetView = FindClosestFabricManagedTouchableView(targetView);

  CGPoint offsetLocation = [recognizer locationInView:targetView];

  UIKeyModifierFlags modifierFlags;
  if (@available(iOS 13.4, *)) {
    modifierFlags = recognizer.modifierFlags;
  } else {
    modifierFlags = 0;
  }

  PointerEvent event =
      CreatePointerEventFromIncompleteHoverData(clientLocation, screenLocation, offsetLocation, modifierFlags);

  NSOrderedSet<RCTReactTaggedView *> *eventPathViews = [self handleIncomingPointerEvent:event onView:targetView];
  SharedTouchEventEmitter eventEmitter = GetTouchEmitterFromView(targetView, offsetLocation);
  bool hasMoveEventListeners = IsAnyViewInPathListeningToEvent(eventPathViews, ViewEvents::Offset::PointerMove) ||
      IsAnyViewInPathListeningToEvent(eventPathViews, ViewEvents::Offset::PointerMoveCapture);
  if (eventEmitter != nil && hasMoveEventListeners) {
    eventEmitter->onPointerMove(event);
  }
}
#endif

/**
 * Private method which is used for tracking the location of pointer events to manage the entering/leaving events.
 * The primary idea is that a pointer's presence & movement is dicated by a variety of underlying events such as down,
 * move, and up — and they should all be treated the same when it comes to tracking the entering & leaving of pointers
 * to views. This method accomplishes that by recieving the pointer event, the target view (can be null in cases when
 * the event indicates that the pointer has left the screen entirely), and a block/callback where the underlying event
 * should be fired.
 */
#if !TARGET_OS_OSX
- (NSOrderedSet<RCTReactTaggedView *> *)handleIncomingPointerEvent:(PointerEvent)event
                                                            onView:(nullable RCTUIView *)targetView // [macOS]
{
  int pointerId = event.pointerId;
  CGPoint clientLocation = CGPointMake(event.clientPoint.x, event.clientPoint.y);

  NSOrderedSet<RCTReactTaggedView *> *currentlyHoveredViews =
      [_currentlyHoveredViewsPerPointer objectForKey:@(pointerId)];
  if (currentlyHoveredViews == nil) {
    currentlyHoveredViews = [NSOrderedSet orderedSet];
  }

  RCTReactTaggedView *targetTaggedView = [RCTReactTaggedView wrap:targetView];
  RCTReactTaggedView *prevTargetTaggedView = [currentlyHoveredViews firstObject];
  RCTUIView *prevTargetView = prevTargetTaggedView.view; // [macOS]

  NSOrderedSet<RCTReactTaggedView *> *eventPathViews = GetTouchableViewsInPathToRoot(targetView);

  // Out
  if (prevTargetView != nil && prevTargetTaggedView.tag != targetTaggedView.tag) {
    BOOL shouldEmitOutEvent = IsAnyViewInPathListeningToEvent(currentlyHoveredViews, ViewEvents::Offset::PointerOut);
    SharedTouchEventEmitter eventEmitter =
        GetTouchEmitterFromView(prevTargetView, [_rootComponentView convertPoint:clientLocation toView:prevTargetView]);
    if (shouldEmitOutEvent && eventEmitter != nil) {
      eventEmitter->onPointerOut(event);
    }
  }

  // Leaving

  // pointerleave events need to be emited from the deepest target to the root but
  // we also need to efficiently keep track of if a view has a parent which is listening to the leave events,
  // so we first iterate from the root to the target, collecting the views which need events fired for, of which
  // we reverse iterate (now from target to root), actually emitting the events.
  NSMutableOrderedSet<RCTUIView *> *viewsToEmitLeaveEventsTo = [NSMutableOrderedSet orderedSet]; // [macOS]

  BOOL hasParentLeaveListener = NO;
  for (RCTReactTaggedView *taggedView in [currentlyHoveredViews reverseObjectEnumerator]) {
    RCTUIView *componentView = taggedView.view; // [macOS]

    BOOL shouldEmitEvent = componentView != nil &&
        (hasParentLeaveListener || IsViewListeningToEvent(taggedView, ViewEvents::Offset::PointerLeave));

    if (shouldEmitEvent && ![eventPathViews containsObject:taggedView]) {
      [viewsToEmitLeaveEventsTo addObject:componentView];
    }

    if (shouldEmitEvent && !hasParentLeaveListener) {
      hasParentLeaveListener = YES;
    }
  }

  for (RCTUIView *componentView in [viewsToEmitLeaveEventsTo reverseObjectEnumerator]) { // [macOS]
    SharedTouchEventEmitter eventEmitter =
        GetTouchEmitterFromView(componentView, [_rootComponentView convertPoint:clientLocation toView:componentView]);
    if (eventEmitter != nil) {
      eventEmitter->onPointerLeave(event);
    }
  }

  // Over
  if (targetView != nil && prevTargetTaggedView.tag != targetTaggedView.tag) {
    BOOL shouldEmitOverEvent = IsAnyViewInPathListeningToEvent(eventPathViews, ViewEvents::Offset::PointerOver);
    SharedTouchEventEmitter eventEmitter =
        GetTouchEmitterFromView(targetView, [_rootComponentView convertPoint:clientLocation toView:targetView]);
    if (shouldEmitOverEvent && eventEmitter != nil) {
      eventEmitter->onPointerOver(event);
    }
  }

  // Entering

  // We only want to emit events to JS if there is a view that is currently listening to said event
  // so we only send those event to the JS side if the element which has been entered is itself listening,
  // or if one of its parents is listening in case those listeners care about the capturing phase. Adding the ability
  // for native to distingusih between capturing listeners and not could be an optimization to futher reduce the number
  // of events we send to JS
  BOOL hasParentEnterListener = NO;
  for (RCTReactTaggedView *taggedView in [eventPathViews reverseObjectEnumerator]) {
    RCTUIView *componentView = taggedView.view; // [macOS]

    BOOL shouldEmitEvent = componentView != nil &&
        (hasParentEnterListener || IsViewListeningToEvent(taggedView, ViewEvents::Offset::PointerEnter));

    if (shouldEmitEvent && ![currentlyHoveredViews containsObject:taggedView]) {
      SharedTouchEventEmitter eventEmitter =
          GetTouchEmitterFromView(componentView, [_rootComponentView convertPoint:clientLocation toView:componentView]);
      if (eventEmitter != nil) {
        eventEmitter->onPointerEnter(event);
      }
    }

    if (shouldEmitEvent && !hasParentEnterListener) {
      hasParentEnterListener = YES;
    }
  }

  [_currentlyHoveredViewsPerPointer setObject:eventPathViews forKey:@(pointerId)];

  return eventPathViews;
}
#endif


@end
