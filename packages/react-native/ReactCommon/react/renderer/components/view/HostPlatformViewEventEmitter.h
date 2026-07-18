/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#if defined(__APPLE__)
#include <TargetConditionals.h>
#endif

#if defined(__APPLE__) && TARGET_OS_OSX
#include <react/renderer/components/view/platform/macos/react/renderer/components/view/HostPlatformViewEventEmitter.h>
#else
#include <react/renderer/components/view/platform/cxx/react/renderer/components/view/HostPlatformViewEventEmitter.h>
#endif
