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
const {Text, View, Button, findNodeHandle} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {
  constructor() {
    super();
    this.firstViewRef = React.createRef();
    this.secondViewRef = React.createRef();
    this.thirdViewRef = React.createRef();
    this.fourthButtonRef = React.createRef();
  }

  componentDidMount() {
    this.firstViewRef.current.setNativeProps({
      nextKeyViewTest: findNodeHandle(this.secondViewRef.current),
    });
    this.secondViewRef.current.setNativeProps({
      nextKeyViewTest: findNodeHandle(this.thirdViewRef.current),
    });
    this.thirdViewRef.current.setNativeProps({
      nextKeyViewTest: findNodeHandle(this.fourthButtonRef.current),
    });
    this.fourthButtonRef.current.nextKeyViewTest = findNodeHandle(
      this.firstViewRef.current,
    );
  }

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
              <View
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                onFocus={() => {
                  console.log('First View Focus!');
                }}
                ref={this.firstViewRef}>
                <Text>First View</Text>
              </View>
              <View
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                ref={this.thirdViewRef}>
                <Text>Third View</Text>
              </View>
              <View
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                ref={this.secondViewRef}>
                <Text>Second View</Text>
              </View>
              <Button
                title="Fourth Button"
                focusable={true}
                // enableFocusRing={true}
                ref={this.fourthButtonRef}
              />
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
