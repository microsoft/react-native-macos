/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

// TODO(macOS GH#774)

'use strict';

const ReactNativeViewViewConfigMacOS = {
  uiViewClassName: 'RCTView',
  bubblingEventTypes: {
    topKeyUp: {
      registrationName: 'onKeyUp',
    },
    topKeyDown: {
      registrationName: 'onKeyDown',
    },
  },
  directEventTypes: {
    topDoubleClick: {
      registrationName: 'onDoubleClick',
    },
    topDragEnter: {
      registrationName: 'onDragEnter',
    },
    topDragLeave: {
      registrationName: 'onDragLeave',
    },
    topDrop: {
      registrationName: 'onDrop',
    },
    topMouseEnter: {
      registrationName: 'onMouseEnter',
    },
    topMouseLeave: {
      registrationName: 'onMouseLeave',
    },
  },
  validAttributes: {
    acceptsFirstMouse: true,
    accessibilityTraits: true,
    draggedTypes: true,
    enableFocusRing: true,
    nextKeyViewTag: true,
    tooltip: true,
    validKeysDown: true,
    validKeysUp: true,
    keyDownEvents: true,
    keyUpEvents: true
  },
};

module.exports = ReactNativeViewViewConfigMacOS;
