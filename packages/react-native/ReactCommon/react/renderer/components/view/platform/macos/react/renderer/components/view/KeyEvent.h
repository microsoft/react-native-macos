/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>
#include <optional>

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

/**
 * Key event emitted by handled key events.
 */
struct KeyEvent {
  /**
   * The key for the event aligned to https://www.w3.org/TR/uievents-key/.
   */
  std::string key{};

  /*
   * A flag indicating if the alt key is pressed.
   */
  bool altKey{false};

  /*
   * A flag indicating if the control key is pressed.
   */
  bool ctrlKey{false};

  /*
   * A flag indicating if the shift key is pressed.
   */
  bool shiftKey{false};

  /*
   * A flag indicating if the meta key is pressed.
   */
  bool metaKey{false};
  
  /*
   * A flag indicating if the caps lock key is pressed.
   */
  bool capsLockKey{false};

  /*
   * A flag indicating if the key on the numeric pad is pressed.
   */
  bool numericPadKey{false};

  /*
   * A flag indicating if the help key is pressed.
   */
  bool helpKey{false};

  /*
   * A flag indicating if a function key is pressed.
   */
  bool functionKey{false};
};

inline static bool operator==(const KeyEvent &lhs, const HandledKey &rhs) {
  return lhs.key == rhs.key && 
      (!rhs.altKey.has_value() || lhs.altKey == *rhs.altKey) && 
      (!rhs.ctrlKey.has_value() || lhs.ctrlKey == *rhs.ctrlKey) && 
      (!rhs.shiftKey.has_value() || lhs.shiftKey == *rhs.shiftKey) && 
      (!rhs.metaKey.has_value() || lhs.metaKey == *rhs.metaKey);
}

} // namespace facebook::react
