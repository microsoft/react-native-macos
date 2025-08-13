/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {HostInstance} from '../../../src/private/types/HostInstance';
import type {EventSubscription} from '../../vendor/emitter/EventEmitter';

import RCTDeviceEventEmitter from '../../EventEmitter/RCTDeviceEventEmitter';
import {sendAccessibilityEvent} from '../../ReactNative/RendererProxy';
import Platform from '../../Utilities/Platform';
import legacySendAccessibilityEvent from './legacySendAccessibilityEvent';
import NativeAccessibilityInfoAndroid from './NativeAccessibilityInfo';
import NativeAccessibilityManagerApple from './NativeAccessibilityManager'; // [macOS]

// Events that are only supported on Android.
type AccessibilityEventDefinitionsAndroid = {
  accessibilityServiceChanged: [boolean],
  highTextContrastChanged: [boolean],
};

// Events that are only supported on iOS.
type AccessibilityEventDefinitionsIOS = {
  announcementFinished: [{announcement: string, success: boolean}],
  boldTextChanged: [boolean],
  grayscaleChanged: [boolean],
  invertColorsChanged: [boolean],
  reduceTransparencyChanged: [boolean],
  darkerSystemColorsChanged: [boolean],
};

// [macOS
// Events that are only supported on macOS.
type AccessibilityEventDefinitionsMacOS = {
  highContrastChanged: [boolean], // [macOS] highContrastChanged is used on macOS
};
// macOS]

type AccessibilityEventDefinitions = {
  ...AccessibilityEventDefinitionsAndroid,
  ...AccessibilityEventDefinitionsIOS,
  ...AccessibilityEventDefinitionsMacOS, // [macOS]
  change: [boolean], // screenReaderChanged
  reduceMotionChanged: [boolean],
  screenReaderChanged: [boolean],
};

type AccessibilityEventTypes = 'click' | 'focus' | 'viewHoverEnter';

// Mapping of public event names to platform-specific event names.
const EventNames: Map<
  $Keys<AccessibilityEventDefinitions>,
  string,
> = Platform.OS === 'android'
  ? new Map([
      ['change', 'touchExplorationDidChange'],
      ['reduceMotionChanged', 'reduceMotionDidChange'],
      ['highTextContrastChanged', 'highTextContrastDidChange'],
      ['screenReaderChanged', 'touchExplorationDidChange'],
      ['accessibilityServiceChanged', 'accessibilityServiceDidChange'],
      ['invertColorsChanged', 'invertColorDidChange'],
      ['grayscaleChanged', 'grayscaleModeDidChange'],
    ])
  : new Map([
      ['announcementFinished', 'announcementFinished'],
      ['boldTextChanged', 'boldTextChanged'],
      ['change', 'screenReaderChanged'],
      ['grayscaleChanged', 'grayscaleChanged'],
      ['invertColorsChanged', 'invertColorsChanged'],
      ['reduceMotionChanged', 'reduceMotionChanged'],
      ['reduceTransparencyChanged', 'reduceTransparencyChanged'],
      ['screenReaderChanged', 'screenReaderChanged'],
      ['darkerSystemColorsChanged', 'darkerSystemColorsChanged'],
      ['highContrastChanged', 'highContrastChanged'], // [macOS]
    ]);

/**
 * Sometimes it's useful to know whether or not the device has a screen reader
 * that is currently active. The `AccessibilityInfo` API is designed for this
 * purpose. You can use it to query the current state of the screen reader as
 * well as to register to be notified when the state of the screen reader
 * changes.
 *
 * See https://reactnative.dev/docs/accessibilityinfo
 */
const AccessibilityInfo = {
  /**
   * Query whether bold text is currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when bold text is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#isBoldTextEnabled
   */
  isBoldTextEnabled(): Promise<boolean> {
    // [macOS rework logic to return Promise.resolve(false) on macOS
    if (Platform.OS === 'ios') {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityManagerApple != null) {
          NativeAccessibilityManagerApple.getCurrentBoldTextState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      });
    } else {
      return Promise.resolve(false);
    }
    // macOS]
  },

  /**
   * Query whether grayscale is currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when grayscale is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#isGrayscaleEnabled
   */
  isGrayscaleEnabled(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityInfoAndroid?.isGrayscaleEnabled != null) {
          NativeAccessibilityInfoAndroid.isGrayscaleEnabled(resolve);
        } else {
          reject(null);
        }
      });
    } else {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityManagerApple != null) {
          NativeAccessibilityManagerApple.getCurrentGrayscaleState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      });
    }
  },

  // [macOS
  /**
   * macOS only
   */
  isHighContrastEnabled: function (): Promise<boolean> {
    if (Platform.OS === 'macos' || Platform.OS === 'ios') {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityManagerApple) {
          NativeAccessibilityManagerApple.getCurrentHighContrastState(
            resolve,
            reject,
          );
        } else {
          reject(reject);
        }
      });
    } else {
      return Promise.resolve(false);
    }
  },
  // macOS]

  /**
   * Query whether inverted colors are currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when invert color is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#isInvertColorsEnabled
   */
  isInvertColorsEnabled(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityInfoAndroid?.isInvertColorsEnabled != null) {
          NativeAccessibilityInfoAndroid.isInvertColorsEnabled(resolve);
        } else {
          reject(null);
        }
      });
    } else {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityManagerApple != null) {
          NativeAccessibilityManagerApple.getCurrentInvertColorsState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      });
    }
  },

  /**
   * Query whether reduced motion is currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when a reduce motion is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#isReduceMotionEnabled
   */
  isReduceMotionEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        if (NativeAccessibilityInfoAndroid != null) {
          NativeAccessibilityInfoAndroid.isReduceMotionEnabled(resolve);
        } else {
          reject(null);
        }
      } else {
        if (NativeAccessibilityManagerApple != null) {
          NativeAccessibilityManagerApple.getCurrentReduceMotionState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      }
    });
  },

  /**
   * Query whether high text contrast is currently enabled. Android only.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when high text contrast is enabled and `false` otherwise.
   */
  isHighTextContrastEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        if (NativeAccessibilityInfoAndroid?.isHighTextContrastEnabled != null) {
          NativeAccessibilityInfoAndroid.isHighTextContrastEnabled(resolve);
        } else {
          reject(null);
        }
      } else {
        return Promise.resolve(false);
      }
    });
  },

  /**
   * Query whether dark system colors is currently enabled. iOS only.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when dark system colors is enabled and `false` otherwise.
   */
  isDarkerSystemColorsEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        return Promise.resolve(false);
      } else {
        if (
          NativeAccessibilityManagerApple?.getCurrentDarkerSystemColorsState !=
          null
        ) {
          NativeAccessibilityManagerApple.getCurrentDarkerSystemColorsState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      }
    });
  },

  /**
   * Query whether reduce motion and prefer cross-fade transitions settings are currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when  prefer cross-fade transitions is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#prefersCrossFadeTransitions
   */
  prefersCrossFadeTransitions(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        return Promise.resolve(false);
      } else {
        if (
          NativeAccessibilityManagerApple?.getCurrentPrefersCrossFadeTransitionsState != // [macOS]
          null
        ) {
          // [macOS]
          NativeAccessibilityManagerApple.getCurrentPrefersCrossFadeTransitionsState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      }
    });
  },

  /**
   * Query whether reduced transparency is currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when a reduce transparency is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#isReduceTransparencyEnabled
   */
  isReduceTransparencyEnabled(): Promise<boolean> {
    // [macOS rework logic to return Promise.resolve(false) on macOS
    if (Platform.OS === 'ios') {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityManagerApple != null) {
          NativeAccessibilityManagerApple.getCurrentReduceTransparencyState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      });
    } else {
      return Promise.resolve(false);
    }
    // macOS]
  },

  /**
   * Query whether a screen reader is currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when a screen reader is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#isScreenReaderEnabled
   */
  isScreenReaderEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        if (NativeAccessibilityInfoAndroid != null) {
          NativeAccessibilityInfoAndroid.isTouchExplorationEnabled(resolve);
        } else {
          reject(null);
        }
      } else {
        if (NativeAccessibilityManagerApple != null) {
          NativeAccessibilityManagerApple.getCurrentVoiceOverState(
            resolve,
            reject,
          );
        } else {
          reject(null);
        }
      }
    });
  },

  /**
   * Query whether Accessibility Service is currently enabled.
   *
   * Returns a promise which resolves to a boolean.
   * The result is `true` when any service is enabled and `false` otherwise.
   *
   * @platform android
   *
   * See https://reactnative.dev/docs/accessibilityinfo/#isaccessibilityserviceenabled-android
   */
  isAccessibilityServiceEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android') {
        if (
          NativeAccessibilityInfoAndroid != null &&
          NativeAccessibilityInfoAndroid.isAccessibilityServiceEnabled != null
        ) {
          NativeAccessibilityInfoAndroid.isAccessibilityServiceEnabled(resolve);
        } else {
          reject(null);
        }
      } else {
        reject(null);
      }
    });
  },

  /**
   * Add an event handler. Supported events:
   *
   * - `reduceMotionChanged`: Fires when the state of the reduce motion toggle changes.
   *   The argument to the event handler is a boolean. The boolean is `true` when a reduce
   *   motion is enabled (or when "Transition Animation Scale" in "Developer options" is
   *   "Animation off") and `false` otherwise.
   * - `screenReaderChanged`: Fires when the state of the screen reader changes. The argument
   *   to the event handler is a boolean. The boolean is `true` when a screen
   *   reader is enabled and `false` otherwise.
   *
   * These events are only supported on iOS:
   *
   * - `boldTextChanged`: iOS-only event. Fires when the state of the bold text toggle changes.
   *   The argument to the event handler is a boolean. The boolean is `true` when a bold text
   *   is enabled and `false` otherwise.
   * - `grayscaleChanged`: iOS-only event. Fires when the state of the gray scale toggle changes.
   *   The argument to the event handler is a boolean. The boolean is `true` when a gray scale
   *   is enabled and `false` otherwise.
   * - `invertColorsChanged`: iOS-only event. Fires when the state of the invert colors toggle
   *   changes. The argument to the event handler is a boolean. The boolean is `true` when a invert
   *   colors is enabled and `false` otherwise.
   * - `reduceTransparencyChanged`: iOS-only event. Fires when the state of the reduce transparency
   *   toggle changes.  The argument to the event handler is a boolean. The boolean is `true`
   *   when a reduce transparency is enabled and `false` otherwise.
   * - `announcementFinished`: iOS-only event. Fires when the screen reader has
   *   finished making an announcement. The argument to the event handler is a
   *   dictionary with these keys:
   *     - `announcement`: The string announced by the screen reader.
   *     - `success`: A boolean indicating whether the announcement was
   *       successfully made.
   * - `darkerSystemColorsChanged`: iOS-only event. Fires when the state of the dark system colors
   *   toggle changes. The argument to the event handler is a boolean. The boolean is `true` when
   *   dark system colors is enabled and `false` otherwise.
   *
   * These events are only supported on Android:
   *
   * - `highTextContrastChanged`: Android-only event. Fires when the state of the high text contrast
   *   toggle changes. The argument to the event handler is a boolean. The boolean is `true` when
   *   high text contrast is enabled and `false` otherwise.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#addeventlistener
   */
  addEventListener<K: $Keys<AccessibilityEventDefinitions>>(
    eventName: K,
    // $FlowIssue[incompatible-type] - Flow bug with unions and generics (T128099423)
    handler: (...$ElementType<AccessibilityEventDefinitions, K>) => void,
  ): EventSubscription {
    const deviceEventName = EventNames.get(eventName);
    return deviceEventName == null
      ? {remove(): void {}}
      : // $FlowFixMe[incompatible-call]
        RCTDeviceEventEmitter.addListener(deviceEventName, handler);
  },

  /**
   * Set accessibility focus to a React component.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#setaccessibilityfocus
   */
  setAccessibilityFocus(reactTag: number): void {
    legacySendAccessibilityEvent(reactTag, 'focus');
  },

  /**
   * Send a named accessibility event to a HostComponent.
   */
  sendAccessibilityEvent(
    handle: HostInstance,
    eventType: AccessibilityEventTypes,
  ) {
    // iOS only supports 'focus' event types
    if (Platform.OS === 'ios' && eventType === 'click') {
      return;
    }
    // route through React renderer to distinguish between Fabric and non-Fabric handles
    sendAccessibilityEvent(handle, eventType);
  },

  /**
   * Post a string to be announced by the screen reader.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#announceforaccessibility
   */
  announceForAccessibility(announcement: string): void {
    if (Platform.OS === 'android') {
      NativeAccessibilityInfoAndroid?.announceForAccessibility(announcement);
    } else {
      NativeAccessibilityManagerApple?.announceForAccessibility(announcement); // [macOS]
    }
  },

  /**
   * Post a string to be announced by the screen reader.
   * - `announcement`: The string announced by the screen reader.
   * - `options`: An object that configures the reading options.
   *   - `queue`: The announcement will be queued behind existing announcements. iOS only.
   */
  announceForAccessibilityWithOptions(
    announcement: string,
    options: {queue?: boolean},
  ): void {
    if (Platform.OS === 'android') {
      NativeAccessibilityInfoAndroid?.announceForAccessibility(announcement);
    } else {
      // [macOS NativeAccessibilityManagerApple -> NativeAccessibilityManagerApple
      if (
        NativeAccessibilityManagerApple?.announceForAccessibilityWithOptions
      ) {
        NativeAccessibilityManagerApple?.announceForAccessibilityWithOptions(
          announcement,
          options,
        );
      } else {
        NativeAccessibilityManagerApple?.announceForAccessibility(announcement);
      }
      // macOS]
    }
  },

  /**
   * Get the recommended timeout for changes to the UI needed by this user.
   *
   * See https://reactnative.dev/docs/accessibilityinfo#getrecommendedtimeoutmillis
   */
  getRecommendedTimeoutMillis(originalTimeout: number): Promise<number> {
    if (Platform.OS === 'android') {
      return new Promise((resolve, reject) => {
        if (NativeAccessibilityInfoAndroid?.getRecommendedTimeoutMillis) {
          NativeAccessibilityInfoAndroid.getRecommendedTimeoutMillis(
            originalTimeout,
            resolve,
          );
        } else {
          resolve(originalTimeout);
        }
      });
    } else {
      return Promise.resolve(originalTimeout);
    }
  },
};

export default AccessibilityInfo;
