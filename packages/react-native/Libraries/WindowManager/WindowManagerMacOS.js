/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {EventSubscription} from '../vendor/emitter/EventEmitter';

import NativeEventEmitter from '../EventEmitter/NativeEventEmitter';
import NativeWindowManagerMacOS from './NativeWindowManagerMacOS';

export type WindowOptions = {
  +moduleName: string,
  +key?: ?string,
  // $FlowFixMe[unclear-type] unclear type of arbitrary initial props
  +initialProps?: ?Object,
  +title?: ?string,
  +width?: ?number,
  +height?: ?number,
  +minWidth?: ?number,
  +minHeight?: ?number,
  +x?: ?number,
  +y?: ?number,
  +resizable?: ?boolean,
  +closable?: ?boolean,
  +minimizable?: ?boolean,
  +titlebarAppearsTransparent?: ?boolean,
  +hidesOnDeactivate?: ?boolean,
  +alwaysOnTop?: ?boolean,
  +rememberFrame?: ?boolean,
  +focus?: ?boolean,
};

export type WindowInfo = {
  +key: string,
  +moduleName: string,
  +title: string,
  +width: number,
  +height: number,
  +x: number,
  +y: number,
  +isKey: boolean,
  +isVisible: boolean,
};

type WindowManagerEventMap = {
  windowDidOpen: [WindowInfo],
  windowDidClose: [{key: string, moduleName: string}],
  windowDidFocus: [WindowInfo],
  windowDidBlur: [WindowInfo],
  windowDidResize: [WindowInfo],
};

function rejectNotSupported<T>(): Promise<T> {
  return Promise.reject(
    new Error('WindowManagerMacOS is only available on macOS'),
  );
}

/**
 * `WindowManagerMacOS` lets you open additional NSWindows, each hosting its
 * own React root, from JavaScript.
 *
 * First register the component you want to display in a window, just like
 * any other app key:
 *
 *   AppRegistry.registerComponent('Settings', () => SettingsScreen);
 *
 * Then open a window for it:
 *
 *   WindowManagerMacOS.open({
 *     moduleName: 'Settings',
 *     title: 'Settings',
 *     width: 480,
 *     height: 360,
 *   });
 *
 * All windows share a single bridge and JavaScript runtime, so plain module
 * state (or any store) is visible to every window. Note that
 * `Dimensions`/`useWindowDimensions` still report the app's key window, not
 * the window a given root is rendered into.
 */
class WindowManagerMacOS {
  /**
   * Whether the native module backing this API is present. It is only ever
   * true on macOS.
   */
  isSupported: boolean = NativeWindowManagerMacOS != null;

  _emitter: ?NativeEventEmitter<WindowManagerEventMap> = null;

  /**
   * The emitter is created lazily and never in the constructor: on iOS and
   * macOS `new NativeEventEmitter()` asserts on a null module, so building it
   * eagerly would make merely importing this module throw on every platform
   * that has no window manager — defeating the `isSupported` check below.
   */
  _getEmitter(): NativeEventEmitter<WindowManagerEventMap> {
    let emitter = this._emitter;
    if (emitter == null) {
      if (NativeWindowManagerMacOS == null) {
        throw new Error('WindowManagerMacOS is only available on macOS');
      }
      emitter = new NativeEventEmitter<WindowManagerEventMap>(
        NativeWindowManagerMacOS,
      );
      this._emitter = emitter;
    }
    return emitter;
  }

  /**
   * Subscribe to window lifecycle events. Throws on platforms where
   * `isSupported` is false.
   */
  addListener<TEvent: $Keys<WindowManagerEventMap>>(
    eventType: TEvent,
    listener: (...args: WindowManagerEventMap[TEvent]) => mixed,
    context?: mixed,
  ): EventSubscription {
    return this._getEmitter().addListener(eventType, listener, context);
  }

  removeAllListeners<TEvent: $Keys<WindowManagerEventMap>>(
    eventType: ?TEvent,
  ): void {
    if (this._emitter != null) {
      this._emitter.removeAllListeners(eventType);
    }
  }

  /**
   * Open a new window hosting `options.moduleName`. If a window with the
   * same `key` (defaulting to `moduleName`) already exists, it is focused
   * and its current info is resolved instead of opening a new window.
   */
  open(options: WindowOptions): Promise<WindowInfo> {
    if (NativeWindowManagerMacOS == null) {
      return rejectNotSupported();
    }
    return NativeWindowManagerMacOS.open(options);
  }

  /**
   * Close the window registered under `key`.
   */
  close(key: string): Promise<boolean> {
    if (NativeWindowManagerMacOS == null) {
      return rejectNotSupported();
    }
    return NativeWindowManagerMacOS.close(key);
  }

  /**
   * Bring the window registered under `key` to the front.
   */
  focus(key: string): Promise<boolean> {
    if (NativeWindowManagerMacOS == null) {
      return rejectNotSupported();
    }
    return NativeWindowManagerMacOS.focus(key);
  }

  /**
   * Update the title of the window registered under `key`.
   */
  setTitle(key: string, title: string): Promise<boolean> {
    if (NativeWindowManagerMacOS == null) {
      return rejectNotSupported();
    }
    return NativeWindowManagerMacOS.setTitle(key, title);
  }

  /**
   * Whether a window is currently open for `key`.
   */
  isOpen(key: string): Promise<boolean> {
    if (NativeWindowManagerMacOS == null) {
      return Promise.resolve(false);
    }
    return NativeWindowManagerMacOS.isOpen(key);
  }

  /**
   * Info for all currently open windows.
   */
  getWindows(): Promise<Array<WindowInfo>> {
    if (NativeWindowManagerMacOS == null) {
      return Promise.resolve([]);
    }
    return NativeWindowManagerMacOS.getWindows();
  }
}

export default (new WindowManagerMacOS(): WindowManagerMacOS);
