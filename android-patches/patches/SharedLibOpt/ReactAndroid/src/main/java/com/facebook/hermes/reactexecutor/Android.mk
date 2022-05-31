diff --git a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/reactexecutor/Android.mk b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/reactexecutor/Android.mk
index 7716394c31..2815b73724 100644
--- a/home/dev/rnm_clean_0.66/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/reactexecutor/Android.mk
+++ b/home/dev/react-native-macos/ReactAndroid/src/main/java/com/facebook/hermes/reactexecutor/Android.mk
@@ -15,6 +15,8 @@ LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp)
 
 LOCAL_C_INCLUDES := $(LOCAL_PATH) $(REACT_NATIVE)/ReactCommon/jsi $(call find-node-module,$(LOCAL_PATH),hermes-engine)/android/include
 
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections
+
 LOCAL_CPP_FEATURES := exceptions
 
 LOCAL_STATIC_LIBRARIES := libjsireact libhermes-executor-common-release
@@ -32,6 +34,8 @@ LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp)
 
 LOCAL_C_INCLUDES := $(LOCAL_PATH) $(REACT_NATIVE)/ReactCommon/jsi $(call find-node-module,$(LOCAL_PATH),hermes-engine)/android/include
 
+LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections
+
 LOCAL_CPP_FEATURES := exceptions
 
 LOCAL_STATIC_LIBRARIES := libjsireact libhermes-executor-common-debug libhermes-inspector
