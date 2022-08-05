--- "C:\\github\\react-native\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\v8executor\\V8Executor.java"	1970-01-01 05:30:00.000000000 +0530
+++ "C:\\github\\react-native-macos\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\v8executor\\V8Executor.java"	2022-08-05 12:38:10.946736100 +0530
@@ -0,0 +1,36 @@
+/**
+ * Copyright (c) 2015-present, Facebook, Inc.
+ *
+ * <p>This source code is licensed under the MIT license found in the LICENSE file in the root
+ * directory of this source tree.
+ */
+
+package com.facebook.react.v8executor;
+
+import com.facebook.jni.HybridData;
+import com.facebook.proguard.annotations.DoNotStrip;
+import com.facebook.react.bridge.JavaScriptExecutor;
+import com.facebook.react.bridge.ReadableNativeMap;
+import com.facebook.soloader.SoLoader;
+
+@DoNotStrip
+public class V8Executor extends JavaScriptExecutor {
+  static {
+    loadLibrary();
+  }
+
+  public static void loadLibrary() throws UnsatisfiedLinkError {
+    SoLoader.loadLibrary("v8executor");
+  }
+
+  /* package */ V8Executor(ReadableNativeMap v8Config) {
+    super(initHybrid(v8Config));
+  }
+
+  @Override
+  public String getName() {
+    return "V8Executor";
+  }
+
+  private static native HybridData initHybrid(ReadableNativeMap v8Config);
+}
