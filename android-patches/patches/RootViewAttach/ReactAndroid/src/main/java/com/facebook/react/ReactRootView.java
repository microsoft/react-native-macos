--- "E:\\gh\\react-native-macos2\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactRootView.java"	2021-11-05 17:21:36.664481900 -0700
+++ "E:\\gh\\react-native-macos\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\ReactRootView.java"	2021-11-05 17:24:21.975326400 -0700
@@ -384,6 +384,7 @@
       mInitialUITemplate = initialUITemplate;
 
       mReactInstanceManager.createReactContextInBackground();
+      attachToReactInstanceManager();
 
     } finally {
       Systrace.endSection(TRACE_TAG_REACT_JAVA_BRIDGE);
