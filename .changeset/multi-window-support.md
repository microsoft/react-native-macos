---
'react-native-macos': patch
---

Add `WindowManagerMacOS`, an API for opening and managing additional windows from JavaScript. Each window hosts its own React root (registered via `AppRegistry.registerComponent`) while sharing a single bridge and JavaScript runtime. Also makes `RCTKeyWindow()` fall back to the main window and then any visible window, so `Dimensions` no longer reports a zero-sized window when no window has key focus.
