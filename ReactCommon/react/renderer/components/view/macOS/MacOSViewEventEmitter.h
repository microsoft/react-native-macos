/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/TouchEventEmitter.h>
#include <react/renderer/components/view/macOS/KeyEvent.h>

namespace facebook::react {

class MacOSViewEventEmitter : public TouchEventEmitter {
 public:
  using TouchEventEmitter::TouchEventEmitter;

#pragma mark - Keyboard Events

  void onKeyDown(KeyEvent const &keyEvent) const;
  void onKeyUp(KeyEvent const &keyEvent) const;
};

} // namespace facebook::react
