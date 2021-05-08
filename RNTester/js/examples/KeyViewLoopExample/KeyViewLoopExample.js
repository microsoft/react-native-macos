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
const {
  Text,
  View,
  Button,
  TextInput,
  StyleSheet,
  findNodeHandle,
  Image,
} = ReactNative;

class KeyViewLoopExample extends React.Component<{}, State> {
  render() {
    const firstKeyViewID = 'firstKeyView';
    const secondKeyViewID = 'secondKeyView';
    const thirdKeyViewID = 'thirdKeyView';
    const fourthKeyViewID = 'fourthKeyView';

    return (
      <View>
        <Text>
          Key-view loops allow custom control of keyboard accessibility to
          navigate between controls.
        </Text>
        <View>
          {Platform.OS === 'macos' ? (
            <View>
              <View
                style={{height: 20, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                nativeID={firstKeyViewID}
                nextKeyViewID={secondKeyViewID}>
                <Text>First View</Text>
              </View>
              <View
                style={{height: 20, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                nativeID={thirdKeyViewID}
                nextKeyViewID={fourthKeyViewID}>
                <Text>Third View</Text>
              </View>
              <View
                style={{height: 20, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                nativeID={secondKeyViewID}
                nextKeyViewID={thirdKeyViewID}>
                <Text>Second View</Text>
              </View>
              <Image
                style={{height: 100, width: 100, margin: 20}}
                focusable={true}
                enableFocusRing={true}
                nativeID={fourthKeyViewID}
                source={{
                  uri: 'https://reactnative.dev/img/tiny_logo.png',
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }
}
class FocusTrapExample extends React.Component<{}, {}> {
  render() {
    const nextKeyViewID = 'inputView4';
    return (
      <View>
        <Text>Focus trap example.</Text>
        <TextInput placeholder={'Focusable 1'} style={styles.textInput} />
        <TextInput placeholder={'Focusable 2'} style={styles.textInput} />
        <TextInput placeholder={'Focusable 3'} style={styles.textInput} />
        <Text>Begin focus trap:</Text>
        <TextInput
          nativeID={nextKeyViewID}
          placeholder={'Focusable 4'}
          style={styles.textInput}
        />
        <TextInput placeholder={'Focusable 5'} style={styles.textInput} />
        <TextInput
          nextKeyViewID={nextKeyViewID}
          placeholder={'Focusable 6'}
          style={styles.textInput}
        />
        <Text>End focus trap:</Text>
        <TextInput placeholder={'Focusable 7'} style={styles.textInput} />
        <TextInput placeholder={'Focusable 8'} style={styles.textInput} />
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

class KeyViewLoopRefExample extends React.Component<{}, State> {
  firstButtonRef = React.createRef();
  secondButtonRef = React.createRef();
  thirdButtonRef = React.createRef();

  componentDidMount() {
    console.log('componentDidMount');

    this.firstButtonRef.current.setNativeProps({
      nextKeyViewRef: findNodeHandle(this.secondButtonRef.current),
    });
    this.secondButtonRef.current.setNativeProps({
      nextKeyViewRef: findNodeHandle(this.thirdButtonRef.current),
    });
    this.thirdButtonRef.current.setNativeProps({
      nextKeyViewRef: findNodeHandle(this.firstButtonRef.current),
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
            <View>
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

class KeyViewLoopViewManagerExample extends React.Component<{}, State> {
  firstButtonRef = React.createRef();
  secondButtonRef = React.createRef();
  thirdButtonRef = React.createRef();

  componentDidMount() {
    console.log('componentDidMount');

    this.firstButtonRef.current.setNativeProps({
      nextKeyViewRef: findNodeHandle(this.secondButtonRef.current),
    });
    this.secondButtonRef.current.setNativeProps({
      nextKeyViewRef: findNodeHandle(this.thirdButtonRef.current),
    });
    this.thirdButtonRef.current.setNativeProps({
      nextKeyViewRef: findNodeHandle(this.firstButtonRef.current),
    });

    if (this.firstButtonRef && this.firstButtonRef.current) {
      // console.log("focus")
      // this.firstButtonRef.current.focus();
      // this.firstButtonRef.current.recalculateKeyViewLoop();
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
            <View>
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
                  this.secondButtonRef.current.recalculateKeyViewLoop();
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
    title: 'KeyViewLoopViewManagerExample',
    render: function(): React.Element<any> {
      return <KeyViewLoopViewManagerExample />;
    },
  },
  // {
  //   title: 'KeyViewLoopRefExample',
  //   render: function(): React.Element<any> {
  //     return <KeyViewLoopRefExample />;
  //   },
  // },
  // {
  //   title: 'KeyViewLoopExample',
  //   render: function(): React.Element<any> {
  //     return <KeyViewLoopExample />;
  //   },
  // },
  // {
  //   title: 'FocusTrapExample',
  //   render: function(): React.Element<any> {
  //     return <FocusTrapExample />;
  //   },
  // },
];
