/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @format
 */

'use strict';

jest.mock('child_process', () => ({execFileSync: jest.fn()}));

const {
  prepareReactNativeDependenciesArtifactsAsync,
} = require('../reactNativeDependencies');
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {Readable} = require('stream');

const realExecFileSync = jest.requireActual('child_process').execFileSync;
const mkdirSync = fs.mkdirSync.bind(fs);
const join = path.join.bind(path);
const originalFetch = global.fetch;
const envKeys = ['RN_DEP_VERSION', 'HERMES_ENGINE_TARBALL_PATH'];
const binaryName = 'ReactNativeDependencies.xcframework';
const sidecarName = 'ReactNativeDependenciesHeaders.xcframework';
const headerPath = 'ios-arm64/Headers/folly/detail/Sidecar Header.h';
const header = '#pragma once\n// dependency header fixture\n';
let tmp;
let savedEnv;

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  savedEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  process.env.RN_DEP_VERSION = '0.87.0';
  delete process.env.HERMES_ENGINE_TARBALL_PATH;
  tmp = fs.mkdtempSync(join(os.tmpdir(), 'deps sidecar test '));
  jest.spyOn(process, 'cwd').mockReturnValue(tmp);
  jest.spyOn(console, 'log').mockImplementation(() => {});

  // Sandbox the preparer's fixed extraction directory. Keep tar extraction
  // and filesystem copies real, including source and destination with spaces.
  const scratch = '/tmp/react-native-dependencies';
  const extracted = join(tmp, 'extracted artifacts');
  jest
    .spyOn(fs, 'mkdirSync')
    .mockImplementation((dir, options) =>
      mkdirSync(dir === scratch ? extracted : dir, options),
    );
  jest
    .spyOn(path, 'join')
    .mockImplementation((first, ...rest) =>
      join(first === scratch ? extracted : first, ...rest),
    );
  execFileSync.mockImplementation((command, args, options) => {
    expect(command).toBe('tar');
    expect(args[0]).toBe('-xzf');
    return realExecFileSync(
      command,
      args.map(arg => (arg === scratch ? extracted : arg)),
      options,
    );
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
  envKeys.forEach(key => {
    if (savedEnv[key] == null) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  });
  fs.rmSync(tmp, {recursive: true, force: true});
});

function serveArtifact(includeSidecar) {
  const staged = join(tmp, 'archive contents');
  const deps = join(staged, 'packages/react-native/third-party');
  const binaryHeader = join(deps, binaryName, 'Headers/folly/Dependency.h');
  fs.mkdirSync(path.dirname(binaryHeader), {recursive: true});
  fs.writeFileSync(binaryHeader, header);
  if (includeSidecar) {
    const sidecar = join(deps, sidecarName);
    fs.mkdirSync(path.dirname(join(sidecar, headerPath)), {recursive: true});
    fs.writeFileSync(join(sidecar, headerPath), header);
    fs.writeFileSync(
      join(sidecar, 'ios-arm64/libReactNativeDependenciesHeaders.a'),
      '!<arch>\n',
    );
    fs.writeFileSync(
      join(sidecar, 'Info.plist'),
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>XCFrameworkFormatVersion</key><string>1.0</string>
<key>AvailableLibraries</key><array><dict>
<key>LibraryIdentifier</key><string>ios-arm64</string>
<key>LibraryPath</key><string>libReactNativeDependenciesHeaders.a</string>
<key>HeadersPath</key><string>Headers</string>
<key>SupportedArchitectures</key><array><string>arm64</string></array>
<key>SupportedPlatform</key><string>ios</string>
</dict></array></dict></plist>`,
    );
  }
  const archive = join(tmp, 'prebuilt dependencies.tar.gz');
  realExecFileSync('tar', ['-czf', archive, '-C', staged, 'packages']);
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'HEAD') {
      return {status: 200};
    }
    return {ok: true, body: Readable.from([fs.readFileSync(archive)])};
  });
}

test.each([true, false])(
  'prepares an artifact with optional headers sidecar present=%s in paths with spaces',
  async includeSidecar => {
    serveArtifact(includeSidecar);
    const artifacts = await prepareReactNativeDependenciesArtifactsAsync(
      '0.87.0',
      'Debug',
    );
    expect(artifacts).toBe(join(tmp, 'third-party'));
    expect(
      fs.readFileSync(
        join(artifacts, binaryName, 'Headers/folly/Dependency.h'),
        'utf8',
      ),
    ).toBe(header);
    const sidecar = join(artifacts, sidecarName);
    if (includeSidecar) {
      expect(fs.readFileSync(join(sidecar, headerPath), 'utf8')).toBe(header);
      expect(fs.readFileSync(join(sidecar, 'Info.plist'), 'utf8')).toContain(
        '<key>HeadersPath</key><string>Headers</string>',
      );
      expect(
        fs.readFileSync(
          join(sidecar, 'ios-arm64/libReactNativeDependenciesHeaders.a'),
          'utf8',
        ),
      ).toBe('!<arch>\n');
    } else {
      expect(fs.existsSync(sidecar)).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('(pre-sidecar artifact)'),
      );
    }
    expect(fs.readFileSync(join(artifacts, 'version.txt'), 'utf8')).toBe(
      '0.87.0-Debug',
    );
    expect(
      fs.existsSync(
        join(artifacts, 'reactnative-dependencies-0.87.0-Debug.tar.gz'),
      ),
    ).toBe(false);
  },
);
