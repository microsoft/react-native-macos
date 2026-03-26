/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {HandledKeyEvent} from '../Types/CoreEventTypes';

export type LegacyHandledKeyEvent = string | HandledKeyEvent;

function expandLegacyHandledKeyEvent(
  legacyHandledKeyEvent: LegacyHandledKeyEvent,
): Array<HandledKeyEvent> {
  if (typeof legacyHandledKeyEvent !== 'string') {
    return [legacyHandledKeyEvent];
  }

  const expandedHandledKeyEvents = [];
  for (const metaKey of [false, true]) {
    for (const ctrlKey of [false, true]) {
      for (const altKey of [false, true]) {
        for (const shiftKey of [false, true]) {
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
): void | Array<HandledKeyEvent> {
  if (legacyHandledKeyEvents == null) {
    return undefined;
  }

  const normalizedHandledKeyEvents = [];
  for (const legacyHandledKeyEvent of legacyHandledKeyEvents) {
    normalizedHandledKeyEvents.push(
      ...expandLegacyHandledKeyEvent(legacyHandledKeyEvent),
    );
  }

  return normalizedHandledKeyEvents;
}