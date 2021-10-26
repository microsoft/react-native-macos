--- /dev/null	2021-10-25 12:29:33.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/OfficeRNHost/ReactCommon/cxxreact/PlatformBundleInfo.h	2021-10-25 12:22:45.000000000 -0700
@@ -0,0 +1,15 @@
+#pragma once
+
+#include <cxxreact/JSBigString.h>
+
+namespace facebook { namespace react {
+
+struct PlatformBundleInfo
+{
+	std::unique_ptr<const JSBigString> Bundle;
+	std::string BundleUrl;
+	std::string BytecodePath;
+	uint64_t Version;
+};
+
+}}//namespace facebook::react
\ No newline at end of file
