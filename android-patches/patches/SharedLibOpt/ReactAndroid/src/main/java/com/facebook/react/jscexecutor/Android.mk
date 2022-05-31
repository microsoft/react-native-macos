diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/jscexecutor/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/jscexecutor/Android.mk
index 19a28eee5a..19141aba7d 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/jscexecutor/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/jscexecutor/Android.mk
@@ -13,8 +13,7 @@ LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp)
 
 LOCAL_C_INCLUDES := $(LOCAL_PATH)
 
-LOCAL_CFLAGS += -fvisibility=hidden -fexceptions -frtti
-
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti
 LOCAL_STATIC_LIBRARIES :=  libjsireact jscruntime
 LOCAL_SHARED_LIBRARIES := libfolly_json libfb libfbjni libreactnativejni libjsi
 
