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
const {Button, Text, View, findNodeHandle, UIManager} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {
  firstButtonRef = React.createRef();
  secondButtonRef = React.createRef();
  thirdButtonRef = React.createRef();

  // [Tue Mar 30 2021 09:05:08.409]  ERROR
  // Warning: KeyViewLoopExample is accessing findNodeHandle inside its render(). √
  // render() should be a pure function of props and state. It should never access something that requires stale data from the previous render, such as refs.
  //  Move this logic to componentDidMount and componentDidUpdate instead.

  render() {
    // this.firstButtonRef.viewRef.current.setNativeProps({
    //   nextKeyViewTest: this.secondButtonRef,
    // });

    // this.secondButtonRef.viewRef.current.setNativeProps({
    //   nextKeyViewTest: this.thirdButtonRef,
    // });

    // this.thirdButtonRef.viewRef.current.setNativeProps({
    //   nextKeyViewTest: this.firstButtonRef,
    // });

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
                // nextKeyViewTest={findNodeHandle(this.secondButtonRef.current)}
                onBlur={() => {
                  console.log('First Button Blur!');
                  const reactTag = findNodeHandle(this.secondButtonRef.current);
                  UIManager.focus(reactTag);
                }}
              />
              <Button
                focusable={true}
                title={'Third'}
                onPress={() => {}}
                ref={this.thirdButtonRef}
                // nextKeyViewTest={findNodeHandle(this.firstButtonRef.current)}
                onBlur={() => {
                  console.log('Third Button Blur!');
                  const reactTag = findNodeHandle(this.firstButtonRef.current);
                  UIManager.focus(reactTag);
                }}
              />
              <Button
                focusable={true}
                title={'Second'}
                onPress={() => {}}
                ref={this.secondButtonRef}
                // nextKeyViewTest={findNodeHandle(this.thirdButtonRef.current)}
                onBlur={() => {
                  console.log('Second Button Blur!');
                  const reactTag = findNodeHandle(this.thirdButtonRef.current);
                  UIManager.focus(reactTag);
                }}
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
