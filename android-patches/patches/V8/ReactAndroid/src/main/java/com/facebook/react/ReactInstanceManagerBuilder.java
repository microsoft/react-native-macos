--- "C:\\github\\react-native\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactInstanceManagerBuilder.java"	2022-08-05 12:59:58.286964700 +0530
+++ "C:\\github\\react-native-macos\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactInstanceManagerBuilder.java"	2022-08-05 15:08:37.009898300 +0530
@@ -34,6 +34,8 @@
 import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;
 import com.facebook.react.packagerconnection.RequestHandler;
 import com.facebook.react.uimanager.UIImplementationProvider;
+import com.facebook.react.v8executor.V8ExecutorFactory;
+import com.facebook.react.v8executor.V8Executor;
 import java.util.ArrayList;
 import java.util.List;
 import java.util.Map;
@@ -397,6 +399,9 @@
     } else if (jsInterpreter == JSInterpreter.HERMES) {
       HermesExecutor.loadLibrary();
       return new HermesExecutorFactory();
+    } else if(mJSEngine == JSInterpreter.V8) {
+      V8Executor.loadLibrary();
+      return new V8ExecutorFactory(appName, deviceName);
     } else {
       JSCExecutor.loadLibrary();
       return new JSCExecutorFactory(appName, deviceName);
