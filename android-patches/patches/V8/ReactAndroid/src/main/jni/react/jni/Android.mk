--- ./ReactAndroid/src/main/jni/react/jni/Android.mk	2021-10-19 18:12:12.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/V8/ReactAndroid/src/main/jni/react/jni/Android.mk	2021-10-25 12:22:45.000000000 -0700
@@ -128,6 +128,7 @@
 $(call import-module,reactperflogger)
 $(call import-module,hermes)
 $(call import-module,runtimeexecutor)
+$(call import-module,v8jsi)
 $(call import-module,react/nativemodule/core)
 
 include $(REACT_SRC_DIR)/reactperflogger/jni/Android.mk
@@ -148,5 +149,6 @@
 include $(REACT_SRC_DIR)/../hermes/reactexecutor/Android.mk
 include $(REACT_SRC_DIR)/../hermes/instrumentation/Android.mk
 include $(REACT_SRC_DIR)/modules/blob/jni/Android.mk
+include $(REACT_SRC_DIR)/v8executor/Android.mk
 
 include $(REACT_GENERATED_SRC_DIR)/codegen/jni/Android.mk
