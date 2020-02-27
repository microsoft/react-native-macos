--- "E:\\github\\ms-react-native-minus\\Libraries\\Components\\TextInput\\TextInput.js"	2020-02-27 14:37:24.079535800 -0800
+++ "E:\\github\\ms-react-native-forpatch\\Libraries\\Components\\TextInput\\TextInput.js"	2020-02-27 14:21:31.646362500 -0800
@@ -985,6 +985,14 @@
     );
   },
 
+  /**
+   * Returns the native `TextView` node.
+   */
+  getTextViewHandle: function(): any {
+    // [TODO(OSS Candidate ISS#2710739)
+    return ReactNative.findNodeHandle(this._inputRef);
+  }, // ]TODO(OSS Candidate ISS#2710739)
+
   _inputRef: (undefined: any),
   _focusSubscription: (undefined: ?Function),
   _lastNativeText: (undefined: ?string),
@@ -1138,6 +1146,7 @@
         rejectResponderTermination={true}
         accessible={props.accessible}
         accessibilityLabel={props.accessibilityLabel}
+        accessibilityHint={props.accessibilityHint} // TODO(OSS Candidate ISS#2710739)
         accessibilityRole={props.accessibilityRole}
         accessibilityStates={props.accessibilityStates}
         nativeID={this.props.nativeID}
@@ -1247,6 +1256,7 @@
         onPress={this._onPress}
         accessible={this.props.accessible}
         accessibilityLabel={this.props.accessibilityLabel}
+        accessibilityHint={this.props.accessibilityHint} // TODO(OSS Candidate ISS#2710739)
         accessibilityRole={this.props.accessibilityRole}
         accessibilityStates={this.props.accessibilityStates}
         nativeID={this.props.nativeID}
@@ -1257,6 +1267,15 @@
   },
 
   _onFocus: function(event: FocusEvent) {
+    // [TODO(android ISS)
+    // Set the focused TextInput field info in TextInputState.
+    // Delaying this to onFocus native event ensures that -
+    // 1. The state is updated only after the native code completes setting focus on the view
+    // 2. In case the focus is moving from one TextInput(A) to another TextInput(B), the state of
+    //    A needs to be updated (blurred) before info about B is updated in TestInputState.
+    TextInputState.setFocusedTextInput(
+      ReactNative.findNodeHandle(this._inputRef),
+    ); // ]TODO(android ISS)
     if (this.props.onFocus) {
       this.props.onFocus(event);
     }
@@ -1352,7 +1371,17 @@
   _onBlur: function(event: BlurEvent) {
     // This is a hack to fix https://fburl.com/toehyir8
     // @todo(rsnara) Figure out why this is necessary.
-    this.blur();
+    // this.blur();
+    // [TODO(android ISS) removed: this.blur();
+    // Set the focused TextInput field info in TextInputState.
+    // Delaying this to onBlur native event ensures that -
+    // 1. The state is updated only after the native code completes clearing focus on the view
+    // 2. In case the focus is moving from one TextInput(A) to another TextInput(B), the state of
+    //    A needs to be updated (blurred) before info about B is updated in TestInputState.
+    TextInputState.clearFocusedTextInput(
+      ReactNative.findNodeHandle(this._inputRef),
+    ); // ]TODO(android ISS)
+
     if (this.props.onBlur) {
       this.props.onBlur(event);
     }
