/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {RNTesterModuleExample} from '../../types/RNTesterTypes';
import type {WindowInfo} from 'react-native';

import * as React from 'react';
import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {
  AppRegistry,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
  WindowManagerMacOS,
} from 'react-native';

const SECONDARY_WINDOW_MODULE_NAME = 'RNTesterSecondaryWindow';
const FIRST_WINDOW_KEY = 'secondary-1';
const SECOND_WINDOW_KEY = 'secondary-2';

/**
 * A tiny module-scope store so the counter is visible (and can be
 * incremented) from every window sharing this bridge/JS runtime, not just
 * the window that owns the `useState` call.
 */
let sharedCount = 0;
const sharedCountListeners: Set<() => void> = new Set();

function incrementSharedCount(): void {
  sharedCount += 1;
  sharedCountListeners.forEach(listener => listener());
}

function subscribeToSharedCount(listener: () => void): () => void {
  sharedCountListeners.add(listener);
  return () => {
    sharedCountListeners.delete(listener);
  };
}

function getSharedCount(): number {
  return sharedCount;
}

function useSharedCount(): number {
  return useSyncExternalStore(subscribeToSharedCount, getSharedCount);
}

/**
 * Root component rendered inside secondary windows opened via
 * `WindowManagerMacOS.open`. `windowKey` is passed through `initialProps`
 * rather than reusing the prop name `key`: React treats `key` as a reserved
 * prop and strips it from `props` when spread onto an element (see
 * `renderApplication.js`, which renders `<RootComponent {...initialProps} />`),
 * so a same-named `key` field in `initialProps` would never actually reach
 * this component.
 */
function WindowManagerExampleWindow(props: {
  windowKey: string,
  title?: ?string,
}): React.Node {
  const sharedCountValue = useSharedCount();
  const [error, setError] = useState<?string>(null);

  const closeThisWindow = useCallback(() => {
    WindowManagerMacOS.close(props.windowKey).catch((closeError: mixed) => {
      setError(String(closeError));
    });
  }, [props.windowKey]);

  return (
    <View style={styles.windowContainer}>
      <Text style={styles.heading}>{props.title ?? 'Secondary window'}</Text>
      <Text>windowKey: {props.windowKey}</Text>
      <Text>Shared counter: {sharedCountValue}</Text>
      <Button
        title="Increment shared counter"
        onPress={incrementSharedCount}
      />
      <Button title="Close this window" onPress={closeThisWindow} />
      {error != null ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// Registration must happen exactly once at module scope (not on every
// render) so the app key is idempotently associated with this component
// regardless of how many times `WindowManagerExample` itself mounts.
AppRegistry.registerComponent(
  SECONDARY_WINDOW_MODULE_NAME,
  () => WindowManagerExampleWindow,
);

function WindowManagerExample(): React.Node {
  const [windows, setWindows] = useState<Array<WindowInfo>>([]);
  const [error, setError] = useState<?string>(null);
  const sharedCountValue = useSharedCount();

  const refreshWindows = useCallback(() => {
    WindowManagerMacOS.getWindows()
      .then((nextWindows: Array<WindowInfo>) => {
        setWindows(nextWindows);
      })
      .catch((refreshError: mixed) => {
        setError(String(refreshError));
      });
  }, []);

  useEffect(() => {
    refreshWindows();

    const subscriptions = [
      WindowManagerMacOS.addListener('windowDidOpen', refreshWindows),
      WindowManagerMacOS.addListener('windowDidClose', refreshWindows),
      WindowManagerMacOS.addListener('windowDidFocus', refreshWindows),
      WindowManagerMacOS.addListener('windowDidBlur', refreshWindows),
    ];

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [refreshWindows]);

  const openWindow = useCallback((windowKey: string) => {
    WindowManagerMacOS.open({
      moduleName: SECONDARY_WINDOW_MODULE_NAME,
      key: windowKey,
      initialProps: {
        windowKey,
        title: `Window ${windowKey}`,
      },
      title: `Window ${windowKey}`,
      width: 360,
      height: 240,
    }).catch((openError: mixed) => {
      setError(String(openError));
    });
  }, []);

  const openWindowTwice = useCallback(() => {
    const options = {
      moduleName: SECONDARY_WINDOW_MODULE_NAME,
      key: FIRST_WINDOW_KEY,
      initialProps: {
        windowKey: FIRST_WINDOW_KEY,
        title: `Window ${FIRST_WINDOW_KEY}`,
      },
      title: `Window ${FIRST_WINDOW_KEY}`,
      width: 360,
      height: 240,
    };
    WindowManagerMacOS.open(options)
      // Opening the same key again is idempotent: this focuses the
      // existing window instead of creating a second one.
      .then(() => WindowManagerMacOS.open(options))
      .catch((openTwiceError: mixed) => {
        setError(String(openTwiceError));
      });
  }, []);

  const focusFirstWindow = useCallback(() => {
    WindowManagerMacOS.focus(FIRST_WINDOW_KEY).catch((focusError: mixed) => {
      setError(String(focusError));
    });
  }, []);

  const closeAllWindows = useCallback(() => {
    WindowManagerMacOS.getWindows()
      .then((openWindows: Array<WindowInfo>) =>
        Promise.all(
          openWindows.map(windowInfo =>
            WindowManagerMacOS.close(windowInfo.key),
          ),
        ),
      )
      .then(() => refreshWindows())
      .catch((closeAllError: mixed) => {
        setError(String(closeAllError));
      });
  }, [refreshWindows]);

  const setFirstWindowTitle = useCallback(() => {
    WindowManagerMacOS.setTitle(
      FIRST_WINDOW_KEY,
      `Window ${FIRST_WINDOW_KEY} @ ${Date.now()}`,
    ).catch((setTitleError: mixed) => {
      setError(String(setTitleError));
    });
  }, []);

  if (!WindowManagerMacOS.isSupported) {
    return <Text>Multi-window is only supported on macOS.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text>Shared counter: {sharedCountValue}</Text>
      <Button
        title="Increment shared counter"
        onPress={incrementSharedCount}
      />
      <Button
        title="Open window"
        onPress={() => openWindow(FIRST_WINDOW_KEY)}
      />
      <Button
        title="Open second window"
        onPress={() => openWindow(SECOND_WINDOW_KEY)}
      />
      <Button
        title="Open window twice (idempotent)"
        onPress={openWindowTwice}
      />
      <Button title="Focus first window" onPress={focusFirstWindow} />
      <Button title="Set title" onPress={setFirstWindowTitle} />
      <Button title="Close all" onPress={closeAllWindows} />
      <Text style={styles.heading}>Open windows</Text>
      {windows.length === 0 ? (
        <Text>No windows currently open.</Text>
      ) : (
        windows.map(windowInfo => (
          <Text key={windowInfo.key}>
            {windowInfo.key} — {windowInfo.title} ({windowInfo.width}x
            {windowInfo.height}) {windowInfo.isKey ? '[focused]' : ''}
          </Text>
        ))
      )}
      {error != null ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  windowContainer: {
    padding: 16,
  },
  heading: {
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  error: {
    color: 'red',
    marginTop: 8,
  },
});

exports.title = 'WindowManagerMacOS';
exports.category = 'macOS';
exports.description =
  'Demonstrates opening, focusing, closing and renaming additional NSWindows from JavaScript via WindowManagerMacOS.';
exports.examples = [
  {
    title: 'Multi-window management',
    description: ('Open, focus, retitle and close secondary windows.': string),
    render(): React.Node {
      return <WindowManagerExample />;
    },
  },
] as Array<RNTesterModuleExample>;
