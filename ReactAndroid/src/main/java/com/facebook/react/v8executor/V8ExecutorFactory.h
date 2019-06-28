#include <folly/dynamic.h>
#include <jsiexecutor/jsireact/JSIExecutor.h>
#include <jsi/V8Runtime.h>
#include "JSLoader.h"
#include <JSLogging.h>
#include <ReadableNativeMap.h>


namespace facebook {
namespace react {

namespace v8executor{

class V8ExecutorFactory : public JSExecutorFactory {
public:
  V8ExecutorFactory(folly::dynamic&& v8Config) :
    m_v8Config(std::move(v8Config)) {
  }

  std::unique_ptr<JSExecutor> createJSExecutor(
      std::shared_ptr<ExecutorDelegate> delegate,
      std::shared_ptr<MessageQueueThread> jsQueue) override {

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

private:
  folly::dynamic m_v8Config;
};
}
}
}
