/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @noflow
 */

// [macOS]

'use strict';

jest.mock(
  '../../codegen/generate-artifacts-executor/generateFBReactNativeSpecIOS',
  () => ({generateFBReactNativeSpecIOS: jest.fn()}),
);
jest.mock('../hermes', () => ({prepareHermesArtifactsAsync: jest.fn()}));
jest.mock('../reactNativeDependencies', () => ({
  prepareReactNativeDependenciesArtifactsAsync: jest.fn(),
}));
jest.mock('../utils', () => ({
  createFolderIfNotExists: jest.fn(),
  createLogger: () => jest.fn(),
}));
jest.mock('child_process', () => ({execSync: jest.fn()}));
jest.mock('fs');

const {setup} = require('../setup');
const fs = require('fs');
const path = require('path');

test('stages canonical view headers and both relative platform trees in both namespaces, replacing stale links', async () => {
  const root = '/rn';
  const headers = '/build/headers';
  const view = 'ReactCommon/react/renderer/components/view';
  const names = [
    'HostPlatformViewProps.h',
    'HostPlatformViewTraitsInitializer.h',
  ];
  const directories = new Map([
    [path.join(root, view), names],
    [path.join(root, view, 'platform/cxx'), ['react/']],
    [path.join(root, view, 'platform/macos'), ['react/']],
  ]);
  for (const platform of ['cxx', 'macos']) {
    const base = path.join(root, view, 'platform', platform);
    for (const [directory, entries] of [
      ['react', ['renderer/']],
      ['react/renderer', ['components/']],
      ['react/renderer/components', ['view/']],
      ['react/renderer/components/view', names],
    ]) {
      directories.set(path.join(base, directory), entries);
    }
  }
  const namespaces = [view, 'react/renderer/components/view'];
  const linked = new Map(
    namespaces.map(namespace => [
      path.join(headers, namespace, names[0]),
      'stale platform header',
    ]),
  );
  fs.readdirSync.mockImplementation(directory =>
    (directories.get(directory) ?? []).map(name => ({
      name: name.replace(/\/$/, ''),
      isFile: () => !name.endsWith('/'),
      isDirectory: () => name.endsWith('/'),
    })),
  );
  fs.existsSync.mockImplementation(file => linked.has(file));
  fs.linkSync.mockImplementation((source, target) => {
    linked.set(target, source);
  });
  fs.rmSync.mockImplementation(directory => {
    for (const file of linked.keys()) {
      if (file.startsWith(directory + path.sep)) {
        linked.delete(file);
      }
    }
  });

  await setup(root, '/build', '1000.0.0', 'Debug');

  for (const namespace of namespaces) {
    for (const name of names) {
      expect(linked.get(path.join(headers, namespace, name))).toBe(
        path.join(root, view, name),
      );
      for (const platform of ['cxx', 'macos']) {
        const relative = path.join(
          'platform',
          platform,
          'react/renderer/components/view',
          name,
        );
        expect(linked.get(path.join(headers, namespace, relative))).toBe(
          path.join(root, view, relative),
        );
      }
    }
  }
});
