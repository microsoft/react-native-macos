/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 #import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, RCTCursor) {
  RCTCursorAuto,
  RCTCursorPointer,
  // [macOS
  RCTCursorAlias,
  RCTCursorAllScroll,
  RCTCursorCell,
  RCTCursorColResize,
  RCTCursorContextMenu,
  RCTCursorCopy,
  RCTCursorCrosshair,
  RCTCursorDefault,
  RCTCursorEResize,
  RCTCursorEWResize,
  RCTCursorGrab,
  RCTCursorGrabbing,
  RCTCursorHelp,
  RCTCursorMove,
  RCTCursorNEResize,
  RCTCursorNESWResize,
  RCTCursorNResize,
  RCTCursorNSResize,
  RCTCursorNWResize,
  RCTCursorNWSEResize,
  RCTCursorNoDrop,
  RCTCursorNone,
  RCTCursorNotAllowed,
  RCTCursorProgress,
  RCTCursorRowResize,
  RCTCursorSResize,
  RCTCursorSEResize,
  RCTCursorSWResize,
  RCTCursorText,
  RCTCursorUrl,
  RCTCursorWResize,
  RCTCursorWait,
  RCTCursorZoomIn,
  RCTCursorZoomOut,
  // macOS]
};

// Write a switch statement for every cursor type in RCTCursor
// [macOS




#if TARGET_OS_OSX // [macOS
inline static NSCursor *NSCursorFromRCTCursor(RCTCursor cursor)
{
  switch (cursor) {
    case RCTCursorAuto:
      return [NSCursor arrowCursor];
    case RCTCursorPointer:
      return [NSCursor pointingHandCursor];
    case RCTCursorAlias:
      return [NSCursor dragLinkCursor];
    case RCTCursorAllScroll:
      // TODO
    case RCTCursorCell:
      
    case RCTCursorColResize:
      return [NSCursor resizeLeftRightCursor];
    case RCTCursorContextMenu:
      return [NSCursor contextualMenuCursor];
    case RCTCursorCopy:
      return [NSCursor dragCopyCursor];
    case RCTCursorCrosshair:
      return [NSCursor crosshairCursor];
    case RCTCursorDefault:
      return [NSCursor arrowCursor];
    case RCTCursorEResize:
      return [NSCursor resizeRightCursor];
    case RCTCursorEWResize:
      // TODO
    case RCTCursorGrab:
      return [NSCursor openHandCursor];
    case RCTCursorGrabbing:
      return [NSCursor closedHandCursor];
    case RCTCursorHelp:
      // TODO
    case RCTCursorMove:
      // TODO
    case RCTCursorNEResize:
      // TODO
    case RCTCursorNESWResize:
      // TODO
    case RCTCursorNResize:
      return [NSCursor resizeUpCursor];
    case RCTCursorNSResize:
      // TODO
    case RCTCursorNWResize:
      // TODO
    case RCTCursorNWSEResize:
     // TODO
    case RCTCursorNoDrop:
      return [NSCursor operationNotAllowedCursor];
    case RCTCursorNone:
      // TODO
    case RCTCursorNotAllowed:
      return [NSCursor operationNotAllowedCursor];
    case RCTCursorProgress:
      // TODO
    case RCTCursorRowResize:
      return [NSCursor resizeUpDownCursor];
    case RCTCursorSResize:
      return [NSCursor resizeDownCursor];
    case RCTCursorSEResize:
      // TODO
    case RCTCursorSWResize:
      // TODO
    case RCTCursorText:
      return [NSCursor IBeamCursor];
    case RCTCursorUrl:
      // TODO
    case RCTCursorWResize:
      // TODO
    case RCTCursorWait:
      // TODO
    case RCTCursorZoomIn:
      // TODO
    case RCTCursorZoomOut:
      // TODO
  }
}
#endif // macOS]

