--- ./Libraries/Components/View/ReactNativeViewViewConfigAndroid.js	2021-10-06 16:05:18.000000000 -0700
+++ /var/folders/vs/8_b205053dddbcv7btj0w0v80000gn/T/update-Ge4Sm3/merge/Focus/Libraries/Components/View/ReactNativeViewViewConfigAndroid.js	2021-10-25 12:22:45.000000000 -0700
@@ -19,6 +19,12 @@
         captured: 'onSelectCapture',
       },
     },
+    topOnFocusChange: {
+      phasedRegistrationNames: {
+      bubbled: 'onFocusChange',
+      captured: 'onFocusChangeCapture',
+      },
+    },
     topAssetDidLoad: {
       phasedRegistrationNames: {
         bubbled: 'onAssetDidLoad',
