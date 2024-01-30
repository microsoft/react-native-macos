/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "MacOSViewProps.h"

#include <react/renderer/components/view/macOS/conversions.h>
#include <react/renderer/core/CoreFeatures.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

MacOSViewProps::MacOSViewProps(
    const PropsParserContext &context,
    const MacOSViewProps &sourceProps,
    const RawProps &rawProps,
    bool shouldSetRawProps)
    : focusable(
          CoreFeatures::enablePropIteratorSetter
              ? sourceProps.focusable
              : convertRawProp(context, rawProps, "focusable", sourceProps.focusable, {})),
      enableFocusRing(
          CoreFeatures::enablePropIteratorSetter
              ? sourceProps.enableFocusRing
              : convertRawProp(context, rawProps, "enableFocusRing", sourceProps.enableFocusRing, true)),
      validKeysDown(
          CoreFeatures::enablePropIteratorSetter
              ? sourceProps.validKeysDown
              : convertRawProp(context, rawProps, "validKeysDown", sourceProps.validKeysDown, {})),
      validKeysUp(
          CoreFeatures::enablePropIteratorSetter
              ? sourceProps.validKeysUp
              : convertRawProp(context, rawProps, "validKeysUp", sourceProps.validKeysUp, {})){};

void MacOSViewProps::setProp(
    const PropsParserContext &context,
    RawPropsPropNameHash hash,
    const char *propName,
    RawValue const &value) {
  switch (hash) {
    RAW_SET_PROP_SWITCH_CASE_BASIC(focusable, false);
    RAW_SET_PROP_SWITCH_CASE_BASIC(enableFocusRing, true);
    RAW_SET_PROP_SWITCH_CASE_BASIC(validKeysDown, {});
    RAW_SET_PROP_SWITCH_CASE_BASIC(validKeysUp, {});
  }
}

} // namespace facebook::react
