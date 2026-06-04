---
sidebar_label: 'Platform Colors'
sidebar_position: 2
---

# Platform Colors

React Native macOS extends the core `PlatformColor` API with helpers that map directly to AppKit system colors. These helpers make it easier to adopt macOS appearance and accessibility behaviors without writing native code.

## `DynamicColorMacOS`

`DynamicColorMacOS` creates a color that automatically adapts to light, dark, and high-contrast appearances on macOS.

:::note
`DynamicColorIOS` works on macOS too, they are essentially equivalent
:::

| Option               | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `light`              | Color used in the standard light appearance.                    |
| `dark`               | Color used in the standard dark appearance.                     |
| `highContrastLight`  | Optional color for high-contrast light mode. Defaults to `light`.|
| `highContrastDark`   | Optional color for high-contrast dark mode. Defaults to `dark`. |

## `ColorWithSystemEffectMacOS`

`ColorWithSystemEffectMacOS(color, effect)` wraps an existing color so AppKit can apply control state effects such as pressed, disabled, or rollover.

| Parameter | Description |
| --------- | ----------- |
| `color`   | A string produced by `PlatformColor`, `DynamicColorMacOS`, or a CSS color string. |
| `effect`  | One of `none`, `pressed`, `deepPressed`, `disabled`, or `rollover`. |

```javascript
import {
  ColorWithSystemEffectMacOS,
  DynamicColorMacOS,
  PlatformColor,
  StyleSheet,
} from 'react-native';

const styles = StyleSheet.create({
  buttonPressed: {
    backgroundColor: ColorWithSystemEffectMacOS(
      PlatformColor('controlColor'),
      'pressed',
    ),
  },
});
```
