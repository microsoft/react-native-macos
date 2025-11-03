---
sidebar_label: 'Events'
sidebar_position: 2
---

# Events

React Native macOS extends the standard React Native View component with additional events that are specific to macOS. These events allow you to respond to macOS-specific user interactions such as keyboard input, mouse movements, drag and drop operations, and more.

## Focus

This event is useful for implementing custom focus management and showing focus-specific UI elements. For these to fire, the prop [focusable](view-props#focusable) must be set.

### `onFocus`

Fired when the view receives focus.

---

### `onBlur`

Fired when the view loses focus. This is supported for all Views

---


## Keyboard

### `onKeyDown`

Fired when a key is pressed while the view has focus.

**Event Data:** Key event with the following properties:
- `key`: The key value (aligned with [W3C UI Events](https://www.w3.org/TR/uievents-key/))
- `altKey`: Whether Alt/Option key is pressed
- `ctrlKey`: Whether Control key is pressed
- `shiftKey`: Whether Shift key is pressed
- `metaKey`: Whether Command key is pressed
- `capsLockKey`: Whether Caps Lock is active
- `numericPadKey`: Whether the key is on the numeric keypad
- `helpKey`: Whether Help key is pressed
- `functionKey`: Whether a function key is pressed

:::note
To receive key events, the view must have `focusable={true}` set, and you should specify which keys to handle using the `keyDownEvents` prop.
:::

Example:
```javascript
<View
  focusable={true}
  keyDownEvents=[
    { key: 'Enter' },
    { key: 's', metaKey: true }
  ]
  onKeyDown={(event) => {
    const { key, metaKey } = event.nativeEvent;
    if (key === 'Enter') {
      console.log('Enter pressed');
    } else if (key === 's' && metaKey) {
      console.log('Command+S pressed');
    }
  }}
>
  <Text>Press Enter or Cmd+S</Text>
</View>
```

---

### `onKeyUp`

Fired when a key is released while the view has focus.

**Event Data:** Key event (same format as `onKeyDown`)

:::note
To receive key events, the view must have `focusable={true}` set, and you should specify which keys to handle using the `keyUpEvents` prop.
:::

---

## Mouse

### `onMouseEnter`

Fired when the mouse cursor enters the view's bounds.

**Event Data:** Mouse event with the following properties:
- `clientX`: Horizontal position in the target view
- `clientY`: Vertical position in the target view
- `screenX`: Horizontal position in the window
- `screenY`: Vertical position in the window
- `altKey`: Whether Alt/Option key is pressed
- `ctrlKey`: Whether Control key is pressed
- `shiftKey`: Whether Shift key is pressed
- `metaKey`: Whether Command key is pressed

Example:
```javascript
<View onMouseEnter={(event) => {
  console.log('Mouse entered at', event.nativeEvent.clientX, event.nativeEvent.clientY);
}}>
  <Text>Hover over me</Text>
</View>
```

---

### `onMouseLeave`

Fired when the mouse cursor leaves the view's bounds.

**Event Data:** Mouse event (same format as `onMouseEnter`)

Example:
```javascript
<View
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  style={{ backgroundColor: isHovered ? 'lightblue' : 'white' }}
>
  <Text>Hover state example</Text>
</View>
```

---

### `onDoubleClick`

Fired when the user double-clicks on the view.

**Event Data:** Mouse event with the following properties:
- `clientX`: Horizontal position in the target view
- `clientY`: Vertical position in the target view
- `screenX`: Horizontal position in the window
- `screenY`: Vertical position in the window
- `altKey`: Whether Alt/Option key is pressed
- `ctrlKey`: Whether Control key is pressed
- `shiftKey`: Whether Shift key is pressed
- `metaKey`: Whether Command key is pressed

Example:
```javascript
<View onDoubleClick={(event) => {
  console.log('Double clicked at', event.nativeEvent.clientX, event.nativeEvent.clientY);
}}>
  <Text>Double click me</Text>
</View>
```

---

### `onDragEnter`

Fired when a drag operation enters the view's bounds.

**Event Data:** Drag event with mouse position and data transfer information

This event is fired when the user drags content over the view. Use this to provide visual feedback that the view can accept the dragged content.

---

### `onDragLeave`

Fired when a drag operation leaves the view's bounds.

**Event Data:** Drag event with mouse position and data transfer information

This event is fired when the user drags content away from the view. Use this to remove any visual feedback shown during drag enter.

---

### `onDrop`

Fired when the user drops content onto the view.

**Event Data:** Drag event with the following properties:
- Mouse position (`clientX`, `clientY`, `screenX`, `screenY`)
- Modifier keys (`altKey`, `ctrlKey`, `shiftKey`, `metaKey`)
- `dataTransfer`: Object containing:
  - `files`: Array of dropped files, each with:
    - `name`: File name
    - `type`: MIME type
    - `uri`: File URI
    - `size`: File size (optional)
    - `width`: Image width (optional, for images)
    - `height`: Image height (optional, for images)
  - `items`: Array of data transfer items, each with:
    - `kind`: Item kind (e.g., 'file', 'string')
    - `type`: MIME type
  - `types`: Array of available data types

Example:
```javascript
<View
  draggedTypes={['public.file-url']}
  onDrop={(event) => {
    const files = event.nativeEvent.dataTransfer.files;
    files.forEach(file => {
      console.log('Dropped file:', file.name, file.uri);
    });
  }}
>
  <Text>Drop files here</Text>
</View>
```

---

## Complete Example

Here's a comprehensive example showing multiple macOS-specific events:

```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function MacOSEventsExample() {
  const [status, setStatus] = useState('Ready');
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.interactiveView,
          isHovered && styles.hoveredView
        ]}
        focusable={true}
        enableFocusRing={true}
        draggedTypes={['public.file-url', 'public.text']}
        keyDownEvents={[
          { key: 'Enter' },
          { key: 'Escape' }
        ]}
        onFocus={() => setStatus('Focused')}
        onBlur={() => setStatus('Blurred')}
        onKeyDown={(e) => setStatus(`Key down: ${e.nativeEvent.key}`)}
        onKeyUp={(e) => setStatus(`Key up: ${e.nativeEvent.key}`)}
        onMouseEnter={(e) => {
          setIsHovered(true);
          setStatus(`Mouse entered at (${e.nativeEvent.clientX}, ${e.nativeEvent.clientY})`);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setStatus('Mouse left');
        }}
        onDoubleClick={() => setStatus('Double clicked!')}
        onDragEnter={() => setStatus('Drag entered')}
        onDragLeave={() => setStatus('Drag left')}
        onDrop={(e) => {
          const files = e.nativeEvent.dataTransfer.files;
          setStatus(`Dropped ${files.length} file(s)`);
        }}
      >
        <Text>Interactive macOS View</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}


    height: 200,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'gray',
    padding: 20,
  },
  hoveredView: {
    backgroundColor: 'lightblue',
  },
  statusText: {
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default MacOSEventsExample;
```
