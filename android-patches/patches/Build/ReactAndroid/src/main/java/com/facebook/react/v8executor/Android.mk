diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/v8executor/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/v8executor/Android.mk
index 8e28a3ddfd..0110af1d2a 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/v8executor/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/react/v8executor/Android.mk
@@ -13,7 +13,7 @@ LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp)
 
 LOCAL_C_INCLUDES := $(LOCAL_PATH) $(THIRD_PARTY_NDK_DIR)/..
 
-LOCAL_CFLAGS += -fvisibility=hidden -fexceptions -frtti
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections -fexceptions -frtti
 
 LOCAL_STATIC_LIBRARIES := libjsi libjsireact
 LOCAL_SHARED_LIBRARIES := libfolly_json libfb libfbjni libreactnativejni v8jsi
