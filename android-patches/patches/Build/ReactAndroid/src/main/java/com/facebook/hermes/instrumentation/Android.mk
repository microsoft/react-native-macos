diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/instrumentation/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/instrumentation/Android.mk
index 651168243e..369b6414ae 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/instrumentation/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/instrumentation/Android.mk
@@ -12,6 +12,8 @@ include $(CLEAR_VARS)
 
 LOCAL_MODULE := jsijniprofiler
 
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections
+
 LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp)
 
 LOCAL_C_INCLUDES := $(LOCAL_PATH) $(REACT_NATIVE)/ReactCommon/jsi $(call find-node-module,$(LOCAL_PATH),hermes-engine)/android/include
