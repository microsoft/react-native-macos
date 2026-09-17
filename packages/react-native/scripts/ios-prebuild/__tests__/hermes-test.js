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

jest.mock('child_process', () => ({execSync: jest.fn()}));

const {prepareHermesArtifactsAsync} = require('../hermes');
const {execSync} = require('child_process');
const fs = require('fs');
const ini = require('ini');
const os = require('os');
const path = require('path');
const {Readable} = require('stream');

const propertiesPath = path.resolve(
  __dirname,
  '../../../sdks/hermes-engine/version.properties',
);
const readFileSync = fs.readFileSync.bind(fs);
const checkedInProperties = readFileSync(propertiesPath, 'utf8');
const metadata = ini.parse(checkedInProperties);
const originalFetch = global.fetch;
const envKeys = [
  'RCT_HERMES_V1_ENABLED',
  'HERMES_ENGINE_TARBALL_PATH',
  'HERMES_VERSION',
  'ENTERPRISE_REPOSITORY',
];
let tmp;
let artifacts;
let versionFile;
let framework;
let savedEnv;
let properties;

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  savedEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  envKeys.forEach(key => delete process.env[key]);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-test-'));
  artifacts = path.join(tmp, '.build/artifacts/hermes');
  versionFile = path.join(artifacts, 'version.txt');
  framework = path.join(
    artifacts,
    'destroot/Library/Frameworks/universal/hermesvm.xcframework',
  );
  properties = 'HERMES_VERSION_NAME=123.4.56\nHERMES_V1_VERSION_NAME=234.5.67';
  jest.spyOn(process, 'cwd').mockReturnValue(tmp);
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
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'HEAD') {
      return {status: 200};
    }
    return {ok: true, body: Readable.from(['mock Hermes archive'])};
  });
  execSync.mockImplementation(() => {
    fs.mkdirSync(framework, {recursive: true});
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

function releaseUrl(version, flavor = 'debug') {
  return `https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-${flavor}.tar.gz`;
}

test.each(['Debug', 'Release'])(
  'uses checked-in metadata with the 1000.0.0 RN package for %s',
  async flavor => {
    properties = checkedInProperties;
    const version = metadata.HERMES_VERSION_NAME;
    expect(await prepareHermesArtifactsAsync('1000.0.0', flavor)).toBe(
      artifacts,
    );
    const url = releaseUrl(version, flavor.toLowerCase());
    expect(global.fetch.mock.calls).toEqual([[url, {method: 'HEAD'}], [url]]);
    expect(readFileSync(versionFile, 'utf8')).toBe(`${version}-${flavor}`);
    expect(fs.existsSync(path.join(artifacts, 'hermes-ios.download'))).toBe(
      false,
    );
    expect(
      fs.existsSync(
        path.join(artifacts, `hermes-ios-${version}-${flavor}.tar.gz`),
      ),
    ).toBe(false);
  },
);

test('selects V1 metadata only with flag 1', async () => {
  properties = checkedInProperties;
  process.env.RCT_HERMES_V1_ENABLED = '1';
  await prepareHermesArtifactsAsync('0.83.1', 'Debug');
  expect(global.fetch).toHaveBeenCalledWith(
    releaseUrl(metadata.HERMES_V1_VERSION_NAME),
  );
});

test.each([
  '',
  'HERMES_VERSION_NAME=^1.2.3',
  Object.assign(new Error('missing version.properties'), {code: 'ENOENT'}),
])(
  'fails invalid or missing metadata before network or extraction: %s',
  async invalid => {
    properties = invalid;
    await expect(
      prepareHermesArtifactsAsync('1000.0.0', 'Debug'),
    ).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(execSync).not.toHaveBeenCalled();
  },
);

test('local tarball overrides invalid metadata and explicit nightly', async () => {
  const tarball = path.join(tmp, 'local hermes.tar.gz');
  fs.writeFileSync(tarball, 'local archive');
  fs.mkdirSync(artifacts, {recursive: true});
  fs.writeFileSync(versionFile, 'old-version');
  process.env.HERMES_ENGINE_TARBALL_PATH = tarball;
  process.env.HERMES_VERSION = 'nightly';
  properties = '';
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  expect(execSync).toHaveBeenCalledWith(
    `tar -xzf "${tarball}" -C "${artifacts}"`,
    {stdio: 'inherit'},
  );
  expect(fs.existsSync(tarball)).toBe(true);
  expect(fs.existsSync(versionFile)).toBe(false);
  expect(fs.readFileSync).not.toHaveBeenCalledWith(propertiesPath, 'utf8');
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each(['123.4.56', '1000.0.0'])(
  'explicit version %s bypasses metadata',
  async version => {
    process.env.HERMES_VERSION = version;
    properties = new Error('missing metadata');
    await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
    expect(global.fetch.mock.calls).toEqual([
      [releaseUrl(version), {method: 'HEAD'}],
      [releaseUrl(version)],
    ]);
    expect(fs.readFileSync).not.toHaveBeenCalledWith(propertiesPath, 'utf8');
  },
);

test('only explicit nightly resolves the npm tag', async () => {
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
});

test('an explicit nightly lookup failure does not use the default pin', async () => {
  process.env.HERMES_VERSION = 'nightly';
  global.fetch.mockResolvedValue({
    ok: false,
    status: 503,
    statusText: 'Unavailable',
  });
  await expect(
    prepareHermesArtifactsAsync('1000.0.0', 'Debug'),
  ).rejects.toThrow("Couldn't get an answer from NPM: 503 Unavailable");
  expect(global.fetch.mock.calls).toEqual([
    ['https://registry.npmjs.org/hermes-compiler/nightly'],
  ]);
  expect(execSync).not.toHaveBeenCalled();
});

test('main does not infer a source exception from selected metadata 1000.0.0', async () => {
  properties = 'HERMES_VERSION_NAME=1000.0.0';
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  expect(global.fetch.mock.calls).toEqual([
    [releaseUrl('1000.0.0'), {method: 'HEAD'}],
    [releaseUrl('1000.0.0')],
  ]);
});

test('uses the selected pin for snapshot metadata and download', async () => {
  const base =
    'https://central.sonatype.com/repository/maven-snapshots/com/facebook/hermes/hermes-ios/123.4.56-SNAPSHOT';
  const url = `${base}/hermes-ios-123.4.56-20260101.010203-4-hermes-ios-debug.tar.gz`;
  global.fetch.mockImplementation(async (target, options) => {
    if (target.endsWith('/maven-metadata.xml')) {
      return {
        ok: true,
        text: async () =>
          '<metadata><snapshot><timestamp>20260101.010203</timestamp><buildNumber>4</buildNumber></snapshot></metadata>',
      };
    }
    if (options?.method === 'HEAD') {
      return {status: target === url ? 200 : 404};
    }
    return {ok: true, body: Readable.from(['snapshot archive'])};
  });
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  expect(global.fetch.mock.calls).toEqual([
    [releaseUrl('123.4.56'), {method: 'HEAD'}],
    [`${base}/maven-metadata.xml`],
    [url, {method: 'HEAD'}],
    [`${base}/maven-metadata.xml`],
    [url],
  ]);
});

test('preserves the enterprise repository override', async () => {
  process.env.ENTERPRISE_REPOSITORY = 'https://mirror.example/maven';
  await prepareHermesArtifactsAsync('0.83.1', 'Release');
  expect(global.fetch).toHaveBeenCalledWith(
    releaseUrl('123.4.56', 'release').replace(
      'https://repo1.maven.org/maven2',
      process.env.ENTERPRISE_REPOSITORY,
    ),
  );
});

test('reuses only the matching Hermes version, flag and flavor cache', async () => {
  await prepareHermesArtifactsAsync('1000.0.0', 'Debug');
  global.fetch.mockClear();
  execSync.mockClear();
  await prepareHermesArtifactsAsync('0.83.1', 'Debug');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(execSync).not.toHaveBeenCalled();
  properties = 'HERMES_VERSION_NAME=123.4.58\nHERMES_V1_VERSION_NAME=234.5.67';
  await prepareHermesArtifactsAsync('0.83.1', 'Debug');
  expect(global.fetch).toHaveBeenCalledWith(releaseUrl('123.4.58'));
  await prepareHermesArtifactsAsync('0.83.1', 'Release');
  expect(global.fetch).toHaveBeenCalledWith(releaseUrl('123.4.58', 'release'));
  process.env.RCT_HERMES_V1_ENABLED = '1';
  await prepareHermesArtifactsAsync('0.83.1', 'Release');
  expect(global.fetch).toHaveBeenCalledWith(releaseUrl('234.5.67', 'release'));
});

test('unavailable artifacts fail without an npm or source fallback', async () => {
  global.fetch.mockResolvedValue({
    ok: false,
    status: 404,
    statusText: 'Not Found',
  });
  await expect(
    prepareHermesArtifactsAsync('1000.0.0', 'Debug'),
  ).rejects.toThrow('Failed to download: 404 Not Found');
  expect(execSync).not.toHaveBeenCalled();
  expect(global.fetch.mock.calls.some(([url]) => url.includes('npmjs'))).toBe(
    false,
  );
});
