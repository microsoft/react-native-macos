/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

// [macOS]

import {
  DynamicallyInjectedByGestureHandler,
  ConditionallyIgnoredEventHandlers,
} from './ViewConfigIgnore';
import ReactNativeStyleAttributes from '../Components/View/ReactNativeStyleAttributes';
import type {PartialViewConfigWithoutName} from './PlatformBaseViewConfig';
import { PlatformBaseViewConfigIos } from './BaseViewConfig.ios';


const bubblingEventTypes = {
  ...PlatformBaseViewConfigIos.bubblingEventTypes,
};

const directEventTypes = {
  ...PlatformBaseViewConfigIos.directEventTypes,
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
  topKeyUp: {
    registrationName: 'onKeyUp',
  },
  topKeyDown: {
    registrationName: 'onKeyDown',
  },
  topMouseEnter: {
    registrationName: 'onMouseEnter',
  },
  topMouseLeave: {
    registrationName: 'onMouseLeave',
  },
};

const validAttributesForNonEventProps = {
  ...PlatformBaseViewConfigIos.validAttributesForNonEventProps,
  acceptsFirstMouse: true,
  accessibilityTraits: true,
  cursor: true,
  draggedTypes: true,
  enableFocusRing: true,
  tooltip: true,
  validKeysDown: true,
  validKeysUp: true,
};

const validAttributesForEventProps = ConditionallyIgnoredEventHandlers({
  ...PlatformBaseViewConfigIos.validAttributesForEventProps,
  onBlur: true,
  onClick: true,
  onDoubleClick: true,
  onDragEnter: true,
  onDragLeave: true,
  onDrop: true,
  onFocus: true,
  onKeyDown: true,
  onKeyUp: true,
  onMouseEnter: true,
  onMouseLeave: true,
});

const PlatformBaseViewConfigMacos: PartialViewConfigWithoutName = {
  bubblingEventTypes,
  directEventTypes,
  validAttributes: {
    ...validAttributesForNonEventProps,
    ...validAttributesForEventProps,
  },
};

export default PlatformBaseViewConfigMacos;
