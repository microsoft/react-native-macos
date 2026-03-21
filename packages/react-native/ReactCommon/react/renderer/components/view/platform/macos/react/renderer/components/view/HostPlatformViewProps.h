/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#pragma once

#include <react/renderer/core/Props.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/components/view/primitives.h>
#include <react/renderer/components/view/BaseViewProps.h>

#include <react/renderer/components/view/KeyEvent.h>

#include <optional>
#include <string>

#include "HostPlatformViewEvents.h"

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

#pragma mark - Props

  bool focusable{false};
  bool enableFocusRing{true};

  std::vector<HandledKey> keyDownEvents{};
  std::vector<HandledKey> keyUpEvents{};

  std::vector<std::string> draggedTypes{};

  std::optional<std::string> tooltip{};

  bool acceptsFirstMouse{false};
  bool allowsVibrancy{false};
  bool mouseDownCanMoveWindow{true};
};
} // namespace facebook::react
