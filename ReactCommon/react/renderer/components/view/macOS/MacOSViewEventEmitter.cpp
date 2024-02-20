/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "MacOSViewEventEmitter.h"

namespace facebook::react {

#pragma mark - Keyboard Events

static jsi::Value keyEventPayload(jsi::Runtime &runtime, KeyEvent const &event) {
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

void MacOSViewEventEmitter::onKeyDown(KeyEvent const &keyEvent) const {
  dispatchEvent(
      "keyDown",
      [keyEvent](jsi::Runtime &runtime) { return keyEventPayload(runtime, keyEvent); },
      EventPriority::AsynchronousBatched);
}

void MacOSViewEventEmitter::onKeyUp(KeyEvent const &keyEvent) const {
  dispatchEvent(
      "keyUp",
      [keyEvent](jsi::Runtime &runtime) { return keyEventPayload(runtime, keyEvent); },
      EventPriority::AsynchronousBatched);
}


#pragma mark - Mouse Events

static jsi::Object mouseEventPayload(jsi::Runtime &runtime, MouseEvent const &event) {
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

void MacOSViewEventEmitter::onMouseEnter(MouseEvent const &mouseEvent) const {
  dispatchEvent(
      "mouseEnter",
      [mouseEvent](jsi::Runtime &runtime) { return mouseEventPayload(runtime, mouseEvent); },
      EventPriority::AsynchronousBatched);
}

void MacOSViewEventEmitter::onMouseLeave(MouseEvent const &mouseEvent) const {
  dispatchEvent(
      "mouseLeave",
      [mouseEvent](jsi::Runtime &runtime) { return mouseEventPayload(runtime, mouseEvent); },
      EventPriority::AsynchronousBatched);
}


#pragma mark - Drag and Drop Events

jsi::Value MacOSViewEventEmitter::dataTransferPayload(jsi::Runtime &runtime, std::vector<DataTransferItem> const &dataTransferItems) {
  auto filesArray = jsi::Array(runtime, dataTransferItems.size());
  auto itemsArray = jsi::Array(runtime, dataTransferItems.size());
  auto typesArray = jsi::Array(runtime, dataTransferItems.size());
  int i = 0;
  for (auto const &transferItem : dataTransferItems) {
    auto fileObject = jsi::Object(runtime);
    fileObject.setProperty(runtime, "name", transferItem.name);
    fileObject.setProperty(runtime, "type", transferItem.type);
    fileObject.setProperty(runtime, "uri", transferItem.uri);
    if (transferItem.size.has_value()) {
      fileObject.setProperty(runtime, "size", *transferItem.size);
    }
    if (transferItem.width.has_value()) {
      fileObject.setProperty(runtime, "width", *transferItem.width);
    }
    if (transferItem.height.has_value()) {
      fileObject.setProperty(runtime, "height", *transferItem.height);
    }
    filesArray.setValueAtIndex(runtime, i, fileObject);
    
    auto itemObject = jsi::Object(runtime);
    itemObject.setProperty(runtime, "kind", transferItem.kind);
    itemObject.setProperty(runtime, "type", transferItem.type);
    itemsArray.setValueAtIndex(runtime, i, itemObject);
    
    typesArray.setValueAtIndex(runtime, i, transferItem.type);
    i++;
  }
  
  auto dataTransferObject = jsi::Object(runtime);
  dataTransferObject.setProperty(runtime, "files", filesArray);
  dataTransferObject.setProperty(runtime, "items", itemsArray);
  dataTransferObject.setProperty(runtime, "types", typesArray);
  
  return dataTransferObject;
}

static jsi::Value dragEventPayload(jsi::Runtime &runtime, DragEvent const &event) {
  auto payload = mouseEventPayload(runtime, event);
  auto dataTransferObject = MacOSViewEventEmitter::dataTransferPayload(runtime, event.dataTransferItems);
  payload.setProperty(runtime, "dataTransfer", dataTransferObject);
  return payload;
}

void MacOSViewEventEmitter::onDragEnter(DragEvent const &dragEvent) const {
  dispatchEvent(
      "dragEnter",
      [dragEvent](jsi::Runtime &runtime) { return dragEventPayload(runtime, dragEvent); },
      EventPriority::AsynchronousBatched);
}

void MacOSViewEventEmitter::onDragLeave(DragEvent const &dragEvent) const {
  dispatchEvent(
      "dragLeave",
      [dragEvent](jsi::Runtime &runtime) { return dragEventPayload(runtime, dragEvent); },
      EventPriority::AsynchronousBatched);
}

void MacOSViewEventEmitter::onDrop(DragEvent const &dragEvent) const {
  dispatchEvent(
      "drop",
      [dragEvent](jsi::Runtime &runtime) { return dragEventPayload(runtime, dragEvent); },
      EventPriority::AsynchronousBatched);
}

} // namespace facebook::react
