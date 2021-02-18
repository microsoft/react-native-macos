--- "E:\\github\\react-native-macos-fresh\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\bridge\\ReactBridge.java"	2021-02-09 22:22:02.075638100 -0800
+++ "E:\\github\\react-native-macos3\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\bridge\\ReactBridge.java"	2021-02-09 22:34:45.147175000 -0800
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
