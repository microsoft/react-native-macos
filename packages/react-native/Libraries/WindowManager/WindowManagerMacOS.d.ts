/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// [macOS]

import type {EventSubscription} from '../vendor/emitter/EventEmitter';

export type WindowManagerEventMap = {
  windowDidOpen: WindowInfo;
  windowDidClose: {key: string; moduleName: string};
  windowDidFocus: WindowInfo;
  windowDidBlur: WindowInfo;
  windowDidResize: WindowInfo;
};

export interface WindowOptions {
  moduleName: string;
  key?: string | undefined;
  initialProps?: Object | undefined;
  title?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  minWidth?: number | undefined;
  minHeight?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
  resizable?: boolean | undefined;
  closable?: boolean | undefined;
  minimizable?: boolean | undefined;
  titlebarAppearsTransparent?: boolean | undefined;
  hidesOnDeactivate?: boolean | undefined;
  alwaysOnTop?: boolean | undefined;
  rememberFrame?: boolean | undefined;
  focus?: boolean | undefined;
}

export interface WindowInfo {
  key: string;
  moduleName: string;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isKey: boolean;
  isVisible: boolean;
}

export interface WindowManagerMacOSImpl {
  isSupported: boolean;
  addListener<K extends keyof WindowManagerEventMap>(
    eventType: K,
    listener: (event: WindowManagerEventMap[K]) => void,
    context?: unknown,
  ): EventSubscription;
  removeAllListeners<K extends keyof WindowManagerEventMap>(
    eventType?: K | null,
  ): void;
  open(options: WindowOptions): Promise<WindowInfo>;
  close(key: string): Promise<boolean>;
  focus(key: string): Promise<boolean>;
  setTitle(key: string, title: string): Promise<boolean>;
  isOpen(key: string): Promise<boolean>;
  getWindows(): Promise<WindowInfo[]>;
}

export const WindowManagerMacOS: WindowManagerMacOSImpl;
export type WindowManagerMacOS = WindowManagerMacOSImpl;
