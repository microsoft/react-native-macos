/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/TouchEventEmitter.h>
#include <react/renderer/components/view/macOS/KeyEvent.h>
#include <react/renderer/components/view/macOS/MouseEvent.h>

namespace facebook::react {

class MacOSViewEventEmitter : public TouchEventEmitter {
 public:
  using TouchEventEmitter::TouchEventEmitter;

#pragma mark - Keyboard Events

  void onKeyDown(KeyEvent const &keyEvent) const;
  void onKeyUp(KeyEvent const &keyEvent) const;
  
#pragma mark - Mouse Events

  void onMouseEnter(MouseEvent const &mouseEvent) const;
  void onMouseLeave(MouseEvent const &mouseEvent) const;

#pragma mark - Drag and Drop Events

  void onDragEnter(DragEvent const &dragEvent) const;
  void onDragLeave(DragEvent const &dragEvent) const;
  void onDrop(DragEvent const &dragEvent) const;
};

} // namespace facebook::react
