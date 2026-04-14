/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * [macOS] Handles version resolution for macOS fork branches.
 *
 * @flow
 * @format
 */

const {createLogger} = require('./utils');
const {execSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
 * Finds the Hermes commit at the merge base with facebook/react-native.
 * Used on the main branch (1000.0.0) where no prebuilt artifacts exist.
 *
 * Since react-native-macos lags slightly behind facebook/react-native, we can't always use
 * the latest Hermes commit because Hermes and JSI don't always guarantee backwards compatibility.
 * Instead, we take the commit hash of Hermes at the time of the merge base with facebook/react-native.
 *
 * This is the JavaScript equivalent of the Ruby `hermes_commit_at_merge_base`
 * in sdks/hermes-engine/hermes-utils.rb.
 */
function hermesCommitAtMergeBase() /*: {| commit: string, timestamp: string |} */ {
  const HERMES_GITHUB_URL = 'https://github.com/facebook/hermes.git';

  // Fetch upstream react-native
  macosLog('Fetching facebook/react-native to find merge base...');
  try {
    execSync('git fetch -q https://github.com/facebook/react-native.git', {
      stdio: 'pipe',
    });
  } catch (e) {
    abort(
      '[Hermes] Failed to fetch facebook/react-native into the local repository.',
    );
  }

  // Find merge base between our HEAD and upstream's HEAD
  const mergeBase = execSync('git merge-base FETCH_HEAD HEAD', {
    encoding: 'utf8',
  }).trim();
  if (!mergeBase) {
    abort(
      "[Hermes] Unable to find the merge base between our HEAD and upstream's HEAD.",
    );
  }

  // Get timestamp of merge base
  const timestamp = execSync(`git show -s --format=%ci ${mergeBase}`, {
    encoding: 'utf8',
  }).trim();
  if (!timestamp) {
    abort(
      `[Hermes] Unable to extract the timestamp for the merge base (${mergeBase}).`,
    );
  }

  // Clone Hermes bare (minimal) into a temp directory and find the commit
  macosLog(
    `Merge base timestamp: ${timestamp}. Cloning Hermes to find matching commit...`,
  );
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-'));
  const hermesGitDir = path.join(tmpDir, 'hermes.git');

  try {
    // Explicitly use Hermes 'main' branch since the default branch changed to 'static_h' (Hermes V1)
    execSync(
      `git clone -q --bare --filter=blob:none --single-branch --branch main ${HERMES_GITHUB_URL} "${hermesGitDir}"`,
      {stdio: 'pipe', timeout: 120000},
    );

    // Find the Hermes commit at the time of the merge base on branch 'main'
    const commit = execSync(
      `git --git-dir="${hermesGitDir}" rev-list -1 --before="${timestamp}" refs/heads/main`,
      {encoding: 'utf8'},
    ).trim();

    if (!commit) {
      abort(
        `[Hermes] Unable to find the Hermes commit hash at time ${timestamp} on branch 'main'.`,
      );
    }

    macosLog(
      `Using Hermes commit from the merge base with facebook/react-native: ${commit} (timestamp: ${timestamp})`,
    );
    return {commit, timestamp};
  } finally {
    // Clean up temp directory
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }
}

/**
 * Finds the upstream react-native version at the merge base with facebook/react-native.
 * Falls back to null if the version at merge base is also 1000.0.0 (i.e. merge base is
 * on upstream main, not a release branch).
 */
function findVersionAtMergeBase() /*: ?string */ {
  try {
    // hermesCommitAtMergeBase() already fetches facebook/react-native, but we
    // might not have FETCH_HEAD if this runs standalone. Fetch it.
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

function abort(message /*: string */) {
  macosLog(message, 'error');
  throw new Error(message);
}

module.exports = {
  findMatchingHermesVersion,
  hermesCommitAtMergeBase,
  findVersionAtMergeBase,
  getLatestStableVersionFromNPM,
};
