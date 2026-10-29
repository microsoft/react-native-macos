---
id: a11y.roles
summary: How role and accessibilityRole become NSAccessibility roles in Paper and Fabric, where the tables differ, and rules for changing them.
kind: rules
status: active
load_when: Changing or debugging how role or accessibilityRole maps to an NSAccessibility role
sources:
  - packages/react-native/React/Base/RCTConvert.mm#accessibilityRoleFromAriaRole
  - packages/react-native/React/Base/RCTConvert.mm#traitOrRoleToAccessibilityRole
  - packages/react-native/React/Views/RCTViewManager.m#updateAccessibilityRole
  - packages/react-native/ReactCommon/react/renderer/components/view/AccessibilityProps.cpp#precedentRoleValue
  - packages/react-native/ReactCommon/react/renderer/components/view/accessibilityPropsConversions.h#Unsupported
  - packages/react-native/ReactApple/Libraries/RCTUIKit/RCTUIAccessibilityTraits.h#RCTAccessibilityRoleFromTraits
  - packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm#RCTAccessibilityRoleFromTraits
verified: 2026-10-28
rules: [role-wins, restore-default-role, no-paper-in-fabric]
requires: [a11y.appkit]
related: [a11y.state]
watch: [microsoft/react-native-macos#3136]
asserts:
  - file: packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm
    contains: 'self.accessibilityRole = RCTAccessibilityRoleFromTraits(traits);'
---

<!-- @format -->

# Accessibility roles

Use when: you change or debug how `role` or `accessibilityRole` becomes an NSAccessibility role. Not for: state attributes ([a11y.state](state.md)) or TextInput roles ([a11y.text-input](text-input.md)).

## Rules

- **a11y.roles.role-wins:** Resolve `role` first, then `accessibilityRole`, then the element's default role. Paper's `updateAccessibilityRole:` and the C++ traits parser both use this order.
- **a11y.roles.restore-default-role:** When both props are unset, restore the element's default role, read as [a11y.appkit](appkit.md) describes, not the last role you set.
- **a11y.roles.no-paper-in-fabric:** Don't import Paper's `RCTConvert` into Fabric component views to reuse its tables. Maintainers asked for Fabric-local code on #3136.

## Facts

How each architecture maps a role on `main`:

| Step                | Paper (`RCTViewManager`, `RCTConvert`)                                                      | Fabric (`RCTViewComponentView`)                                      |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `role`              | ARIA table, `accessibilityRoleFromAriaRole:`; unknown strings fall back to the legacy table | Parsed into traits only                                              |
| `accessibilityRole` | Legacy table, `traitOrRoleToAccessibilityRole`                                              | Parsed into traits only                                              |
| Neither set         | `defaultView.accessibilityRole`                                                             | Whatever `RCTAccessibilityRoleFromTraits` returns, often `AXUnknown` |

- The two Paper tables disagree. `tab` maps to `AXRadioButton` in the ARIA table and to `AXButton` in the legacy table. `none` maps to `AXGroup` and to `AXUnknown`.
- The C++ traits parser (`fromString` for `AccessibilityTraits`) knows about 20 strings, such as `button`, `link`, `header`, `image`, and `switch`. Every other string, such as `menuitem`, `option`, `tab`, or `checkbox`, becomes no traits.
- `RCTAccessibilityRoleFromTraits` checks traits in a fixed order and returns `AXUnknown` when none match. On `main`, an AX client sees `AXUnknown` for `role="menuitem"`, `"option"`, and `"tab"`, while `role="button"` reports `AXButton`.
- Fabric stores `role` as the C++ `Role` enum and `accessibilityRole` as a string. Strings with no `Role` value, such as `textbox`, `listbox`, `image`, and `search`, log "Unsupported Role value" and become `Role::None`, so they never reach an ARIA table. The JS `Role` type doesn't allow them either.
- When a raw prop value is missing or `null`, the C++ parser keeps the previous value for `accessibilityRole` and the traits.
- With the `enableCppPropsIteratorSetter` flag (off by default), `role` doesn't update the traits.
- Fabric's only `RCTConvert.h` import is in `Fabric/Utils/RCTColorSpaceUtils.h`.

## Pitfalls

- Merging the two Paper tables silently changes `tab` and `none`.
- Testing only `button` hides the problem, because `button` works on `main` through traits. Include a role with no trait, such as `menuitem`.

## Verify

Give each element under test a `testID`, and dump its role with [testing.ax-probes](../testing/ax-probes.md). Each role must match the table its prop goes through. #3136 adds `macos-role-*` examples to RNTester.
