/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "HostPlatformViewProps.h"

#include <algorithm>

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/components/view/conversions.h>
#include <react/renderer/components/view/propsConversions.h>
#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

HostPlatformViewProps::HostPlatformViewProps(
    const PropsParserContext& context,
    const HostPlatformViewProps& sourceProps,
    const RawProps& rawProps)
    : BaseViewProps(context, sourceProps, rawProps),
      macOSViewEvents(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.macOSViewEvents
              : convertRawProp(
                    context, 
                    rawProps,
                    sourceProps.macOSViewEvents,
                    {})),
      focusable(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.focusable
              : convertRawProp(
                    context,
                    rawProps,
                    "focusable",
                    sourceProps.focusable,
                    {})),
      enableFocusRing(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.enableFocusRing
              : convertRawProp(
                    context,
                    rawProps,
                    "enableFocusRing",
                    sourceProps.enableFocusRing,
                    {})) {}

#define MACOS_VIEW_EVENT_CASE(eventType)                    \
case CONSTEXPR_RAW_PROPS_KEY_HASH("on" #eventType): {       \
  const auto offset = MacOSViewEvents::Offset::eventType;   \
  MacOSViewEvents defaultViewEvents{};                      \
  bool res = defaultViewEvents[offset];                     \
  if (value.hasValue()) {                                   \
    fromRawValue(context, value, res);                      \
  }                                                         \
  macOSViewEvents[offset] = res;                              \
  return;                                                   \
}

void HostPlatformViewProps::setProp(
    const PropsParserContext& context,
    RawPropsPropNameHash hash,
    const char* propName,
    const RawValue& value) {
  // All Props structs setProp methods must always, unconditionally,
  // call all super::setProp methods, since multiple structs may
  // reuse the same values.
  BaseViewProps::setProp(context, hash, propName, value);
  
  static auto defaults = HostPlatformViewProps{};
  
  switch (hash) {
    RAW_SET_PROP_SWITCH_CASE_BASIC(focusable);
    RAW_SET_PROP_SWITCH_CASE_BASIC(enableFocusRing);
    MACOS_VIEW_EVENT_CASE(Focus);
    MACOS_VIEW_EVENT_CASE(Blur);
      
  }
}


} // namespace facebook::react
