---
id: a11y.text-input
summary: How TextInput's editable, readOnly, and accessibility props behave on macOS compared with other platforms, and the AX traps of its backing views.
kind: rules
status: active
load_when: Changing TextInput editable, readOnly, disabled, or accessibility behavior on macOS
sources:
  - packages/react-native/Libraries/Text/TextInput/Singleline/RCTUITextField.mm#setEditable
  - packages/react-native/Libraries/Text/TextInput/Multiline/RCTWrappedTextView.m#forwardInvocation
  - packages/react-native/Libraries/Components/TextInput/TextInput.js#readOnly
  - packages/react-native/Libraries/Components/TextInput/TextInput.flow.js#readOnly
  - packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/textinput/ReactTextInputManager.kt#isEnabled
verified: 2026-10-28
rules: [match-other-platforms, test-both-backings]
requires: [a11y.appkit]
related: [a11y.state, a11y.keyboard]
watch: [microsoft/react-native-macos#3136]
asserts:
  - file: packages/react-native/Libraries/Text/TextInput/Singleline/RCTUITextField.mm
    contains: 'self.enabled = editable;'
---

<!-- @format -->

# TextInput accessibility

Use when: you change how TextInput's `editable`, `readOnly`, or accessibility props behave on macOS. Not for: Tab order ([a11y.keyboard](keyboard.md)) or `View` state ([a11y.state](state.md)).

## Rules

- **a11y.text-input.match-other-platforms:** When macOS behavior is a choice, match iOS, web, and React Native unless desktop conventions call for something else, and record why. Maintainers gave this guidance on #3136, where read-only versus disabled is still open.
- **a11y.text-input.test-both-backings:** Test single-line and multiline inputs separately. They use different AppKit views and behave differently for AX clients.

## Facts

What `editable={false}` does on each platform:

| Platform           | Implementation                                                            | Result                                       |
| ------------------ | ------------------------------------------------------------------------- | -------------------------------------------- |
| iOS, single-line   | `RCTUITextField setEditable:` sets `enabled = editable`                   | Disabled field                               |
| iOS, multiline     | `UITextView.editable = NO`; `RCTUITextView` doesn't override it           | Read-only, still selectable                  |
| Android            | `view.isEnabled = editable`                                               | Disabled field                               |
| Web                | react-native-web sets `readOnly` when `editable === false` (`dadf289dd9`) | Read-only                                    |
| Windows            | react-native-windows sets `TXTBIT_READONLY` (`e8599fb438`)                | Read-only                                    |
| macOS, single-line | The iOS code plus `[super setEditable:]`                                  | `AXStaticText`, `AXEnabled=0`, not focusable |
| macOS, multiline   | `RCTWrappedTextView` forwards `setEditable:` to its `NSTextView`          | Read-only `NSTextView` (inferred)            |

- JS maps `readOnly` onto `editable`, and `readOnly` wins when both are set. TextInput has no `disabled` prop; `accessibilityState.disabled` changes only accessibility.
- On `main`, `accessibilityState={{disabled: true}}` on a TextInput leaves `AXEnabled=1`, and the field still takes focus.
- A multiline input's `testID` doesn't reach its `AXTextArea`, which has no `AXIdentifier`. The identifier stays on the `RCTWrappedTextView` wrapper.
- On `main`, single-line inputs that `RCTCopyBackedTextInput` rebuilt report `AXUnknown` ([a11y.appkit](appkit.md)). Both `secureTextEntry` inputs in RNTester's TextInput module do, and two of three identical inputs did in one run. With #3136's copy fix, all three identical inputs report `AXTextField`.

## Pitfalls

- An `NSTextField` that isn't editable reports `AXStaticText`, even when it's selectable. Don't expect `AXTextField` from a read-only single-line input.
- Probes can't find a multiline input by `testID`. Dump all elements and find its `AXTextArea` by value.

## Verify

Dump single-line and multiline inputs with [testing.ax-probes](../testing/ax-probes.md) in each `editable` and `accessibilityState` combination, including after the prop is removed.
