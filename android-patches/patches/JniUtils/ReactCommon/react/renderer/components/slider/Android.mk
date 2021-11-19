--- a/ReactCommon/react/renderer/components/slider/Android.mk
+++ b/ReactCommon/react/renderer/components/slider/Android.mk
@@ -21,7 +21,7 @@ LOCAL_CFLAGS += -fexceptions -frtti -std=c++14 -Wall
 
 LOCAL_STATIC_LIBRARIES :=
 
-LOCAL_SHARED_LIBRARIES := libfbjni libreact_render_viewmanagers libreact_render_imagemanager libreactnativeutilsjni libreact_render_componentregistry libreact_render_uimanager libreact_render_components_image libyoga libfolly_futures glog libfolly_json libglog_init libreact_render_core libreact_render_debug libreact_render_graphics libreact_render_components_view
+LOCAL_SHARED_LIBRARIES := libfbjni libreact_render_viewmanagers libreact_render_imagemanager libreactnativejni libreact_render_componentregistry libreact_render_uimanager libreact_render_components_image libyoga libfolly_futures glog libfolly_json libglog_init libreact_render_core libreact_render_debug libreact_render_graphics libreact_render_components_view
 
 include $(BUILD_SHARED_LIBRARY)
 
