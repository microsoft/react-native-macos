diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JRuntimeExecutor.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JRuntimeExecutor.h
index 1a250d7a86..dc678232e3 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JRuntimeExecutor.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JRuntimeExecutor.h
@@ -10,6 +10,10 @@
 #include <ReactCommon/RuntimeExecutor.h>
 #include <fbjni/fbjni.h>
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 namespace facebook {
 namespace react {
 
@@ -18,7 +22,7 @@ class JRuntimeExecutor : public jni::HybridClass<JRuntimeExecutor> {
   static auto constexpr kJavaDescriptor =
       "Lcom/facebook/react/bridge/RuntimeExecutor;";
 
-  RuntimeExecutor get();
+  RN_EXPORT RuntimeExecutor get();
 
  private:
   friend HybridBase;
