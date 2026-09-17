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
  emitReactFrameworkHeaders,
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

test('only the version header uses the built overlay on iOS and macOS slices', () => {
  const os = require('os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamped-headers-'));
  const rnRoot = path.join(root, 'source');
  const overlay = path.join(root, 'built');
  const xcfw = path.join(root, 'React.xcframework');
  const versionSource = 'React/Base/ReactNativeVersion.h';
  const tracingSource =
    'ReactCommon/jsinspector-modern/tracing/TraceRecordingState.h';
  const sentinel = '#define REACT_NATIVE_VERSION_MAJOR 1000\n';
  const stamped =
    '#define REACT_NATIVE_VERSION_MAJOR 0\n#define REACT_NATIVE_VERSION_MINOR 87\n';
  for (const [dir, name, text] of [
    [rnRoot, versionSource, sentinel],
    [overlay, versionSource, stamped],
    [rnRoot, tracingSource, '// current move-only tracing definition\n'],
    [overlay, tracingSource, '// stale copyable tracing definition\n'],
  ]) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), {recursive: true});
    fs.writeFileSync(path.join(dir, name), text);
  }
  const slices = ['ios-arm64', 'macos-arm64_x86_64'];
  for (const slice of slices) {
    fs.mkdirSync(path.join(xcfw, slice, 'React.framework'), {recursive: true});
  }
  const plan = {
    react: [
      {relPath: 'ReactNativeVersion.h', source: versionSource},
      {relPath: 'TraceRecordingState.h', source: tracingSource},
    ],
    umbrella: [],
    privateReactHeaders: {modular: [], textual: []},
  };
  try {
    emitReactFrameworkHeaders(xcfw, plan, rnRoot, overlay);
    for (const slice of slices) {
      const headers = path.join(xcfw, slice, 'React.framework', 'Headers');
      expect(
        fs.readFileSync(path.join(headers, 'ReactNativeVersion.h'), 'utf8'),
      ).toBe(stamped);
      expect(
        fs.readFileSync(path.join(headers, 'TraceRecordingState.h'), 'utf8'),
      ).toBe('// current move-only tracing definition\n');
    }
    expect(fs.readFileSync(path.join(rnRoot, versionSource), 'utf8')).toBe(
      sentinel,
    );
    emitReactFrameworkHeaders(xcfw, plan, rnRoot);
    expect(
      fs.readFileSync(
        path.join(
          xcfw,
          slices[0],
          'React.framework/Headers/ReactNativeVersion.h',
        ),
        'utf8',
      ),
    ).toBe(sentinel);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
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
        reactNativeHeaders: [],
        namespaceUmbrellas: [],
        namespaceModules: {},
      },
      root,
      emitter.stubSlicesFromXcframework('/binary/React.xcframework'),
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
