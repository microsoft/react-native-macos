/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import type {PartialViewConfigWithoutName} from './PlatformBaseViewConfig';

import * as ReactNativeFeatureFlags from '../../src/private/featureflags/ReactNativeFeatureFlags';
import NativeReactNativeFeatureFlags from '../../src/private/featureflags/specs/NativeReactNativeFeatureFlags';
import ReactNativeStyleAttributes from '../Components/View/ReactNativeStyleAttributes';
import {
  ConditionallyIgnoredEventHandlers,
  DynamicallyInjectedByGestureHandler,
} from './ViewConfigIgnore';

const bubblingEventTypes = {
  // Generic Events
  topPress: {
    phasedRegistrationNames: {
      bubbled: 'onPress',
      captured: 'onPressCapture',
    },
  },
  topChange: {
    phasedRegistrationNames: {
      bubbled: 'onChange',
      captured: 'onChangeCapture',
    },
  },
  topFocus: {
    phasedRegistrationNames: {
      bubbled: 'onFocus',
      captured: 'onFocusCapture',
    },
  },
  topBlur: {
    phasedRegistrationNames: {
      bubbled: 'onBlur',
      captured: 'onBlurCapture',
    },
  },
  topSubmitEditing: {
    phasedRegistrationNames: {
      bubbled: 'onSubmitEditing',
      captured: 'onSubmitEditingCapture',
    },
  },
  topEndEditing: {
    phasedRegistrationNames: {
      bubbled: 'onEndEditing',
      captured: 'onEndEditingCapture',
    },
  },
  topKeyPress: {
    phasedRegistrationNames: {
      bubbled: 'onKeyPress',
      captured: 'onKeyPressCapture',
    },
  },

  // Touch Events
  topTouchStart: {
    phasedRegistrationNames: {
      bubbled: 'onTouchStart',
      captured: 'onTouchStartCapture',
    },
  },
  topTouchMove: {
    phasedRegistrationNames: {
      bubbled: 'onTouchMove',
      captured: 'onTouchMoveCapture',
    },
  },
  topTouchCancel: {
    phasedRegistrationNames: {
      bubbled: 'onTouchCancel',
      captured: 'onTouchCancelCapture',
    },
  },
  topTouchEnd: {
    phasedRegistrationNames: {
      bubbled: 'onTouchEnd',
      captured: 'onTouchEndCapture',
    },
  },

  // Experimental/Work in Progress Pointer Events (not yet ready for use)
  topClick: {
    phasedRegistrationNames: {
      captured: 'onClickCapture',
      bubbled: 'onClick',
    },
  },
  topPointerCancel: {
    phasedRegistrationNames: {
      captured: 'onPointerCancelCapture',
      bubbled: 'onPointerCancel',
    },
  },
  topPointerDown: {
    phasedRegistrationNames: {
      captured: 'onPointerDownCapture',
      bubbled: 'onPointerDown',
    },
  },
  topPointerMove: {
    phasedRegistrationNames: {
      captured: 'onPointerMoveCapture',
      bubbled: 'onPointerMove',
    },
  },
  topPointerUp: {
    phasedRegistrationNames: {
      captured: 'onPointerUpCapture',
      bubbled: 'onPointerUp',
    },
  },
  topPointerEnter: {
    phasedRegistrationNames: {
      captured: 'onPointerEnterCapture',
      bubbled: 'onPointerEnter',
      skipBubbling: true,
    },
  },
  topPointerLeave: {
    phasedRegistrationNames: {
      captured: 'onPointerLeaveCapture',
      bubbled: 'onPointerLeave',
      skipBubbling: true,
    },
  },
  topPointerOver: {
    phasedRegistrationNames: {
      captured: 'onPointerOverCapture',
      bubbled: 'onPointerOver',
    },
  },
  topPointerOut: {
    phasedRegistrationNames: {
      captured: 'onPointerOutCapture',
      bubbled: 'onPointerOut',
    },
  },
  topGotPointerCapture: {
    phasedRegistrationNames: {
      captured: 'onGotPointerCaptureCapture',
      bubbled: 'onGotPointerCapture',
    },
  },
  topLostPointerCapture: {
    phasedRegistrationNames: {
      captured: 'onLostPointerCaptureCapture',
      bubbled: 'onLostPointerCapture',
    },
  },
};

const directEventTypes = {
  topAccessibilityAction: {
    registrationName: 'onAccessibilityAction',
  },
  topAccessibilityTap: {
    registrationName: 'onAccessibilityTap',
  },
  topMagicTap: {
    registrationName: 'onMagicTap',
  },
  topAccessibilityEscape: {
    registrationName: 'onAccessibilityEscape',
  },
  topLayout: {
    registrationName: 'onLayout',
  },
  onGestureHandlerEvent: DynamicallyInjectedByGestureHandler({
    registrationName: 'onGestureHandlerEvent',
  }),
  onGestureHandlerStateChange: DynamicallyInjectedByGestureHandler({
    registrationName: 'onGestureHandlerStateChange',
  }),

  // macOS-specific events
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
  acceptsFirstMouse: true,
  accessibilityTraits: true,
  allowsVibrancy: true,
  cursor: true,
  draggedTypes: true,
  enableFocusRing: true,
  tooltip: true,
  keyDownEvents: true,
  keyUpEvents: true,
  mouseDownCanMoveWindow: true,
};

// Props for bubbling and direct events
const validAttributesForEventProps = ConditionallyIgnoredEventHandlers({
  onLayout: true,
  onMagicTap: true,

  // Accessibility
  onAccessibilityAction: true,
  onAccessibilityEscape: true,
  onAccessibilityTap: true,

  // PanResponder handlers
  onMoveShouldSetResponder: true,
  onMoveShouldSetResponderCapture: true,
  onStartShouldSetResponder: true,
  onStartShouldSetResponderCapture: true,
  onResponderGrant: true,
  onResponderReject: true,
  onResponderStart: true,
  onResponderEnd: true,
  onResponderRelease: true,
  onResponderMove: true,
  onResponderTerminate: true,
  onResponderTerminationRequest: true,
  onShouldBlockNativeResponder: true,

  // Touch events
  onTouchStart: true,
  onTouchMove: true,
  onTouchEnd: true,
  onTouchCancel: true,

  // Pointer events
  onClick: true,
  onClickCapture: true,
  onPointerUp: true,
  onPointerDown: true,
  onPointerCancel: true,
  onPointerEnter: true,
  onPointerMove: true,
  onPointerLeave: true,
  onPointerOver: true,
  onPointerOut: true,
  onGotPointerCapture: true,
  onLostPointerCapture: true,

  // macOS-specific events
  onDoubleClick: true,
  onBlur: true,
  onDragEnter: true,
  onDragLeave: true,
  onDrop: true,
  onFocus: true,
  onKeyDown: true,
  onKeyUp: true,
  onMouseEnter: true,
  onMouseLeave: true,
});

/**
 * On iOS, view managers define all of a component's props.
 * All view managers extend RCTViewManager, and RCTViewManager declares these props.
 */
const PlatformBaseViewConfigIos: PartialViewConfigWithoutName = {
  bubblingEventTypes,
  directEventTypes,
  validAttributes: {
    ...validAttributesForNonEventProps,
    ...validAttributesForEventProps,
  },
};

export default PlatformBaseViewConfigIos;
