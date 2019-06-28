/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict'; // TODO(OSS Candidate ISS#2710739)

const React = require('react');
const ReactNative = require('react-native');
const Platform = require('Platform');
const {
  Image,
  StyleSheet,
  Text,
  View,
} = ReactNative;

type State = {
};

class DarkModeExample extends React.Component<{}, State> {
  state: State = {
  };

  render() {
    return (
      <View>
        <Text>
          Dark Mode Examples
        </Text>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  textInput: {
    ...Platform.select({
      macos: {
        color: {semantic: 'textColor'},
        backgroundColor: {semantic: 'textBackgroundColor'},
        borderColor: {semantic: 'gridColor'},
      },
      default: {
        borderColor: '#0f0f0f',
      },
    }),
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 13,
    padding: 4,
  },
});

exports.title = 'Dark Mode Example';
exports.description = 'Examples that show how Dark Mode may be implemented in an app.';
exports.examples = [
  {
    title: 'Dark Mode Example',
    render: function(): React.Element<any> {
      return <DarkModeExample />;
    },
  },
];
