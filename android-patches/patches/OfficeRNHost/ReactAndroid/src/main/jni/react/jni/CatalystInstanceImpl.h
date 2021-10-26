--- ./ReactAndroid/src/main/jni/react/jni/CatalystInstanceImpl.h	2021-10-12 18:36:58.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactAndroid/src/main/jni/react/jni/CatalystInstanceImpl.h	2021-10-25 12:22:45.000000000 -0700
@@ -49,17 +49,16 @@
 
   CatalystInstanceImpl();
 
+  void createModuleRegistry(
+    jni::alias_ref<JavaMessageQueueThread::javaobject> nativeModulesQueue,
+    jni::alias_ref<jni::JCollection<JavaModuleWrapper::javaobject>::javaobject> javaModules,
+    jni::alias_ref<jni::JCollection<ModuleHolder::javaobject>::javaobject> cxxModules);
+
   void initializeBridge(
       jni::alias_ref<ReactCallback::javaobject> callback,
       // This executor is actually a factory holder.
       JavaScriptExecutorHolder *jseh,
-      jni::alias_ref<JavaMessageQueueThread::javaobject> jsQueue,
-      jni::alias_ref<JavaMessageQueueThread::javaobject> moduleQueue,
-      jni::alias_ref<
-          jni::JCollection<JavaModuleWrapper::javaobject>::javaobject>
-          javaModules,
-      jni::alias_ref<jni::JCollection<ModuleHolder::javaobject>::javaobject>
-          cxxModules);
+      jni::alias_ref<JavaMessageQueueThread::javaobject> jsQueue);
 
   void extendNativeModules(
       jni::alias_ref<jni::JCollection<
@@ -97,6 +96,7 @@
   void setGlobalVariable(std::string propName, std::string &&jsonValue);
   jlong getJavaScriptContext();
   void handleMemoryPressure(int pressureLevel);
+  jlong getPointerOfInstancePointer();
 
   // This should be the only long-lived strong reference, but every C++ class
   // will have a weak reference.
