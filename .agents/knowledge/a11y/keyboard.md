---
id: a11y.keyboard
summary: How focusable, first responder, and the key view loop decide Tab order on macOS, and why a TextInput takes two Tab stops on main.
kind: rules
status: active
load_when: Changing focus, first responder, Tab order, or the key view loop on macOS
sources:
  - packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm#acceptsFirstResponder
  - packages/react-native/Libraries/Components/TextInput/TextInput.js#focusable
  - packages/react-native/Libraries/Text/TextInput/Multiline/RCTWrappedTextView.m#acceptsFirstResponder
  - packages/react-native/Libraries/AppDelegate/RCTAppDelegate.mm#autorecalculatesKeyViewLoop
  - packages/rn-tester/RNTester/AppDelegate.mm#NSWindow
  - packages/react-native/Libraries/NativeComponent/BaseViewConfig.macos.js#enableFocusRing
verified: 2026-10-28
rules: [one-tab-stop, test-recalculated-loop]
related: [a11y.text-input, testing.ax-probes]
watch: [microsoft/react-native-macos#3136]
---

<!-- @format -->

# Keyboard focus and Tab order

Use when: you change focus, first responder, Tab order, or the key view loop on macOS. Not for: TextInput `editable` semantics ([a11y.text-input](text-input.md)).

## Rules

- **a11y.keyboard.one-tab-stop:** Give each control one Tab stop. A host view that wraps a focusable AppKit view must not accept first responder itself.
- **a11y.keyboard.test-recalculated-loop:** Test Tab order in a window with `autorecalculatesKeyViewLoop = YES`, which apps built on `RCTAppDelegate` get. On `main`, RNTester's macOS window doesn't set it.

## Facts

- A Fabric view's `acceptsFirstResponder` returns `focusable || [super acceptsFirstResponder]`. On macOS, `focusable`, `enableFocusRing`, `keyDownEvents`, and `keyUpEvents` are `View` props.
- `TextInput.js` sends `focusable` as `true` unless the app passes `false`. The Fabric TextInput host doesn't override first-responder methods, so on `main` it becomes a Tab stop before its field. Each TextInput then takes two Tab presses, and an AX client reports the enclosing `AXScrollArea` as focused on the first one. #3136 makes the host refuse focus.
- `RCTWrappedTextView` forwards `acceptsFirstResponder`, `becomeFirstResponder`, and `resignFirstResponder` to its `RCTUITextView`.
- `RCTAppDelegate` creates its window with `autorecalculatesKeyViewLoop = YES`. RNTester's `AppDelegate` creates its own `NSWindow` and doesn't set it on `main`; #3136 adds it.

## Pitfalls

- A focused `AXScrollArea` between two fields is the extra host stop, not a scroll view taking focus.
- Test Shift-Tab (`key code 48 using shift down`) as well as Tab.

## Verify

Focus the first element, press Tab with `osascript -e 'tell application "System Events" to key code 48'`, and read the focus with `ax.swift <pid> focused` after each press ([testing.ax-probes](../testing/ax-probes.md)).
