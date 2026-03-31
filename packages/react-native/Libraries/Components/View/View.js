/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {HandledKeyEvent, KeyEvent} from '../../Types/CoreEventTypes'; // [macOS]
import type {ViewProps} from './ViewPropTypes';

import * as ReactNativeFeatureFlags from '../../../src/private/featureflags/ReactNativeFeatureFlags';
import TextAncestorContext from '../../Text/TextAncestorContext';
// [macOS
import normalizeLegacyHandledKeyEvents, {
  type LegacyHandledKeyEvent,
} from '../../Utilities/normalizeLegacyHandledKeyEvents';
// macOS]
import ViewNativeComponent from './ViewNativeComponent';
import * as React from 'react';
import {use} from 'react';

/**
 * The most fundamental component for building a UI, View is a container that
 * supports layout with flexbox, style, some touch handling, and accessibility
 * controls.
 *
 * @see https://reactnative.dev/docs/view
 */
export default component View(
  ref?: React.RefSetter<React.ElementRef<typeof ViewNativeComponent>>,
  ...props: ViewProps
) {
  const hasTextAncestor = use(TextAncestorContext);
  // [macOS Legacy keyboard event compat
  // $FlowFixMe[unclear-type]
  const validKeysDown = ((props: any).validKeysDown: ?$ReadOnlyArray<LegacyHandledKeyEvent>);
  // $FlowFixMe[unclear-type]
  const validKeysUp = ((props: any).validKeysUp: ?$ReadOnlyArray<LegacyHandledKeyEvent>);
  // $FlowFixMe[unclear-type]
  const passthroughAllKeyEvents = ((props: any).passthroughAllKeyEvents: ?boolean);
  // $FlowFixMe[unclear-type]
  const propsWithoutLegacyKeyProps = ({...props}: any);
  delete propsWithoutLegacyKeyProps.validKeysDown;
  delete propsWithoutLegacyKeyProps.validKeysUp;
  delete propsWithoutLegacyKeyProps.passthroughAllKeyEvents;
  const hasModernKeyDown = propsWithoutLegacyKeyProps.keyDownEvents != null;
  const hasModernKeyUp = propsWithoutLegacyKeyProps.keyUpEvents != null;
  const legacyPassthrough =
    passthroughAllKeyEvents === true && !hasModernKeyDown;
  const gateKeyDown =
    !hasModernKeyDown && validKeysDown != null && !legacyPassthrough;
  const gateKeyUp =
    !hasModernKeyUp && validKeysUp != null && !legacyPassthrough;
  const normalizedKeyDownEvents =
    propsWithoutLegacyKeyProps.keyDownEvents ??
    normalizeLegacyHandledKeyEvents(validKeysDown);
  const normalizedKeyUpEvents =
    propsWithoutLegacyKeyProps.keyUpEvents ??
    normalizeLegacyHandledKeyEvents(validKeysUp);
  const nativeKeyDownEvents = legacyPassthrough
    ? undefined
    : normalizedKeyDownEvents;
  const nativeKeyUpEvents = legacyPassthrough
    ? undefined
    : normalizedKeyUpEvents;

  let actualView;
  const _onKeyDown = (event: KeyEvent) => {
    let isHandled = false;
    if (normalizedKeyDownEvents != null && !event.isPropagationStopped()) {
      isHandled = normalizedKeyDownEvents.some(
        ({key, metaKey, ctrlKey, altKey, shiftKey}: HandledKeyEvent) => {
          return (
            event.nativeEvent.key === key &&
            Boolean(metaKey) === event.nativeEvent.metaKey &&
            Boolean(ctrlKey) === event.nativeEvent.ctrlKey &&
            Boolean(altKey) === event.nativeEvent.altKey &&
            Boolean(shiftKey) === event.nativeEvent.shiftKey
          );
        },
      );
      if (isHandled === true && hasModernKeyDown) {
        event.stopPropagation();
      }
    }
    if (!gateKeyDown || isHandled) {
      propsWithoutLegacyKeyProps.onKeyDown?.(event);
    }
  };

  const _onKeyUp = (event: KeyEvent) => {
    let isHandled = false;
    if (normalizedKeyUpEvents != null && !event.isPropagationStopped()) {
      isHandled = normalizedKeyUpEvents.some(
        ({key, metaKey, ctrlKey, altKey, shiftKey}: HandledKeyEvent) => {
          return (
            event.nativeEvent.key === key &&
            Boolean(metaKey) === event.nativeEvent.metaKey &&
            Boolean(ctrlKey) === event.nativeEvent.ctrlKey &&
            Boolean(altKey) === event.nativeEvent.altKey &&
            Boolean(shiftKey) === event.nativeEvent.shiftKey
          );
        },
      );
      if (isHandled === true && hasModernKeyUp) {
        event.stopPropagation();
      }
    }
    if (!gateKeyUp || isHandled) {
      propsWithoutLegacyKeyProps.onKeyUp?.(event);
    }
  };
  // macOS]

  if (ReactNativeFeatureFlags.reduceDefaultPropsInView()) {
    const {
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
      id,
      tabIndex,
      ...otherProps
    } = propsWithoutLegacyKeyProps;

    // Since we destructured props, we can now treat it as mutable
    const processedProps = otherProps as {...ViewProps};

    processedProps.keyDownEvents = nativeKeyDownEvents;
    processedProps.keyUpEvents = nativeKeyUpEvents;
    if (processedProps.onKeyDown != null) {
      processedProps.onKeyDown = _onKeyDown;
    }
    if (processedProps.onKeyUp != null) {
      processedProps.onKeyUp = _onKeyUp;
    }

    const parsedAriaLabelledBy = ariaLabelledBy?.split(/\s*,\s*/g);
    if (parsedAriaLabelledBy !== undefined) {
      processedProps.accessibilityLabelledBy = parsedAriaLabelledBy;
    }

    if (ariaLabel !== undefined) {
      processedProps.accessibilityLabel = ariaLabel;
    }

    if (ariaLive !== undefined) {
      processedProps.accessibilityLiveRegion =
        ariaLive === 'off' ? 'none' : ariaLive;
    }

    if (ariaHidden !== undefined) {
      processedProps.accessibilityElementsHidden = ariaHidden;
      if (ariaHidden === true) {
        processedProps.importantForAccessibility = 'no-hide-descendants';
      }
    }

    if (id !== undefined) {
      processedProps.nativeID = id;
    }

    if (tabIndex !== undefined) {
      processedProps.focusable = !tabIndex;
    }

    if (
      accessibilityState != null ||
      ariaBusy != null ||
      ariaChecked != null ||
      ariaDisabled != null ||
      ariaExpanded != null ||
      ariaSelected != null
    ) {
      processedProps.accessibilityState = {
        busy: ariaBusy ?? accessibilityState?.busy,
        checked: ariaChecked ?? accessibilityState?.checked,
        disabled: ariaDisabled ?? accessibilityState?.disabled,
        expanded: ariaExpanded ?? accessibilityState?.expanded,
        selected: ariaSelected ?? accessibilityState?.selected,
      };
    }

    if (
      accessibilityValue != null ||
      ariaValueMax != null ||
      ariaValueMin != null ||
      ariaValueNow != null ||
      ariaValueText != null
    ) {
      processedProps.accessibilityValue = {
        max: ariaValueMax ?? accessibilityValue?.max,
        min: ariaValueMin ?? accessibilityValue?.min,
        now: ariaValueNow ?? accessibilityValue?.now,
        text: ariaValueText ?? accessibilityValue?.text,
      };
    }

    actualView =
      ref == null ? (
        <ViewNativeComponent {...processedProps} />
      ) : (
        <ViewNativeComponent {...processedProps} ref={ref} />
      );
  } else {
    const {
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
    } = propsWithoutLegacyKeyProps;
    const _accessibilityLabelledBy =
      ariaLabelledBy?.split(/\s*,\s*/g) ?? accessibilityLabelledBy;

    const _accessibilityState =
      accessibilityState != null ||
      ariaBusy != null ||
      ariaChecked != null ||
      ariaDisabled != null ||
      ariaExpanded != null ||
      ariaSelected != null
        ? {
            busy: ariaBusy ?? accessibilityState?.busy,
            checked: ariaChecked ?? accessibilityState?.checked,
            disabled: ariaDisabled ?? accessibilityState?.disabled,
            expanded: ariaExpanded ?? accessibilityState?.expanded,
            selected: ariaSelected ?? accessibilityState?.selected,
          }
        : undefined;

    const _accessibilityValue =
      accessibilityValue != null ||
      ariaValueMax != null ||
      ariaValueMin != null ||
      ariaValueNow != null ||
      ariaValueText != null
        ? {
            max: ariaValueMax ?? accessibilityValue?.max,
            min: ariaValueMin ?? accessibilityValue?.min,
            now: ariaValueNow ?? accessibilityValue?.now,
            text: ariaValueText ?? accessibilityValue?.text,
          }
        : undefined;

    actualView = (
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
        keyDownEvents={nativeKeyDownEvents}
        keyUpEvents={nativeKeyUpEvents}
        // $FlowFixMe[exponential-spread]
        {...(otherProps.onKeyDown && {onKeyDown: _onKeyDown})} // [macOS]
        {...(otherProps.onKeyUp && {onKeyUp: _onKeyUp})} // [macOS]
        ref={ref}
      />
    );
  }

  if (hasTextAncestor) {
    return (
      <TextAncestorContext value={false}>{actualView}</TextAncestorContext>
    );
  }
  return actualView;
}
