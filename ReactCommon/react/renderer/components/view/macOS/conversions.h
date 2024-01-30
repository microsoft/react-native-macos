/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/Conv.h>
#include <react/renderer/components/view/macOS/KeyEvent.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>

#include <unordered_map>

namespace facebook::react {

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
