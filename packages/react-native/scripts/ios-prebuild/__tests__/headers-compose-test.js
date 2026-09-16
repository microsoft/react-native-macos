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

const resources = require('../framework-resources');
const {
  COMPOSE_TOOLING_FILES,
  buildReactNativeHeadersXcframework,
  composeToolingHash,
  ensureHeadersLayout,
} = require('../headers-compose');
const inventory = require('../headers-inventory');
const spec = require('../headers-spec');
const xcframework = require('../headers-xcframework');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
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

describe('binary-derived header sidecars', () => {
  let tmp = '';
  const plan = {
    react: [],
    reactNativeHeaders: [],
    umbrella: [],
    namespaceUmbrellas: [],
    namespaceModules: {},
    depsNamespaces: [],
    collisions: [],
    privateReactHeaders: {modular: [], textual: []},
  };
  const writeBinary = (name, platform) => {
    const dir = path.join(tmp, name + '.xcframework');
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(
      path.join(dir, 'Info.plist'),
      JSON.stringify({
        AvailableLibraries: [
          {SupportedPlatform: platform, SupportedArchitectures: ['arm64']},
        ],
      }),
    );
    return dir;
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'header-slices-test-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest
      .spyOn(inventory, 'computeInventory')
      .mockReturnValue({headers: [], collisions: []});
    jest.spyOn(spec, 'planFromInventory').mockReturnValue(plan);
    jest.spyOn(resources, 'buildReactPrivacyManifest').mockReturnValue(null);
    jest.spyOn(resources, 'collectLprojDirs').mockReturnValue([]);
    jest
      .spyOn(childProcess, 'execFileSync')
      .mockImplementation((command, args) => {
        if (command === 'plutil') {
          return fs.readFileSync(args[args.length - 1]);
        }
        if (command === '/bin/cp') {
          fs.cpSync(args[1], args[2], {recursive: true});
          return Buffer.from('');
        }
        throw new Error(`Unexpected native command: ${command}`);
      });
    jest
      .spyOn(xcframework, 'composeHeadersOnlyXcframework')
      .mockImplementation((out, name) => {
        const dir = path.join(out, name + '.xcframework');
        fs.mkdirSync(dir, {recursive: true});
        return dir;
      });
    jest
      .spyOn(xcframework, 'buildDepsHeadersXcframework')
      .mockImplementation(out => {
        const dir = path.join(
          out,
          'ReactNativeDependenciesHeaders.xcframework',
        );
        fs.mkdirSync(dir, {recursive: true});
        return dir;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  test('passes the supplied slices unchanged to the RN emitter', () => {
    const slices = [
      {name: 'xros', sdk: 'xros', targets: ['arm64-apple-xros1.0']},
    ];
    buildReactNativeHeadersXcframework(tmp, plan, tmp, slices);
    expect(xcframework.composeHeadersOnlyXcframework).toHaveBeenCalledWith(
      tmp,
      'ReactNativeHeaders',
      expect.any(String),
      slices,
    );
  });

  test('consumer derives each sidecar from its own binary and refreshes changed deps slices', () => {
    writeBinary('React', 'macos');
    const deps = writeBinary('ReactNativeDependencies', 'xros');
    const out = path.join(tmp, 'composed');
    ensureHeadersLayout(tmp, tmp, out);
    expect(xcframework.composeHeadersOnlyXcframework).toHaveBeenLastCalledWith(
      out,
      'ReactNativeHeaders',
      expect.any(String),
      [{name: 'macos', sdk: 'macosx', targets: ['arm64-apple-macosx11.0']}],
    );
    expect(xcframework.buildDepsHeadersXcframework).toHaveBeenLastCalledWith(
      out,
      path.join(deps, 'Headers'),
      [],
      [{name: 'xros', sdk: 'xros', targets: ['arm64-apple-xros1.0']}],
    );

    ensureHeadersLayout(tmp, tmp, out);
    expect(xcframework.composeHeadersOnlyXcframework).toHaveBeenCalledTimes(1);
    expect(xcframework.buildDepsHeadersXcframework).toHaveBeenCalledTimes(1);

    writeBinary('ReactNativeDependencies', 'ios');
    ensureHeadersLayout(tmp, tmp, out);
    expect(xcframework.buildDepsHeadersXcframework).toHaveBeenLastCalledWith(
      out,
      path.join(deps, 'Headers'),
      [],
      [{name: 'ios', sdk: 'iphoneos', targets: ['arm64-apple-ios15.0']}],
    );
    expect(xcframework.buildDepsHeadersXcframework).toHaveBeenCalledTimes(2);
  });

  test.each(['React', 'ReactNativeDependencies'])(
    'rejects invalid %s metadata before emitting either sidecar',
    name => {
      writeBinary('React', 'macos');
      writeBinary('ReactNativeDependencies', 'xros');
      fs.writeFileSync(
        path.join(tmp, name + '.xcframework', 'Info.plist'),
        '{}',
      );
      expect(() =>
        ensureHeadersLayout(tmp, tmp, path.join(tmp, 'composed')),
      ).toThrow(/non-empty AvailableLibraries/);
      expect(xcframework.composeHeadersOnlyXcframework).not.toHaveBeenCalled();
      expect(xcframework.buildDepsHeadersXcframework).not.toHaveBeenCalled();
    },
  );
});
