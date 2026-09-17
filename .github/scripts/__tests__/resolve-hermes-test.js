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

const {spawnSync} = require('child_process');
const fs = require('fs');
const ini = require('ini');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const metadata = ini.parse(
  fs.readFileSync(
    path.join(
      root,
      'packages/react-native/sdks/hermes-engine/version.properties',
    ),
    'utf8',
  ),
);
const script = path.join(root, '.github/scripts/resolve-hermes.mts');
const preload = path.join(__dirname, '__fixtures__/resolve-hermes.cjs');
const sourceCommit = '1234567890abcdef1234567890abcdef12345678';
let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-hermes-test-'));
});

afterEach(() => {
  fs.rmSync(tmp, {recursive: true, force: true});
});

function run(command, overrides = {}) {
  const env = {...process.env};
  for (const key of [
    'RCT_HERMES_V1_ENABLED',
    'HERMES_VERSION',
    'HERMES_ENGINE_TARBALL_PATH',
    'HERMES_TEST_PROPERTIES',
    'HERMES_TEST_DOWNLOAD',
    'HERMES_TEST_COMMIT',
    'HERMES_TEST_SOURCE_ERROR',
  ]) {
    delete env[key];
  }
  const outputPath = path.join(tmp, 'output');
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--require', preload, script, ...command],
    {
      cwd: tmp,
      env: {
        ...env,
        TMPDIR: tmp,
        GITHUB_OUTPUT: outputPath,
        HERMES_TEST_COMMIT: sourceCommit,
        ...overrides,
      },
      encoding: 'utf8',
      timeout: 10000,
    },
  );
  if (result.error) {
    throw result.error;
  }
  const output = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, 'utf8')
    : '';
  const urls = JSON.parse(result.stdout.match(/HERMES_TEST_URLS=(.*)/)[1]);
  const calls = JSON.parse(result.stdout.match(/HERMES_TEST_CALLS=(.*)/)[1]);
  return {...result, output, urls, calls};
}

test.each([
  [undefined, '123.4.56', 'HERMES_VERSION_NAME', 'Debug'],
  ['0', '123.4.56', 'HERMES_VERSION_NAME', 'Debug'],
  ['1', metadata.HERMES_V1_VERSION_NAME, 'HERMES_V1_VERSION_NAME', 'Release'],
])(
  'CI downloads flag %s with the selected key and version',
  (flag, version, key, flavor) => {
    const result = run(['download-hermes', flavor], {
      ...(flag == null ? {} : {RCT_HERMES_V1_ENABLED: flag}),
      HERMES_TEST_PROPERTIES:
        `${key}=${version}\n` +
        `${key === 'HERMES_VERSION_NAME' ? 'HERMES_V1_VERSION_NAME' : 'HERMES_VERSION_NAME'}=1000.0.0`,
      HERMES_TEST_DOWNLOAD: 'release',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Using ${key}=${version}`);
    expect(result.output).toContain(`version=${version}\n`);
    expect(result.urls).toEqual([
      `https://central.sonatype.com/repository/maven-snapshots/com/facebook/hermes/hermes-ios/${version}-SNAPSHOT/maven-metadata.xml`,
      `https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-${flavor.toLowerCase()}.tar.gz`,
    ]);
    expect(result.calls).toEqual({
      source: [],
      nightly: [
        [
          version,
          flavor,
          'hermes',
          'hermes-ios',
          `hermes-ios-${flavor.toLowerCase()}.tar.gz`,
        ],
      ],
    });
    const tarball = result.output.match(/^tarball=(.+)$/m)[1];
    expect(fs.readFileSync(tarball, 'utf8')).toBe('mock Hermes archive');
  },
);

test('CI snapshot fallback uses the five-argument URL helper contract', () => {
  const version = '123.4.56';
  const result = run(['download-hermes'], {
    HERMES_TEST_DOWNLOAD: 'snapshot',
    HERMES_TEST_PROPERTIES: `HERMES_VERSION_NAME=${version}`,
  });
  expect(result.status).toBe(0);
  expect(result.output).toContain(`version=${version}\n`);
  expect(result.urls).toEqual([
    `https://central.sonatype.com/repository/maven-snapshots/com/facebook/hermes/hermes-ios/${version}-SNAPSHOT/maven-metadata.xml`,
    `https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-debug.tar.gz`,
    `https://central.sonatype.com/repository/maven-snapshots/com/facebook/hermes/hermes-ios/${version}-SNAPSHOT/hermes-ios-${version}-20260101.010203-4-hermes-ios-debug.tar.gz`,
  ]);
  expect(result.calls).toEqual({
    source: [],
    nightly: [
      [version, 'Debug', 'hermes', 'hermes-ios', 'hermes-ios-debug.tar.gz'],
    ],
  });
});

test('CI can still select source when valid pinned artifacts are unavailable', () => {
  const result = run(['download-hermes'], {
    HERMES_TEST_PROPERTIES: 'HERMES_VERSION_NAME=123.4.56',
  });
  expect(result.status).toBe(0);
  expect(result.output).toBe('');
  expect(result.stdout).toContain('will build from source');
  expect(result.urls).toHaveLength(2);
  expect(result.calls.source).toEqual([]);
});

const invalidMetadata = [
  ['', 'Expected one exact HERMES_VERSION_NAME'],
  ['UNREADABLE', 'EACCES'],
  ['HERMES_VERSION_NAME=^1.2.3', 'Expected one exact HERMES_VERSION_NAME'],
  [
    'HERMES_VERSION_NAME=1.2.3\nHERMES_VERSION_NAME=1.2.3',
    'Expected one exact HERMES_VERSION_NAME',
  ],
];

describe.each(['download-hermes', 'resolve-commit'])('%s', command => {
  test.each(invalidMetadata)(
    'CI fails invalid metadata before any helper call: %s',
    (properties, error) => {
      const result = run([command], {HERMES_TEST_PROPERTIES: properties});
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(error);
      expect(result.output).toBe('');
      expect(result.urls).toEqual([]);
      expect(result.calls).toEqual({source: [], nightly: []});
      expect(result.stdout).not.toContain('will build from source');
    },
  );

  test('CI fails when the selected V1 key is missing', () => {
    const result = run([command], {
      RCT_HERMES_V1_ENABLED: '1',
      HERMES_TEST_PROPERTIES: 'HERMES_VERSION_NAME=1000.0.0',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Expected one exact HERMES_V1_VERSION_NAME',
    );
    expect(result.output).toBe('');
    expect(result.urls).toEqual([]);
    expect(result.calls).toEqual({source: [], nightly: []});
  });
});

test('CI selects source without a download when version.properties is missing', () => {
  const result = run(['download-hermes'], {HERMES_TEST_PROPERTIES: 'MISSING'});
  expect(result.status).toBe(0);
  expect(result.output).toBe('');
  expect(result.stdout).toContain('will build from source');
  expect(result.urls).toEqual([]);
  expect(result.calls).toEqual({source: [], nightly: []});
});

test.each([
  [undefined, 'HERMES_VERSION_NAME', undefined],
  ['0', 'HERMES_VERSION_NAME', undefined],
  [
    '1',
    'HERMES_V1_VERSION_NAME',
    'HERMES_VERSION_NAME=123.4.56\nHERMES_V1_VERSION_NAME=1000.0.0',
  ],
])('CI selected sentinel for flag %s', (flag, key, properties) => {
  const overrides = {
    ...(flag == null ? {} : {RCT_HERMES_V1_ENABLED: flag}),
    ...(properties == null ? {} : {HERMES_TEST_PROPERTIES: properties}),
  };

  const download = run(['download-hermes'], overrides);
  expect(download.status).toBe(0);
  expect(download.stdout).toContain(`Using ${key}=1000.0.0`);
  expect(download.output).toBe('');
  expect(download.urls).toEqual([]);
  expect(download.calls).toEqual({source: [], nightly: []});

  const resolve = run(['resolve-commit'], overrides);
  expect(resolve.status).toBe(0);
  expect(resolve.stdout).toContain(`Using ${key}=1000.0.0`);
  expect(resolve.stdout).toContain('2026-01-05 12:34:56 +0000');
  expect(resolve.output).toBe(`hermes-commit=${sourceCommit}\n`);
  expect(resolve.urls).toEqual([]);
  expect(resolve.calls).toEqual({source: [[]], nightly: []});
});

test('CI source resolution uses the current helper SHA for the cache output', () => {
  const commit = 'abcdef1234567890abcdef1234567890abcdef12';
  const result = run(['resolve-commit'], {HERMES_TEST_COMMIT: commit});
  expect(result.status).toBe(0);
  expect(result.output).toBe(`hermes-commit=${commit}\n`);
  expect(result.calls).toEqual({source: [[]], nightly: []});
});

test('CI fails source resolution without falling back to a tag', () => {
  const result = run(['resolve-commit'], {
    HERMES_TEST_SOURCE_ERROR: 'Cannot resolve merge-base timestamp',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Cannot resolve merge-base timestamp');
  expect(result.output).toBe('');
  expect(result.urls).toEqual([]);
  expect(result.calls).toEqual({source: [[]], nightly: []});
});

test.each([
  [undefined, '.hermesversion', 'MISSING'],
  ['0', '.hermesversion', 'MISSING'],
  ['1', '.hermesv1version', 'MISSING'],
  [undefined, '.hermesversion', 'HERMES_VERSION_NAME=123.4.56'],
  [
    '0',
    '.hermesversion',
    'HERMES_VERSION_NAME=123.4.56\nHERMES_V1_VERSION_NAME=1000.0.0',
  ],
  ['1', '.hermesv1version', undefined],
])(
  'CI resolve-commit reads flag %s tag %s independently of metadata %s',
  (flag, tagFile, properties) => {
    const result = run(['resolve-commit'], {
      ...(flag == null ? {} : {RCT_HERMES_V1_ENABLED: flag}),
      ...(properties == null ? {} : {HERMES_TEST_PROPERTIES: properties}),
    });
    const tag = fs
      .readFileSync(
        path.join(root, 'packages/react-native/sdks', tagFile),
        'utf8',
      )
      .trim();
    expect(result.status).toBe(0);
    expect(result.output).toBe(`hermes-commit=${tag}\n`);
    expect(result.urls).toEqual([]);
    expect(result.calls).toEqual({source: [], nightly: []});
  },
);
