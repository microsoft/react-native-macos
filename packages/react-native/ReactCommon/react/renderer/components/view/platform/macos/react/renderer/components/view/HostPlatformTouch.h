/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#pragma once

#include <react/renderer/components/view/BaseTouch.h>

namespace facebook::react {

class HostPlatformTouch : public BaseTouch {
 public:
  /*
   * The button indicating which pointer is used.
   */
  int button;

  /*
   * The pointer type indicating the device type (e.g., mouse, pen, touch)
   */
  std::string pointerType;

  /*
   * A flag indicating if the alt key is pressed.
   */
  bool altKey;

  /*
   * A flag indicating if the control key is pressed.
   */
  bool ctrlKey;

  /*
   * A flag indicating if the shift key is pressed.
   */
  bool shiftKey;

  /*
   * A flag indicating if the shift key is pressed.
   */
  bool metaKey;

  /*
   * Windows-specific timestamp field. We can't use the shared BaseTouch
   * timestamp field beacuse it's a float and lacks sufficient resolution.
   */
  double pointerTimestamp;
};

inline static void setTouchPayloadOnObject(
    jsi::Object& object,
    jsi::Runtime& runtime,
    const HostPlatformTouch& touch) {
  object.setProperty(runtime, "locationX", touch.offsetPoint.x);
  object.setProperty(runtime, "locationY", touch.offsetPoint.y);
  object.setProperty(runtime, "pageX", touch.pagePoint.x);
  object.setProperty(runtime, "pageY", touch.pagePoint.y);
  object.setProperty(runtime, "screenX", touch.screenPoint.x);
  object.setProperty(runtime, "screenY", touch.screenPoint.y);
  object.setProperty(runtime, "identifier", touch.identifier);
  object.setProperty(runtime, "target", touch.target);
  object.setProperty(runtime, "timestamp", touch.pointerTimestamp);
  object.setProperty(runtime, "force", touch.force);
  object.setProperty(runtime, "button", touch.button);
  object.setProperty(runtime, "altKey", touch.altKey);
  object.setProperty(runtime, "ctrlKey", touch.ctrlKey);
  object.setProperty(runtime, "shiftKey", touch.shiftKey);
  object.setProperty(runtime, "metaKey", touch.metaKey);
};

} // namespace facebook::react
