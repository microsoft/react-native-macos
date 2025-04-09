/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @oncall react_native
 */

'use strict';

const PlatformAndroid = require('../Platform.android');
const PlatformIOS = require('../Platform.ios');
const PlatformMacOS = require('../Platform.macos'); // [macOS]

describe('Platform', () => {
  describe('OS', () => {
    it('should have correct value', () => {
      expect(PlatformIOS.OS).toEqual('ios');
      expect(PlatformAndroid.OS).toEqual('android');
      expect(PlatformMacOS.OS).toEqual('macos'); // [macOS]
    });
  });

  describe('select', () => {
    it('should return platform specific value', () => {
      const obj = {ios: 'ios', android: 'android', macos: 'macos'}; // [macOS]
      expect(PlatformIOS.select(obj)).toEqual(obj.ios);
      expect(PlatformAndroid.select(obj)).toEqual(obj.android);
      expect(PlatformMacOS.select(obj)).toEqual(obj.macos); // [macOS]
    });

    // [macOS
    it('should return correct platform given partial platform overrides', () => {
      const iosSpecific = {ios: 'ios', native: 'native'};
      expect(PlatformIOS.select(iosSpecific)).toEqual(iosSpecific.ios);
      expect(PlatformAndroid.select(iosSpecific)).toEqual(iosSpecific.native);
      expect(PlatformMacOS.select(iosSpecific)).toEqual(iosSpecific.native);

      const androidSpecific = {android: 'android', native: 'native'};
      expect(PlatformIOS.select(androidSpecific)).toEqual(
        androidSpecific.native,
      );
      expect(PlatformAndroid.select(androidSpecific)).toEqual(
        androidSpecific.android,
      );
      expect(PlatformMacOS.select(androidSpecific)).toEqual(
        androidSpecific.native,
      );

      const macosSpecific = {macos: 'macos', native: 'native'};
      expect(PlatformIOS.select(macosSpecific)).toEqual(macosSpecific.native);
      expect(PlatformAndroid.select(macosSpecific)).toEqual(
        macosSpecific.native,
      );
      expect(PlatformMacOS.select(macosSpecific)).toEqual(macosSpecific.macos);
    });
    // macOS]

    it('should return native value if no specific value was found', () => {
      const obj = {native: 'native', default: 'default'};
      expect(PlatformIOS.select(obj)).toEqual(obj.native);
      expect(PlatformAndroid.select(obj)).toEqual(obj.native);
      expect(PlatformMacOS.select(obj)).toEqual(obj.native); // [macOS]
    });

    it('should return default value if no specific value was found', () => {
      const obj = {default: 'default'};
      expect(PlatformIOS.select(obj)).toEqual(obj.default);
      expect(PlatformAndroid.select(obj)).toEqual(obj.default);
      expect(PlatformMacOS.select(obj)).toEqual(obj.default); // [macOS]
    });
  });
});
