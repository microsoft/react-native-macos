diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/ReadableNativeMap.h b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/ReadableNativeMap.h
index 282082c39a..39ee6aa3ee 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/ReadableNativeMap.h
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/ReadableNativeMap.h
@@ -39,7 +39,7 @@ struct ReadableNativeMap : jni::HybridClass<ReadableNativeMap, NativeMap> {
   jni::local_ref<jni::JArrayClass<jobject>> importValues();
   jni::local_ref<jni::JArrayClass<jobject>> importTypes();
   folly::Optional<folly::dynamic> keys_;
-  static jni::local_ref<jhybridobject> createWithContents(folly::dynamic &&map);
+  RN_EXPORT static jni::local_ref<jhybridobject> createWithContents(folly::dynamic &&map);
 
   static void mapException(const std::exception &ex);
 
