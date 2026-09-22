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
jest.mock('../microsoft-hermes', () => ({
  hermesCommitAtMergeBase: jest.fn(),
  findMatchingHermesVersion: jest.fn(() => {
    throw new Error('RN peer mapping must not run');
  }),
}));

const {prepareHermesArtifactsAsync} = require('../hermes');
const {
  findMatchingHermesVersion,
  hermesCommitAtMergeBase,
} = require('../microsoft-hermes');
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {Readable} = require('stream');

const propertiesPath = path.resolve(
  __dirname,
  '../../../sdks/hermes-engine/version.properties',
);
const readFileSync = fs.readFileSync.bind(fs);
const originalFetch = global.fetch;
const envKeys = [
  'RCT_HERMES_V1_ENABLED',
  'HERMES_ENGINE_TARBALL_PATH',
  'HERMES_VERSION',
  'ENTERPRISE_REPOSITORY',
];
const commit = '0123456789abcdef0123456789abcdef01234567';
let savedEnv;
let tmp;
let artifacts;
let versionFile;
let properties;

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  savedEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  envKeys.forEach(key => delete process.env[key]);
  process.env.RCT_HERMES_V1_ENABLED = '0';
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-084-test-'));
  artifacts = path.join(tmp, '.build/artifacts/hermes');
  versionFile = path.join(artifacts, 'version.txt');
  properties =
    'HERMES_VERSION_NAME=1000.0.0\nHERMES_V1_VERSION_NAME=250829098.0.1';
  jest.spyOn(process, 'cwd').mockReturnValue(tmp);
  jest.spyOn(os, 'tmpdir').mockReturnValue(tmp);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(fs, 'readFileSync').mockImplementation((file, ...args) => {
    if (file === propertiesPath) {
      if (properties instanceof Error) {
        throw properties;
      }
      return properties;
    }
    return readFileSync(file, ...args);
  });
  hermesCommitAtMergeBase.mockReturnValue({commit, timestamp: '2026-01-05'});
  execFileSync.mockImplementation((command, args) => {
    if (command === 'tar' && args[0] === '-czf') {
      fs.writeFileSync(args[1], 'source archive');
    }
    if (command === 'tar' && args[0] === '-xzf') {
      fs.mkdirSync(
        path.join(
          artifacts,
          'destroot/Library/Frameworks/universal/hermesvm.xcframework',
        ),
        {recursive: true},
      );
      fs.writeFileSync(
        path.join(
          artifacts,
          'destroot/Library/Frameworks/universal/hermesvm.xcframework/Info.plist',
        ),
        'mock plist',
      );
    }
    if (command === 'plutil') {
      return JSON.stringify({
        AvailableLibraries: [{SupportedPlatform: 'macos'}],
      });
    }
  });
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'HEAD') {
      return {status: 200};
    }
    return {ok: true, body: Readable.from(['artifact archive'])};
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

function releaseUrl(version) {
  return `https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-debug.tar.gz`;
}

test.each(['0'])(
  'selected legacy sentinel builds from the merge-base helper with flag %s',
  async flag => {
    if (flag != null) {
      process.env.RCT_HERMES_V1_ENABLED = flag;
    }
    await prepareHermesArtifactsAsync('0.84.0', 'Debug');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(findMatchingHermesVersion).not.toHaveBeenCalled();
    expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(1);
    expect(hermesCommitAtMergeBase).toHaveBeenCalledWith();
    expect(execFileSync).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining([`+${commit}:refs/remotes/origin/main`]),
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenCalledWith(
      'bash',
      [expect.stringContaining('build-ios-framework.sh')],
      expect.objectContaining({
        env: expect.objectContaining({
          BUILD_TYPE: 'Debug',
          RELEASE_VERSION: '1000.0.0',
        }),
      }),
    );
    expect(readFileSync(versionFile, 'utf8')).toBe(`source-${commit}-Debug`);
    expect(fs.readdirSync(tmp)).toEqual(['.build']);
  },
);

test.each([undefined, '1', '', 'true'])(
  'flag %s downloads concrete V1 metadata without a source tag lookup',
  async flag => {
    if (flag == null) {
      delete process.env.RCT_HERMES_V1_ENABLED;
    } else {
      process.env.RCT_HERMES_V1_ENABLED = flag;
    }
    await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
    expect(global.fetch.mock.calls).toEqual([
      [releaseUrl('250829098.0.1'), {method: 'HEAD'}],
      [releaseUrl('250829098.0.1')],
    ]);
    expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
    expect(fs.readFileSync.mock.calls.map(([file]) => file)).toEqual([
      propertiesPath,
    ]);
  },
);

test('concrete legacy metadata stays an artifact pin on RN main', async () => {
  properties = 'HERMES_VERSION_NAME=0.14.0';
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  expect(global.fetch.mock.calls).toEqual([
    [releaseUrl('0.14.0'), {method: 'HEAD'}],
    [releaseUrl('0.14.0')],
  ]);
  expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
  expect(findMatchingHermesVersion).not.toHaveBeenCalled();
});

test.each(['1000.0.0', '123.4.56'])(
  'explicit version %s bypasses metadata and source policy',
  async version => {
    process.env.HERMES_VERSION = version;
    properties = new Error('missing metadata');
    await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
    expect(global.fetch.mock.calls).toEqual([
      [releaseUrl(version), {method: 'HEAD'}],
      [releaseUrl(version)],
    ]);
    expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
    expect(fs.readFileSync).not.toHaveBeenCalled();
  },
);

test('local tarball takes priority over metadata and explicit nightly', async () => {
  const tarball = path.join(tmp, 'local hermes.tar.gz');
  fs.writeFileSync(tarball, 'local archive');
  process.env.HERMES_ENGINE_TARBALL_PATH = tarball;
  process.env.HERMES_VERSION = 'nightly';
  properties = new Error('missing metadata');
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  expect(execFileSync).toHaveBeenCalledWith(
    'tar',
    ['-xzf', tarball, '-C', artifacts],
    {stdio: 'inherit'},
  );
  expect(fs.existsSync(tarball)).toBe(true);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
  expect(fs.readFileSync).not.toHaveBeenCalled();
});

test('explicit nightly resolves the npm tag', async () => {
  process.env.HERMES_VERSION = 'nightly';
  properties = '';
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({version: '123.4.57'}),
  });
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  expect(global.fetch.mock.calls).toEqual([
    ['https://registry.npmjs.org/hermes-compiler/nightly'],
    [releaseUrl('123.4.57'), {method: 'HEAD'}],
    [releaseUrl('123.4.57')],
  ]);
  expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
});

test('source cache respects flavor and does not satisfy an explicit artifact override', async () => {
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  execFileSync.mockClear();
  await prepareHermesArtifactsAsync('0.84.0', 'Debug');
  expect(execFileSync.mock.calls.map(([command]) => command)).toEqual([
    'plutil',
  ]);
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(2);
  await prepareHermesArtifactsAsync('0.84.0', 'Release');
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(3);
  process.env.HERMES_VERSION = '1000.0.0';
  await prepareHermesArtifactsAsync('0.84.0', 'Debug');
  expect(global.fetch).toHaveBeenCalledWith(releaseUrl('1000.0.0'));
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(3);
  delete process.env.HERMES_VERSION;
  await prepareHermesArtifactsAsync('0.84.0', 'Debug');
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(4);
});

test('source cache rebuilds for a changed commit and reuses an unchanged commit', async () => {
  await prepareHermesArtifactsAsync('0.84.0', 'Debug');
  expect(readFileSync(versionFile, 'utf8')).toBe(`source-${commit}-Debug`);
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(1);

  const nextCommit = 'abcdef0123456789abcdef0123456789abcdef01';
  hermesCommitAtMergeBase.mockReturnValue({
    commit: nextCommit,
    timestamp: '2026-01-06',
  });
  execFileSync.mockClear();
  await prepareHermesArtifactsAsync('0.84.0', 'Debug');
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(2);
  expect(execFileSync).toHaveBeenCalledWith(
    'git',
    expect.arrayContaining([`+${nextCommit}:refs/remotes/origin/main`]),
    expect.any(Object),
  );
  expect(execFileSync).toHaveBeenCalledWith(
    'bash',
    [expect.stringContaining('build-ios-framework.sh')],
    expect.any(Object),
  );
  expect(readFileSync(versionFile, 'utf8')).toBe(`source-${nextCommit}-Debug`);

  execFileSync.mockClear();
  await prepareHermesArtifactsAsync('0.84.0', 'Debug');
  expect(hermesCommitAtMergeBase).toHaveBeenCalledTimes(3);
  expect(execFileSync.mock.calls.map(([command]) => command)).toEqual([
    'plutil',
  ]);
  expect(readFileSync(versionFile, 'utf8')).toBe(`source-${nextCommit}-Debug`);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('unavailable V1 artifacts do not fall back to legacy source or npm', async () => {
  process.env.RCT_HERMES_V1_ENABLED = '1';
  global.fetch.mockResolvedValue({
    ok: false,
    status: 404,
    statusText: 'Not Found',
  });
  await expect(
    prepareHermesArtifactsAsync('1000.0.0', 'Debug'),
  ).rejects.toThrow('Failed to download: 404 Not Found');
  expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
  expect(global.fetch.mock.calls.some(([url]) => url.includes('npmjs'))).toBe(
    false,
  );
});

test('invalid metadata fails before source or artifact access', async () => {
  properties = 'HERMES_VERSION_NAME=nightly';
  await expect(
    prepareHermesArtifactsAsync('1000.0.0', 'Debug'),
  ).rejects.toThrow('Expected one exact HERMES_VERSION_NAME');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(hermesCommitAtMergeBase).not.toHaveBeenCalled();
  expect(execFileSync).not.toHaveBeenCalled();
});
