diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/Android.mk
index 17eb40f3a0..722af07f44 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/jni/react/jni/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/jni/react/jni/Android.mk
@@ -22,8 +22,7 @@ LOCAL_C_INCLUDES := $(LOCAL_PATH)
 #   ./../ == react
 LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/../..
 
-LOCAL_CFLAGS += -fexceptions -frtti -Wno-unused-lambda-capture
-
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti -Wno-unused-lambda-capture
 LOCAL_LDLIBS += -landroid
 
 # The dynamic libraries (.so files) that this module depends on.
@@ -72,8 +71,7 @@ LOCAL_C_INCLUDES := $(LOCAL_PATH)
 #   ./../ == react
 LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/../..
 
-LOCAL_CFLAGS += -fexceptions -frtti -Wno-unused-lambda-capture
-
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti -Wno-unused-lambda-capture
 LOCAL_LDLIBS += -landroid
 
 # The dynamic libraries (.so files) that this module depends on.
