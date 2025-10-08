/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import type {ViewProps} from './ViewPropTypes';

import TextAncestor from '../../Text/TextAncestor';
import ViewNativeComponent from './ViewNativeComponent';
import * as React from 'react';
import type { KeyEvent, HandledKeyEvent } from '../../Types/CoreEventTypes'; // [macOS]

export type Props = ViewProps;

/**
 * The most fundamental component for building a UI, View is a container that
 * supports layout with flexbox, style, some touch handling, and accessibility
 * controls.
 *
 * @see https://reactnative.dev/docs/view
 */
const View: component(
  ref?: React.RefSetter<React.ElementRef<typeof ViewNativeComponent>>,
  ...props: ViewProps
) = React.forwardRef(
  (
    {
      accessibilityElementsHidden,
      accessibilityLabel,
      accessibilityLabelledBy,
      accessibilityLiveRegion,
      accessibilityState,
      accessibilityValue,
      'aria-busy': ariaBusy,
      'aria-checked': ariaChecked,
      'aria-disabled': ariaDisabled,
      'aria-expanded': ariaExpanded,
      'aria-hidden': ariaHidden,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-live': ariaLive,
      'aria-selected': ariaSelected,
      'aria-valuemax': ariaValueMax,
      'aria-valuemin': ariaValueMin,
      'aria-valuenow': ariaValueNow,
      'aria-valuetext': ariaValueText,
      focusable,
      id,
      importantForAccessibility,
      nativeID,
      tabIndex,
      ...otherProps
    }: ViewProps,
    forwardedRef,
  ) => {
    const hasTextAncestor = React.useContext(TextAncestor);
    const _accessibilityLabelledBy =
      ariaLabelledBy?.split(/\s*,\s*/g) ?? accessibilityLabelledBy;

    let _accessibilityState;
    if (
      accessibilityState != null ||
      ariaBusy != null ||
      ariaChecked != null ||
      ariaDisabled != null ||
      ariaExpanded != null ||
      ariaSelected != null
    ) {
      _accessibilityState = {
        busy: ariaBusy ?? accessibilityState?.busy,
        checked: ariaChecked ?? accessibilityState?.checked,
        disabled: ariaDisabled ?? accessibilityState?.disabled,
        expanded: ariaExpanded ?? accessibilityState?.expanded,
        selected: ariaSelected ?? accessibilityState?.selected,
      };
    }
    let _accessibilityValue;
    if (
      accessibilityValue != null ||
      ariaValueMax != null ||
      ariaValueMin != null ||
      ariaValueNow != null ||
      ariaValueText != null
    ) {
      _accessibilityValue = {
        max: ariaValueMax ?? accessibilityValue?.max,
        min: ariaValueMin ?? accessibilityValue?.min,
        now: ariaValueNow ?? accessibilityValue?.now,
        text: ariaValueText ?? accessibilityValue?.text,
      };
    }

    // [macOS
    const _onKeyDown = (event: KeyEvent) => {
      if (otherProps.keyDownEvents && !event.isPropagationStopped()) {
        const isHandled = otherProps.keyDownEvents.some(({key, metaKey, ctrlKey, altKey, shiftKey}: HandledKeyEvent) => {
          return (
            event.nativeEvent.key === key &&
            (metaKey ?? event.nativeEvent.metaKey) === event.nativeEvent.metaKey &&
            (ctrlKey ?? event.nativeEvent.ctrlKey) === event.nativeEvent.ctrlKey &&
            (altKey ?? event.nativeEvent.altKey) === event.nativeEvent.altKey &&
            (shiftKey ?? event.nativeEvent.shiftKey) === event.nativeEvent.shiftKey
          );
        });
        if (isHandled) {
          event.stopPropagation();
        }
      }
      otherProps.onKeyDown && otherProps.onKeyDown(event);
    };

    const _onKeyUp = (event: KeyEvent) => {
      if (otherProps.keyUpEvents && !event.isPropagationStopped()) {
        const isHandled = otherProps.keyUpEvents.some(({key, metaKey, ctrlKey, altKey, shiftKey}: HandledKeyEvent) => {
          return (
            event.nativeEvent.key === key &&
            (metaKey ?? event.nativeEvent.metaKey) === event.nativeEvent.metaKey &&
            (ctrlKey ?? event.nativeEvent.ctrlKey) === event.nativeEvent.ctrlKey &&
            (altKey ?? event.nativeEvent.altKey) === event.nativeEvent.altKey &&
            (shiftKey ?? event.nativeEvent.shiftKey) === event.nativeEvent.shiftKey
          );
        });
        if (isHandled) {
          event.stopPropagation();
        }
      }
      otherProps.onKeyUp && otherProps.onKeyUp(event);
    };
    // macOS]

    const actualView = (
      <ViewNativeComponent
        {...otherProps}
        accessibilityLiveRegion={
          ariaLive === 'off' ? 'none' : ariaLive ?? accessibilityLiveRegion
        }
        accessibilityLabel={ariaLabel ?? accessibilityLabel}
        focusable={tabIndex !== undefined ? !tabIndex : focusable}
        accessibilityState={_accessibilityState}
        accessibilityElementsHidden={ariaHidden ?? accessibilityElementsHidden}
        accessibilityLabelledBy={_accessibilityLabelledBy}
        accessibilityValue={_accessibilityValue}
        importantForAccessibility={
          ariaHidden === true
            ? 'no-hide-descendants'
            : importantForAccessibility
        }
        nativeID={id ?? nativeID}
        onKeyDown={_onKeyDown} // [macOS]
        onKeyUp={_onKeyUp} // [macOS]
        ref={forwardedRef}
      />
    );

    if (hasTextAncestor) {
      return (
        <TextAncestor.Provider value={false}>
          {actualView}
        </TextAncestor.Provider>
      );
    }

    return actualView;
  },
);

View.displayName = 'View';

export default View;
