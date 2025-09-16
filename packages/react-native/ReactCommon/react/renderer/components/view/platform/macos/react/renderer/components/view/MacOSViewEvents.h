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
  std::bitset<8> bits{}; // TODO: Windows sets this to 32.. should we be higher?

  enum class Offset : uint8_t { // TODO: Windows sets this and others to std::size_t instead of uint8_t.. should we?
    // Focus Events
    Focus = 0,
    Blur = 1,
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

  // Focus Events
  result[Offset::Focus] =
      convertRawProp(context, rawProps, "onFocus", sourceValue[Offset::Focus], defaultValue[Offset::Focus]);
  result[Offset::Blur] =
      convertRawProp(context, rawProps, "onBlur", sourceValue[Offset::Blur], defaultValue[Offset::Blur]);

  return result;
}

} // namespace facebook::react