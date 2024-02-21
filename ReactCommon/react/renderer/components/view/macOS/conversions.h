/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/Conv.h>
#include <react/renderer/components/view/macOS/KeyEvent.h>
#include <react/renderer/components/view/macOS/primitives.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>

#include <unordered_map>
#include <string>

namespace facebook::react {

static inline MacOSViewEvents convertRawProp(
    const PropsParserContext &context,
    const RawProps &rawProps,
    const MacOSViewEvents &sourceValue,
    const MacOSViewEvents &defaultValue) {
  MacOSViewEvents result{};
  using Offset = MacOSViewEvents::Offset;

  result[Offset::KeyDown] =
      convertRawProp(context, rawProps, "onKeyDown", sourceValue[Offset::KeyDown], defaultValue[Offset::KeyDown]);
  result[Offset::KeyUp] =
      convertRawProp(context, rawProps, "onKeyUp", sourceValue[Offset::KeyUp], defaultValue[Offset::KeyUp]);

  result[Offset::MouseEnter] =
      convertRawProp(context, rawProps, "onMouseEnter", sourceValue[Offset::MouseEnter], defaultValue[Offset::MouseEnter]);
  result[Offset::MouseLeave] =
      convertRawProp(context, rawProps, "onMouseLeave", sourceValue[Offset::MouseLeave], defaultValue[Offset::MouseLeave]);

  result[Offset::DoubleClick] =
      convertRawProp(context, rawProps, "onDoubleClick", sourceValue[Offset::DoubleClick], defaultValue[Offset::DoubleClick]);

  return result;
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

inline void fromRawValue(const PropsParserContext &context, const RawValue &value, DraggedType &result) {
  auto string = (std::string)value;
  if (string == "fileUrl") {
    result = DraggedType::FileUrl;
  } else if (string == "image") {
    result = DraggedType::Image;
  } else if (string == "string") {
    result = DraggedType::String;
  } else {
    abort();
  }
}

} // namespace facebook::react
