--- "E:\\github\\ms-react-native-minus\\Libraries\\Components\\TextInput\\TextInputState.js"	2020-02-27 14:39:42.367940200 -0800
+++ "E:\\github\\ms-react-native-forpatch\\Libraries\\Components\\TextInput\\TextInputState.js"	2020-02-27 14:13:23.259748900 -0800
@@ -36,9 +36,11 @@
  */
 function focusTextInput(textFieldID: ?number) {
   if (currentlyFocusedID !== textFieldID && textFieldID !== null) {
-    currentlyFocusedID = textFieldID;
-    if (Platform.OS === 'ios' ||
-      Platform.OS === 'macos' /* TODO(macOS ISS#2323203) */) {
+    // TODO(android ISS) removed: currentlyFocusedID = textFieldID;
+    if (
+      Platform.OS === 'ios' ||
+      Platform.OS === 'macos' /* TODO(macOS ISS#2323203) */
+    ) {
       UIManager.focus(textFieldID);
     } else if (Platform.OS === 'android') {
       UIManager.dispatchViewManagerCommand(
@@ -74,6 +76,29 @@
     }
   }
 }
+
+/** [TODO(android ISS)
+ * @param {number} TextInputID id of the text field that has received focus
+ * Should be called after the view has received focus and fired the onFocus event
+ * noop if the focused text field is same
+ */
+function setFocusedTextInput(textFieldID: ?number) {
+  if (currentlyFocusedID !== textFieldID && textFieldID !== null) {
+    currentlyFocusedID = textFieldID;
+  }
+}
+
+/**
+ * @param {number} TextInputID id of the text field whose focus has to be cleared
+ * Should be called after the view has cleared focus and fired the onFocus event
+ * noop if the focused text field is not same
+ */
+function clearFocusedTextInput(textFieldID: ?number) {
+  if (currentlyFocusedID === textFieldID && textFieldID !== null) {
+    currentlyFocusedID = null;
+  }
+} // ]TODO(android ISS)
+
 function registerInput(textFieldID: number) {
   inputs.add(textFieldID);
 }
@@ -88,6 +113,8 @@
 
 module.exports = {
   currentlyFocusedField,
+  setFocusedTextInput, // TODO(android ISS)
+  clearFocusedTextInput, // TODO(android ISS)
   focusTextInput,
   blurTextInput,
   registerInput,
