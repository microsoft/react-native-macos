/*
 * Copyright (c) Microsoft Corporation.
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

inline void fromRawValue(const PropsParserContext &context, const RawValue &value, HandledKey &result) {
  if (value.hasType<std::unordered_map<std::string, RawValue>>()) {
    auto map = static_cast<std::unordered_map<std::string, RawValue>>(value);
    for (const auto &pair : map) {
      if (pair.first == "key") {
        result.key = static_cast<std::string>(pair.second);
      } else if (pair.first == "altKey") {
        result.altKey = static_cast<bool>(pair.second);
      } else if (pair.first == "ctrlKey") {
        result.ctrlKey = static_cast<bool>(pair.second);
      } else if (pair.first == "shiftKey") {
        result.shiftKey = static_cast<bool>(pair.second);
      } else if (pair.first == "metaKey") {
        result.metaKey = static_cast<bool>(pair.second);
      }
    }
  } else if (value.hasType<std::string>()) {
    result.key = (std::string)value;
  }
}

} // namespace facebook::react
