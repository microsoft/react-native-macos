/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/BaseViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include "HostPlatformViewEvents.h"
#include "KeyEvent.h"

namespace facebook::react {
class HostPlatformViewProps : public BaseViewProps {
 public:
  HostPlatformViewProps() = default;
  HostPlatformViewProps(
      const PropsParserContext& context,
      const HostPlatformViewProps& sourceProps,
      const RawProps& rawProps);

  void setProp(
      const PropsParserContext& context,
      RawPropsPropNameHash hash,
      const char* propName,
      const RawValue& value);

  HostPlatformViewEvents hostPlatformEvents{};

  bool enableFocusRing{true};
  bool focusable{false};

  std::vector<std::string> draggedTypes{};
  std::optional<std::string> tooltip{};
  std::optional<std::vector<HandledKey>> validKeysDown{};
  std::optional<std::vector<HandledKey>> validKeysUp{};
};
} // namespace facebook::react
