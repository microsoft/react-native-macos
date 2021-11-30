--- a/ReactAndroid/src/main/java/com/facebook/react/bridge/ReactBridge.java
+++ b/ReactAndroid/src/main/java/com/facebook/react/bridge/ReactBridge.java
@@ -31,6 +31,25 @@ public class ReactBridge {
     Systrace.beginSection(
         TRACE_TAG_REACT_JAVA_BRIDGE, "ReactBridge.staticInit::load:reactnativejni");
     ReactMarker.logMarker(ReactMarkerConstants.LOAD_REACT_NATIVE_SO_FILE_START);
+
+    // JS Engine is configurable.. And we exepct only one packaged
+    // Hence ignore failure
+    try {
+	SoLoader.loadLibrary("hermes");
+    }catch (UnsatisfiedLinkError jscE){}
+
+    try {
+	SoLoader.loadLibrary("v8jsi");
+    }catch (UnsatisfiedLinkError jscE){}
+
+    SoLoader.loadLibrary("glog");
+    SoLoader.loadLibrary("glog_init");
+    SoLoader.loadLibrary("fb");
+    SoLoader.loadLibrary("fbjni");
+    SoLoader.loadLibrary("yoga");
+    SoLoader.loadLibrary("folly_json");
+    SoLoader.loadLibrary("reactperfloggerjni");
+    SoLoader.loadLibrary("jsinspector");
     SoLoader.loadLibrary("reactnativejni");
     ReactMarker.logMarker(ReactMarkerConstants.LOAD_REACT_NATIVE_SO_FILE_END);
     Systrace.endSection(TRACE_TAG_REACT_JAVA_BRIDGE);
