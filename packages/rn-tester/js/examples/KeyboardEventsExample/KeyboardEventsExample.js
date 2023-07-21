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

const React = require('react');
const ReactNative = require('react-native');
import {Platform} from 'react-native';
import type {KeyEvent} from 'react-native/Libraries/Types/CoreEventTypes';

const {Button, StyleSheet, Switch, Text, TextInput, View} = ReactNative;

const switchStyle = {
  alignItems: 'center',
  padding: 10,
  flexDirection: 'row',
  justifyContent: 'space-between',
};

function BubblingExample(): React.Node {
  const onKeyDown = e => {
    console.log(e.nativeEvent.key);
  };
  return (
    <View
      style={{padding: 20, borderColor: 'red', borderWidth: 1}}
      focusable
      keyDownEvents={[{key: 'g'}]}
      onKeyDown={onKeyDown}>
      <View
        style={{padding: 20, borderColor: 'green', borderWidth: 1}}
        focusable
        keyDownEvents={[{key: 'Tab'}]}
        onKeyDown={onKeyDown}>
        <View
          style={{padding: 20, borderColor: 'blue', borderWidth: 1}}
          focusable
          keyDownEvents={[{key: 'g'}]}
          onKeyDown={onKeyDown}
        />
      </View>
    </View>
  );
}

function KeyboardEventExample(): React.Node {
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

  const [showView, setShowView] = React.useState(true);
  const toggleShowView = React.useCallback(
    (value: boolean) => {
      setShowView(value);
    },
    [setShowView],
  );

  const [showTextInput, setShowTextInput] = React.useState(true);
  const toggleShowTextInput = React.useCallback(
    (value: boolean) => {
      setShowTextInput(value);
    },
    [setShowTextInput],
  );

  const [showTextInput2, setShowTextInput2] = React.useState(true);
  const toggleShowTextInput2 = React.useCallback(
    (value: boolean) => {
      setShowTextInput2(value);
    },
    [setShowTextInput2],
  );

  const [passthroughAllKeyEvents, setPassthroughAllKeyEvents] =
    React.useState(false);
  const toggleSwitch = React.useCallback(
    (value: boolean) => {
      setPassthroughAllKeyEvents(value);
    },
    [setPassthroughAllKeyEvents],
  );

  return (
    <View style={{padding: 10}}>
      <Text>
        Key events are called when a component detects a key press.To tab
        between views on macOS: Enable System Preferences / Keyboard / Shortcuts
        > Use keyboard navigation to move focus between controls.
      </Text>
      <View>
        {Platform.OS === 'macos' ? (
          <>
            <View style={switchStyle}>
              <Text style={styles.title}>View</Text>
              <Switch value={showView} onValueChange={toggleShowView} />
            </View>
            {showView ? (
              <>
                <Text style={styles.text}>
                  validKeysDown: [g, Escape, Enter, ArrowLeft]{'\n'}
                  validKeysUp: [c, d]
                </Text>
                <View
                  focusable={true}
                  style={styles.row}
                  passthroughAllKeyEvents={passthroughAllKeyEvents}
                  validKeysDown={['g', 'Escape', 'Enter', 'ArrowLeft']}
                  keyDownEvents={['g', 'Escape', 'Enter', 'ArrowLeft']}
                  onKeyDown={handleKeyDown}
                  validKeysUp={['c', 'd']}
                  onKeyUp={handleKeyUp}
                />
              </>
            ) : null}
            <View style={switchStyle}>
              <Text style={styles.title}>TextInput</Text>
              <Switch
                value={showTextInput}
                onValueChange={toggleShowTextInput}
              />
            </View>
            {showTextInput ? (
              <>
                <Text style={styles.text}>
                  validKeysDown: [ArrowRight, ArrowDown, Ctrl+Enter]{'\n'}
                  validKeysUp: [Escape, Enter]
                </Text>
                <TextInput
                  blurOnSubmit={false}
                  placeholder={'Singleline textInput'}
                  multiline={false}
                  focusable={true}
                  style={styles.row}
                  passthroughAllKeyEvents={passthroughAllKeyEvents}
                  validKeysDown={[
                    'ArrowRight',
                    'ArrowDown',
                    {key: 'Enter', ctrlKey: true},
                  ]}
                  keyDownEvents={[
                    {key: 'ArrowRight'},
                    {key: 'ArrowDown'},
                    {key: 'Enter', ctrlKey: true},
                  ]}
                  onKeyDown={handleKeyDown}
                  validKeysUp={['Escape', 'Enter']}
                  onKeyUp={handleKeyUp}
                />
                <TextInput
                  placeholder={'Multiline textInput'}
                  multiline={true}
                  focusable={true}
                  style={styles.row}
                  passthroughAllKeyEvents={passthroughAllKeyEvents}
                  validKeysDown={[
                    'ArrowRight',
                    'ArrowDown',
                    {key: 'Enter', ctrlKey: true},
                  ]}
                  keyDownEvents={[
                    {key: 'ArrowRight'},
                    {key: 'ArrowDown'},
                    {key: 'Enter', ctrlKey: true},
                  ]}
                  onKeyDown={handleKeyDown}
                  validKeysUp={['Escape', 'Enter']}
                  onKeyUp={handleKeyUp}
                />
              </>
            ) : null}
            <View style={switchStyle}>
              <Text style={styles.title}>TextInput with no handled keys</Text>
              <Switch
                value={showTextInput2}
                onValueChange={toggleShowTextInput2}
              />
            </View>
            {showTextInput2 ? (
              <>
                <Text style={styles.text}>
                  validKeysDown: []{'\n'}
                  validKeysUp: []
                </Text>
                <TextInput
                  blurOnSubmit={false}
                  placeholder={'Singleline textInput'}
                  multiline={false}
                  focusable={true}
                  style={styles.row}
                  passthroughAllKeyEvents={passthroughAllKeyEvents}
                  validKeysDown={[]}
                  keyDownEvents={[]}
                  onKeyDown={handleKeyDown}
                  validKeysUp={[]}
                  onKeyUp={handleKeyUp}
                />
                <TextInput
                  placeholder={'Multiline textInput'}
                  multiline={true}
                  focusable={true}
                  style={styles.row}
                  passthroughAllKeyEvents={passthroughAllKeyEvents}
                  validKeysDown={[]}
                  keyDownEvents={[]}
                  onKeyDown={handleKeyDown}
                  validKeysUp={[]}
                  onKeyUp={handleKeyUp}
                />
              </>
            ) : null}
          </>
        ) : null}
        <View style={switchStyle}>
          <Text>{'Pass through all key events'}</Text>
          <Switch
            value={passthroughAllKeyEvents}
            onValueChange={toggleSwitch}
          />
        </View>
        <Button
          testID="event_clear_button"
          onPress={clearLog}
          title="Clear event log"
        />
        <Text>{'Events:\n' + log.join('\n')}</Text>
      </View>
    </View>
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

exports.title = 'Keyboard Events';
exports.description = 'Examples that show how Key events can be used.';
exports.examples = [
  {
    title: 'Bubbling Example',
    render: function (): React.Element<any> {
      return <BubblingExample />;
    },
  },
  {
    title: 'Keyboard Event Example',
    render: function (): React.Element<any> {
      return <KeyboardEventExample />;
    },
  },
];
