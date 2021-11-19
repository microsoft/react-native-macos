--- a/ReactAndroid/src/main/jni/react/jni/Android.mk
+++ b/ReactAndroid/src/main/jni/react/jni/Android.mk
@@ -77,7 +77,7 @@ LOCAL_CFLAGS += -fexceptions -frtti -Wno-unused-lambda-capture
 LOCAL_LDLIBS += -landroid
 
 # The dynamic libraries (.so files) that this module depends on.
-LOCAL_SHARED_LIBRARIES := libreactnativeutilsjni libfolly_json libfb libfbjni libglog_init libyoga
+LOCAL_SHARED_LIBRARIES := libfolly_json libfb libfbjni libglog_init libyoga
 
 # The static libraries (.a files) that this module depends on.
 LOCAL_STATIC_LIBRARIES := libreactnative libruntimeexecutor libcallinvokerholder
