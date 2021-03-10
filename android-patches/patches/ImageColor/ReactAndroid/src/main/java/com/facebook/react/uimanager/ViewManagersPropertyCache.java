--- "E:\\github\\rnm-63-fresh\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\uimanager\\ViewManagersPropertyCache.java"	2020-10-27 20:26:16.901168200 -0700
+++ "E:\\github\\rnm-63\\ReactAndroid\\src\\main\\java\\com\\facebook\\react\\uimanager\\ViewManagersPropertyCache.java"	2021-03-09 18:12:54.215475900 -0800
@@ -214,6 +214,29 @@
     }
   }
 
+  private static class NullableColorPropSetter extends PropSetter {
+
+    private final int mDefaultValue;
+
+    public NullableColorPropSetter(ReactProp prop, Method setter) {
+      this(prop, setter, 0);
+    }
+
+    public NullableColorPropSetter(ReactProp prop, Method setter, int defaultValue) {
+      super(prop, "mixed", setter);
+      mDefaultValue = defaultValue;
+    }
+
+    @Override
+    protected Object getValueOrDefault(Object value, Context context) {
+      if (value == null) {
+        return null;
+      }
+
+      return ColorPropConverter.getColor(value, context);
+    }
+  }
+
   private static class BooleanPropSetter extends PropSetter {
 
     private final boolean mDefaultValue;
@@ -407,6 +430,9 @@
       if ("Color".equals(annotation.customType())) {
         return new ColorPropSetter(annotation, method, annotation.defaultInt());
       }
+      if ("NullableColor".equals(annotation.customType())) {
+        return new NullableColorPropSetter(annotation, method, annotation.defaultInt());
+      }
       return new IntPropSetter(annotation, method, annotation.defaultInt());
     } else if (propTypeClass == float.class) {
       return new FloatPropSetter(annotation, method, annotation.defaultFloat());
@@ -420,6 +446,9 @@
       if ("Color".equals(annotation.customType())) {
         return new ColorPropSetter(annotation, method);
       }
+      if ("NullableColor".equals(annotation.customType())) {
+        return new NullableColorPropSetter(annotation, method, annotation.defaultInt());
+      }
       return new BoxedIntPropSetter(annotation, method);
     } else if (propTypeClass == ReadableArray.class) {
       return new ArrayPropSetter(annotation, method);
