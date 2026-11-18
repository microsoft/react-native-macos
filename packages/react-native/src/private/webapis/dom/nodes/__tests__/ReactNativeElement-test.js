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

import TextInputState from '../../../../../../Libraries/Components/TextInput/TextInputState';
import {Commands as ViewCommands} from '../../../../../../Libraries/Components/View/ViewNativeComponent';
import Platform from '../../../../../../Libraries/Utilities/Platform';
import * as ReactNativeFeatureFlags from '../../../../featureflags/ReactNativeFeatureFlags';
import ReactNativeElement from '../ReactNativeElement';

jest.mock(
  '../../../../../../Libraries/Components/View/ViewNativeComponent',
  () => ({
    Commands: {
      blur: jest.fn(),
      focus: jest.fn(),
    },
  }),
);
jest.mock('../specs/NativeDOM', () => ({}));

const originalPlatform = Platform.OS;

describe.each(['focus', 'blur'])('ReactNativeElement.%s', command => {
  let element: ReactNativeElement;

  beforeEach(() => {
    element = Object.create(ReactNativeElement.prototype);
    jest.clearAllMocks();
  });

  afterEach(() => {
    TextInputState.unregisterInput(element);
    // $FlowExpectedError[incompatible-type] Restore the platform-specific OS literal.
    Object.defineProperty(Platform, 'OS', {value: originalPlatform});
    jest.restoreAllMocks();
  });

  it.each([
    ['macos', false, true],
    ['ios', false, false],
    ['android', false, false],
    ['ios', true, true],
    ['android', true, true],
  ])(
    'dispatches on %s with enableImperativeFocus=%s: %s',
    (platform, enabled, shouldDispatch) => {
      Object.defineProperty(Platform, 'OS', {value: platform});
      jest
        .spyOn(ReactNativeFeatureFlags, 'enableImperativeFocus')
        .mockReturnValue(enabled);

      element[command]();

      if (shouldDispatch) {
        expect(ViewCommands[command]).toHaveBeenCalledTimes(1);
        expect(ViewCommands[command]).toHaveBeenCalledWith(element);
      } else {
        expect(ViewCommands[command]).not.toHaveBeenCalled();
      }
    },
  );

  it.each(['macos', 'ios', 'android'])(
    'keeps TextInput commands separate on %s',
    platform => {
      Object.defineProperty(Platform, 'OS', {value: platform});
      jest
        .spyOn(ReactNativeFeatureFlags, 'enableImperativeFocus')
        .mockReturnValue(true);
      TextInputState.registerInput(element);
      const textInputCommand = jest
        .spyOn(
          TextInputState,
          command === 'focus' ? 'focusTextInput' : 'blurTextInput',
        )
        .mockImplementation(() => {});

      element[command]();

      expect(textInputCommand).toHaveBeenCalledTimes(1);
      expect(textInputCommand).toHaveBeenCalledWith(element);
      expect(ViewCommands[command]).not.toHaveBeenCalled();
    },
  );
});
