#include <folly/dynamic.h>
#include <jsiexecutor/jsireact/JSIExecutor.h>
#include <jsi/V8Runtime.h>
#include "react/jni/JSLoader.h"
#include <react/jni/JSLogging.h>
#include <react/jni/ReadableNativeMap.h>


namespace facebook { namespace react { namespace jsi {

class V8ExecutorFactory : public JSExecutorFactory {
public:
  V8ExecutorFactory(folly::dynamic&& v8Config) :
    m_v8Config(std::move(v8Config)) {}

  std::unique_ptr<JSExecutor> createJSExecutor(
      std::shared_ptr<ExecutorDelegate> delegate,
      std::shared_ptr<MessageQueueThread> jsQueue) override;

private:
  folly::dynamic m_v8Config;
};
}}} // namespace facebook::react::jsi
