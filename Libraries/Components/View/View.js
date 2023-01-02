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

import ViewNativeComponent from './ViewNativeComponent';
import TextAncestor from '../../Text/TextAncestor';
import * as React from 'react';
import invariant from 'invariant'; // [macOS]
import type {KeyEvent} from '../../Types/CoreEventTypes'; // [macOS]

export type Props = ViewProps;

/**
 * The most fundamental component for building a UI, View is a container that
 * supports layout with flexbox, style, some touch handling, and accessibility
 * controls.
 *
 * @see https://reactnative.dev/docs/view
 */
const View: React.AbstractComponent<
  ViewProps,
  React.ElementRef<typeof ViewNativeComponent>,
> = React.forwardRef((props: ViewProps, forwardedRef) => {
  // [macOS
  const {onKeyDown, onKeyUp, validKeysDown, validKeysUp} = props;

  invariant(
    // $FlowFixMe Wanting to catch untyped usages
    validKeysDown === undefined,
    'Support for the "acceptsKeyboardFocus" property has been deprecated in favor of "keyDownEvents"',
  );

  invariant(
    // $FlowFixMe Wanting to catch untyped usages
    validKeysUp === undefined,
    'Support for the "acceptsKeyboardFocus" property has been removed in favor of "keyUpEvents"',
  );

  // To support the deprecated validKeysDown prop, suppress bubbling if it is defined
  const onKeyDownWithLegacyBehavior = (e: KeyEvent) => {
    if (validKeysDown) {
      e.stopPropogation();
    }
    onKeyDown?.();
  };

  // To support the deprecated validKeysUp prop, suppress bubbling if it is defined
  const onKeyUpWithLegacyBehavior = (e: KeyEvent) => {
    if (validKeysUp) {
      e.stopPropogation();
    }
    onKeyUp?.();
  };
  // macOS]

  return (
    <TextAncestor.Provider value={false}>
      {/* [macOS */}
      <ViewNativeComponent
        {...props}
        ref={forwardedRef}
        {...(onKeyDown && {keyDown: onKeyDownWithLegacyBehavior})}
        {...(onKeyUp && {keyUp: onKeyUpWithLegacyBehavior})}
      />
      {/* macOS] */}
    </TextAncestor.Provider>
  );
});

View.displayName = 'View';

module.exports = View;
