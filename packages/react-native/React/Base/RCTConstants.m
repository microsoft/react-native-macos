/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTConstants.h"

#if !TARGET_OS_OSX // [macOS]
NSString *const RCTPlatformName = @"ios";
#else // [macOS
NSString *const RCTPlatformName = @"macos";
#endif // macOS]

NSString *const RCTUserInterfaceStyleDidChangeNotification = @"RCTUserInterfaceStyleDidChangeNotification";
#if !TARGET_OS_OSX // [macOS]
NSString *const RCTUserInterfaceStyleDidChangeNotificationTraitCollectionKey = @"traitCollection";
#else // [macOS
NSString *const RCTUserInterfaceStyleDidChangeNotificationAppearanceKey = @"appearance";
#endif // macOS]

NSString *const RCTWindowFrameDidChangeNotification = @"RCTWindowFrameDidChangeNotification";

NSString *const RCTJavaScriptDidFailToLoadNotification = @"RCTJavaScriptDidFailToLoadNotification";
NSString *const RCTJavaScriptDidLoadNotification = @"RCTJavaScriptDidLoadNotification";
NSString *const RCTJavaScriptWillStartExecutingNotification = @"RCTJavaScriptWillStartExecutingNotification";
NSString *const RCTJavaScriptWillStartLoadingNotification = @"RCTJavaScriptWillStartLoadingNotification";

NSString *const RCTDidInitializeModuleNotification = @"RCTDidInitializeModuleNotification";

NSString *const RCTNotifyEventDispatcherObserversOfEvent_DEPRECATED =
    @"RCTNotifyEventDispatcherObserversOfEvent_DEPRECATED";

/*
 * W3C Pointer Events
 */
static BOOL RCTDispatchW3CPointerEvents = NO;

BOOL RCTGetDispatchW3CPointerEvents(void)
{
  return RCTDispatchW3CPointerEvents;
}

void RCTSetDispatchW3CPointerEvents(BOOL value)
{
  RCTDispatchW3CPointerEvents = value;
}
