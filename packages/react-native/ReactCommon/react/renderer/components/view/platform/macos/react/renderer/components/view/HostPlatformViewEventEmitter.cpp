/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 // [macOS]

#include <react/renderer/components/view/HostPlatformViewEventEmitter.h>
#include <react/renderer/components/view/KeyEvent.h>

namespace facebook::react {

#pragma mark - Focus Events

void HostPlatformViewEventEmitter::onFocus() const {
  dispatchEvent("focus");
}

void HostPlatformViewEventEmitter::onBlur() const {
  dispatchEvent("blur");
}

#pragma mark - Keyboard Events

static jsi::Value keyEventPayload(jsi::Runtime& runtime, const KeyEvent& event) {
  auto payload = jsi::Object(runtime);
  payload.setProperty(runtime, "key", jsi::String::createFromUtf8(runtime, event.key));
  payload.setProperty(runtime, "ctrlKey", event.ctrlKey);
  payload.setProperty(runtime, "shiftKey", event.shiftKey);
  payload.setProperty(runtime, "altKey", event.altKey);
  payload.setProperty(runtime, "metaKey", event.metaKey);
  payload.setProperty(runtime, "capsLockKey", event.capsLockKey);
  payload.setProperty(runtime, "numericPadKey", event.numericPadKey);
  payload.setProperty(runtime, "helpKey", event.helpKey);
  payload.setProperty(runtime, "functionKey", event.functionKey);
  return payload;
};

void HostPlatformViewEventEmitter::onKeyDown(const KeyEvent& keyEvent) const {
  dispatchEvent("keyDown", [keyEvent](jsi::Runtime& runtime) {
    return keyEventPayload(runtime, keyEvent);
  });
}

void HostPlatformViewEventEmitter::onKeyUp(const KeyEvent& keyEvent) const {
  dispatchEvent("keyUp", [keyEvent](jsi::Runtime& runtime) {
    return keyEventPayload(runtime, keyEvent);
  });
}

#pragma mark - Mouse Events

// Returns an Object instead of value as we read and modify it in dragEventPayload.
static jsi::Object mouseEventPayload(jsi::Runtime& runtime, const MouseEvent& event) {
  auto payload = jsi::Object(runtime);
  payload.setProperty(runtime, "clientX", event.clientX);
  payload.setProperty(runtime, "clientY", event.clientY);
  payload.setProperty(runtime, "screenX", event.screenX);
  payload.setProperty(runtime, "screenY", event.screenY);
  payload.setProperty(runtime, "altKey", event.altKey);
  payload.setProperty(runtime, "ctrlKey", event.ctrlKey);
  payload.setProperty(runtime, "shiftKey", event.shiftKey);
  payload.setProperty(runtime, "metaKey", event.metaKey);
  return payload;
};

void HostPlatformViewEventEmitter::onMouseEnter(const MouseEvent& mouseEvent) const {
  dispatchEvent("mouseEnter", [mouseEvent](jsi::Runtime &runtime) { 
    return mouseEventPayload(runtime, mouseEvent); 
  });
}

void HostPlatformViewEventEmitter::onMouseLeave(const MouseEvent& mouseEvent) const {
  dispatchEvent("mouseLeave", [mouseEvent](jsi::Runtime &runtime) { 
    return mouseEventPayload(runtime, mouseEvent); 
  });
}

#pragma mark - Drag and Drop Events

jsi::Value HostPlatformViewEventEmitter::dataTransferPayload(
    jsi::Runtime& runtime,
    DataTransfer const& dataTransfer) {
  const auto& files = dataTransfer.files;
  const auto& items = dataTransfer.items;
  const auto& types = dataTransfer.types;
  auto filesArray = jsi::Array(runtime, files.size());
  auto itemsArray = jsi::Array(runtime, items.size());
  auto maxEntries = std::max(files.size(), std::max(items.size(), types.size()));
  auto typesArray = jsi::Array(runtime, maxEntries);

  for (size_t fileIndex = 0; fileIndex < files.size(); ++fileIndex) {
    const auto& fileItem = files[fileIndex];
    auto fileObject = jsi::Object(runtime);
    fileObject.setProperty(runtime, "name", fileItem.name);
    if (!fileItem.type.empty()) {
      fileObject.setProperty(runtime, "type", fileItem.type);
    } else {
      fileObject.setProperty(runtime, "type", jsi::Value::null());
    }
    fileObject.setProperty(runtime, "uri", fileItem.uri);
    if (fileItem.size.has_value()) {
      fileObject.setProperty(runtime, "size", *fileItem.size);
    }
    if (fileItem.width.has_value()) {
      fileObject.setProperty(runtime, "width", *fileItem.width);
    }
    if (fileItem.height.has_value()) {
      fileObject.setProperty(runtime, "height", *fileItem.height);
    }
    filesArray.setValueAtIndex(runtime, static_cast<int>(fileIndex), fileObject);
  }

  for (size_t itemIndex = 0; itemIndex < items.size(); ++itemIndex) {
    const auto& item = items[itemIndex];
    auto itemObject = jsi::Object(runtime);
    itemObject.setProperty(runtime, "kind", item.kind);
    if (!item.type.empty()) {
      itemObject.setProperty(runtime, "type", item.type);
    } else {
      itemObject.setProperty(runtime, "type", jsi::Value::null());
    }
    itemsArray.setValueAtIndex(runtime, static_cast<int>(itemIndex), itemObject);
  }

  for (size_t typeIndex = 0; typeIndex < maxEntries; ++typeIndex) {
    if (typeIndex < types.size()) {
      const auto& typeEntry = types[typeIndex];
      if (!typeEntry.empty()) {
        typesArray.setValueAtIndex(
            runtime,
            static_cast<int>(typeIndex),
            jsi::String::createFromUtf8(runtime, typeEntry));
        continue;
      }
    }

    const std::string* fallbackType = nullptr;
    if (typeIndex < items.size() && !items[typeIndex].type.empty()) {
      fallbackType = &items[typeIndex].type;
    } else if (typeIndex < files.size() && !files[typeIndex].type.empty()) {
      fallbackType = &files[typeIndex].type;
    }

    if (fallbackType != nullptr) {
      typesArray.setValueAtIndex(runtime, static_cast<int>(typeIndex), jsi::String::createFromUtf8(runtime, *fallbackType));
    } else {
      typesArray.setValueAtIndex(runtime, static_cast<int>(typeIndex), jsi::Value::null());
    }
  }

  auto dataTransferObject = jsi::Object(runtime);
  dataTransferObject.setProperty(runtime, "files", filesArray);
  dataTransferObject.setProperty(runtime, "items", itemsArray);
  dataTransferObject.setProperty(runtime, "types", typesArray);

  return dataTransferObject;
}

static jsi::Value dragEventPayload(
    jsi::Runtime& runtime,
    const DragEvent& event) {
  auto payload = mouseEventPayload(runtime, event);
  auto dataTransferObject = HostPlatformViewEventEmitter::dataTransferPayload(
    runtime,
    event.dataTransfer);
  payload.setProperty(runtime, "dataTransfer", dataTransferObject);
  return payload;
}

void HostPlatformViewEventEmitter::onDragEnter(DragEvent const& dragEvent) const {
  dispatchEvent("dragEnter", [dragEvent](jsi::Runtime &runtime) {
    return dragEventPayload(runtime, dragEvent);
  });
}

void HostPlatformViewEventEmitter::onDragLeave(DragEvent const& dragEvent) const {
  dispatchEvent("dragLeave", [dragEvent](jsi::Runtime &runtime) {
    return dragEventPayload(runtime, dragEvent);
  });
}

void HostPlatformViewEventEmitter::onDrop(DragEvent const& dragEvent) const {
  dispatchEvent("drop", [dragEvent](jsi::Runtime &runtime) {
    return dragEventPayload(runtime, dragEvent);
  });
}

} // namespace facebook::react
