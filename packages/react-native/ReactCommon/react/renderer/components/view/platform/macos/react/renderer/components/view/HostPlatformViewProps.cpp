/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "HostPlatformViewProps.h"

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/components/view/conversions.h>
#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

HostPlatformViewProps::HostPlatformViewProps(
    const PropsParserContext& context,
    const HostPlatformViewProps& sourceProps,
    const RawProps& rawProps)
    : BaseViewProps(context, sourceProps, rawProps),
      hostPlatformEvents(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.hostPlatformEvents
              : convertRawProp(
                    context,
                    rawProps,
                    sourceProps.hostPlatformEvents,
                    {})),
      enableFocusRing(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.enableFocusRing
              : convertRawProp(
                    context,
                    rawProps,
                    "enableFocusRing",
                    sourceProps.enableFocusRing,
                    true)),
      focusable(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.focusable
              : convertRawProp(
                    context,
                    rawProps,
                    "focusable",
                    sourceProps.focusable,
                    {})),
      draggedTypes(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.draggedTypes
              : convertRawProp(
                    context,
                    rawProps,
                    "draggedTypes",
                    sourceProps.draggedTypes,
                    {})),
      tooltip(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.tooltip
              : convertRawProp(
                    context,
                    rawProps,
                    "tooltip",
                    sourceProps.tooltip,
                    {})),
      validKeysDown(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.validKeysDown
              : convertRawProp(
                    context,
                    rawProps,
                    "validKeysDown",
                    sourceProps.validKeysDown,
                    {})),
      validKeysUp(
          ReactNativeFeatureFlags::enableCppPropsIteratorSetter()
              ? sourceProps.validKeysUp
              : convertRawProp(
                    context,
                    rawProps,
                    "validKeysUp",
                    sourceProps.validKeysUp,
                    {})){};

#define VIEW_EVENT_CASE_MACOS(eventType)                           \
  case CONSTEXPR_RAW_PROPS_KEY_HASH("on" #eventType): {            \
    const auto offset = HostPlatformViewEvents::Offset::eventType; \
    HostPlatformViewEvents defaultViewEvents{};                    \
    bool res = defaultViewEvents[offset];                          \
    if (value.hasValue()) {                                        \
      fromRawValue(context, value, res);                           \
    }                                                              \
    hostPlatformEvents[offset] = res;                              \
    return;                                                        \
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
    VIEW_EVENT_CASE_MACOS(DoubleClick);
    VIEW_EVENT_CASE_MACOS(KeyDown);
    VIEW_EVENT_CASE_MACOS(KeyUp);
    VIEW_EVENT_CASE_MACOS(MouseEnter);
    VIEW_EVENT_CASE_MACOS(MouseLeave);
    RAW_SET_PROP_SWITCH_CASE_BASIC(draggedTypes);
    RAW_SET_PROP_SWITCH_CASE_BASIC(enableFocusRing);
    RAW_SET_PROP_SWITCH_CASE_BASIC(focusable);
    RAW_SET_PROP_SWITCH_CASE_BASIC(tooltip);
    RAW_SET_PROP_SWITCH_CASE_BASIC(validKeysDown);
    RAW_SET_PROP_SWITCH_CASE_BASIC(validKeysUp);
  }
}

} // namespace facebook::react
