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
const {Button, Text, View, findNodeHandle} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {
  firstButtonRef = React.createRef();
  secondButtonRef = React.createRef();
  thirdButtonRef = React.createRef();

  componentDidUpdate() {
    console.log('componentDidUpdate');
  }

  componentDidMount() {
    console.log('componentDidMount');
    if (this.firstButtonRef) {
      // this.firstButtonRef.setNativeProps({
      //   nextKeyViewTest: this.secondButtonRef,
      // });
      this.firstButtonRef.nextKeyViewTest = findNodeHandle(
        this.secondButtonRef.current,
      );
    }
    if (this.secondButtonRef) {
      this.secondButtonRef.setNativeProps({
        nextKeyViewTest: this.thirdButtonRef,
      });
    }
    if (this.thirdButtonRef) {
      this.thirdButtonRef.setNativeProps({
        nextKeyViewTest: this.firstButtonRef,
      });
    }
  }

  render() {
    console.log('render');
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
                // nativeID={'firstButton'}
                ref={this.firstButtonRef}
                // ref={firstButtonRef => {
                //   console.log('setting first button ref')
                //   this.firstButtonRef = firstButtonRef;
                // }}
                nextKeyViewTest={this.secondButtonRef}
                onBlur={() => {
                  console.log('First Button Blur!');
                  // const reactTag = findNodeHandle(this.secondButtonRef.current);
                  // UIManager.focus(reactTag);
                }}
              />
              <Button
                focusable={true}
                title={'Third'}
                onPress={() => {}}
                // nativeID={'thirdButton'}
                ref={this.thirdButtonRef}
                // ref={thirdButtonRef => {
                //   console.log('setting third button ref')
                //   this.thirdButtonRef = thirdButtonRef;
                // }}
                // nextKeyViewTest={findNodeHandle(this.firstButtonRef.current)}
                onBlur={() => {
                  console.log('Third Button Blur!');
                  // const reactTag = findNodeHandle(this.firstButtonRef.current);
                  // UIManager.focus(reactTag);
                }}
              />
              <Button
                focusable={true}
                title={'Second'}
                onPress={() => {}}
                nativeID={'secondButton'}
                ref={this.secondButtonRef}
                // ref={secondButtonRef => {
                //   console.log('setting second button ref')
                //   this.secondButtonRef = secondButtonRef;
                // }}
                // nextKeyViewTest={findNodeHandle(this.thirdButtonRef.current)}
                onBlur={() => {
                  console.log('Second Button Blur!');
                  // const reactTag = findNodeHandle(this.thirdButtonRef.current);
                  // UIManager.focus(reactTag);
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
