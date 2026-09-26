/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

// [macOS]

'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');

/*::
type HermesPolicy = 'legacy-default' | 'v1-default' | 'single';
type HermesMetadataSelection = {
  versionKey: string,
  tagFile: string,
};
type HermesMetadata = {
  ...HermesMetadataSelection,
  version: string,
};
*/

// Keep policy explicit so later release lines can change their default without
// inferring it from a React Native package version or the available keys.
function selectHermesMetadata(
  policy /*: HermesPolicy */ = 'legacy-default',
  hermesV1Enabled /*: ?string */,
) /*: HermesMetadataSelection */ {
  let useV1;
  switch (policy) {
    case 'legacy-default':
      useV1 = hermesV1Enabled === '1';
      break;
    case 'v1-default':
      useV1 = hermesV1Enabled !== '0';
      break;
    case 'single':
      useV1 = false;
      break;
    default:
      throw new Error(`Unknown Hermes metadata policy: ${policy}`);
  }

  const versionKey = useV1 ? 'HERMES_V1_VERSION_NAME' : 'HERMES_VERSION_NAME';
  const tagFile = useV1 ? '.hermesv1version' : '.hermesversion';
  return {versionKey, tagFile};
}

function parseHermesMetadata(
  properties /*: string */,
  policy /*: HermesPolicy */ = 'legacy-default',
  hermesV1Enabled /*: ?string */,
) /*: HermesMetadata */ {
  const {versionKey, tagFile} = selectHermesMetadata(policy, hermesV1Enabled);
  const entries = properties.split(/\r?\n/).filter(line => {
    const equals = line.indexOf('=');
    return equals !== -1 && line.slice(0, equals).trim() === versionKey;
  });
  const version =
    entries.length === 1
      ? entries[0].slice(entries[0].indexOf('=') + 1).trim()
      : '';
  // semver.valid removes build metadata; retain it in the artifact coordinate.
  // 1000.0.0 is also an exact version. Any release-specific source exception
  // belongs to the caller, not the metadata parser.
  if (!version || semver.valid(version) !== version.replace(/\+.*/, '')) {
    throw new Error(
      `Expected one exact ${versionKey} version in Hermes version.properties`,
    );
  }
  return {version, versionKey, tagFile};
}

function readHermesMetadata(
  policy /*: HermesPolicy */ = 'legacy-default',
  hermesV1Enabled /*: ?string */ = process.env.RCT_HERMES_V1_ENABLED,
) /*: HermesMetadata */ {
  const propertiesPath = path.resolve(
    __dirname,
    '../../sdks/hermes-engine/version.properties',
  );
  return parseHermesMetadata(
    fs.readFileSync(propertiesPath, 'utf8'),
    policy,
    hermesV1Enabled,
  );
}

module.exports = {
  selectHermesMetadata,
  parseHermesMetadata,
  readHermesMetadata,
};
