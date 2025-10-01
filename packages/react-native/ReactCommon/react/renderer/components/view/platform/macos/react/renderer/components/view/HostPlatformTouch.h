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

struct HostPlatformTouch : public BaseTouch {
  /*
   * The button indicating which pointer is used.
   */
  int button;

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
   * A flag indicating if the meta key is pressed.
   */
  bool metaKey;
};

} // namespace facebook::react
