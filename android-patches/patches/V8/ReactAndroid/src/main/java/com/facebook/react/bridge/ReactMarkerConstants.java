--- ./ReactAndroid/src/main/java/com/facebook/react/bridge/ReactMarkerConstants.java	2021-10-12 18:36:58.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/V8/ReactAndroid/src/main/java/com/facebook/react/bridge/ReactMarkerConstants.java	2021-10-25 12:22:45.000000000 -0700
@@ -109,6 +109,9 @@
   FABRIC_BATCH_EXECUTION_END,
   FABRIC_UPDATE_UI_MAIN_THREAD_START,
   FABRIC_UPDATE_UI_MAIN_THREAD_END,
+  BYTECODE_CREATION_FAILED,
+  BYTECODE_READ_FAILED,
+  BYTECODE_WRITE_FAILED,
   // New markers used by bridgeless RN below this line
   REACT_INSTANCE_INIT_START,
   REACT_INSTANCE_INIT_END
