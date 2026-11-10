---
id: a11y.state
summary: How accessibilityState and accessibility actions reach macOS AX clients in Paper and Fabric, the gaps on main, and rules for exposing them.
kind: rules
status: active
load_when: Changing how accessibilityState, AXEnabled, AXSelected, AXExpanded, or AXPress behave on macOS
sources:
  - packages/react-native/React/Views/RCTView.m#isAccessibilitySelectorAllowed
  - packages/react-native/React/Views/RCTView.m#accessibilityPerformPress
  - packages/react-native/React/Views/RCTViewManager.m#RCT_CUSTOM_VIEW_PROPERTY(accessibilityState
  - packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm#accessibilityValue
  - packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm#RCTUIAccessibilityTraitNotEnabled
verified: 2026-10-28
rules: [clear-on-removal, gate-press]
requires: [a11y.appkit]
related: [a11y.roles, a11y.text-input]
watch: [microsoft/react-native-macos#3136]
---

<!-- @format -->

# Accessibility state and actions

Use when: you change how `accessibilityState` or accessibility actions reach AX clients on macOS. Not for: roles ([a11y.roles](roles.md)) or TextInput's `editable` ([a11y.text-input](text-input.md)).

## Rules

- **a11y.state.clear-on-removal:** When JS removes `accessibilityState` or one of its keys, stop advertising that attribute. Setting it to `NO` isn't enough, because AppKit keeps advertising it ([a11y.appkit](appkit.md)).
- **a11y.state.gate-press:** Advertise `AXPress` only when the element handles it, through `onAccessibilityTap` or an `activate` action, as Paper's `RCTView` does.

## Facts

What an AX client sees for each state on `main`:

| JS                | Paper (`RCTView`)                                        | Fabric (`RCTViewComponentView`)                    |
| ----------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `disabled`        | `AXEnabled`, only when the key is set                    | Nothing; `AXEnabled` stays `1`                     |
| `selected`        | `AXSelected`, only when the key is set                   | Nothing                                            |
| `expanded`        | `AXExpanded`, only when the key is set                   | The word "expanded" in `AXValue`, only when `true` |
| `checked`, `busy` | Words in `AXValue`                                       | Words in `AXValue`                                 |
| Press             | `AXPress` when `onAccessibilityTap` or `activate` exists | No `AXPress`                                       |

- Paper gates the attributes and actions in `isAccessibilitySelectorAllowed:`.
- Fabric's state block in `updateProps` is iOS-only. On macOS, Fabric sets `accessibilityEnabled` only from the `NotEnabled` trait, inside the traits block, so any element whose traits change advertises `AXEnabled`.
- Both architectures build `AXValue` from localized words for `checked`, `unchecked`, `mixed`, `busy`, and `expanded`, and Fabric adds role words for `checkbox` and `radio`.
- On `main`, Paper's `accessibilityState` setter returns early when the prop is removed, so the previous state stays. #3136 clears it on macOS.

## Pitfalls

- An AX client can't press a Fabric view on `main`. Probes must click by position instead ([testing.ax-probes](../testing/ax-probes.md)).
- A test that only sets state once misses stale state. Toggle each key on, off, and then remove it.

## Verify

Give the element a `testID`, toggle its state, and dump it with [testing.ax-probes](../testing/ax-probes.md) after each change.
