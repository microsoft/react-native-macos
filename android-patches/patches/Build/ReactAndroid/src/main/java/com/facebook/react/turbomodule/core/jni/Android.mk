diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/Android.mk
index 758713238e..d957bfe1aa 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/Android.mk
@@ -48,8 +48,7 @@ LOCAL_C_INCLUDES := $(LOCAL_PATH)/ReactCommon
 # Header search path for modules that depend on this module
 LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)
 
-LOCAL_CFLAGS += -fexceptions -frtti -std=c++17 -Wall
-
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti -std=c++17 -Wall
 LOCAL_SHARED_LIBRARIES = libfb libfbjni libreact_nativemodule_core
 
 LOCAL_STATIC_LIBRARIES = libcallinvokerholder libreactperfloggerjni
