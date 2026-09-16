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

const {parseHermesMetadata, readHermesMetadata} = require('../hermes-version');

const properties =
  'HERMES_VERSION_NAME=0.14.0\nHERMES_V1_VERSION_NAME=250829098.0.2\n';

test.each([
  ['legacy-default', undefined, false],
  ['legacy-default', '0', false],
  ['legacy-default', '1', true],
  ['legacy-default', '', false],
  ['legacy-default', 'true', false],
  ['v1-default', undefined, true],
  ['v1-default', '0', false],
  ['v1-default', '1', true],
  ['v1-default', '', true],
  ['v1-default', 'true', true],
  ['single', undefined, false],
  ['single', '0', false],
  ['single', '1', false],
])('%s with flag %s selects the exact key and tag file', (policy, flag, v1) => {
  expect(parseHermesMetadata(properties, policy, flag)).toEqual({
    version: v1 ? '250829098.0.2' : '0.14.0',
    versionKey: v1 ? 'HERMES_V1_VERSION_NAME' : 'HERMES_VERSION_NAME',
    tagFile: v1 ? '.hermesv1version' : '.hermesversion',
  });
});

test('the pure parser defaults to legacy without reading the environment', () => {
  const previous = process.env.RCT_HERMES_V1_ENABLED;
  try {
    process.env.RCT_HERMES_V1_ENABLED = '1';
    expect(parseHermesMetadata(properties).version).toBe('0.14.0');
  } finally {
    if (previous == null) {
      delete process.env.RCT_HERMES_V1_ENABLED;
    } else {
      process.env.RCT_HERMES_V1_ENABLED = previous;
    }
  }
});

test.each([
  '0.14.0',
  '250829098.0.2',
  '1.2.3-rc.1',
  '1.2.3+build.1',
  '1000.0.0',
])('accepts exact version %s with comments, whitespace and CRLF', version => {
  expect(
    parseHermesMetadata(
      `# Hermes pin\r\n! comment\r\n OTHER_KEY=ignored\r\n HERMES_VERSION_NAME = ${version} \r\n`,
    ).version,
  ).toBe(version);
});

test.each([
  '',
  'HERMES_V1_VERSION_NAME=1.2.3',
  'OTHER_HERMES_VERSION_NAME=1.2.3',
  '# HERMES_VERSION_NAME=1.2.3',
  'HERMES_VERSION_NAME=',
  'HERMES_VERSION_NAME=nightly',
  'HERMES_VERSION_NAME=latest-v1',
  'HERMES_VERSION_NAME=^1.2.3',
  'HERMES_VERSION_NAME=~1.2.3',
  'HERMES_VERSION_NAME=1.2.x',
  'HERMES_VERSION_NAME=>=1.2.3',
  'HERMES_VERSION_NAME=1.2.3 || 2.0.0',
  'HERMES_VERSION_NAME=v1.2.3',
  'HERMES_VERSION_NAME=01.2.3',
  'HERMES_VERSION_NAME=1.2.3-01',
  'HERMES_VERSION_NAME=1.2.3=invalid',
  'HERMES_VERSION_NAME=1.2.3 # comment',
  'HERMES_VERSION_NAME=1.2.3\n HERMES_VERSION_NAME = 1.2.3',
  'HERMES_VERSION_NAME=1.2.3\nHERMES_VERSION_NAME=2.0.0',
])('rejects invalid selected metadata: %s', input => {
  expect(() => parseHermesMetadata(input)).toThrow(
    'Expected one exact HERMES_VERSION_NAME',
  );
});

test('validates only the selected key without a fallback to another key', () => {
  const input = 'HERMES_VERSION_NAME=invalid\nHERMES_V1_VERSION_NAME=1.2.3';
  expect(parseHermesMetadata(input, 'legacy-default', '1').version).toBe(
    '1.2.3',
  );
  expect(() => parseHermesMetadata(input)).toThrow('HERMES_VERSION_NAME');
  expect(() =>
    parseHermesMetadata('HERMES_VERSION_NAME=1.2.3', 'v1-default'),
  ).toThrow('HERMES_V1_VERSION_NAME');
  expect(() =>
    parseHermesMetadata(
      `${properties}HERMES_V1_VERSION_NAME=1.2.3`,
      'v1-default',
    ),
  ).toThrow('HERMES_V1_VERSION_NAME');
});

test('rejects an unknown policy', () => {
  expect(() => parseHermesMetadata(properties, 'guess')).toThrow(
    'Unknown Hermes metadata policy',
  );
});

test('reads main metadata relative to the helper', () => {
  expect(readHermesMetadata('legacy-default', '0').version).toBe('0.14.0');
  expect(readHermesMetadata('legacy-default', '1').version).toBe(
    '250829098.0.2',
  );
});
