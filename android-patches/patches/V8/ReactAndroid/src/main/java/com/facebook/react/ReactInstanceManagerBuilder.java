--- "E:\\github\\react-native-macos-fresh\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactInstanceManagerBuilder.java"	2021-02-09 22:22:02.042124100 -0800
+++ "E:\\github\\react-native-macos3\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactInstanceManagerBuilder.java"	2021-02-09 22:02:12.808297600 -0800
@@ -26,6 +26,7 @@
 import com.facebook.react.devsupport.interfaces.DevBundleDownloadListener;
 import com.facebook.react.devsupport.interfaces.DevSupportManager;
 import com.facebook.react.jscexecutor.JSCExecutorFactory;
+import com.facebook.react.v8executor.V8ExecutorFactory;
 import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;
 import com.facebook.react.packagerconnection.RequestHandler;
 import com.facebook.react.uimanager.UIImplementationProvider;
@@ -58,9 +59,22 @@
   private int mMinTimeLeftInFrameForNonBatchedOperationMs = -1;
   private @Nullable JSIModulePackage mJSIModulesPackage;
   private @Nullable Map<String, RequestHandler> mCustomPackagerCommandHandlers;
+  
+  public enum JSEngine {
+    Hermes,
+    V8
+  }
+  
+  private JSEngine mJSEngine = JSEngine.V8;
 
   /* package protected */ ReactInstanceManagerBuilder() {}
 
+  public ReactInstanceManagerBuilder setJSEngine(
+      JSEngine jsEngine) {
+    mJSEngine = jsEngine;
+    return this;
+  }
+
   /** Sets a provider of {@link UIImplementation}. Uses default provider if null is passed. */
   public ReactInstanceManagerBuilder setUIImplementationProvider(
       @Nullable UIImplementationProvider uiImplementationProvider) {
@@ -291,6 +305,12 @@
 
   private JavaScriptExecutorFactory getDefaultJSExecutorFactory(
       String appName, String deviceName, Context applicationContext) {
+    if(mJSEngine == JSEngine.V8) {
+      return new V8ExecutorFactory(appName, deviceName);
+    } else if (mJSEngine == JSEngine.Hermes) {
+      return new HermesExecutorFactory();
+    }
+
     try {
       // If JSC is included, use it as normal
       initializeSoLoaderIfNecessary(applicationContext);
