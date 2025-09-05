/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#if TARGET_OS_OSX

#include <react/renderer/components/view/macOS/MacOSViewEventEmitter.h>

namespace facebook::react {
using HostPlatformViewEventEmitter = MacOSViewEventEmitter;
} // namespace facebook::react

#else

#include <react/renderer/components/view/TouchEventEmitter.h>

namespace facebook::react {
  using HostPlatformViewEventEmitter = TouchEventEmitter;
} // namespace facebook::react

#endif
