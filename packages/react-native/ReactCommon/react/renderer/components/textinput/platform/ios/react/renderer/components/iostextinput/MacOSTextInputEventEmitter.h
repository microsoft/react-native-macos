/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/attributedstring/AttributedString.h>
#include <react/renderer/components/iostextinput/TextInputEventEmitter.h>
#include <react/renderer/components/view/HostPlatformViewEventEmitter.h>

namespace facebook::react {

class MacOSTextInputEventEmitter : public TextInputEventEmitter {
 public:
  using TextInputEventEmitter::TextInputEventEmitter;

  struct OnAutoCorrectChange {
    bool enabled;
  };
  void onAutoCorrectChange(OnAutoCorrectChange value) const;

  struct OnSpellCheckChange {
    bool enabled;
  };
  void onSpellCheckChange(OnSpellCheckChange value) const;

  struct OnGrammarCheckChange {
    bool enabled;
  };
  void onGrammarCheckChange(OnGrammarCheckChange value) const;

  struct PasteEvent {
    std::vector<DataTransferItem> dataTransferItems;
  };
  void onPaste(const PasteEvent& pasteEvent) const;
};
} // namespace facebook::react
