diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JSLogging.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JSLogging.h
index 3d853200fb..d168ef3658 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JSLogging.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JSLogging.h
@@ -10,13 +10,17 @@
 #include <android/log.h>
 #include <string>
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 namespace facebook {
 namespace react {
 
-void reactAndroidLoggingHook(
+RN_EXPORT void reactAndroidLoggingHook(
     const std::string &message,
     android_LogPriority logLevel);
-void reactAndroidLoggingHook(const std::string &message, unsigned int logLevel);
+RN_EXPORT void reactAndroidLoggingHook(const std::string &message, unsigned int logLevel);
 
 } // namespace react
 } // namespace facebook
