--- ./ReactAndroid/src/main/jni/react/jni/JReactMarker.cpp	2021-10-19 18:12:12.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/V8/ReactAndroid/src/main/jni/react/jni/JReactMarker.cpp	2021-10-25 12:22:45.000000000 -0700
@@ -92,6 +92,15 @@
     case ReactMarker::REACT_INSTANCE_INIT_STOP:
       // These are not used on Android.
       break;
+    case ReactMarker::BYTECODE_CREATION_FAILED:
+      JReactMarker::logMarker("BYTECODE_CREATION_FAILED");
+      break;
+    case ReactMarker::BYTECODE_READ_FAILED:
+      JReactMarker::logMarker("BYTECODE_READ_FAILED", tag);
+      break;
+    case ReactMarker::BYTECODE_WRITE_FAILED:
+      JReactMarker::logMarker("BYTECODE_WRITE_FAILED");
+      break;
   }
 }
 
