--- ./ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstance.java	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstance.java	2021-10-25 12:22:45.000000000 -0700
@@ -131,4 +131,11 @@
    * hasNativeModule, and getNativeModules can also return TurboModules.
    */
   void setTurboModuleManager(JSIModule getter);
+
+  long getPointerOfInstancePointer();
+
+  public interface CatalystInstanceEventListener {
+    void onModuleRegistryCreated(CatalystInstance catalystInstance);
+  }
+
 }
