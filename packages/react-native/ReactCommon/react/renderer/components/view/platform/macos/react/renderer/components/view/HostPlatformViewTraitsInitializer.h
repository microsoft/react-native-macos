/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ShadowNodeTraits.h>

namespace facebook::react::HostPlatformViewTraitsInitializer {

inline bool formsStackingContext(const ViewProps& props) {
  return props.allowsVibrancy ||
         props.mouseDownCanMoveWindow ||
         props.acceptsFirstMouse ||
         props.hostPlatformEvents.bits.any();
}

inline bool formsView(const ViewProps& props) {
  return props.focusable;
}

} // namespace facebook::react::HostPlatformViewTraitsInitializer
