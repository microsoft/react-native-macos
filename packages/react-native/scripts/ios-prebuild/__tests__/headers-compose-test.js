/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

const {
  COMPOSE_TOOLING_FILES,
  composeToolingHash,
} = require('../headers-compose');
const fs = require('fs');
const path = require('path');

describe('COMPOSE_TOOLING_FILES stays in sync with headers-compose.js requires', () => {
  test('every local sibling require is covered by the hashed file list', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'headers-compose.js'),
      'utf8',
    );
    const requireRe = /require\('\.\/([\w-]+)'\)/g;
    const required = new Set<string>();
    for (const match of source.matchAll(requireRe)) {
      required.add(`${match[1]}.js`);
    }
    for (const name of required) {
      expect(COMPOSE_TOOLING_FILES).toContain(name);
    }
    const listWithoutSelf = COMPOSE_TOOLING_FILES.filter(
      name => name !== 'headers-compose.js',
    );
    for (const name of listWithoutSelf) {
      expect(required).toContain(name);
    }
  });
});

describe('composeToolingHash', () => {
  test('returns a 64-char hex sha256 digest', () => {
    const hash = composeToolingHash();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

test('header sidecar composition uses the binary macOS slice instead of iOS defaults', () => {
  const emitter = require('../headers-xcframework');
  const os = require('os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'macos-headers-compose-'));
  const slices = [
    {name: 'macos', sdk: 'macosx', targets: ['arm64-apple-macosx11.0']},
  ];
  const recipe = jest
    .spyOn(emitter, 'stubSlicesFromXcframework')
    .mockReturnValue(slices);
  const compose = jest
    .spyOn(emitter, 'composeHeadersOnlyXcframework')
    .mockReturnValue(path.join(root, 'ReactNativeHeaders.xcframework'));
  // No compiler or xcodebuild is needed: this checks the platform handoff.
  try {
    const {buildReactNativeHeadersXcframework} = require('../headers-compose');
    buildReactNativeHeadersXcframework(
      root,
      {
        react: [],
        reactNativeHeaders: [],
        depsNamespaces: [],
        umbrella: [],
        namespaceUmbrellas: [],
        namespaceModules: {},
        privateReactHeaders: {modular: [], textual: []},
        collisions: [],
      },
      root,
      false,
      null,
      '/binary/React.xcframework',
    );
    expect(recipe).toHaveBeenCalledWith('/binary/React.xcframework');
    expect(compose).toHaveBeenCalledWith(
      root,
      'ReactNativeHeaders',
      expect.any(String),
      slices,
    );
  } finally {
    recipe.mockRestore();
    compose.mockRestore();
    fs.rmSync(root, {recursive: true, force: true});
  }
});
