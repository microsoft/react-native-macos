/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "MacOSViewEventEmitter.h"

namespace facebook::react {

#pragma mark - Keyboard Events

static jsi::Value keyEventPayload(jsi::Runtime &runtime, KeyEvent const &event) {
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

void MacOSViewEventEmitter::onKeyDown(KeyEvent const &keyEvent) const {
  dispatchEvent(
      "keyDown",
      [keyEvent](jsi::Runtime &runtime) { return keyEventPayload(runtime, keyEvent); },
      EventPriority::AsynchronousBatched);
}

void MacOSViewEventEmitter::onKeyUp(KeyEvent const &keyEvent) const {
  dispatchEvent(
      "keyUp",
      [keyEvent](jsi::Runtime &runtime) { return keyEventPayload(runtime, keyEvent); },
      EventPriority::AsynchronousBatched);
}

} // namespace facebook::react
