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

import type {HandledKeyEvent} from '../Types/CoreEventTypes';

export type LegacyHandledKeyEvent = string | HandledKeyEvent;

function expandLegacyHandledKeyEvent(
  legacyHandledKeyEvent: LegacyHandledKeyEvent,
): Array<HandledKeyEvent> {
  if (typeof legacyHandledKeyEvent !== 'string') {
    return [legacyHandledKeyEvent];
  }

  const expandedHandledKeyEvents: Array<HandledKeyEvent> = [];
  const bools: Array<boolean> = [false, true];
  for (const metaKey of bools) {
    for (const ctrlKey of bools) {
      for (const altKey of bools) {
        for (const shiftKey of bools) {
          expandedHandledKeyEvents.push({
            altKey,
            ctrlKey,
            key: legacyHandledKeyEvent,
            metaKey,
            shiftKey,
          });
        }
      }
    }
  }

  return expandedHandledKeyEvents;
}

export default function normalizeLegacyHandledKeyEvents(
  legacyHandledKeyEvents: ?$ReadOnlyArray<LegacyHandledKeyEvent>,
): void | $ReadOnlyArray<HandledKeyEvent> {
  if (legacyHandledKeyEvents == null) {
    return undefined;
  }

  const normalizedHandledKeyEvents: Array<HandledKeyEvent> = [];
  for (const legacyHandledKeyEvent of legacyHandledKeyEvents) {
    normalizedHandledKeyEvents.push(
      ...expandLegacyHandledKeyEvent(legacyHandledKeyEvent),
    );
  }

  return normalizedHandledKeyEvents;
}