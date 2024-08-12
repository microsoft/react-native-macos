/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import RNTesterComponentTitle from './RNTesterComponentTitle';
import {RNTesterThemeContext} from './RNTesterTheme';
import * as React from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';

type ViewStyleProp = $ElementType<React.ElementConfig<typeof View>, 'style'>;
type Props = {
  accessibilityLabel?: ?string,
  testID?: ?string,
  onPressIn?: ?() => mixed,
  onPressOut?: ?() => mixed,
  bottomAddOn?: ?React.Node,
  children?: ?React.Node,
  title: string,
  description?: ?string,
  onPress: () => mixed,
  style?: ViewStyleProp | ((pressed: boolean) => ViewStyleProp),
};

export default function RNTPressableRow({
  onPressIn,
  onPressOut,
  title,
  description,
  bottomAddOn,
  onPress,
  style,
  accessibilityLabel,
}: Props): React.Node {
  const theme = React.useContext(RNTesterThemeContext);
  const label = accessibilityLabel ?? `${title} ${description ?? ''}`;
  return (
    <Pressable
      testID={title}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={label}
      style={({pressed}) => [
        styles.row,
        typeof style === 'function' ? style(pressed) : style,
        pressed
          ? {backgroundColor: theme.SecondarySystemFillColor}
          : {backgroundColor: theme.SecondaryGroupedBackgroundColor},
      ]}
      onPress={onPress}>
      <View style={styles.topRowStyle}>
        <RNTesterComponentTitle>{title}</RNTesterComponentTitle>
      </View>
      <Text
        style={[styles.descriptionText, {color: theme.SecondaryLabelColor}]}>
        {description}
      </Text>
      {bottomAddOn}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginVertical: Platform.select({ios: 4, android: 8, macos: 4}), // [macOS]
    marginHorizontal: 15,
    overflow: 'hidden',
    elevation: 5,
    // [macOS
    backgroundColor: Platform.select({
      ios: '#FFFFFF',
      android: '#F3F8FF',
      macos: '#FFFFFF',
    }),
    // macOS]
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 5,
  },
  pressed: {
    elevation: 3,
  },
  topRowStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
});
