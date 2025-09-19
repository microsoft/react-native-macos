/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ShadowNodeTraits.h>

namespace facebook::react::HostPlatformViewTraitsInitializer {

inline bool formsStackingContext(const ViewProps& props) {
  constexpr decltype(HostPlatformViewEvents::bits) mouseEventMask = {
      (1 << (int)HostPlatformViewEvents::Offset::MouseEnter) |
      (1 << (int)HostPlatformViewEvents::Offset::MouseLeave) |
      (1 << (int)HostPlatformViewEvents::Offset::DoubleClick)};
  return (props.hostPlatformEvents.bits & mouseEventMask).any() ||
      props.tooltip;
}

inline bool formsView(const ViewProps& props) {
  return props.focusable;
}

} // namespace facebook::react::HostPlatformViewTraitsInitializer
