diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JReactMarker.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JReactMarker.h
index d495daf9ec..5da80bbc1d 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/JReactMarker.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/JReactMarker.h
@@ -12,6 +12,10 @@
 
 #include <cxxreact/ReactMarker.h>
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 namespace facebook {
 namespace react {
 
@@ -19,7 +23,7 @@ class JReactMarker : public facebook::jni::JavaClass<JReactMarker> {
  public:
   static constexpr auto kJavaDescriptor =
       "Lcom/facebook/react/bridge/ReactMarker;";
-  static void setLogPerfMarkerIfNeeded();
+  RN_EXPORT static void setLogPerfMarkerIfNeeded();
 
  private:
   static void logMarker(const std::string &marker);
