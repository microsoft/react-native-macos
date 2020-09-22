--- /home/hermes/code/react-native-macos-fresh/Libraries/Components/View/ReactNativeViewViewConfigAndroid.js	2020-09-21 21:41:24.322788533 -0700
+++ /home/hermes/code/react-native-macos/Libraries/Components/View/ReactNativeViewViewConfigAndroid.js	2020-09-19 12:14:19.918744241 -0700
@@ -19,6 +19,11 @@
         captured: 'onSelectCapture',
       },
     },
+    topOnFocusChange: {
+      phasedRegistrationNames: {
+        bubbled: 'onFocusChange'
+      }
+    }
   },
   directEventTypes: {
     topClick: {
