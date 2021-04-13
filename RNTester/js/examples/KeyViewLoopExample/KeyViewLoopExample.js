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
const {Button, Text, View, UIManager, findNodeHandle} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {
  firstButtonRef = React.createRef();
  secondButtonRef = React.createRef();
  thirdButtonRef = React.createRef();

  componentDidMount() {
    console.log('componentDidMount');
    this.firstButtonRef.current.setNativeProps({
      nextKeyViewTest: findNodeHandle(this.secondButtonRef.current),
    });
    this.secondButtonRef.current.setNativeProps({
      nextKeyViewTest: findNodeHandle(this.thirdButtonRef.current),
    });
    this.thirdButtonRef.current.setNativeProps({
      nextKeyViewTest: findNodeHandle(this.firstButtonRef.current),
    });
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
              <View
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                ref={this.firstButtonRef}
                onFocus={() => {
                  console.log('First View Focus!');
                }}>
                <Text>First View</Text>
              </View>
              <View
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                ref={this.thirdButtonRef}
                onFocus={() => {
                  console.log('Third View Focus!');
                }}>
                <Text>Third View</Text>
              </View>
              <View
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                ref={this.secondButtonRef}
                onFocus={() => {
                  console.log('Second View Focus!');
                }}>
                <Text>Second View</Text>
              </View>
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
