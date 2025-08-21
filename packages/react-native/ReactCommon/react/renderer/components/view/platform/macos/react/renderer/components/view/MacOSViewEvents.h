/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>

#include <bitset>

namespace facebook::react {

struct MacOSViewEvents {
  std::bitset<8> bits{};

  enum class Offset : uint8_t {
    // Keyboard Events
    KeyDown = 1,
    KeyUp = 2,

    // Mouse Events
    MouseEnter = 3,
    MouseLeave = 4,
    DoubleClick = 5,
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

static inline MacOSViewEvents convertRawProp(
    const PropsParserContext &context,
    const RawProps &rawProps,
    const MacOSViewEvents &sourceValue,
    const MacOSViewEvents &defaultValue) {
  MacOSViewEvents result{};
  using Offset = MacOSViewEvents::Offset;

  // Key Events
  result[Offset::KeyDown] =
      convertRawProp(context, rawProps, "onKeyDown", sourceValue[Offset::KeyDown], defaultValue[Offset::KeyDown]);
  result[Offset::KeyUp] =
      convertRawProp(context, rawProps, "onKeyUp", sourceValue[Offset::KeyUp], defaultValue[Offset::KeyUp]);

  // Mouse Events
  result[Offset::MouseEnter] =
      convertRawProp(context, rawProps, "onMouseEnter", sourceValue[Offset::MouseEnter], defaultValue[Offset::MouseEnter]);
  result[Offset::MouseLeave] =
      convertRawProp(context, rawProps, "onMouseLeave", sourceValue[Offset::MouseLeave], defaultValue[Offset::MouseLeave]);
  result[Offset::DoubleClick] =
      convertRawProp(context, rawProps, "onDoubleClick", sourceValue[Offset::DoubleClick], defaultValue[Offset::DoubleClick]);

  return result;
}

} // namespace facebook::react
