#include "V8ExecutorFactory.h"
#include <folly/dynamic.h>
#include <jsiexecutor/jsireact/JSIExecutor.h>
#include <jsi/V8Runtime.h>
#include "react/jni/JSLoader.h"
#include <react/jni/JSLogging.h>
#include <react/jni/ReadableNativeMap.h>

namespace facebook{ namespace react{ namespace jsi{

std::unique_ptr<JSExecutor> V8ExecutorFactory::createJSExecutor(
      std::shared_ptr<ExecutorDelegate> delegate,
      std::shared_ptr<MessageQueueThread> jsQueue){

    auto logger = std::make_shared<JSIExecutor::Logger>([](const std::string& message, unsigned int logLevel) {
                    reactAndroidLoggingHook(message, logLevel);
    });

    return folly::make_unique<JSIExecutor>(
      facebook::v8runtime::makeV8Runtime(m_v8Config, logger),
      delegate,
      *logger,
      JSIExecutor::defaultTimeoutInvoker,
      nullptr);
  }
  }}} // namespace facebook::react::jsi