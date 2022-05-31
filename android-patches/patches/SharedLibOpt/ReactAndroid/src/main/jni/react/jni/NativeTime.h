diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeTime.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeTime.h
index b4d028dd88..ce768cb7ec 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeTime.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeTime.h
@@ -7,10 +7,14 @@
 
 #pragma once
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 namespace facebook {
 namespace react {
 
-double reactAndroidNativePerformanceNowHook();
+RN_EXPORT double reactAndroidNativePerformanceNowHook();
 
 } // namespace react
 } // namespace facebook
