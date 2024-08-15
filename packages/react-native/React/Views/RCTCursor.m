/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import <Foundation/Foundation.h>
#import "RCTCursor.h"

#if defined(__MAC_OS_X_VERSION_MAX_ALLOWED) && __MAC_OS_X_VERSION_MAX_ALLOWED >= 150000 /* __MAC_15_0 */
#define __MAC_OS_15_SDK_AVAILABLE
#endif // __MAC_OS_X_VERSION_MAX_ALLOWED

#if TARGET_OS_OSX
NSCursor *NSCursorFromSFSymbol(NSString * _Nonnull symbolName)
{
  NSCursor *cursor = nil;
  if (@available(macOS 11.0, *)) {
    NSImage *symbolImage = [NSImage imageWithSystemSymbolName:symbolName accessibilityDescription:nil];
    if (symbolImage != nil) {
      cursor = [[NSCursor alloc] initWithImage:symbolImage hotSpot:NSZeroPoint];
    }
  }
  return cursor;
}

NSCursor *NSCursorFromRCTCursor(RCTCursor cursor)
{
  NSCursor *resolvedCursor = nil;
  switch (cursor) {
    case RCTCursorAuto:
      break;
    case RCTCursorAlias:
      resolvedCursor = [NSCursor dragLinkCursor];
      break;
    case RCTCursorAllScroll:
      resolvedCursor = NSCursorFromSFSymbol(@"arrow.up.and.down.and.arrow.left.and.right");
      break;
    case RCTCursorCell:
      resolvedCursor = NSCursorFromSFSymbol(@"cross.fill");
      break;
    case RCTCursorColResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor columnResizeCursor];
      } else {
        resolvedCursor = [NSCursor resizeLeftRightCursor];
      }
#else
      resolvedCursor = [NSCursor resizeLeftRightCursor];
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorContextMenu:
      resolvedCursor = [NSCursor contextualMenuCursor];
      break;
    case RCTCursorCopy:
      resolvedCursor = [NSCursor dragCopyCursor];
      break;
    case RCTCursorCrosshair:
      resolvedCursor = [NSCursor crosshairCursor];
      break;
    case RCTCursorDefault:
      resolvedCursor = [NSCursor arrowCursor];
      break;
    case RCTCursorEResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionLeft
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      } else {
        resolvedCursor = [NSCursor resizeRightCursor];
      }
#else
      resolvedCursor = [NSCursor resizeRightCursor];
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorEWResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionLeft
                                                    inDirections:NSCursorFrameResizeDirectionsAll];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorGrab:
      resolvedCursor = [NSCursor openHandCursor];
      break;
    case RCTCursorGrabbing:
      resolvedCursor = [NSCursor closedHandCursor];
      break;
    case RCTCursorHelp:
      resolvedCursor = NSCursorFromSFSymbol(@"questionmark");
      break;
    case RCTCursorMove:
      resolvedCursor = NSCursorFromSFSymbol(@"arrow.up.and.down.and.arrow.left.and.right");
      break;
    case RCTCursorNEResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionTopRight
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
    case RCTCursorNESWResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionTopRight
                                                    inDirections:NSCursorFrameResizeDirectionsAll];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorNResize:
      resolvedCursor = [NSCursor resizeUpCursor];
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionTop
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      } else {
        resolvedCursor = [NSCursor resizeUpCursor];
      }
#else
      resolvedCursor = [NSCursor resizeUpCursor];
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorNSResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionTop
                                                    inDirections:NSCursorFrameResizeDirectionsAll];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorNWResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionTopLeft
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorNWSEResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionTopLeft
                                                    inDirections:NSCursorFrameResizeDirectionsAll];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorNoDrop:
      resolvedCursor = [NSCursor operationNotAllowedCursor];
      break;
    case RCTCursorNone:
      // Not supported
      break;
    case RCTCursorNotAllowed:
      resolvedCursor = [NSCursor operationNotAllowedCursor];
      break;
    case RCTCursorPointer:
      resolvedCursor = [NSCursor pointingHandCursor];
      break;
    case RCTCursorProgress:
      resolvedCursor = NSCursorFromSFSymbol(@"progress.indicator");
      break;
    case RCTCursorRowResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor rowResizeCursor];
      } else {
        resolvedCursor = [NSCursor resizeUpDownCursor];
      }
#else
      resolvedCursor = [NSCursor resizeUpDownCursor];
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorSResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionBottom
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      } else {
        resolvedCursor = [NSCursor resizeDownCursor];
      }
#else
      resolvedCursor = [NSCursor resizeDownCursor];
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorSEResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionBottomRight
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorSWResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionBottomLeft
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorText:
      resolvedCursor = [NSCursor IBeamCursor];
      break;
    case RCTCursorUrl:
      // Not supported
      break;
    case RCTCursorWResize:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor frameResizeCursorFromPosition:NSCursorFrameResizePositionLeft
                                                    inDirections:NSCursorFrameResizeDirectionsOutward];
      }
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorWait:
      resolvedCursor = NSCursorFromSFSymbol(@"arrow.trianglehead.2.clockwise.rotate.90.circle.fill");
      break;
    case RCTCursorZoomIn:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor zoomInCursor];
      } else {
        resolvedCursor = NSCursorFromSFSymbol(@"plus.magnifyingglass");
      }
#else
      resolvedCursor = NSCursorFromSFSymbol(@"plus.magnifyingglass");
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
    case RCTCursorZoomOut:
#ifdef __MAC_OS_15_SDK_AVAILABLE
      if (@available(macOS 15.0, *)) {
        resolvedCursor = [NSCursor zoomOutCursor];
      } else {
        resolvedCursor = NSCursorFromSFSymbol(@"minus.magnifyingglass");
      }
#else
      resolvedCursor = NSCursorFromSFSymbol(@"minus.magnifyingglass");
#endif // __MAC_OS_15_SDK_AVAILABLE
      break;
  }
  return resolvedCursor;
}
#endif // TARGET_OS_OSX

