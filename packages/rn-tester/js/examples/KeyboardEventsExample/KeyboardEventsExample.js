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

import * as React from 'react';

import {
  Button,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

function BubblingExample(): React.Node {
  const ref = React.useRef<React.ElementRef<typeof Pressable> | null>(null);
  const [eventLog, setEventLog] = React.useState<Array<string>>([]);
  const [stopPropagationEnabled, setStopPropagationEnabled] =
    React.useState<boolean>(false);

  function appendEvent(eventName: string, source?: string) {
    const limit = 12;
    setEventLog((current: Array<string>) => {
      const prefix = source != null ? `${source}: ` : '';
      return [`${prefix}${eventName}`].concat(current.slice(0, limit - 1));
    });
  }

  return (
    <View style={{marginTop: 10}}>
      <View
        style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
        <Text style={{marginRight: 8}}>Stop Propagation in Box 2:</Text>
        <Switch
          value={stopPropagationEnabled}
          onValueChange={(value: boolean) => setStopPropagationEnabled(value)}
        />
      </View>
      <View
        style={styles.boxOuter}
        nativeID="Box 3"
        onKeyDown={ev => {
          appendEvent(`keyDown: ${ev.nativeEvent.key}`, 'Box 3');
        }}>
        <View
          style={styles.boxMiddle}
          nativeID="Box 2"
          onKeyDown={ev => {
            appendEvent(
              `keyDown: ${ev.nativeEvent.key}`,
              'Box 2 keyDownEvents=[f,g]',
            );
            if (stopPropagationEnabled) {
              ev.stopPropagation();
              appendEvent('stopPropagation called', 'Box 2');
            }
          }}
          keyDownEvents={[{key: 'f'}, {key: 'g'}]}>
          <View
            style={styles.boxInner}
            nativeID="Box 1"
            onKeyDown={ev => {
              appendEvent(`keyDown: ${ev.nativeEvent.key}`, 'Box 1');
            }}>
            <View style={[styles.centered]}>
              <Pressable
                ref={ref}
                style={({pressed}) => [
                  styles.focusBox,
                  pressed && styles.focusBoxPressed,
                ]}
                nativeID="keyboard_events_focusable"
                focusable={true}
                onPress={() => {
                  ref.current?.focus();
                }}
                onKeyDown={ev => {
                  appendEvent(`keyDown: ${ev.nativeEvent.key}`, 'Focusable');
                  if (
                    ev.nativeEvent.key === 'k' &&
                    ev.nativeEvent.metaKey === true
                  ) {
                    appendEvent('Key command: Clear event log', 'Focusable');
                    setTimeout(() => {
                      setEventLog([]);
                    }, 0);
                  }
                }}>
                <Text style={styles.button}>Click to Focus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View testID="keyboard_events_example_console" style={styles.eventLogBox}>
        <View style={styles.logHeaderRow}>
          <Text style={styles.logHeader}>Event Log</Text>
          <Pressable
            style={({pressed}) => [
              styles.clearButton,
              pressed && styles.clearButtonPressed,
            ]}
            onPress={() => setEventLog([])}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
        {eventLog.map((e, ii) => (
          <Text key={ii} style={styles.logEntry}>
            {e}
          </Text>
        ))}
      </View>
    </View>
  );
}

function KeyboardEventExample(): React.Node {
  const viewRef = React.useRef<React.ElementRef<typeof View> | null>(null);
  const [log, setLog] = React.useState<Array<string>>([]);

  const clearLog = React.useCallback(() => {
    setLog([]);
  }, [setLog]);

  const appendLog = React.useCallback(
    (line: string) => {
      const limit = 12;
      const newLog = log.slice(0, limit - 1);
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
    <View
      style={{
        padding: 10,
      }}>
      <Text>
        Key events are called when a component detects a key press.To tab
        between views on macOS: Enable System Preferences / Keyboard / Shortcuts{' '}
        {'>'} Use keyboard navigation to move focus between controls.
      </Text>
      <View>
        <Text style={styles.text}>{viewText}</Text>
        <View
          ref={viewRef}
          focusable={true}
          style={styles.input}
          {...viewKeyboardProps}
        />
        <Text style={styles.text}>{textInputText}</Text>
        <TextInput
          blurOnSubmit={false}
          placeholder={'Singleline textInput'}
          multiline={false}
          focusable={true}
          style={styles.input}
          {...textInputKeyboardProps}
        />
        <TextInput
          placeholder={'Multiline textInput'}
          multiline={true}
          focusable={true}
          style={styles.input}
          {...textInputKeyboardProps}
        />
        <Text style={styles.text}>{textInputUnhandledText}</Text>
        <TextInput
          blurOnSubmit={false}
          placeholder={'Singleline textInput'}
          multiline={false}
          focusable={true}
          style={styles.input}
          {...textInputunHandledKeyboardProps}
        />
        <TextInput
          placeholder={'Multiline textInput'}
          multiline={true}
          focusable={true}
          style={styles.input}
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
  );
}

const styles = StyleSheet.create({
  eventLogBox: {
    padding: 10,
    margin: 10,
    height: 300,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  logHeader: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  logEntry: {
    fontSize: 12,
    marginVertical: 2,
  },
  // Box styles for nesting
  boxOuter: {
    padding: 8,
    margin: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c0392b',
    borderRadius: 6,
    backgroundColor: '#fff6f6',
  },
  boxMiddle: {
    padding: 8,
    margin: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e67e22',
    borderRadius: 6,
    backgroundColor: '#fff9f0',
  },
  boxInner: {
    padding: 8,
    margin: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27ae60',
    borderRadius: 6,
    backgroundColor: '#f6fff6',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  button: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  focusBoxPressed: {
    backgroundColor: '#0051c7',
  },
  clearButtonPressed: {
    backgroundColor: '#c8c8c8',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#007AFF',
  },
  input: {
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
    render: function (): React.Node {
      return <BubblingExample />;
    },
  },
  {
    title: 'keyDownEvents / keyUpEvents',
    render: function (): React.Node {
      return <KeyboardEventExample />;
    },
  },
];
