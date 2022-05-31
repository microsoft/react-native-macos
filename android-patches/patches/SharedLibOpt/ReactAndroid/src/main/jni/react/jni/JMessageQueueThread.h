diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JMessageQueueThread.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JMessageQueueThread.h
index ef76632dfa..519a1cd2d9 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JMessageQueueThread.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JMessageQueueThread.h
@@ -12,6 +12,10 @@
 #include <cxxreact/MessageQueueThread.h>
 #include <fbjni/fbjni.h>
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 using namespace facebook::jni;
 
 namespace facebook {
@@ -23,7 +27,7 @@ class JavaMessageQueueThread : public jni::JavaClass<JavaMessageQueueThread> {
       "Lcom/facebook/react/bridge/queue/MessageQueueThread;";
 };
 
-class JMessageQueueThread : public MessageQueueThread {
+class RN_EXPORT JMessageQueueThread : public MessageQueueThread {
  public:
   JMessageQueueThread(alias_ref<JavaMessageQueueThread::javaobject> jobj);
 
