/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict'; // [macOS]

import type {KeyEvent} from 'react-native/Libraries/Types/CoreEventTypes';

const React = require('react');
const ReactNative = require('react-native');

const {Button, ScrollView, StyleSheet, Text, TextInput, View} = ReactNative;

function KeyboardEventExample(): React.Node {

  const viewRef = React.useRef<View>(null);

  // $FlowFixMe[missing-empty-array-annot]
  const [log, setLog] = React.useState([]);

  const clearLog = React.useCallback(() => {
    setLog([]);
  }, [setLog]);

  const appendLog = React.useCallback(
    (line: string) => {
      const limit = 12;
      let newLog = log.slice(0, limit - 1);
      newLog.unshift(line);
      setLog(newLog);
    },
    [log, setLog],
  );

  const handleKeyDown = React.useCallback(
    (e: KeyEvent) => {
      appendLog('Key Down:' + e.nativeEvent.key);
    },
    [appendLog],
  );

  const handleKeyUp = React.useCallback(
    (e: KeyEvent) => {
      appendLog('Key Up:' + e.nativeEvent.key);
    },
    [appendLog],
  );

  const viewText =
    "keyDownEvents: [{key: 'g'}, {key: 'Escape'}, {key: 'Enter'}, {key: 'ArrowLeft'}] \nkeyUpEvents: [{key: 'c'}, {key: 'd'}]";
  const viewKeyboardProps = {
    onKeyDown: handleKeyDown,
    keyDownEvents: [
      {key: 'g'},
      {key: 'Escape'},
      {key: 'Enter'},
      {key: 'ArrowLeft'},
    ],
    onKeyUp: handleKeyUp,
    keyUpEvents: [{key: 'c'}, {key: 'd'}],
  };

  const textInputText =
    "keyDownEvents: [{key: 'ArrowRight'}, {key: 'ArrowDown'}, {key: 'Enter', ctrlKey: true}, \nkeyUpEvents: [{key: 'Escape'}, {key: 'Enter'}]";
  const textInputKeyboardProps = {
    onKeyDown: handleKeyDown,
    keyDownEvents: [
      {key: 'ArrowRight'},
      {key: 'ArrowDown'},
      {key: 'Enter', ctrlKey: true},
    ],
    onKeyUp: handleKeyUp,
    keyUpEvents: [{key: 'Escape'}, {key: 'Enter'}],
  };

  const textInputUnhandledText =
    "keyDownEvents: [{key: 'ArrowRight'}, {key: 'ArrowDown'}, {key: 'Enter', ctrlKey: true}, \nkeyUpEvents: [{key: 'Escape'}, {key: 'Enter'}]";
  const textInputunHandledKeyboardProps = {
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
  };

  React.useEffect(() => {
    // Focus the first view on mount
    viewRef.current?.focus();
  }, []);

  return (
    <ScrollView>
      <View
        style={{
          padding: 10,
        }}>
        <Text>
          Key events are called when a component detects a key press.To tab
          between views on macOS: Enable System Preferences / Keyboard /
          Shortcuts > Use keyboard navigation to move focus between controls.
        </Text>
        <View>
          <Text style={styles.text}>{viewText}</Text>
          <View
           ref={viewRef} focusable={true} style={styles.row} {...viewKeyboardProps} />
          <Text style={styles.text}>{textInputText}</Text>
          <TextInput
            blurOnSubmit={false}
            placeholder={'Singleline textInput'}
            multiline={false}
            focusable={true}
            style={styles.row}
            {...textInputKeyboardProps}
          />
          <TextInput
            placeholder={'Multiline textInput'}
            multiline={true}
            focusable={true}
            style={styles.row}
            {...textInputKeyboardProps}
          />
          <Text style={styles.text}>{textInputUnhandledText}</Text>
          <TextInput
            blurOnSubmit={false}
            placeholder={'Singleline textInput'}
            multiline={false}
            focusable={true}
            style={styles.row}
            {...textInputunHandledKeyboardProps}
          />
          <TextInput
            placeholder={'Multiline textInput'}
            multiline={true}
            focusable={true}
            style={styles.row}
            {...textInputunHandledKeyboardProps}
          />
          <Button
            testID="event_clear_button"
            onPress={clearLog}
            title="Clear event log"
          />
          <Text>{'Events:\n' + log.join('\n')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 36,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: 'grey',
    padding: 10,
  },
  title: {
    fontSize: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  text: {
    fontSize: 12,
    paddingBottom: 4,
  },
});

exports.title = 'Key Events';
exports.description = 'Examples that show how Key events can be used.';
exports.examples = [
  {
    title: 'Keyboard Event Example',
    render: function (): React.Node {
      return <KeyboardEventExample />;
    },
  },
];
