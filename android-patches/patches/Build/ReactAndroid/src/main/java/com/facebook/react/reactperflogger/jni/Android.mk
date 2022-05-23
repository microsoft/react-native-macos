diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/reactperflogger/jni/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/reactperflogger/jni/Android.mk
index fd0ff0d7fd..7a83b3a80f 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/reactperflogger/jni/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/reactperflogger/jni/Android.mk
@@ -13,8 +13,7 @@ LOCAL_C_INCLUDES := $(LOCAL_PATH)/reactperflogger
 # Header search path for modules that depend on this module
 LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)
 
-LOCAL_CFLAGS += -fexceptions -frtti -std=c++17 -Wall
-
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti -std=c++17 -Wall
 LOCAL_LDLIBS += -landroid
 
 LOCAL_STATIC_LIBRARIES = libreactperflogger
