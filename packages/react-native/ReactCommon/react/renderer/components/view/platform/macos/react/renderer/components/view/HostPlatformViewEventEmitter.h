/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#pragma once

#include <react/renderer/components/view/BaseViewEventEmitter.h>
#include <react/renderer/components/view/KeyEvent.h>
#include <react/renderer/components/view/MouseEvent.h>

namespace facebook::react {

class HostPlatformViewEventEmitter : public BaseViewEventEmitter {
 public:
  using BaseViewEventEmitter::BaseViewEventEmitter;

#pragma mark - Focus Events

  void onFocus() const;
  void onBlur() const;

#pragma mark - Keyboard Events

  void onKeyDown(const KeyEvent& keyEvent) const;
  void onKeyUp(const KeyEvent& keyEvent) const;

#pragma mark - Mouse Events

  void onMouseEnter(const MouseEvent& mouseEvent) const;
  void onMouseLeave(const MouseEvent& mouseEvent) const;
  void onDoubleClick(const MouseEvent& mouseEvent) const;

#pragma mark - Drag and Drop Events

  void onDragEnter(const DragEvent& dragEvent) const;
  void onDragLeave(const DragEvent& dragEvent) const;
  void onDrop(const DragEvent& dragEvent) const;
  static jsi::Value dataTransferPayload(
    jsi::Runtime& runtime,
    const DataTransfer& dataTransfer);
};

} // namespace facebook::react
