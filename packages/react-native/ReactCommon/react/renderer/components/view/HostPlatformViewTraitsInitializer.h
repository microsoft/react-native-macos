/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#if defined(__APPLE__)
#include <TargetConditionals.h>
#endif

#if defined(__ANDROID__)
#include "platform/android/react/renderer/components/view/HostPlatformViewTraitsInitializer.h"
#elif defined(__APPLE__) && TARGET_OS_OSX
#include "platform/macos/react/renderer/components/view/HostPlatformViewTraitsInitializer.h"
#else
#include "platform/cxx/react/renderer/components/view/HostPlatformViewTraitsInitializer.h"
#endif
