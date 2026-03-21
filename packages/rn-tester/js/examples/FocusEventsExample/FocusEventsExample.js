/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

// [macOS]

import type {RNTesterModule} from '../../types/RNTesterTypes';

import * as React from 'react';
import {useState} from 'react';
import {
  Button,
  Platform,
  PlatformColor,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const FocusEventExample = (): React.Node => {
  const [eventStream, setEventStream] = useState('');

  const appendEvent = (eventName: string) => {
    setEventStream(prev => prev + '\n' + eventName);
  };

  return (
    <View>
      <Text>
        Focus events are called when a component receives or loses focus. This
        can be acquired by manually focusing components
        {Platform.OS === 'macos' ? ' or using tab-based nav' : ''}
      </Text>
      <View>
        <TextInput
          onFocus={() => appendEvent('TextInput Focus')}
          onBlur={() => appendEvent('TextInput Blur')}
          placeholder={'TextInput'}
          placeholderTextColor={
            Platform.OS === 'macos' ? PlatformColor('textColor') : 'black'
          }
          style={styles.textInput}
        />

        {
          // Only test View on MacOS, since canBecomeFirstResponder is false on all iOS, therefore we can't focus
          Platform.OS === 'macos' ? (
            <View
              focusable={true}
              onFocus={() => appendEvent('View Focus')}
              onBlur={() => appendEvent('View Blur')}>
              <Text>Focusable View</Text>
            </View>
          ) : null
        }

        <View
          onFocus={() =>
            appendEvent('Nested Singleline TextInput Parent Focus')
          }
          onBlur={() => appendEvent('Nested Singleline TextInput Parent Blur')}>
          <TextInput
            onFocus={() => appendEvent('Nested Singleline TextInput Focus')}
            onBlur={() => appendEvent('Nested Singleline TextInput Blur')}
            style={styles.textInput}
            placeholder={'Nested Singleline TextInput'}
            placeholderTextColor={
              Platform.OS === 'macos' ? PlatformColor('textColor') : 'black'
            }
          />
        </View>

        {
          // Only test View on MacOS, since canBecomeFirstResponder is false on all iOS, therefore we can't focus
          Platform.OS === 'macos' ? (
            <View>
              <View
                onFocus={() => appendEvent('Descendent Button Focus')}
                onBlur={() => appendEvent('Descendent Button Blur')}>
                <View>
                  <Button
                    title="Button whose ancestor has onFocus/onBlur"
                    onPress={() => {}}
                  />
                </View>
              </View>
              <View
                onFocus={() => appendEvent('Descendent Button Focus')}
                onBlur={() => appendEvent('Descendent Button Blur')}>
                <View>
                  <Button
                    title="Button with onFocus/onBlur and ancestor has onFocus/onBlur"
                    onPress={() => {}}
                    onFocus={() => appendEvent('Button Focus')}
                    onBlur={() => appendEvent('Button Blur')}
                  />
                </View>
              </View>
              <View
                onFocus={() => appendEvent('Descendent Text Focus')}
                onBlur={() => appendEvent('Descendent Text Blur')}>
                <View>
                  <Text selectable={true}>Selectable text</Text>
                </View>
              </View>
              <View
                onFocus={() => appendEvent('Nested View Parent Focus')}
                onBlur={() => appendEvent('Nested View Parent Blur')}>
                <View
                  focusable={true}
                  onFocus={() => appendEvent('Nested View Focus')}
                  onBlur={() => appendEvent('Nested View Blur')}>
                  <Text>Nested Focusable View</Text>
                </View>
              </View>
            </View>
          ) : null
        }

        <View
          onFocus={() => appendEvent('Nested Multiline TextInput Parent Focus')}
          onBlur={() => appendEvent('Nested Multiline TextInput Parent Blur')}>
          <TextInput
            onFocus={() => appendEvent('Nested Multiline TextInput Focus')}
            onBlur={() => appendEvent('Nested Multiline TextInput Blur')}
            style={styles.textInput}
            multiline={true}
            placeholder={'Nested Multiline TextInput'}
            placeholderTextColor={
              Platform.OS === 'macos' ? PlatformColor('textColor') : 'black'
            }
          />
        </View>

        <Text>{'Events: ' + eventStream + '\n\n'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  textInput: {
    ...Platform.select({
      macos: {
        color: PlatformColor('textColor'),
        backgroundColor: PlatformColor('textBackgroundColor'),
        borderColor: PlatformColor('gridColor'),
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

export default ({
  title: 'Focus Events',
  description: 'Examples that show how Focus events can be used.',
  examples: [
    {
      title: 'FocusEventExample',
      render: function (): React.Node {
        return <FocusEventExample />;
      },
    },
  ],
}: RNTesterModule);
