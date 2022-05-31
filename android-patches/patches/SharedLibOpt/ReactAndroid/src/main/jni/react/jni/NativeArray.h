diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeArray.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeArray.h
index 8c7c879ac2..958f26f142 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeArray.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/NativeArray.h
@@ -12,6 +12,10 @@
 
 #include "NativeCommon.h"
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 namespace facebook {
 namespace react {
 
