/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * [macOS] Library functions for resolving React Native versions used by
 * Hermes-related dependency artifacts.
 *
 * @flow
 * @format
 */

const {createLogger} = require('./utils');
const {execSync} = require('child_process');
const fs = require('fs');

const macosLog = createLogger('macOS');

/**
 * For react-native-macos stable branches, maps the macOS package version
 * to the upstream react-native version using peerDependencies.
 * Returns null for version 1000.0.0 (main branch dev version).
 *
 * This is the JavaScript equivalent of the Ruby `findMatchingHermesVersion`
 * in sdks/hermes-engine/hermes-utils.rb.
 */
function findMatchingHermesVersion(
  packageJsonPath /*: string */,
) /*: ?string */ {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (pkg.version === '1000.0.0') {
    macosLog(
      'Main branch detected (1000.0.0), no matching upstream Hermes version',
    );
    return null;
  }

  if (pkg.peerDependencies && pkg.peerDependencies['react-native']) {
    const upstreamVersion = pkg.peerDependencies['react-native'];
    macosLog(
      `Mapped macOS version ${pkg.version} to upstream RN version: ${upstreamVersion}`,
    );
    return upstreamVersion;
  }

  macosLog(
    'No matching Hermes version found in peerDependencies. Defaulting to package version.',
  );
  return null;
}

/**
 * Finds the upstream react-native version at the merge base with facebook/react-native.
 * Falls back to null if the version at merge base is also 1000.0.0 (i.e. merge base is
 * on upstream main, not a release branch).
 */
function findVersionAtMergeBase() /*: ?string */ {
  try {
    // Ensure facebook/react-native is fetched so FETCH_HEAD is available when
    // this runs standalone.
    execSync('git fetch -q https://github.com/facebook/react-native.git', {
      stdio: 'pipe',
      timeout: 60000,
    });
    const mergeBase = execSync('git merge-base FETCH_HEAD HEAD', {
      encoding: 'utf8',
    }).trim();
    if (!mergeBase) {
      return null;
    }
    // Read the package.json version at the merge base commit
    const pkgJson = execSync(
      `git show ${mergeBase}:packages/react-native/package.json`,
      {encoding: 'utf8'},
    );
    const version = JSON.parse(pkgJson).version;
    // If the merge base is also on main (1000.0.0), this doesn't help
    if (version === '1000.0.0') {
      return null;
    }
    return version;
  } catch (_) {
    return null;
  }
}

async function getLatestStableVersionFromNPM() /*: Promise<string> */ {
  const npmResponse /*: Response */ = await fetch(
    'https://registry.npmjs.org/react-native/latest',
  );

  if (!npmResponse.ok) {
    throw new Error(
      `Couldn't get latest stable version from NPM: ${npmResponse.status} ${npmResponse.statusText}`,
    );
  }

  const json = await npmResponse.json();
  return json.version;
}

module.exports = {
  findMatchingHermesVersion,
  findVersionAtMergeBase,
  getLatestStableVersionFromNPM,
};
