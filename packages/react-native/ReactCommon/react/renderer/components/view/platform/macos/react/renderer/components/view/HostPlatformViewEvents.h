/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>
#include <array>
#include <bitset>
#include <cmath>
#include <optional>

namespace facebook::react {

struct HostPlatformViewEvents {
  std::bitset<64> bits{};

  enum class Offset : std::size_t {
    // Focus Events
    Focus = 0,
    Blur = 1,

    // Keyboard Events
    KeyDown = 1,
    KeyUp = 2,

    // Mouse Events
    MouseEnter = 3,
    MouseLeave = 4,
    DoubleClick = 5,
  };

  constexpr bool operator[](const Offset offset) const {
    return bits[static_cast<std::size_t>(offset)];
  }

  std::bitset<64>::reference operator[](const Offset offset) {
    return bits[static_cast<std::size_t>(offset)];
  }
};

inline static bool operator==(
    const HostPlatformViewEvents& lhs,
    const HostPlatformViewEvents& rhs) {
  return lhs.bits == rhs.bits;
}

inline static bool operator!=(
    const HostPlatformViewEvents& lhs,
    const HostPlatformViewEvents& rhs) {
  return lhs.bits != rhs.bits;
}

static inline HostPlatformViewEvents convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const HostPlatformViewEvents& sourceValue,
    const HostPlatformViewEvents& defaultValue) {
  HostPlatformViewEvents result{};
  using Offset = HostPlatformViewEvents::Offset;

  // Focus Events
  result[Offset::Focus] = convertRawProp(
    context, 
    rawProps, 
    "onFocus", 
    sourceValue[Offset::Focus], 
    defaultValue[Offset::Focus]);
  result[Offset::Blur] = convertRawProp(
    context, 
    rawProps, 
    "onBlur", 
    sourceValue[Offset::Blur], 
    defaultValue[Offset::Blur]);

  // Keyboard Events
  result[Offset::KeyDown] = convertRawProp(
      context,
      rawProps,
      "onKeyDown",
      sourceValue[Offset::KeyDown],
      defaultValue[Offset::KeyDown]);
  result[Offset::KeyUp] = convertRawProp(
      context,
      rawProps,
      "onKeyUp",
      sourceValue[Offset::KeyUp],
      defaultValue[Offset::KeyUp]);

  // Mouse Events
  result[Offset::MouseEnter] = convertRawProp(
      context,
      rawProps,
      "onMouseEnter",
      sourceValue[Offset::MouseEnter],
      defaultValue[Offset::MouseEnter]);
  result[Offset::MouseLeave] = convertRawProp(
      context,
      rawProps,
      "onMouseLeave",
      sourceValue[Offset::MouseLeave],
      defaultValue[Offset::MouseLeave]);

  result[Offset::DoubleClick] = convertRawProp(
      context,
      rawProps,
      "onDoubleClick",
      sourceValue[Offset::DoubleClick],
      defaultValue[Offset::DoubleClick]);

  return result;
}

} // namespace facebook::react
