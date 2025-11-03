---
sidebar_label: 'Props'
sidebar_position: 1
---

# Props

React Native macOS extends the standard React Native `<View>` component with additional props that are specific to macOS. These props allow you to customize the behavior and appearance of views to take advantage of macOS-specific features.

## Props

### `acceptsFirstMouse`

Controls whether the view accepts the first mouse click when the window is inactive.

| Type | Default |
| ---- | ------- |
| bool | `false` |

When `true`, the view will respond to mouse clicks even when the window is not in focus, without first bringing the window to the foreground.

---

### `allowsVibrancy`

Enables the vibrancy effect for the view, allowing it to blend with the content behind the window.

| Type | Default |
| ---- | ------- |
| bool | `false` |

When `true`, the view will use macOS vibrancy effects, creating a translucent appearance that adapts to the content behind the window. This makes a difference when content is placed on top of a native [NSVisualEffectView](https://developer.apple.com/documentation/appkit/nsvisualeffectview), such as with the native module [VibrancyView](https://github.com/microsoft/fluentui-react-native/tree/main/packages/experimental/VibrancyView)

---

### `cursor`

Specifies the mouse cursor to display when hovering over the view.

| Type   | 
| ------ |
| string |

Sets the cursor style. This extends the React Native prop to support a larger range of the W3C cursor types supported on web.

---

### `draggedTypes`

Specifies the types of dragged content that the view accepts for drag and drop operations.

| Type            |
| --------------- |
| array of string |

An array of UTI (Uniform Type Identifier) strings that the view will accept. Currently supported: `['fileUrl', 'image', 'string']`.

---

### `enableFocusRing`

Controls whether the standard macOS focus ring is displayed when the view has focus.

| Type | Default |
| ---- | ------- |
| bool | `true`  |

When `true`, macOS will draw the standard focus ring around the view when it receives keyboard focus.

---

### `focusable`

Determines whether the view can receive keyboard focus. This prop has been extended from React Native Core to support all views.

| Type | Default |
| ---- | ------- |
| bool | `false` |

When `true`, the view can be focused using keyboard navigation (e.g., Tab key).

---

### `keyDownEvents`

Specifies which key down events should be handled by the view.

| Type                    |
| ----------------------- |
| array of HandledKey     |

An array of key configurations that the view should handle. Each `HandledKey` object can specify:
- `key`: The key value (aligned with [W3C UI Events](https://www.w3.org/TR/uievents-key/))
- `altKey` (optional): Whether Alt/Option key must be pressed
- `ctrlKey` (optional): Whether Control key must be pressed  
- `shiftKey` (optional): Whether Shift key must be pressed
- `metaKey` (optional): Whether Command key must be pressed

Example:
```javascript
keyDownEvents={[
  { key: 'Enter' },
  { key: 'a', metaKey: true }
]}
```

---

### `keyUpEvents`

Specifies which key up events should be handled by the view.

| Type                    |
| ----------------------- |
| array of HandledKey     |

An array of key configurations that the view should handle when keys are released. Uses the same format as `keyDownEvents`.

---

### `mouseDownCanMoveWindow`

Controls whether clicking and dragging on the view can move the window.

| Type | Default |
| ---- | ------- |
| bool | `true`  |

When `true`, clicking and dragging on the view will allow the user to move the window. Set to `false` for interactive elements where you don't want this behavior.

---

### `tooltip`

Displays a tooltip when the user hovers over the view.

| Type   |
| ------ |
| string |

The text to display in the tooltip.

---

## Example Usage

```javascript
import React from 'react';
import { View, Text } from 'react-native';

function MacOSView() {
  return (
    <View
      style={{ width: 200, height: 100 }}
      focusable={true}
      enableFocusRing={true}
      tooltip="This is a macOS view"
      acceptsFirstMouse={true}
      draggedTypes={['public.file-url']}
      keyDownEvents={[
        { key: 'Enter' },
        { key: 's', metaKey: true }
      ]}
      onKeyDown={(event) => {
        console.log('Key pressed:', event.nativeEvent.key);
      }}
    >
      <Text>macOS View</Text>
    </View>
  );
}
```

## See Also

- [View Events (macOS)](./view-events.md) - macOS-specific events for View components
- [React Native View Component](https://reactnative.dev/docs/view) - Base View component documentation
