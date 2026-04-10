/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {RNTesterModuleExample} from '../../types/RNTesterTypes';

import RNTesterText from '../../components/RNTesterText';
import * as React from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

function Playground() {
  const textInputRef = React.useRef<React.ElementRef<typeof TextInput> | null>(
    null,
  );
  const [refStatus, setRefStatus] = React.useState<string>('pending...');
  const [log, setLog] = React.useState<string>('');

  React.useEffect(() => {
    const status =
      textInputRef.current != null ? 'REF OK' : 'REF IS NULL';
    setRefStatus(status);
  }, []);

  const appendLog = React.useCallback((message: string) => {
    setLog(prev => (prev ? prev + '\n' : '') + message);
  }, []);

  const runCommand = React.useCallback(
    (name: string, fn: (ref: React.ElementRef<typeof TextInput>) => void) => {
      try {
        if (textInputRef.current == null) {
          appendLog(`${name}: FAILED - ref is null`);
          return;
        }
        fn(textInputRef.current);
        appendLog(`${name}: OK`);
      } catch (e: mixed) {
        const message = e instanceof Error ? e.message : String(e);
        appendLog(`${name}: ERROR - ${message}`);
      }
    },
    [appendLog],
  );

  return (
    <ScrollView style={styles.container}>
      <RNTesterText style={styles.header}>
        TextInput Ref & Commands Test
      </RNTesterText>

      <RNTesterText style={styles.status}>
        Ref status: {refStatus}
      </RNTesterText>

      <TextInput
        ref={textInputRef}
        style={styles.textInput}
        defaultValue="Hello World TextInput"
        multiline={false}
      />

      <View style={styles.buttonRow}>
        <Button
          title="Focus"
          onPress={() => runCommand('focus', ref => ref.focus())}
        />
        <Button
          title="Blur"
          onPress={() => runCommand('blur', ref => ref.blur())}
        />
        <Button
          title="Clear"
          onPress={() => runCommand('clear', ref => ref.clear())}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Set Selection (0, 5)"
          onPress={() =>
            runCommand('setSelection(0,5)', ref => ref.setSelection(0, 5))
          }
        />
        <Button
          title="isFocused?"
          onPress={() =>
            runCommand('isFocused', ref =>
              appendLog(`  -> isFocused: ${String(ref.isFocused())}`),
            )
          }
        />
      </View>

      {Platform.OS === 'macos' ? (
        <View style={styles.buttonRow}>
          <Button
            title="Set Ghost Text"
            onPress={() =>
              runCommand('setGhostText', ref =>
                // $FlowFixMe[prop-missing]
                ref.setGhostText('ghost suggestion'),
              )
            }
          />
          <Button
            title="Clear Ghost Text"
            onPress={() =>
              // $FlowFixMe[prop-missing]
              runCommand('clearGhostText', ref => ref.setGhostText(null))
            }
          />
        </View>
      ) : null}

      <Button title="Clear Log" onPress={() => setLog('')} />

      <RNTesterText style={styles.logHeader}>Log:</RNTesterText>
      <View style={styles.logContainer}>
        <RNTesterText style={styles.logText}>
          {log || '(no commands run yet)'}
        </RNTesterText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    height: 40,
    borderColor: '#999',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  logHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
  },
  logContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 8,
    minHeight: 60,
  },
  logText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'macos' ? 'Menlo' : 'monospace',
  },
});

export default ({
  title: 'Playground',
  name: 'playground',
  description:
    'TextInput ref and commands verification test for macOS Fabric.',
  render: (): React.Node => <Playground />,
}: RNTesterModuleExample);
