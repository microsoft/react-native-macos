/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

// [macOS]
// Legacy validKeysDown/validKeysUp/passthroughAllKeyEvents compat layer.
// When removing legacy support, delete this file and its call sites.

import type {HandledKeyEvent, KeyEvent} from '../Types/CoreEventTypes';

type LegacyHandledKeyEvent = string | HandledKeyEvent;

function expandKey(entry: LegacyHandledKeyEvent): Array<HandledKeyEvent> {
  if (typeof entry !== 'string') {
    return [entry];
  }
  const out: Array<HandledKeyEvent> = [];
  const bools: Array<boolean> = [false, true];
  for (const metaKey of bools) {
    for (const ctrlKey of bools) {
      for (const altKey of bools) {
        for (const shiftKey of bools) {
          out.push({altKey, ctrlKey, key: entry, metaKey, shiftKey});
        }
      }
    }
  }
  return out;
}

function normalize(
  legacy: ?$ReadOnlyArray<LegacyHandledKeyEvent>,
): void | Array<HandledKeyEvent> {
  if (legacy == null) {
    return undefined;
  }
  const result: Array<HandledKeyEvent> = [];
  for (const entry of legacy) {
    result.push(...expandKey(entry));
  }
  return result;
}

function matchesEvent(
  events: $ReadOnlyArray<HandledKeyEvent>,
  event: KeyEvent,
): boolean {
  return events.some(
    ({key, metaKey, ctrlKey, altKey, shiftKey}: HandledKeyEvent) =>
      event.nativeEvent.key === key &&
      Boolean(metaKey) === event.nativeEvent.metaKey &&
      Boolean(ctrlKey) === event.nativeEvent.ctrlKey &&
      Boolean(altKey) === event.nativeEvent.altKey &&
      Boolean(shiftKey) === event.nativeEvent.shiftKey,
  );
}

export type LegacyKeyResult = {
  keyDownEvents: void | Array<HandledKeyEvent>,
  keyUpEvents: void | Array<HandledKeyEvent>,
  onKeyDown: void | ((event: KeyEvent) => void),
  onKeyUp: void | ((event: KeyEvent) => void),
};

/**
 * Returns true if the props contain legacy key props that need processing.
 */
export function hasLegacyKeyProps(props: mixed): boolean {
  // $FlowFixMe[unclear-type]
  const p = (props: any);
  return (
    p.validKeysDown != null ||
    p.validKeysUp != null ||
    p.passthroughAllKeyEvents != null
  );
}

/**
 * Strips legacy props from a props object (mutates).
 */
export function stripLegacyKeyProps(props: {+[string]: mixed}): void {
  // $FlowFixMe[unclear-type]
  const p = (props: any);
  delete p.validKeysDown;
  delete p.validKeysUp;
  delete p.passthroughAllKeyEvents;
}

/**
 * Processes legacy validKeysDown/validKeysUp/passthroughAllKeyEvents props
 * and returns the equivalent modern keyDownEvents/keyUpEvents and wrapped
 * onKeyDown/onKeyUp handlers.
 *
 * Usage in component:
 *   if (hasLegacyKeyProps(props)) {
 *     const legacy = processLegacyKeyProps(props);
 *     // use legacy.keyDownEvents, legacy.onKeyDown, etc.
 *   }
 */
export default function processLegacyKeyProps(
  // $FlowFixMe[unclear-type]
  props: any,
): LegacyKeyResult {
  const validKeysDown: ?$ReadOnlyArray<LegacyHandledKeyEvent> =
    props.validKeysDown;
  const validKeysUp: ?$ReadOnlyArray<LegacyHandledKeyEvent> = props.validKeysUp;
  const passthroughAllKeyEvents: ?boolean = props.passthroughAllKeyEvents;

  const hasModernKeyDown = props.keyDownEvents != null;
  const hasModernKeyUp = props.keyUpEvents != null;
  const legacyPassthrough =
    passthroughAllKeyEvents === true && !hasModernKeyDown;

  const gateKeyDown =
    !hasModernKeyDown && validKeysDown != null && !legacyPassthrough;
  const gateKeyUp =
    !hasModernKeyUp && validKeysUp != null && !legacyPassthrough;

  const normalizedDown = props.keyDownEvents ?? normalize(validKeysDown);
  const normalizedUp = props.keyUpEvents ?? normalize(validKeysUp);

  const keyDownEvents = legacyPassthrough ? undefined : normalizedDown;
  const keyUpEvents = legacyPassthrough ? undefined : normalizedUp;

  const onKeyDown =
    props.onKeyDown != null
      ? (event: KeyEvent) => {
          let isHandled = false;
          if (normalizedDown != null && !event.isPropagationStopped()) {
            isHandled = matchesEvent(normalizedDown, event);
            if (isHandled && hasModernKeyDown) {
              event.stopPropagation();
            }
          }
          if (!gateKeyDown || isHandled) {
            props.onKeyDown?.(event);
          }
        }
      : undefined;

  const onKeyUp =
    props.onKeyUp != null
      ? (event: KeyEvent) => {
          let isHandled = false;
          if (normalizedUp != null && !event.isPropagationStopped()) {
            isHandled = matchesEvent(normalizedUp, event);
            if (isHandled && hasModernKeyUp) {
              event.stopPropagation();
            }
          }
          if (!gateKeyUp || isHandled) {
            props.onKeyUp?.(event);
          }
        }
      : undefined;

  return {keyDownEvents, keyUpEvents, onKeyDown, onKeyUp};
}
