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
  ]) {
    delete env[key];
  }
  const outputPath = path.join(tmp, 'output');
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--require', preload, script, ...command],
    {
      cwd: tmp,
      env: {...env, TMPDIR: tmp, GITHUB_OUTPUT: outputPath, ...overrides},
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
  return {...result, output, urls};
}

test.each([
  ['0', metadata.HERMES_VERSION_NAME, 'HERMES_VERSION_NAME', 'Debug'],
  ['1', metadata.HERMES_V1_VERSION_NAME, 'HERMES_V1_VERSION_NAME', 'Release'],
])(
  'CI downloads flag %s with the selected key and version',
  (flag, version, key, flavor) => {
    const result = run(['download-hermes', flavor], {
      RCT_HERMES_V1_ENABLED: flag,
      HERMES_TEST_DOWNLOAD: 'release',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Using ${key}=${version}`);
    expect(result.output).toContain(`version=${version}\n`);
    expect(result.urls).toEqual([
      `https://central.sonatype.com/repository/maven-snapshots/com/facebook/hermes/hermes-ios/${version}-SNAPSHOT/maven-metadata.xml`,
      `https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-${flavor.toLowerCase()}.tar.gz`,
    ]);
    const tarball = result.output.match(/^tarball=(.+)$/m)[1];
    expect(fs.readFileSync(tarball, 'utf8')).toBe('mock Hermes archive');
  },
);

test('CI snapshot fallback preserves the four-argument URL helper contract', () => {
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
});

test('CI can still select source when valid pinned artifacts are unavailable', () => {
  const result = run(['download-hermes']);
  expect(result.status).toBe(0);
  expect(result.output).toBe('');
  expect(result.stdout).toContain('will build from source');
  expect(result.urls).toHaveLength(2);
});

test.each([
  ['', 'Expected one exact HERMES_VERSION_NAME'],
  ['UNREADABLE', 'EACCES'],
  ['HERMES_VERSION_NAME=^1.2.3', 'Expected one exact HERMES_VERSION_NAME'],
  [
    'HERMES_VERSION_NAME=1.2.3\nHERMES_VERSION_NAME=1.2.3',
    'Expected one exact HERMES_VERSION_NAME',
  ],
])('CI fails invalid metadata before any download: %s', (properties, error) => {
  const result = run(['download-hermes'], {HERMES_TEST_PROPERTIES: properties});
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(error);
  expect(result.output).toBe('');
  expect(result.urls).toEqual([]);
  expect(result.stdout).not.toContain('will build from source');
});

test('CI selects source without a download when version.properties is missing', () => {
  const result = run(['download-hermes'], {HERMES_TEST_PROPERTIES: 'MISSING'});
  expect(result.status).toBe(0);
  expect(result.output).toBe('');
  expect(result.stdout).toContain('will build from source');
  expect(result.urls).toEqual([]);
});

test.each([
  [undefined, '.hermesversion'],
  ['0', '.hermesversion'],
  ['1', '.hermesv1version'],
])('CI resolve-commit uses the tag file for flag %s', (flag, tagFile) => {
  const result = run(
    ['resolve-commit'],
    flag == null ? {} : {RCT_HERMES_V1_ENABLED: flag},
  );
  const tag = fs
    .readFileSync(
      path.join(root, 'packages/react-native/sdks', tagFile),
      'utf8',
    )
    .trim();
  expect(result.status).toBe(0);
  expect(result.output).toBe(`hermes-commit=${tag}\n`);
  expect(result.urls).toEqual([]);
});

test.each([
  ['0', '.hermesversion', 'MISSING'],
  ['1', '.hermesv1version', 'MISSING'],
  ['1', '.hermesv1version', 'HERMES_VERSION_NAME=123.4.56'],
  ['0', '.hermesversion', 'HERMES_VERSION_NAME=invalid'],
])(
  'CI resolve-commit reads flag %s tag %s independently of metadata %s',
  (flag, tagFile, properties) => {
    const result = run(['resolve-commit'], {
      RCT_HERMES_V1_ENABLED: flag,
      HERMES_TEST_PROPERTIES: properties,
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
  },
);
