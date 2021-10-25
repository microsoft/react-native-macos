--- ./ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstanceImpl.java	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstanceImpl.java	2021-10-25 12:22:45.000000000 -0700
@@ -121,7 +121,8 @@
       final JavaScriptExecutor jsExecutor,
       final NativeModuleRegistry nativeModuleRegistry,
       final JSBundleLoader jsBundleLoader,
-      NativeModuleCallExceptionHandler nativeModuleCallExceptionHandler) {
+      NativeModuleCallExceptionHandler nativeModuleCallExceptionHandler,
+      CatalystInstanceEventListener catalystInstanceEventListener) {
     FLog.d(ReactConstants.TAG, "Initializing React Xplat Bridge.");
     Systrace.beginSection(TRACE_TAG_REACT_JAVA_BRIDGE, "createCatalystInstanceImpl");
 
@@ -139,15 +140,21 @@
     mTraceListener = new JSProfilerTraceListener(this);
     Systrace.endSection(TRACE_TAG_REACT_JAVA_BRIDGE);
 
+    FLog.d(ReactConstants.TAG, "Create module registry");
+    createModuleRegistry(mNativeModulesQueueThread,
+      mNativeModuleRegistry.getJavaModules(this),
+      mNativeModuleRegistry.getCxxModules());
+    if (catalystInstanceEventListener != null) {
+      FLog.d(ReactConstants.TAG, "Invoking callback onModuleRegistryCreated");
+      catalystInstanceEventListener.onModuleRegistryCreated(this);
+    }
+
     FLog.d(ReactConstants.TAG, "Initializing React Xplat Bridge before initializeBridge");
     Systrace.beginSection(TRACE_TAG_REACT_JAVA_BRIDGE, "initializeCxxBridge");
     initializeBridge(
         new BridgeCallback(this),
         jsExecutor,
-        mReactQueueConfiguration.getJSQueueThread(),
-        mNativeModulesQueueThread,
-        mNativeModuleRegistry.getJavaModules(this),
-        mNativeModuleRegistry.getCxxModules());
+        mReactQueueConfiguration.getJSQueueThread());
     FLog.d(ReactConstants.TAG, "Initializing React Xplat Bridge after initializeBridge");
     Systrace.endSection(TRACE_TAG_REACT_JAVA_BRIDGE);
 
@@ -208,13 +215,15 @@
   private native void jniExtendNativeModules(
       Collection<JavaModuleWrapper> javaModules, Collection<ModuleHolder> cxxModules);
 
+  private native void createModuleRegistry(
+    MessageQueueThread moduleQueue,
+    Collection<JavaModuleWrapper> javaModules,
+    Collection<ModuleHolder> cxxModules);
+
   private native void initializeBridge(
       ReactCallback callback,
       JavaScriptExecutor jsExecutor,
-      MessageQueueThread jsQueue,
-      MessageQueueThread moduleQueue,
-      Collection<JavaModuleWrapper> javaModules,
-      Collection<ModuleHolder> cxxModules);
+      MessageQueueThread jsQueue);
 
   @Override
   public void setSourceURLs(String deviceURL, String remoteURL) {
@@ -395,7 +404,8 @@
                                             mJavaScriptContextHolder.clear();
 
                                             mHybridData.resetNative();
-                                            getReactQueueConfiguration().destroy();
+                                            // TODO :: Office patch :: Not sure why is this needed ?
+                                            // getReactQueueConfiguration().destroy();
                                             FLog.d(
                                                 ReactConstants.TAG,
                                                 "CatalystInstanceImpl.destroy() end");
@@ -565,6 +575,7 @@
   }
 
   private native long getJavaScriptContext();
+  public native long getPointerOfInstancePointer();
 
   private void incrementPendingJSCalls() {
     int oldPendingCalls = mPendingJSCalls.getAndIncrement();
@@ -668,6 +679,7 @@
     private @Nullable NativeModuleRegistry mRegistry;
     private @Nullable JavaScriptExecutor mJSExecutor;
     private @Nullable NativeModuleCallExceptionHandler mNativeModuleCallExceptionHandler;
+    private @Nullable CatalystInstanceEventListener mCatalystInstanceEventListener;
 
     public Builder setReactQueueConfigurationSpec(
         ReactQueueConfigurationSpec ReactQueueConfigurationSpec) {
@@ -695,13 +707,20 @@
       return this;
     }
 
+    public Builder setCatalystInstanceEventListener(
+      CatalystInstanceEventListener catalystInstanceEventListener) {
+        mCatalystInstanceEventListener = catalystInstanceEventListener;
+        return this;
+    }
+
     public CatalystInstanceImpl build() {
       return new CatalystInstanceImpl(
           Assertions.assertNotNull(mReactQueueConfigurationSpec),
           Assertions.assertNotNull(mJSExecutor),
           Assertions.assertNotNull(mRegistry),
           Assertions.assertNotNull(mJSBundleLoader),
-          Assertions.assertNotNull(mNativeModuleCallExceptionHandler));
+          Assertions.assertNotNull(mNativeModuleCallExceptionHandler),
+          mCatalystInstanceEventListener);
     }
   }
 }
