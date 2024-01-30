/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <bitset>

namespace facebook::react {

struct MacOSViewEvents {
  std::bitset<8> bits{};

  enum class Offset : uint8_t {
    KeyDown = 1,
    KeyUp = 2,
  };

  constexpr bool operator[](const Offset offset) const {
    return bits[static_cast<uint8_t>(offset)];
  }

  std::bitset<8>::reference operator[](const Offset offset) {
    return bits[static_cast<uint8_t>(offset)];
  }
};

inline static bool operator==(MacOSViewEvents const &lhs, MacOSViewEvents const &rhs) {
  return lhs.bits == rhs.bits;
}

inline static bool operator!=(MacOSViewEvents const &lhs, MacOSViewEvents const &rhs) {
  return lhs.bits != rhs.bits;
}

} // namespace facebook::react
