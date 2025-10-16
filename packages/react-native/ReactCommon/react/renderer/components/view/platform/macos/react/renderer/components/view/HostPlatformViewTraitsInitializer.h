/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ShadowNodeTraits.h>

namespace facebook::react::HostPlatformViewTraitsInitializer {

inline bool formsStackingContext(const ViewProps& props) {
    return false;
}

inline bool formsView(const ViewProps& props) {
  return props.focusable ||
         props.tooltip ||
         props.hostPlatformEvents[HostPlatformViewEvents::Offset::MouseEnter] ||
         props.hostPlatformEvents[HostPlatformViewEvents::Offset::MouseLeave] ||
         props.hostPlatformEvents[HostPlatformViewEvents::Offset::DoubleClick];
}

} // namespace facebook::react::HostPlatformViewTraitsInitializer
