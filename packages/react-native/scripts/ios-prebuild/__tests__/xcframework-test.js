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

const codegen = require('../../codegen/generate-artifacts-executor/generateFBReactNativeSpecIOS');
const compose = require('../headers-compose');
const {buildXCFrameworks, resolveHermesHeaders} = require('../xcframework');
const childProcess = require('child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('resolveHermesHeaders', () => {
  let tmp /*: string */ = '';
  let buildFolder /*: string */ = '';

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xcframework-test-'));
    buildFolder = path.join(tmp, '.build');
  });

  afterEach(() => {
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  test('returns the base include directory when hermes/hermes.h exists', () => {
    const includeDir = path.join(
      buildFolder,
      'artifacts',
      'hermes',
      'destroot',
      'include',
    );
    fs.mkdirSync(path.join(includeDir, 'hermes'), {recursive: true});
    fs.writeFileSync(path.join(includeDir, 'hermes', 'hermes.h'), '');

    expect(resolveHermesHeaders(buildFolder, true)).toBe(includeDir);
  });

  test('finds a non-standard nested include directory', () => {
    const includeDir = path.join(
      buildFolder,
      'artifacts',
      'hermes',
      'nested',
      'archive',
      'destroot',
      'include',
    );
    fs.mkdirSync(path.join(includeDir, 'hermes'), {recursive: true});
    fs.writeFileSync(path.join(includeDir, 'hermes', 'hermes.h'), '');

    expect(resolveHermesHeaders(buildFolder, true)).toBe(includeDir);
  });

  test('returns null when Hermes headers are absent and not required', () => {
    expect(resolveHermesHeaders(buildFolder, false)).toBeNull();
  });

  test('throws when Hermes headers are absent and required', () => {
    expect(() => resolveHermesHeaders(buildFolder, true)).toThrow(
      /ReactNativeHeaders[\s\S]*<hermes\/\.\.\.>[\s\S]*destroot\/include/,
    );
  });
});

describe('producer header slices', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(['macos', 'xros', 'unknown'])(
    'derives the RN sidecar from the composed %s binary',
    platform => {
      jest
        .spyOn(codegen, 'generateFBReactNativeSpecIOS')
        .mockImplementation(() => {});
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
      jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const plan = {};
      jest.spyOn(compose, 'computeSpecPlan').mockReturnValue(plan);
      jest
        .spyOn(compose, 'emitReactFrameworkHeaders')
        .mockImplementation(() => {});
      const emit = jest
        .spyOn(compose, 'buildReactNativeHeadersXcframework')
        .mockReturnValue(
          '/build/output/xcframeworks/Debug/ReactNativeHeaders.xcframework',
        );
      const exec = jest
        .spyOn(childProcess, 'execFileSync')
        .mockImplementation(command => {
          if (command === 'plutil') {
            return Buffer.from(
              JSON.stringify({
                AvailableLibraries: [
                  {
                    SupportedPlatform: platform,
                    SupportedArchitectures: ['arm64'],
                  },
                ],
              }),
            );
          }
          return Buffer.from('');
        });
      if (platform === 'unknown') {
        expect(() =>
          buildXCFrameworks('/root', '/build', [], 'Debug', null),
        ).toThrow(/no stub recipe/);
        expect(emit).not.toHaveBeenCalled();
        expect(exec.mock.calls.some(([command]) => command === 'tar')).toBe(
          false,
        );
        return;
      }
      buildXCFrameworks('/root', '/build', [], 'Debug', null);
      expect(exec).toHaveBeenCalledWith('plutil', [
        '-convert',
        'json',
        '-o',
        '-',
        '/build/output/xcframeworks/Debug/React.xcframework/Info.plist',
      ]);
      expect(emit).toHaveBeenCalledWith(
        '/build/output/xcframeworks/Debug',
        plan,
        '/root',
        [
          {
            name: platform,
            sdk: platform === 'macos' ? 'macosx' : 'xros',
            targets: [
              platform === 'macos'
                ? 'arm64-apple-macosx11.0'
                : 'arm64-apple-xros1.0',
            ],
          },
        ],
        null,
        null,
      );
    },
  );
});
