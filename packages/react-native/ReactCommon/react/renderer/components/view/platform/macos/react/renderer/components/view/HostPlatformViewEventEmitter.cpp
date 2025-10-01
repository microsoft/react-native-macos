/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#include <react/renderer/components/view/HostPlatformViewEventEmitter.h>
#include <react/renderer/components/view/KeyEvent.h>

namespace facebook::react {

#pragma mark - Focus Events

void HostPlatformViewEventEmitter::onFocus() const {
  dispatchEvent("focus");
}

void HostPlatformViewEventEmitter::onBlur() const {
  dispatchEvent("blur");
}

#pragma mark - Keyboard Events

static jsi::Value keyEventPayload(jsi::Runtime& runtime, const KeyEvent& event) {
  auto payload = jsi::Object(runtime);
  payload.setProperty(runtime, "key", jsi::String::createFromUtf8(runtime, event.key));
  payload.setProperty(runtime, "ctrlKey", event.ctrlKey);
  payload.setProperty(runtime, "shiftKey", event.shiftKey);
  payload.setProperty(runtime, "altKey", event.altKey);
  payload.setProperty(runtime, "metaKey", event.metaKey);
  payload.setProperty(runtime, "capsLockKey", event.capsLockKey);
  payload.setProperty(runtime, "numericPadKey", event.numericPadKey);
  payload.setProperty(runtime, "helpKey", event.helpKey);
  payload.setProperty(runtime, "functionKey", event.functionKey);
  return payload;
};

void HostPlatformViewEventEmitter::onKeyDown(const KeyEvent& keyEvent) const {
  dispatchEvent("keyDown", [keyEvent](jsi::Runtime& runtime) {
    return keyEventPayload(runtime, keyEvent);
  });
}

void HostPlatformViewEventEmitter::onKeyUp(const KeyEvent& keyEvent) const {
  dispatchEvent("keyUp", [keyEvent](jsi::Runtime& runtime) {
    return keyEventPayload(runtime, keyEvent);
  });
}

#pragma mark - Mouse Events

static jsi::Value mouseEventPayload(jsi::Runtime& runtime, const MouseEvent& event) {
  auto payload = jsi::Object(runtime);
  payload.setProperty(runtime, "clientX", event.clientX);
  payload.setProperty(runtime, "clientY", event.clientY);
  payload.setProperty(runtime, "screenX", event.screenX);
  payload.setProperty(runtime, "screenY", event.screenY);
  payload.setProperty(runtime, "altKey", event.altKey);
  payload.setProperty(runtime, "ctrlKey", event.ctrlKey);
  payload.setProperty(runtime, "shiftKey", event.shiftKey);
  payload.setProperty(runtime, "metaKey", event.metaKey);
  return payload;
};

void HostPlatformViewEventEmitter::onMouseEnter(const MouseEvent& mouseEvent) const {
  dispatchEvent("mouseEnter", [mouseEvent](jsi::Runtime &runtime) { 
    return mouseEventPayload(runtime, mouseEvent); 
  });
}

void HostPlatformViewEventEmitter::onMouseLeave(const MouseEvent& mouseEvent) const {
  dispatchEvent("mouseLeave", [mouseEvent](jsi::Runtime &runtime) { 
    return mouseEventPayload(runtime, mouseEvent); 
  });
}

} // namespace facebook::react
