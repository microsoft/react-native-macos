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
import {Platform} from 'react-native';
const {Button, PlatformColor, StyleSheet, Text, View, findNodeHandle} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {

  render() {
    // var firstButtonRef = useRef(null);

    return (
      <View>
        <Text>
          Key-view loops allow custom control of keyboard accessibility to
          navigate between controls.
        </Text>
        <View>
          {Platform.OS === 'macos' ? (
            <View focusable={true} enableFocusRing={true}>
              <Button
                focusable={true}
                title={'First'}
                onPress={() => {}}
                ref='fist_button'
                // mextKeyView='third_button'
                // nextKeyViewTest={findNodeHandle(this.refs['third_button'])}
              />
              <Button
                focusable={true}
                title={'Third'}
                onPress={() => {}}
                // ref={this.thirdButtonRef}
                // nextKeyViewTest={this.firstButtonRef}
                ref='third_button'
                // nextKeyViewTest='first_button'

              />
              <Button
                focusable={true}
                title={'Second'}
                onPress={() => {}}
                ref='second_button'
                // nextKeyViewTest='third_button'
              />
              <Button
                focusable={true}
                title={'Fifth'}
                onPress={() => {}}
                // ref='fifth_button'
              />
              <Button
                focusable={true}
                title={'Fourth'}
                onPress={() => {}}
                // ref='fourth_button'
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  textInput: {
    ...Platform.select({
      macos: {
        color: PlatformColor('textColor'),
        backgroundColor: PlatformColor('textBackgroundColor'),
        borderColor: PlatformColor('gridColor'),
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

exports.title = 'Key View Loop';
exports.description = 'Examples that show how key-view loops can be used.';
exports.examples = [
  {
    title: 'KeyViewLoopExample',
    render: function(): React.Element<any> {
      return <KeyViewLoopExample />;
    },
  },
];
