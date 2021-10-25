--- ./ReactCommon/cxxreact/Instance.cpp	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactCommon/cxxreact/Instance.cpp	2021-10-25 12:22:45.000000000 -0700
@@ -39,6 +39,11 @@
   }
 }
 
+void Instance::setModuleRegistry(
+    std::shared_ptr<ModuleRegistry> moduleRegistry) {
+  moduleRegistry_ = std::move(moduleRegistry);
+}
+
 void Instance::initializeBridge(
     std::unique_ptr<InstanceCallback> callback,
     std::shared_ptr<JSExecutorFactory> jsef,
