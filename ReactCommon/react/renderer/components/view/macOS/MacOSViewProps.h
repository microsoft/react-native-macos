/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/macOS/KeyEvent.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/PropsParserContext.h>

namespace facebook::react {

class MacOSViewProps {
  public:
    MacOSViewProps() = default;
    MacOSViewProps(
        const PropsParserContext &context,
        const MacOSViewProps &sourceProps,
        const RawProps &rawProps,
        bool shouldSetRawProps = true);

  void
  setProp(
      const PropsParserContext &context,
      RawPropsPropNameHash hash,
      const char *propName,
      RawValue const &value);

  bool focusable{false};
  bool enableFocusRing{true};

  std::optional<std::vector<HandledKey>> validKeysDown{};
  std::optional<std::vector<HandledKey>> validKeysUp{};
};

} // namespace facebook::react
