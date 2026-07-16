/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {KeyDownEvent} from '../../Types/CoreEventTypes';

import processLegacyKeyProps, {
  hasLegacyKeyProps,
  stripLegacyKeyProps,
} from '../normalizeLegacyHandledKeyEvents';

type Modifiers = $ReadOnly<{
  altKey?: boolean,
  ctrlKey?: boolean,
  metaKey?: boolean,
  shiftKey?: boolean,
}>;

function createKeyEvent(key: string, modifiers?: Modifiers): KeyDownEvent {
  return ({
    nativeEvent: {
      key,
      altKey: modifiers?.altKey ?? false,
      ctrlKey: modifiers?.ctrlKey ?? false,
      metaKey: modifiers?.metaKey ?? false,
      shiftKey: modifiers?.shiftKey ?? false,
    },
    isPropagationStopped: jest.fn(() => false),
    stopPropagation: jest.fn(),
  }: $FlowFixMe);
}

describe('normalizeLegacyHandledKeyEvents', () => {
  it('expands string keys across modifier combinations', () => {
    const result = processLegacyKeyProps({validKeysDown: ['Enter']});

    expect(result.keyDownEvents).toHaveLength(16);
    expect(result.keyDownEvents).toContainEqual({
      key: 'Enter',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    });
    expect(result.keyDownEvents).toContainEqual({
      key: 'Enter',
      altKey: true,
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    });
  });

  it('preserves structured handled-key entries', () => {
    const handledKey = {key: 'k', metaKey: true};
    const result = processLegacyKeyProps({validKeysUp: [handledKey]});

    expect(result.keyUpEvents).toEqual([handledKey]);
  });

  it('disables legacy key gates for passthrough mode', () => {
    const result = processLegacyKeyProps({
      passthroughAllKeyEvents: true,
      validKeysDown: ['Enter'],
      validKeysUp: ['Escape'],
    });

    expect(result.keyDownEvents).toBeUndefined();
    expect(result.keyUpEvents).toBeUndefined();
  });

  it('calls a legacy handler only for matching events', () => {
    const onKeyDown = jest.fn();
    const result = processLegacyKeyProps({
      onKeyDown,
      validKeysDown: [{key: 'Enter', metaKey: true}],
    });

    result.onKeyDown?.(createKeyEvent('Escape', {metaKey: true}));
    expect(onKeyDown).not.toHaveBeenCalled();

    const matchingEvent = createKeyEvent('Enter', {metaKey: true});
    result.onKeyDown?.(matchingEvent);
    expect(onKeyDown).toHaveBeenCalledWith(matchingEvent);
  });

  it('stops propagation when modern and legacy key gates both match', () => {
    const onKeyDown = jest.fn();
    const event = createKeyEvent('Enter');
    const result = processLegacyKeyProps({
      keyDownEvents: [{key: 'Enter'}],
      onKeyDown,
      validKeysDown: ['Enter'],
    });

    result.onKeyDown?.(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalledWith(event);
  });

  it('detects and strips legacy props', () => {
    const props = {onKeyDown: jest.fn(), validKeysDown: ['Enter']};

    expect(hasLegacyKeyProps(props)).toBe(true);
    stripLegacyKeyProps(props);
    expect(hasLegacyKeyProps(props)).toBe(false);
    expect(props.onKeyDown).toBeDefined();
  });
});
