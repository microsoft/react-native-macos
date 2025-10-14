/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

// [macOS]

import type {AccessibilityActionEvent} from 'react-native/Libraries/Components/View/ViewAccessibility';

const React = require('react');
const ReactNative = require('react-native');

const {Button, Text, View, Platform} = ReactNative;

class AccessibilityShowMenu extends React.Component<{}> {
  onClick: () => void = () => {
    console.log('received click event\n');
  };

  onAccessibilityAction: (e: AccessibilityActionEvent) => void = e => {
    if (e.nativeEvent.actionName === 'showMenu') {
      console.log('received accessibility show event\n');
    }
  };

  render(): React.Node {
    return (
      <View>
        <Text>
          Accessibility Show Menu action is dispatched when the OS triggers it
        </Text>
        <View>
          {Platform.OS === 'macos' ? (
            <Button
              title={'Test button'}
              onPress={this.onClick}
              accessibilityRole={'menubutton'}
              accessibilityActions={[{name: 'showMenu'}]}
              accessibilityHint={
                'For more options, press Control-Option-Shift-M'
              }
              onAccessibilityAction={this.onAccessibilityAction}
            />
          ) : null}
        </View>
      </View>
    );
  }
}

exports.title = 'Accessibility Show Menu action';
exports.description =
  'Examples that show how Accessibility Show Menu action can be used.';
exports.examples = [
  {
    title: 'AccessibilityShowMenu',
    render: function (): React.Node {
      return <AccessibilityShowMenu />;
    },
  },
];
