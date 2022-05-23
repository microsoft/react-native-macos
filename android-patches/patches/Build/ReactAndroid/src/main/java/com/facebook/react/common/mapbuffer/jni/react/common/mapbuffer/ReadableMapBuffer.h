diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/common/mapbuffer/jni/react/common/mapbuffer/ReadableMapBuffer.h b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/common/mapbuffer/jni/react/common/mapbuffer/ReadableMapBuffer.h
index b3f753a67b..60382c9501 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/common/mapbuffer/jni/react/common/mapbuffer/ReadableMapBuffer.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/common/mapbuffer/jni/react/common/mapbuffer/ReadableMapBuffer.h
@@ -13,6 +13,10 @@
 
 #include <fbjni/ByteBuffer.h>
 
+#ifndef RN_EXPORT
+#define RN_EXPORT __attribute__((visibility("default")))
+#endif
+
 namespace facebook {
 namespace react {
 
@@ -23,7 +27,7 @@ class ReadableMapBuffer : public jni::HybridClass<ReadableMapBuffer> {
 
   static void registerNatives();
 
-  static jni::local_ref<jhybridobject> createWithContents(MapBuffer &&map);
+  RN_EXPORT static jni::local_ref<jhybridobject> createWithContents(MapBuffer &&map);
 
   jni::local_ref<jni::JByteBuffer> importByteBufferAllocateDirect();
 
