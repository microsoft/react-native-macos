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
  const pressableRef = React.useRef<React.ElementRef<typeof Pressable> | null>(null);
  const [eventLog, setEventLog] = React.useState<Array<string>>([]);

  function appendEvent(eventName: string, source?: string) {
    const limit = 12;
    setEventLog((current: Array<string>) => {
      const prefix = source != null ? `${source}: ` : '';
      return [`${prefix}${eventName}`].concat(current.slice(0, limit - 1));
    });
  }

  const handleSingleLineKeyDown = React.useCallback(
    (e: KeyEvent) => {
      appendEvent(`keyDown: ${e.nativeEvent.key}`, 'Single-line TextInput');
    },
    [],
  );

  const handleSingleLineKeyUp = React.useCallback(
    (e: KeyEvent) => {
      appendEvent(`keyUp: ${e.nativeEvent.key}`, 'Single-line TextInput');
    },
    [],
  );

  const handleMultiLineKeyDown = React.useCallback(
    (e: KeyEvent) => {
      appendEvent(`keyDown: ${e.nativeEvent.key}`, 'Multi-line TextInput');
    },
    [],
  );

  const handleMultiLineKeyUp = React.useCallback(
    (e: KeyEvent) => {
      appendEvent(`keyUp: ${e.nativeEvent.key}`, 'Multi-line TextInput');
    },
    [],
  );

  const handlePressableKeyDown = React.useCallback(
    (e: KeyEvent) => {
      appendEvent(`keyDown: ${e.nativeEvent.key}`, 'Focusable Pressable');
    },
    [],
  );

  const handlePressableKeyUp = React.useCallback(
    (e: KeyEvent) => {
      appendEvent(`keyUp: ${e.nativeEvent.key}`, 'Focusable Pressable');
    },
    [],
  );

  return (
    <View style={{marginTop: 10}}>
      <Text style={styles.description}>
        Examples of keyboard event handling with keyDownEvents and keyUpEvents arrays. Use to suppress native handling of specific keys.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Single-line TextInput (keyDownEvents: g, Escape, Enter, ArrowLeft)
        </Text>
        <TextInput
          style={styles.styledTextInput}
          placeholder="Type here and press g, Escape, Enter, or ArrowLeft"
          placeholderTextColor="#999"
          onKeyDown={handleSingleLineKeyDown}
          onKeyUp={handleSingleLineKeyUp}
          keyDownEvents={[
            {key: 'g'},
            {key: 'Escape'},
            {key: 'Enter'},
            {key: 'ArrowLeft'},
          ]}
          keyUpEvents={[{key: 'c'}, {key: 'd'}]}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Multi-line TextInput (keyDownEvents: ArrowRight, ArrowDown, Cmd+Enter)
        </Text>
        <TextInput
          style={[styles.styledTextInput, styles.multilineInput]}
          placeholder="Multi-line input - try arrow keys and Cmd+Enter"
          placeholderTextColor="#999"
          multiline={true}
          onKeyDown={handleMultiLineKeyDown}
          onKeyUp={handleMultiLineKeyUp}
          keyDownEvents={[
            {key: 'ArrowRight'},
            {key: 'ArrowDown'},
            {key: 'Enter', metaKey: true},
          ]}
          keyUpEvents={[{key: 'Escape'}, {key: 'Enter'}]}
        />
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

const styles = StyleSheet.create({
  eventLogBox: {
    padding: 10,
    margin: 10,
    height: 300,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0f0f0',
    borderCurve: 'continuous',
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  styledTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 36,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  focusablePressable: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusablePressablePressed: {
    backgroundColor: '#e9ecef',
    borderColor: '#007AFF',
  },
  pressableText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
