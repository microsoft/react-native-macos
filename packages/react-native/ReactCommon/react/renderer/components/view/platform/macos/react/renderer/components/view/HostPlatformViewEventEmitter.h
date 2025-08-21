/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/BaseViewEventEmitter.h>
#include <react/renderer/components/view/KeyEvent.h>
#include <react/renderer/components/view/MouseEvent.h>

namespace facebook::react {

class HostPlatformViewEventEmitter : public BaseViewEventEmitter {
 public:
  using BaseViewEventEmitter::BaseViewEventEmitter;

#pragma mark - Keyboard Events

  void onKeyDown(KeyEvent const &keyEvent) const;
  void onKeyUp(KeyEvent const &keyEvent) const;

#pragma mark - Mouse Events

  void onMouseEnter(MouseEvent const &mouseEvent) const;
  void onMouseLeave(MouseEvent const &mouseEvent) const;
  void onDoubleClick(MouseEvent const &mouseEvent) const;

#pragma mark - Drag and Drop Events

  void onDragEnter(DragEvent const &dragEvent) const;
  void onDragLeave(DragEvent const &dragEvent) const;
  void onDrop(DragEvent const &dragEvent) const;

#pragma mark - Focus Events

  void onFocus() const;
  void onBlur() const;

  static jsi::Value dataTransferPayload(jsi::Runtime &runtime, std::vector<DataTransferItem> const &dataTransferItems);
};

} // namespace facebook::react
