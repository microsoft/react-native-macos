/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import Pressability, {
  type EventHandlers,
  type PressabilityConfig,
} from './Pressability';
import {useEffect, useRef} from 'react';

/**
 * Creates a persistent instance of `Pressability` that automatically configures
 * itself and resets. Accepts null `config` to support lazy initialization. Once
 * initialized, will not un-initialize until the component has been unmounted.
 */
export default function usePressability(
  config: ?PressabilityConfig,
): ?EventHandlers {
  const pressabilityRef = useRef<?Pressability>(null);
  if (config != null && pressabilityRef.current == null) {
    pressabilityRef.current = new Pressability(config);
  }
  const pressability = pressabilityRef.current;

  // On the initial mount, this is a no-op. On updates, `pressability` will be
  // re-configured to use the new configuration.
  useEffect(() => {
    if (config != null && pressability != null) {
      pressability.configure(config);
    }
  }, [config, pressability]);

  // On unmount, reset pending state and timers inside `pressability`. This is
  // a separate effect because we do not want to reset when `config` changes.
  useEffect(() => {
    if (pressability != null) {
      return () => {
        pressability.reset();
      };
    }
  }, [pressability]);

  return pressability == null ? null : pressability.getEventHandlers();
}
