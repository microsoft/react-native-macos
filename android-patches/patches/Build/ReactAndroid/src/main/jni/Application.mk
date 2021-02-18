--- "E:\\github\\react-native-macos-fresh\\ReactAndroid\\src\\main\\jni\\Application.mk"	2021-02-09 22:22:02.345639400 -0800
+++ "E:\\github\\react-native-macos3\\ReactAndroid\\src\\main\\jni\\Application.mk"	2021-02-09 22:38:05.645447000 -0800
@@ -27,7 +27,7 @@
 APP_STL := c++_shared
 
 APP_CFLAGS := -Wall -Werror -fexceptions -frtti -DWITH_INSPECTOR=1
-APP_CPPFLAGS := -std=c++1y
+APP_CPPFLAGS := -std=c++17
 # Make sure every shared lib includes a .note.gnu.build-id header
 APP_LDFLAGS := -Wl,--build-id
 
