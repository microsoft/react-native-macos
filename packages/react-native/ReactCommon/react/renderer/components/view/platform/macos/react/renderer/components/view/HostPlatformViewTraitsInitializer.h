/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
  // The default allows mouse-down events to pass through to superviews.
  // Disabling window dragging needs a native boundary, not enabling it.
  return props.allowsVibrancy || !props.mouseDownCanMoveWindow ||
      props.acceptsFirstMouse || props.hostPlatformEvents.bits.any() ||
      props.tooltip.has_value() || !props.draggedTypes.empty() ||
      !props.keyDownEvents.empty() || !props.keyUpEvents.empty();
}

inline bool formsView(const ViewProps& props) {
  return props.focusable;
}

inline bool isKeyboardFocusable(const ViewProps& props) {
  return props.focusable;
}

} // namespace facebook::react::HostPlatformViewTraitsInitializer
