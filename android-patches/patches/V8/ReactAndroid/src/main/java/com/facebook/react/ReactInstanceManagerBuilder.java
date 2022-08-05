--- "C:\\github\\react-native\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactInstanceManagerBuilder.java"	2022-08-05 12:59:58.286964700 +0530
+++ "C:\\github\\react-native-macos\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactInstanceManagerBuilder.java"	2022-08-05 12:38:48.221666400 +0530
@@ -397,6 +397,9 @@
     } else if (jsInterpreter == JSInterpreter.HERMES) {
       HermesExecutor.loadLibrary();
       return new HermesExecutorFactory();
+    } else if(mJSEngine == JSInterpreter.V8) {
+      V8Executor.loadLibrary();
+      return new V8ExecutorFactory(appName, deviceName);
     } else {
       JSCExecutor.loadLibrary();
       return new JSCExecutorFactory(appName, deviceName);
