diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/uimanager/jni/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/uimanager/jni/Android.mk
index a4085b466b..392d4fcefc 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/uimanager/jni/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/uimanager/jni/Android.mk
@@ -22,8 +22,7 @@ LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/
 LOCAL_CFLAGS := \
   -DLOG_TAG=\"ReacTNative\"
 
-LOCAL_CFLAGS += -fexceptions -frtti -std=c++17 -Wall
-
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti -std=c++17 -Wall
 include $(BUILD_SHARED_LIBRARY)
 
 $(call import-module,fbgloginit)
