/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#if !TARGET_OS_OSX // [macOS
#include <react/renderer/core/Props.h>
#include <react/renderer/core/PropsParserContext.h>
#else // [macOS
#include <react/renderer/components/view/macOS/MacOSViewProps.h>
#endif // macOS]

namespace facebook::react {
#if !TARGET_OS_OSX // [macOS]
class HostPlatformViewProps {
 public:
  HostPlatformViewProps() = default;
  HostPlatformViewProps(
      const PropsParserContext &context,
      const HostPlatformViewProps &sourceProps,
      const RawProps &rawProps,
      bool shouldSetRawProps = true) {}

  void
  setProp(
      const PropsParserContext &context,
      RawPropsPropNameHash hash,
      const char *propName,
      RawValue const &value) {}
};
#else // [macOS
  using HostPlatformViewProps = MacOSViewProps;
#endif // macOS]
} // namespace facebook::react
