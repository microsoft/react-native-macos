/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <jsireact/JSIExecutor.h>

namespace facebook {
namespace react {

/**
 * Creates a lambda used to bind a JSIRuntime in the context of
 * Apple platforms, such as console logging, performance metrics, etc.
 */
<<<<<<< HEAD
JSIExecutor::RuntimeInstaller RCTJSIExecutorRuntimeInstaller(JSIExecutor::RuntimeInstaller runtimeInstallerToWrap);
=======
JSIExecutor::RuntimeInstaller RCTJSIExecutorRuntimeInstaller(
    JSIExecutor::RuntimeInstaller runtimeInstallerToWrap);
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

} // namespace react
} // namespace facebook
