--- ./ReactAndroid/src/main/jni/third-party/boost/Android.mk	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/Build/ReactAndroid/src/main/jni/third-party/boost/Android.mk	2021-10-25 12:22:45.000000000 -0700
@@ -1,8 +1,8 @@
 LOCAL_PATH:= $(call my-dir)
 include $(CLEAR_VARS)
 
-LOCAL_C_INCLUDES := $(LOCAL_PATH)/boost_1_63_0
-LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/boost_1_63_0
+LOCAL_C_INCLUDES := $(LOCAL_PATH)/boost_1_68_0
+LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/boost_1_68_0
 
 LOCAL_MODULE    := boost
 
