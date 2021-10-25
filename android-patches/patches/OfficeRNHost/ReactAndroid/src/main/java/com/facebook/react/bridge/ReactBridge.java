--- ./ReactAndroid/src/main/java/com/facebook/react/bridge/ReactBridge.java	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactAndroid/src/main/java/com/facebook/react/bridge/ReactBridge.java	2021-10-25 12:22:45.000000000 -0700
@@ -31,6 +31,24 @@
     Systrace.beginSection(
         TRACE_TAG_REACT_JAVA_BRIDGE, "ReactBridge.staticInit::load:reactnativejni");
     ReactMarker.logMarker(ReactMarkerConstants.LOAD_REACT_NATIVE_SO_FILE_START);
+
+    // JS Engine is configurable .. And we expect only one packaged.
+    // Hence ignore failure.
+
+    try {
+      SoLoader.loadLibrary("hermes");
+    } catch (UnsatisfiedLinkError jscE) {}
+
+    try {
+      SoLoader.loadLibrary("v8jsi");
+    } catch (UnsatisfiedLinkError jscE) {}
+    
+    SoLoader.loadLibrary("glog_init");
+    SoLoader.loadLibrary("fb");
+    SoLoader.loadLibrary("fbjni");
+    SoLoader.loadLibrary("yoga");
+    SoLoader.loadLibrary("jsinspector");
+
     SoLoader.loadLibrary("reactnativejni");
     ReactMarker.logMarker(ReactMarkerConstants.LOAD_REACT_NATIVE_SO_FILE_END);
     Systrace.endSection(TRACE_TAG_REACT_JAVA_BRIDGE);
