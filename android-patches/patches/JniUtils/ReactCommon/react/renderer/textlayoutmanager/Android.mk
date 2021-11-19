--- a/ReactCommon/react/renderer/textlayoutmanager/Android.mk
+++ b/ReactCommon/react/renderer/textlayoutmanager/Android.mk
@@ -11,7 +11,7 @@ LOCAL_MODULE := react_render_textlayoutmanager
 
 LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/*.cpp $(LOCAL_PATH)/platform/android/react/renderer/textlayoutmanager/*.cpp)
 
-LOCAL_SHARED_LIBRARIES := libfolly_futures libreactnativeutilsjni libreact_utils libfb libfbjni libreact_render_uimanager libreact_render_componentregistry libreact_render_attributedstring libfolly_json libyoga libfolly_json libreact_render_core libreact_render_debug libreact_render_graphics
+LOCAL_SHARED_LIBRARIES := libfolly_futures libreactnativejni libreact_utils libfb libfbjni libreact_render_uimanager libreact_render_componentregistry libreact_render_attributedstring libfolly_json libyoga libfolly_json libreact_render_core libreact_render_debug libreact_render_graphics
 
 LOCAL_STATIC_LIBRARIES :=
 
