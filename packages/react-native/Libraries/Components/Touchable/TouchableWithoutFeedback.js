/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue,
} from '../../Components/View/ViewAccessibility';
import type {EdgeInsetsOrSizeProp} from '../../StyleSheet/EdgeInsetsPropType';
import type {
  BlurEvent,
  FocusEvent,
  KeyEvent, // [macOS]
  LayoutEvent,
  MouseEvent, // [macOS]
  PressEvent,
} from '../../Types/CoreEventTypes';
// [macOS
import type {DraggedTypesType} from '../View/DraggedType';

// macOS]
import View from '../../Components/View/View';
import {PressabilityDebugView} from '../../Pressability/PressabilityDebug';
import usePressability from '../../Pressability/usePressability';
import * as React from 'react';
import {useMemo} from 'react';

type Props = $ReadOnly<{|
  accessibilityActions?: ?$ReadOnlyArray<AccessibilityActionInfo>,
  accessibilityElementsHidden?: ?boolean,
  accessibilityHint?: ?Stringish,
  accessibilityLanguage?: ?Stringish,
  accessibilityIgnoresInvertColors?: ?boolean,
  accessibilityLabel?: ?Stringish,
  accessibilityLiveRegion?: ?('none' | 'polite' | 'assertive'),
  accessibilityRole?: ?AccessibilityRole,
  accessibilityState?: ?AccessibilityState,
  accessibilityValue?: ?AccessibilityValue,
  'aria-valuemax'?: AccessibilityValue['max'],
  'aria-valuemin'?: AccessibilityValue['min'],
  'aria-valuenow'?: AccessibilityValue['now'],
  'aria-valuetext'?: AccessibilityValue['text'],
  accessibilityViewIsModal?: ?boolean,
  'aria-modal'?: ?boolean,
  accessible?: ?boolean,
  /**
   * alias for accessibilityState
   *
   * see https://reactnative.dev/docs/accessibility#accessibilitystate
   */
  'aria-busy'?: ?boolean,
  'aria-checked'?: ?boolean | 'mixed',
  'aria-disabled'?: ?boolean,
  'aria-expanded'?: ?boolean,
  'aria-selected'?: ?boolean,
  'aria-hidden'?: ?boolean,
  'aria-live'?: ?('polite' | 'assertive' | 'off'),
  'aria-label'?: ?Stringish,
  children?: ?React.Node,
  delayLongPress?: ?number,
  delayPressIn?: ?number,
  delayPressOut?: ?number,
  disabled?: ?boolean,
  focusable?: ?boolean,
  hitSlop?: ?EdgeInsetsOrSizeProp,
  id?: string,
  importantForAccessibility?: ?('auto' | 'yes' | 'no' | 'no-hide-descendants'),
  nativeID?: ?string,
  onAccessibilityAction?: ?(event: AccessibilityActionEvent) => mixed,
  onBlur?: ?(event: BlurEvent) => void, // [macOS]
  onFocus?: ?(event: FocusEvent) => void, // [macOS]
  onLayout?: ?(event: LayoutEvent) => mixed,
  onLongPress?: ?(event: PressEvent) => mixed,
  onPress?: ?(event: PressEvent) => mixed,
  onPressIn?: ?(event: PressEvent) => mixed,
  onPressOut?: ?(event: PressEvent) => mixed,
  // [macOS
  acceptsFirstMouse?: ?boolean,
  enableFocusRing?: ?boolean,
  tooltip?: ?string,
  onMouseEnter?: (event: MouseEvent) => void,
  onMouseLeave?: (event: MouseEvent) => void,
  onDragEnter?: (event: MouseEvent) => void,
  onDragLeave?: (event: MouseEvent) => void,
  onDrop?: (event: MouseEvent) => void,
  draggedTypes?: ?DraggedTypesType,
  // macOS]
  pressRetentionOffset?: ?EdgeInsetsOrSizeProp,
  rejectResponderTermination?: ?boolean,
  testID?: ?string,
  touchSoundDisabled?: ?boolean,
|}>;

const PASSTHROUGH_PROPS = [
  'accessibilityActions',
  'accessibilityElementsHidden',
  'accessibilityHint',
  'accessibilityLanguage',
  'accessibilityIgnoresInvertColors',
  'accessibilityLabel',
  'accessibilityLiveRegion',
  'accessibilityRole',
  'accessibilityValue',
  'aria-valuemax',
  'aria-valuemin',
  'aria-valuenow',
  'aria-valuetext',
  'accessibilityViewIsModal',
  'aria-modal',
  'hitSlop',
  'importantForAccessibility',
  'nativeID',
  'onAccessibilityAction',
  'onBlur',
  'onFocus',
  'onLayout',
  // [macOS
  'onMouseEnter',
  'onMouseLeave',
  'onDragEnter',
  'onDragLeave',
  'onDrop',
  'draggedTypes',
  'tooltip',
  // macOS]
  'testID',
];

module.exports = function TouchableWithoutFeedback(props: Props): React.Node {
  const {
    disabled,
    rejectResponderTermination,
    'aria-disabled': ariaDisabled,
    accessibilityState,
    hitSlop,
    delayLongPress,
    delayPressIn,
    delayPressOut,
    pressRetentionOffset,
    touchSoundDisabled,
    onBlur: _onBlur,
    onFocus: _onFocus,
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    // [macOS
    onKeyDown,
    onKeyUp,
    // macOS]
  } = props;

  const pressabilityConfig = useMemo(
    () => ({
      cancelable: !rejectResponderTermination,
      disabled:
        disabled !== null
          ? disabled
          : ariaDisabled ?? accessibilityState?.disabled,
      hitSlop: hitSlop,
      delayLongPress: delayLongPress,
      delayPressIn: delayPressIn,
      delayPressOut: delayPressOut,
      minPressDuration: 0,
      pressRectOffset: pressRetentionOffset,
      android_disableSound: touchSoundDisabled,
      onBlur: _onBlur,
      onFocus: _onFocus,
      onLongPress: onLongPress,
      onPress: onPress,
      onPressIn: onPressIn,
      onPressOut: onPressOut,
    }),
    [
      rejectResponderTermination,
      disabled,
      ariaDisabled,
      accessibilityState?.disabled,
      hitSlop,
      delayLongPress,
      delayPressIn,
      delayPressOut,
      pressRetentionOffset,
      touchSoundDisabled,
      _onBlur,
      _onFocus,
      onLongPress,
      onPress,
      onPressIn,
      onPressOut,
    ],
  );

  const eventHandlers = usePressability(pressabilityConfig);

  const element = React.Children.only<$FlowFixMe>(props.children);
  const children: Array<React.Node> = [element.props.children];
  const ariaLive = props['aria-live'];

  if (__DEV__) {
    if (element.type === View) {
      children.push(
        <PressabilityDebugView color="red" hitSlop={props.hitSlop} />,
      );
    }
  }

  componentDidUpdate(): void {
    this.state.pressability.configure(createPressabilityConfig(this.props));
  }

  componentDidMount(): mixed {
    this.state.pressability.configure(createPressabilityConfig(this.props));
  }

  componentWillUnmount(): void {
    this.state.pressability.reset();
  }
}

function createPressabilityConfig({
  'aria-disabled': ariaDisabled,
  ...props
}: Props): PressabilityConfig {
  const accessibilityStateDisabled =
    ariaDisabled ?? props.accessibilityState?.disabled;
  return {
    cancelable: !props.rejectResponderTermination,
    disabled:
      props.disabled !== null ? props.disabled : accessibilityStateDisabled,
    hitSlop: props.hitSlop,
    delayLongPress: props.delayLongPress,
    delayPressIn: props.delayPressIn,
    delayPressOut: props.delayPressOut,
    minPressDuration: 0,
    pressRectOffset: props.pressRetentionOffset,
    android_disableSound: props.touchSoundDisabled,
    onBlur: props.onBlur,
    onFocus: props.onFocus,
    onLongPress: props.onLongPress,
    onPress: props.onPress,
    onPressIn: props.onPressIn,
    onPressOut: props.onPressOut,
  };

  // BACKWARD-COMPATIBILITY: Focus and blur events were never supported before
  // adopting `Pressability`, so preserve that behavior.
  const {onBlur, onFocus, ...eventHandlersWithoutBlurAndFocus} =
    eventHandlers || {};

  const elementProps: {[string]: mixed, ...} = {
    ...eventHandlersWithoutBlurAndFocus,
    accessible: props.accessible !== false,
    accessibilityState:
      props.disabled != null
        ? {
            ..._accessibilityState,
            disabled: props.disabled,
          }
        : _accessibilityState,
    focusable:
      props.focusable !== false &&
      props.onPress !== undefined &&
      !props.disabled,
    // [macOS
    acceptsFirstMouse:
      props.acceptsFirstMouse !== false &&
      props.onPress !== undefined &&
      !props.disabled,
    enableFocusRing:
      props.enableFocusRing !== false &&
      props.onPress !== undefined &&
      !props.disabled,
    // macOS]

    accessibilityElementsHidden:
      props['aria-hidden'] ?? props.accessibilityElementsHidden,
    importantForAccessibility:
      props['aria-hidden'] === true
        ? 'no-hide-descendants'
        : props.importantForAccessibility,
    accessibilityLiveRegion:
      ariaLive === 'off' ? 'none' : ariaLive ?? props.accessibilityLiveRegion,
    nativeID: props.id ?? props.nativeID,
  };

  for (const prop of PASSTHROUGH_PROPS) {
    if (props[prop] !== undefined) {
      elementProps[prop] = props[prop];
    }
  }

  // $FlowFixMe[incompatible-call]
  return React.cloneElement(element, elementProps, ...children);
};
