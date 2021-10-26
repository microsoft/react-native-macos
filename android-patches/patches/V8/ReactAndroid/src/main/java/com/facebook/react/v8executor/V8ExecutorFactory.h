--- /dev/null	2021-10-25 12:29:33.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/V8/ReactAndroid/src/main/java/com/facebook/react/v8executor/V8ExecutorFactory.h	2021-10-25 12:22:45.000000000 -0700
@@ -0,0 +1,17 @@
+#include <folly/dynamic.h>
+#include <jsiexecutor/jsireact/JSIExecutor.h>
+
+namespace facebook { namespace react { namespace jsi {
+
+class V8ExecutorFactory : public JSExecutorFactory {
+public:
+  V8ExecutorFactory(folly::dynamic&& v8Config);
+
+  std::unique_ptr<JSExecutor> createJSExecutor(
+      std::shared_ptr<ExecutorDelegate> delegate,
+      std::shared_ptr<MessageQueueThread> jsQueue) override;
+
+private:
+  folly::dynamic m_v8Config;
+};
+}}} // namespace facebook::react::jsi
