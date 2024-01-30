/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>

namespace facebook::react {

/*
 * Describes a request to handle a key input.
 */
struct HandledKey {
  /**
   * The key for the event aligned to https://www.w3.org/TR/uievents-key/.
   */
  std::string key{};

  /*
   * A flag indicating if the alt key is pressed.
   */
  std::optional<bool> altKey{};

  /*
   * A flag indicating if the control key is pressed.
   */
  std::optional<bool> ctrlKey{};

  /*
   * A flag indicating if the shift key is pressed.
   */
  std::optional<bool> shiftKey{};

  /*
   * A flag indicating if the meta key is pressed.
   */
  std::optional<bool> metaKey{};
};

inline static bool operator==(const HandledKey &lhs, const HandledKey &rhs) {
  return lhs.key == rhs.key && lhs.altKey == rhs.altKey && lhs.ctrlKey == rhs.ctrlKey &&
      lhs.shiftKey == rhs.shiftKey && lhs.metaKey == rhs.metaKey;
}

} // namespace facebook::react
