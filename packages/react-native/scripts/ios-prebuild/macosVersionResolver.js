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

const {computeNightlyTarballURL, createLogger} = require('./utils');
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

/**
 * Checks whether the upstream Hermes tarball (from Maven) already contains
 * macOS slices. If it does, we can skip building Hermes from source entirely.
 *
 * Tries multiple version resolution strategies in order:
 * 1. Mapped version from peerDependencies (stable branches)
 * 2. Version at merge base with facebook/react-native (main branch)
 * 3. Latest stable version from npm (last resort)
 *
 * Returns {hasMacOS: boolean, tarballPath?: string, version?: string}.
 * When hasMacOS is true, tarballPath points to the downloaded tarball and
 * version is the upstream version string used for the lookup.
 */
async function checkUpstreamHermesHasMacOS(
  buildType /*: string */ = 'Debug',
) /*: Promise<{| hasMacOS: boolean, tarballPath?: string, version?: string |}> */ {
  const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');

  // Build a list of candidate versions to try (in priority order)
  const candidates /*: string[] */ = [];

  const mapped = findMatchingHermesVersion(packageJsonPath);
  if (mapped != null) {
    candidates.push(mapped);
  }

  const mergeBaseVersion = findVersionAtMergeBase();
  if (mergeBaseVersion != null && !candidates.includes(mergeBaseVersion)) {
    candidates.push(mergeBaseVersion);
  }

  try {
    const latestStable = await getLatestStableVersionFromNPM();
    if (!candidates.includes(latestStable)) {
      candidates.push(latestStable);
    }
  } catch (_) {
    // npm lookup failed, continue with what we have
  }

  if (candidates.length === 0) {
    macosLog('Could not determine any upstream version to check Hermes tarball');
    return {hasMacOS: false};
  }

  const mavenRepoUrl = 'https://repo1.maven.org/maven2';
  const namespace = 'com/facebook/react';

  for (const version of candidates) {
    // Try both Maven release and nightly (Sonatype snapshot) URLs
    const releaseUrl = `${mavenRepoUrl}/${namespace}/react-native-artifacts/${version}/react-native-artifacts-${version}-hermes-ios-${buildType.toLowerCase()}.tar.gz`;
    const nightlyUrl = await computeNightlyTarballURL(
      version,
      buildType,
      'react-native-artifacts',
      `hermes-ios-${buildType.toLowerCase()}.tar.gz`,
    );
    const urlsToTry = [releaseUrl];
    if (nightlyUrl) {
      urlsToTry.push(nightlyUrl);
    }

    for (const tarballUrl of urlsToTry) {
      macosLog(
        `Checking upstream Hermes tarball (version: ${version}, ${buildType}) at ${tarballUrl}...`,
      );

      // Check if the tarball exists
      try {
        const headResponse = await fetch(tarballUrl, {method: 'HEAD'});
        if (headResponse.status !== 200) {
          macosLog(`Tarball not found, trying next URL...`);
          continue;
        }
      } catch (_) {
        macosLog('Failed to reach server, trying next URL...');
        continue;
      }

      // Download the tarball to a temp directory
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-check-'));
      const tarballPath = path.join(tmpDir, 'hermes-ios.tar.gz');

      try {
        macosLog(`Downloading upstream tarball...`);
        const response = await fetch(tarballUrl);
        if (!response.ok) {
          macosLog(
            `Download failed: ${response.status} ${response.statusText}`,
          );
          fs.rmSync(tmpDir, {recursive: true, force: true});
          continue;
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tarballPath, Buffer.from(buffer));

        // List tarball contents and check for macosx slice
        const listing = execSync(`tar -tzf "${tarballPath}" 2>/dev/null`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        });

        const hasMacOS = listing
          .split('\n')
          .some(
            entry => entry.includes('/macosx/') || entry.includes('/macosx'),
          );

        if (hasMacOS) {
          macosLog(
            `Upstream Hermes tarball (${version}) contains macOS slices — build from source can be skipped!`,
          );
          return {hasMacOS: true, tarballPath, version};
        } else {
          macosLog(
            `Upstream Hermes tarball (${version}) does NOT contain macOS slices.`,
          );
          fs.rmSync(tmpDir, {recursive: true, force: true});
          // Don't try other versions — if the tarball exists but lacks macOS,
          // older versions won't help since macOS was always included.
          return {hasMacOS: false};
        }
      } catch (e) {
        macosLog(`Error checking tarball for ${version}: ${e.message}`);
        try {
          fs.rmSync(tmpDir, {recursive: true, force: true});
        } catch (_) {}
        continue;
      }
    }
  }

  macosLog(
    'No upstream Hermes tarball found for any candidate version — will build from source.',
  );
  return {hasMacOS: false};
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
  checkUpstreamHermesHasMacOS,
};
