---
id: a11y.appkit
summary: AppKit NSAccessibility behavior that macOS view code depends on, and rules for setting roles, state, and the accessibility element.
kind: rules
status: active
load_when: Writing or reviewing native macOS code that sets an NSAccessibility role, state, or element
sources:
  - packages/react-native/ReactApple/Libraries/RCTUIKit/RCTUIAccessibilityTraits.h#RCTAccessibilityRoleFromTraits
  - packages/react-native/React/Views/RCTView.m#isAccessibilitySelectorAllowed
  - packages/react-native/React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputComponentView.mm#accessibilityElement
  - packages/react-native/React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputUtils.mm#RCTCopyBackedTextInput
  - packages/react-native/Libraries/Text/TextInput/Multiline/RCTWrappedTextView.m#forwardInvocation
verified: 2026-10-28
rules:
  - never-copy-unset-role
  - default-role-from-cell
  - gate-state-attributes
  - target-the-ax-element
  - verify-out-of-process
related: [a11y.roles, a11y.state, testing.ax-probes]
watch: [microsoft/react-native-macos#3136]
asserts:
  - file: packages/react-native/React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputUtils.mm
    contains: 'toTextInput.accessibilityRole = fromTextInput.accessibilityRole;'
---

<!-- @format -->

# AppKit accessibility behavior

Use when: you write native macOS code that sets an NSAccessibility role, a state attribute, or the accessibility element. Not for: how JS props become roles, which is [a11y.roles](roles.md), or checking the result, which is [testing.ax-probes](../testing/ax-probes.md).

## Rules

- **a11y.appkit.never-copy-unset-role:** Never copy or restore a role you read from an `accessibilityRole` getter. Copy it only when it isn't `NSAccessibilityUnknownRole`.
- **a11y.appkit.default-role-from-cell:** Read an `NSControl`'s default role from `control.cell.accessibilityRole`. The control's own getter returns `AXUnknown`.
- **a11y.appkit.gate-state-attributes:** Set `accessibilityEnabled`, `accessibilitySelected`, or `accessibilityExpanded` only when JS provides that state, and gate the selectors in `isAccessibilitySelectorAllowed:` as Paper's `RCTView` does.
- **a11y.appkit.target-the-ax-element:** Set accessibility properties on the object AX clients query, and confirm which object that is with a probe. A Fabric TextInput's `accessibilityElement` isn't always its text view.
- **a11y.appkit.verify-out-of-process:** Prove AX behavior with an out-of-process client ([testing.ax-probes](../testing/ax-probes.md)). In-process getters miss cell roles and don't show which attributes AppKit advertises.

## Facts

Observed with an out-of-process AX client on macOS 27.2:

| Element                                             | Getter in process                 | AX client sees                 |
| --------------------------------------------------- | --------------------------------- | ------------------------------ |
| `NSView` with no role set                           | `AXUnknown`                       | `AXUnknown`, no `AXEnabled`    |
| `NSTextField`, editable                             | `AXUnknown` (cell: `AXTextField`) | `AXTextField`, `AXEnabled=1`   |
| `NSTextField`, not editable but selectable          | —                                 | `AXStaticText`                 |
| `NSTextView`                                        | `AXTextArea`                      | `AXTextArea`, no `AXEnabled`   |
| `NSView` after `setAccessibilitySelected:NO`        | —                                 | `AXSelected=0`, now advertised |
| `NSTextField` after its role is set to `AXUnknown`  | —                                 | `AXUnknown`                    |
| `NSTextField` after its role is set to `AXTextArea` | —                                 | `AXTextArea`                   |

- `NSTextView` isn't an `NSControl`, so it has no `enabled` property.
- UIKit's traits don't exist on macOS. RCTUIKit defines `RCTUIAccessibilityTraits` as a `uint64_t` bitmask with the iOS constants so shared code compiles, and `RCTAccessibilityRoleFromTraits` maps traits to an `NSAccessibilityRole`.
- A Fabric `View`'s `accessibilityElement` is the view itself. A Fabric TextInput's is `_backedTextInputView`: an `RCTUITextField` when single-line, or an `RCTWrappedTextView` when multiline on macOS.
- `RCTWrappedTextView` is an `NSView` that wraps an `RCTUITextView` in a scroll view. It forwards first-responder calls, and forwards through `forwardInvocation:` only selectors that `NSView` lacks, such as `setEditable:`. NSAccessibility setters stay on the wrapper.

## Pitfalls

- On `main`, `RCTCopyBackedTextInput` copies `accessibilityRole` unconditionally when `multiline` or `secureTextEntry` changes. The old view's getter returns `AXUnknown`, so the new `NSTextField` reports `AXUnknown` instead of `AXTextField`.
- The comment in `RCTUIAccessibilityTraits.h` says `RCTViewAccessibilityElement` does the role mapping. That class no longer exists; the view code maps roles.

## Verify

Run `xcrun swift ax.swift <pid> dump <testID>` from [testing.ax-probes](../testing/ax-probes.md) against a running app.
