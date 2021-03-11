/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTBridge.h>
#import <React/RCTJSInvokerModule.h>

/**
 * RCTEventEmitter is an abstract base class to be used for modules that emit
 * events to be observed by JS.
 */
@interface RCTEventEmitter : NSObject <RCTBridgeModule, RCTJSInvokerModule, RCTInvalidating>

<<<<<<< HEAD
@property (nonatomic, weak) RCTBridge * _Nullable bridge; // TODO(macOS ISS#2323203)
@property (nonatomic, copy, nonnull) void (^invokeJS)(NSString * _Nullable module, NSString * _Nullable method, NSArray * _Nullable args); // TODO(macOS ISS#2323203)
=======
@property (nonatomic, weak) RCTBridge *bridge;

- (instancetype)initWithDisabledObservation;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

/**
 * Override this method to return an array of supported event names. Attempting
 * to observe or send an event that isn't included in this list will result in
 * an error.
 */
- (NSArray<NSString *> *_Nullable)supportedEvents; // TODO(macOS ISS#2323203)

/**
 * Send an event that does not relate to a specific view, e.g. a navigation
 * or data update notification.
 */
- (void)sendEventWithName:(NSString *_Nullable)name body:(id _Nullable )body; // TODO(macOS ISS#2323203)

/**
 * These methods will be called when the first observer is added and when the
 * last observer is removed (or when dealloc is called), respectively. These
 * should be overridden in your subclass in order to start/stop sending events.
 */
- (void)startObserving;
- (void)stopObserving;

<<<<<<< HEAD
- (void)addListener:(NSString *_Nullable)eventName; // TODO(macOS ISS#2323203)
=======
- (void)invalidate NS_REQUIRES_SUPER;

- (void)addListener:(NSString *)eventName;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
- (void)removeListeners:(double)count;

@end
