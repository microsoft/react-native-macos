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
import {Platform, PlatformColor, StyleSheet, View} from 'react-native';
import {DynamicColorMacOS} from 'react-native'; // [macOS]

function ColorSwatch({
  color,
  label,
}: {
  color: ReturnType<typeof PlatformColor>,
  label: string,
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.swatch, {backgroundColor: color}]} />
      <RNTesterText style={styles.label}>{label}</RNTesterText>
    </View>
  );
}

function Playground() {
  if (Platform.OS !== 'macos') {
    return (
      <View style={styles.container}>
        <RNTesterText>This test is macOS-only.</RNTesterText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNTesterText style={styles.heading}>
        Fabric Dark Mode Color Test
      </RNTesterText>
      <RNTesterText style={styles.description}>
        These colors should change when you toggle between Light and Dark
        appearance in System Settings. If they all look the same in both modes,
        the bug is not fixed.
      </RNTesterText>

      <RNTesterText style={styles.sectionTitle}>System Colors</RNTesterText>
      <ColorSwatch
        color={PlatformColor('systemBlueColor')}
        label="systemBlueColor"
      />
      <ColorSwatch
        color={PlatformColor('systemRedColor')}
        label="systemRedColor"
      />
      <ColorSwatch
        color={PlatformColor('systemGreenColor')}
        label="systemGreenColor"
      />
      <ColorSwatch
        color={PlatformColor('systemOrangeColor')}
        label="systemOrangeColor"
      />

      <RNTesterText style={styles.sectionTitle}>Semantic Colors</RNTesterText>
      <ColorSwatch
        color={PlatformColor('labelColor')}
        label="labelColor"
      />
      <ColorSwatch
        color={PlatformColor('secondaryLabelColor')}
        label="secondaryLabelColor"
      />
      <ColorSwatch
        color={PlatformColor('windowBackgroundColor')}
        label="windowBackgroundColor"
      />
      <ColorSwatch
        color={PlatformColor('controlBackgroundColor')}
        label="controlBackgroundColor"
      />
      <ColorSwatch
        color={PlatformColor('textColor')}
        label="textColor"
      />
      <ColorSwatch
        color={PlatformColor('separatorColor')}
        label="separatorColor"
      />

      <RNTesterText style={styles.sectionTitle}>
        DynamicColorMacOS
      </RNTesterText>
      <ColorSwatch
        color={DynamicColorMacOS({light: '#FF0000', dark: '#00FF00'})}
        label="light=red, dark=green"
      />
      <ColorSwatch
        color={DynamicColorMacOS({light: '#0000FF', dark: '#FFFF00'})}
        label="light=blue, dark=yellow"
      />

      <RNTesterText style={styles.sectionTitle}>
        Background + Text Test
      </RNTesterText>
      <View
        style={[
          styles.textBox,
          {backgroundColor: PlatformColor('windowBackgroundColor')},
        ]}>
        <RNTesterText style={{color: PlatformColor('labelColor')}}>
          This text should be readable in both light and dark mode
        </RNTesterText>
      </View>
      <View
        style={[
          styles.textBox,
          {backgroundColor: PlatformColor('controlBackgroundColor')},
        ]}>
        <RNTesterText style={{color: PlatformColor('controlTextColor')}}>
          controlTextColor on controlBackgroundColor
        </RNTesterText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    marginBottom: 12,
    color: 'gray',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  swatch: {
    width: 40,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  label: {
    fontSize: 12,
  },
  textBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
});

export default ({
  title: 'Playground',
  name: 'playground',
  description: 'Test out new features and ideas.',
  render: (): React.Node => <Playground />,
}: RNTesterModuleExample);
