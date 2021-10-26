--- ./ReactCommon/cxxreact/CxxNativeModule.h	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactCommon/cxxreact/CxxNativeModule.h	2021-10-25 12:22:45.000000000 -0700
@@ -46,6 +46,12 @@
       unsigned int hookId,
       folly::dynamic &&args) override;
 
+  // Adding this factory method so that Office Android can delay load binary reactnativejni
+  static std::unique_ptr<CxxNativeModule> Make(std::weak_ptr<Instance> instance,
+                                               std::string name,
+                                               xplat::module::CxxModule::Provider provider,
+                                               std::shared_ptr<MessageQueueThread> messageQueueThread);
+
  private:
   void lazyInit();
 
