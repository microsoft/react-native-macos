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
const {Button, PlatformColor, StyleSheet, Text, View, findNodeHandle, AccessibilityInfo} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {


  firstButtonRef = React.createRef();
  secondButtonRef = React.createRef();
  thirdButtonRef = React.createRef();

  render() {
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
                ref={this.firstButtonRef}
                // mextKeyView='third_button'
                // nextKeyViewTest={findNodeHandle(secondButtonRef.current)}
                onBlur={() => {
                  console.log("firstButtonTag: " + findNodeHandle(this.firstButtonRef.current));
                  console.log("secondButtonTag: " + findNodeHandle(this.secondButtonRef.current));
                  console.log("thirdButtonTag: " + findNodeHandle(this.thirdButtonRef.current));
                  const reactTag = findNodeHandle(this.secondButtonRef.current);
                  AccessibilityInfo.setAccessibilityFocus(reactTag);
                  // this.secondButtonRef.current.focus();
                }}
              />
              <Button
                // focusable={true}
                title={'Third'}
                onPress={() => {}}
                ref={this.secondButtonRef}
                // nextKeyViewTest={firstButtonRef}
              />
              <Button
                // focusable={true}
                title={'Second'}
                onPress={() => {}}
                ref={this.thirdButtonRef}
                // nextKeyViewTest={thirdButtonRef}
              />
              {/* <Button
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
              /> */}
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
