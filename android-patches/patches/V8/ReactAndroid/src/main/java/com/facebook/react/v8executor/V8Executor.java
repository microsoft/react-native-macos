--- /dev/null	2021-10-25 12:29:33.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/V8/ReactAndroid/src/main/java/com/facebook/react/v8executor/V8Executor.java	2021-10-25 12:22:45.000000000 -0700
@@ -0,0 +1,32 @@
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
+/* package */ class V8Executor extends JavaScriptExecutor {
+  static {
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
