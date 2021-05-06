--- "E:\\github\\rnm-63-fresh\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\views\\image\\ReactImageManager.java"	2020-10-27 20:26:16.952166400 -0700
+++ "E:\\github\\rnm-63\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\views\\image\\ReactImageManager.java"	2021-03-09 18:13:37.555129800 -0800
@@ -145,7 +145,7 @@
     view.setLoadingIndicatorSource(source);
   }
 
-  @ReactProp(name = "borderColor", customType = "Color")
+  @ReactProp(name = "borderColor", customType = "NullableColor")
   public void setBorderColor(ReactImageView view, @Nullable Integer borderColor) {
     if (borderColor == null) {
       view.setBorderColor(Color.TRANSPARENT);
@@ -154,7 +154,7 @@
     }
   }
 
-  @ReactProp(name = "overlayColor", customType = "Color")
+  @ReactProp(name = "overlayColor", customType = "NullableColor")
   public void setOverlayColor(ReactImageView view, @Nullable Integer overlayColor) {
     if (overlayColor == null) {
       view.setOverlayColor(Color.TRANSPARENT);
@@ -209,7 +209,7 @@
     }
   }
 
-  @ReactProp(name = "tintColor", customType = "Color")
+  @ReactProp(name = "tintColor", customType = "NullableColor")
   public void setTintColor(ReactImageView view, @Nullable Integer tintColor) {
     if (tintColor == null) {
       view.clearColorFilter();
