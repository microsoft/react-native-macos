/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "HostPlatformTouch.h"
#include "Touch.h"

namespace facebook::react {

void setTouchPayloadOnObject(
    jsi::Object& object,
    jsi::Runtime& runtime,
    const HostPlatformTouch& touch) {
  setTouchPayloadOnObject(object, runtime, static_cast<const BaseTouch&>(touch));
#if TARGET_OS_OSX // [macOS
  object.setProperty(runtime, "button", touch.button);
  object.setProperty(runtime, "altKey", touch.altKey);
  object.setProperty(runtime, "ctrlKey", touch.ctrlKey);
  object.setProperty(runtime, "shiftKey", touch.shiftKey);
  object.setProperty(runtime, "metaKey", touch.metaKey);
#endif // macOS]
}

#if RN_DEBUG_STRING_CONVERTIBLE

std::string getDebugName(const HostPlatformTouch& /*touch*/) {
  return "Touch";
}

std::vector<DebugStringConvertibleObject> getDebugProps(
    const HostPlatformTouch& touch,
    DebugStringConvertibleOptions options) {
  auto debugProps = getDebugProps(static_cast<const BaseTouch&>(touch), options);
  debugProps.insert(
      debugProps.end(),
      {
          {"button", getDebugDescription(touch.button, options)},
          {"altKey", getDebugDescription(touch.altKey, options)},
          {"ctrlKey", getDebugDescription(touch.ctrlKey, options)},
          {"shiftKey", getDebugDescription(touch.shiftKey, options)},
          {"metaKey", getDebugDescription(touch.metaKey, options)},
      });
  return debugProps;
};

#endif

} // namespace facebook::react
