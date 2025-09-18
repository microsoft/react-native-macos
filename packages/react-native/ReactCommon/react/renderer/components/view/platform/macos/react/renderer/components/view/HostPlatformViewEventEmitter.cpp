/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#include <react/renderer/components/view/HostPlatformViewEventEmitter.h>

namespace facebook::react {

#pragma mark - Focus Events

void HostPlatformViewEventEmitter::onFocus() const {
  dispatchEvent("focus");
}

void HostPlatformViewEventEmitter::onBlur() const {
  dispatchEvent("blur");
}

} // namespace facebook::react
