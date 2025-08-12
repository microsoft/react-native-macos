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
  BlurEvent,
  // [macOS
  FocusEvent,
  HandledKeyEvent,
  KeyEvent,
  GestureResponderEvent,
  LayoutChangeEvent,
  MouseEvent,
  // macOS]
} from '../../Types/CoreEventTypes';
import type {DraggedTypesType} from '../View/DraggedType'; // [macOS]
import type {ViewProps} from '../View/ViewPropTypes';

import {PressabilityDebugView} from '../../Pressability/PressabilityDebug';
import usePressability from '../../Pressability/usePressability';
import {type RectOrSize} from '../../StyleSheet/Rect';
import useMergeRefs from '../../Utilities/useMergeRefs';
import View from '../View/View';
import useAndroidRippleForView, {
  type PressableAndroidRippleConfig,
} from './useAndroidRippleForView';
import * as React from 'react';
import {useMemo, useRef, useState} from 'react';

type ViewStyleProp = $ElementType<React.ElementConfig<typeof View>, 'style'>;

export type PressableStateCallbackType = $ReadOnly<{
  pressed: boolean,
}>;

type PressableBaseProps = $ReadOnly<{
  /**
   * Whether a press gesture can be interrupted by a parent gesture such as a
   * scroll event. Defaults to true.
   */
  cancelable?: ?boolean,

  /**
   * Either children or a render prop that receives a boolean reflecting whether
   * the component is currently pressed.
   */
  children: React.Node | ((state: PressableStateCallbackType) => React.Node),

  /**
   * Duration to wait after hover in before calling `onHoverIn`.
   */
  delayHoverIn?: ?number,

  /**
   * Duration to wait after hover out before calling `onHoverOut`.
   */
  delayHoverOut?: ?number,

  /**
   * Duration (in milliseconds) from `onPressIn` before `onLongPress` is called.
   */
  delayLongPress?: ?number,

  /**
   * Whether the press behavior is disabled.
   */
  disabled?: ?boolean,

  /**
   * Additional distance outside of this view in which a press is detected.
   */
  hitSlop?: ?RectOrSize,

  /**
   * Additional distance outside of this view in which a touch is considered a
   * press before `onPressOut` is triggered.
   */
  pressRetentionOffset?: ?RectOrSize,

  /**
   * Called when this view's layout changes.
   */
  onLayout?: ?(event: LayoutChangeEvent) => mixed,

  /**
   * Called when the hover is activated to provide visual feedback.
   */
  onHoverIn?: ?(event: MouseEvent) => mixed,

  /**
   * Called when the hover is deactivated to undo visual feedback.
   */
  onHoverOut?: ?(event: MouseEvent) => mixed,

  /**
   * Called when a long-tap gesture is detected.
   */
  onLongPress?: ?(event: GestureResponderEvent) => mixed,

  /**
   * Called when a single tap gesture is detected.
   */
  onPress?: ?(event: GestureResponderEvent) => mixed,

  /**
   * Called when a touch is engaged before `onPress`.
   */
  onPressIn?: ?(event: GestureResponderEvent) => mixed,

  /**
   * Called when a touch is released before `onPress`.
   */
  onPressOut?: ?(event: GestureResponderEvent) => mixed,

  // [macOS
  /**
   * Called after the element is focused.
   */
  onFocus?: ?(event: FocusEvent) => void,

  /**
   * Called after the element loses focus.
   */
  onBlur?: ?(event: BlurEvent) => void,

  /**
   * Called after a key down event is detected.
   */
  onKeyDown?: ?(event: KeyEvent) => void,

  /**
   * Called after a key up event is detected.
   */
  onKeyUp?: ?(event: KeyEvent) => void,

  /**
   * Array of keys to receive key down events for. These events have their default native behavior prevented.
   *
   * @platform macos
   */
  keyDownEvents?: ?Array<HandledKeyEvent>,

  /**
   * Array of keys to receive key up events for. These events have their default native behavior prevented.
   *
   * @platform macos
   */
  keyUpEvents?: ?Array<HandledKeyEvent>,

  /**
   * Specifies whether the view should receive the mouse down event when the
   * containing window is in the background.
   *
   * @platform macos
   */
  acceptsFirstMouse?: ?boolean,

  /**
   * Specifies whether clicking and dragging the view can move the window. This is useful
   * to disable in Button like components like Pressable where mouse the user should still
   * be able to click and drag off the view to cancel the click without accidentally moving the window.
   *
   * @platform macos
   */
  mouseDownCanMoveWindow?: ?boolean,

  /**
   * Specifies whether system focus ring should be drawn when the view has keyboard focus.
   *
   * @platform macos
   */
  enableFocusRing?: ?boolean,

  /**
   * Specifies whether the view ensures it is vibrant on top of other content.
   * For more information, see the following apple documentation:
   * https://developer.apple.com/documentation/appkit/nsview/1483793-allowsvibrancy
   * https://developer.apple.com/documentation/appkit/nsvisualeffectview#1674177
   *
   * @platform macos
   */
  allowsVibrancy?: ?boolean,

  /**
   * Specifies the Tooltip for the Pressable.
   * @platform macos
   */
  tooltip?: ?string,

  /**
   * Fired when a file is dragged into the Pressable via the mouse.
   *
   * @platform macos
   */
  onDragEnter?: (event: MouseEvent) => void,

  /**
   * Fired when a file is dragged out of the Pressable via the mouse.
   *
   * @platform macos
   */
  onDragLeave?: (event: MouseEvent) => void,

  /**
   * Fired when a file is dropped on the Pressable via the mouse.
   *
   * @platform macos
   */
  onDrop?: (event: MouseEvent) => void,

  /**
   * The types of dragged files that the Pressable will accept.
   *
   * Possible values for `draggedTypes` are:
   *
   * - `'fileUrl'`
   *
   * @platform macos
   */
  draggedTypes?: ?DraggedTypesType,
  // macOS]

  /**
   * Either view styles or a function that receives a boolean reflecting whether
   * the component is currently pressed and returns view styles.
   */
  style?:
    | ViewStyleProp
    | ((state: PressableStateCallbackType) => ViewStyleProp),

  /**
   * Identifier used to find this view in tests.
   */
  testID?: ?string,

  /**
   * If true, doesn't play system sound on touch.
   */
  android_disableSound?: ?boolean,

  /**
   * Enables the Android ripple effect and configures its color.
   */
  android_ripple?: ?PressableAndroidRippleConfig,

  /**
   * Used only for documentation or testing (e.g. snapshot testing).
   */
  testOnly_pressed?: ?boolean,

  /**
   * Duration to wait after press down before calling `onPressIn`.
   */
  unstable_pressDelay?: ?number,
}>;

export type PressableProps = $ReadOnly<{
  ...ViewProps,
  ...PressableBaseProps,
}>;

type Instance = React.ElementRef<typeof View>;

/**
 * Component used to build display components that should respond to whether the
 * component is currently pressed or not.
 */
function Pressable(
  props: PressableProps,
  forwardedRef: React.RefSetter<Instance>,
): React.Node {
  const {
    accessible,
    accessibilityState,
    'aria-live': ariaLive,
    android_disableSound,
    android_ripple,
    'aria-busy': ariaBusy,
    'aria-checked': ariaChecked,
    'aria-disabled': ariaDisabled,
    'aria-expanded': ariaExpanded,
    'aria-label': ariaLabel,
    'aria-selected': ariaSelected,
    cancelable,
    children,
    delayHoverIn,
    delayHoverOut,
    delayLongPress,
    disabled,
    focusable,
    hitSlop,
    onHoverIn,
    onHoverOut,
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    // [macOS
    onFocus,
    onBlur,
    onKeyDown,
    onKeyUp,
    keyDownEvents,
    keyUpEvents,
    acceptsFirstMouse,
    mouseDownCanMoveWindow,
    enableFocusRing,
    // macOS]
    pressRetentionOffset,
    style,
    testOnly_pressed,
    unstable_pressDelay,
    ...restProps
  } = props;

  const viewRef = useRef<Instance | null>(null);
  const mergedRef = useMergeRefs(forwardedRef, viewRef);

  const android_rippleConfig = useAndroidRippleForView(android_ripple, viewRef);

  const [pressed, setPressed] = usePressState(testOnly_pressed === true);

  const shouldUpdatePressed =
    typeof children === 'function' || typeof style === 'function';

  let _accessibilityState = {
    busy: ariaBusy ?? accessibilityState?.busy,
    checked: ariaChecked ?? accessibilityState?.checked,
    disabled: ariaDisabled ?? accessibilityState?.disabled,
    expanded: ariaExpanded ?? accessibilityState?.expanded,
    selected: ariaSelected ?? accessibilityState?.selected,
  };

  _accessibilityState =
    disabled != null ? {..._accessibilityState, disabled} : _accessibilityState;

  const accessibilityValue = {
    max: props['aria-valuemax'] ?? props.accessibilityValue?.max,
    min: props['aria-valuemin'] ?? props.accessibilityValue?.min,
    now: props['aria-valuenow'] ?? props.accessibilityValue?.now,
    text: props['aria-valuetext'] ?? props.accessibilityValue?.text,
  };

  const accessibilityLiveRegion =
    ariaLive === 'off' ? 'none' : ariaLive ?? props.accessibilityLiveRegion;

  const accessibilityLabel = ariaLabel ?? props.accessibilityLabel;

  const restPropsWithDefaults: React.ElementConfig<typeof View> = {
    ...restProps,
    ...android_rippleConfig?.viewProps,
    acceptsFirstMouse: acceptsFirstMouse !== false && !disabled, // [macOS]
    mouseDownCanMoveWindow: false, // [macOS]
    enableFocusRing: enableFocusRing !== false && !disabled,
    accessible: accessible !== false,
    accessibilityViewIsModal:
      restProps['aria-modal'] ?? restProps.accessibilityViewIsModal,
    accessibilityLiveRegion,
    accessibilityLabel,
    accessibilityState: _accessibilityState,
    focusable: focusable !== false && !disabled, // macOS]
    accessibilityValue,
    hitSlop,
  };

  const config = useMemo(
    () => ({
      cancelable,
      disabled,
      hitSlop,
      pressRectOffset: pressRetentionOffset,
      android_disableSound,
      delayHoverIn,
      delayHoverOut,
      delayLongPress,
      delayPressIn: unstable_pressDelay,
      onHoverIn,
      onHoverOut,
      onLongPress,
      onPress,
      onPressIn(event: GestureResponderEvent): void {
        if (android_rippleConfig != null) {
          android_rippleConfig.onPressIn(event);
        }
        shouldUpdatePressed && setPressed(true);
        if (onPressIn != null) {
          onPressIn(event);
        }
      },
      onPressMove: android_rippleConfig?.onPressMove,
      onPressOut(event: GestureResponderEvent): void {
        if (android_rippleConfig != null) {
          android_rippleConfig.onPressOut(event);
        }
        shouldUpdatePressed && setPressed(false);
        if (onPressOut != null) {
          onPressOut(event);
        }
      },
      // [macOS
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      // macOS]
    }),
    [
      android_disableSound,
      android_rippleConfig,
      cancelable,
      delayHoverIn,
      delayHoverOut,
      delayLongPress,
      disabled,
      hitSlop,
      onHoverIn,
      onHoverOut,
      onLongPress,
      onPress,
      onPressIn,
      onPressOut,
      // [macOS
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      // macOS]
      pressRetentionOffset,
      setPressed,
      shouldUpdatePressed,
      unstable_pressDelay,
    ],
  );
  const eventHandlers = usePressability(config);

  return (
    <View
      {...restPropsWithDefaults}
      {...eventHandlers}
      ref={mergedRef}
      style={typeof style === 'function' ? style({pressed}) : style}
      collapsable={false}>
      {typeof children === 'function' ? children({pressed}) : children}
      {__DEV__ ? <PressabilityDebugView color="red" hitSlop={hitSlop} /> : null}
    </View>
  );
}

function usePressState(forcePressed: boolean): [boolean, (boolean) => void] {
  const [pressed, setPressed] = useState(false);
  return [pressed || forcePressed, setPressed];
}

const MemoedPressable = React.memo(React.forwardRef(Pressable));
MemoedPressable.displayName = 'Pressable';

export default (MemoedPressable: component(
  ref?: React.RefSetter<React.ElementRef<typeof View>>,
  ...props: PressableProps
));
