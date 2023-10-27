/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <jsireact/JSIExecutor.h>

namespace facebook {
namespace react {

class JSCExecutorFactory : public JSExecutorFactory {
 public:
  explicit JSCExecutorFactory(JSIExecutor::RuntimeInstaller runtimeInstaller)
      : runtimeInstaller_(std::move(runtimeInstaller)) {}

  void setEnableDebugger(bool enableDebugger);

  void setDebuggerName(const std::string &debuggerName);

  std::unique_ptr<JSExecutor> createJSExecutor(
      std::shared_ptr<ExecutorDelegate> delegate,
      std::shared_ptr<MessageQueueThread> jsQueue) override;

 private:
  JSIExecutor::RuntimeInstaller runtimeInstaller_;

  bool enableDebugger_ = true;
  std::string debuggerName_ = "JSC React Native";
};

} // namespace react
} // namespace facebook
