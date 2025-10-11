/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "MacOSTextInputEventEmitter.h"

namespace facebook::react {

void MacOSTextInputEventEmitter::onAutoCorrectChange(
    OnAutoCorrectChange event) const {
  dispatchEvent(
      "autoCorrectChange", [event = std::move(event)](jsi::Runtime& runtime) {
        auto payload = jsi::Object(runtime);
        payload.setProperty(runtime, "enabled", event.enabled);
        return payload;
      });
}

void MacOSTextInputEventEmitter::onSpellCheckChange(
    OnSpellCheckChange event) const {
  dispatchEvent(
      "spellCheckChange", [event = std::move(event)](jsi::Runtime& runtime) {
        auto payload = jsi::Object(runtime);
        payload.setProperty(runtime, "enabled", event.enabled);
        return payload;
      });
}

void MacOSTextInputEventEmitter::onGrammarCheckChange(
    OnGrammarCheckChange event) const {
  dispatchEvent(
      "grammarCheckChange", [event = std::move(event)](jsi::Runtime& runtime) {
        auto payload = jsi::Object(runtime);
        payload.setProperty(runtime, "enabled", event.enabled);
        return payload;
      });
}

void MacOSTextInputEventEmitter::onPaste(const PasteEvent& pasteEvent) const {
  dispatchEvent("paste", [pasteEvent](jsi::Runtime& runtime) {
    auto payload = jsi::Object(runtime);
    auto dataTransfer =
        dataTransferPayload(runtime, pasteEvent.dataTransferItems);
    payload.setProperty(runtime, "dataTransfer", dataTransfer);
    return payload;
  });
}
} // namespace facebook::react
