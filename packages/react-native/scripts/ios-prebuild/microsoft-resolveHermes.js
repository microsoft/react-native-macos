/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * [macOS] Resolves Hermes artifacts for macOS fork branches.
 *
 * Handles downloading upstream Hermes tarballs, recomposing xcframeworks
 * to include the macOS slice, and resolving Hermes commits for
 * build-from-source fallback. Used as both a library and CLI:
 *
 *   node microsoft-resolveHermes.js download-hermes [Debug|Release]
 *   node microsoft-resolveHermes.js recompose-xcframework <tarball> <destroot>
 *   node microsoft-resolveHermes.js resolve-commit
 *
 * @flow
 * @format
 */

/*:: import type {BuildFlavor} from './types'; */

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
 * Downloads the upstream Hermes tarball from Maven or Sonatype.
 * The caller is responsible for extracting and recomposing the
 * xcframework (e.g. adding the macOS slice to the universal).
 *
 * Tries multiple version resolution strategies in order:
 * 1. Mapped version from peerDependencies (stable branches)
 * 2. Version at merge base with facebook/react-native (main branch)
 * 3. Latest stable version from npm (last resort)
 *
 * Returns {tarballPath, version} on success, or null if no tarball is available.
 */
async function downloadUpstreamHermesTarball(
  buildType /*: BuildFlavor */ = 'Debug',
) /*: Promise<?{| tarballPath: string, version: string |}> */ {
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
    macosLog(
      'Could not determine any upstream version to download Hermes tarball',
    );
    return null;
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
        `Trying upstream Hermes tarball (version: ${version}, ${buildType}) at ${tarballUrl}...`,
      );

      try {
        const response /*: Response */ = await fetch(tarballUrl);
        if (!response.ok) {
          macosLog(
            `Tarball not available: ${response.status} ${response.statusText}`,
          );
          continue;
        }

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-'));
        const tarballPath = path.join(tmpDir, 'hermes-ios.tar.gz');
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tarballPath, Buffer.from(buffer));

        macosLog(
          `Downloaded upstream Hermes tarball (${version}) to ${tarballPath}`,
        );
        return {tarballPath, version};
      } catch (e) {
        macosLog(`Error downloading tarball for ${version}: ${e.message}`);
        continue;
      }
    }
  }

  macosLog(
    'No upstream Hermes tarball found for any candidate version — will build from source.',
  );
  return null;
}

/**
 * Extracts an upstream Hermes tarball and recomposes the xcframework to include
 * the macOS slice, if needed.
 *
 * Upstream tarballs ship a universal xcframework (iOS, simulator, catalyst,
 * tvOS, visionOS) plus a standalone macosx/hermes.framework. This function
 * merges the standalone macOS framework into the universal xcframework using
 * `xcodebuild -create-xcframework`.
 *
 * NOTE: Once upstream Hermes includes macOS in the universal xcframework
 * natively, this function will detect the existing macOS slice and skip
 * the recompose. At that point, this step can be removed entirely.
 *
 * Returns true if the xcframework was recomposed (or already had macOS),
 * false if the tarball is missing the macOS framework entirely.
 */
function recomposeHermesXcframework(
  tarballPath /*: string */,
  destroot /*: string */,
) /*: boolean */ {
  // Extract tarball
  fs.mkdirSync(destroot, {recursive: true});
  execSync(`tar -xzf "${tarballPath}" -C "${destroot}" --strip-components=2`, {
    stdio: 'inherit',
  });

  const frameworksDir = path.join(destroot, 'Library', 'Frameworks');
  const xcfwPath = path.join(frameworksDir, 'universal', 'hermes.xcframework');

  macosLog('Upstream tarball contents:');
  execSync(`ls -la "${frameworksDir}"`, {stdio: 'inherit'});

  // Check if macOS is already in the universal xcframework — if so, no recompose needed
  const xcfwContents = fs.readdirSync(xcfwPath);
  const hasMacSlice = xcfwContents.some(
    entry => entry.startsWith('macos') && entry.includes('arm64'),
  );
  if (hasMacSlice) {
    macosLog('macOS slice already present in universal xcframework, skipping recompose');
    // Clean up standalone macOS dir if it exists
    const standaloneMacDir = path.join(frameworksDir, 'macosx');
    if (fs.existsSync(standaloneMacDir)) {
      fs.rmSync(standaloneMacDir, {recursive: true, force: true});
    }
    return true;
  }

  // Check for standalone macOS framework
  const standaloneMacFw = path.join(frameworksDir, 'macosx', 'hermes.framework');
  if (!fs.existsSync(standaloneMacFw)) {
    macosLog('Upstream tarball missing macosx/hermes.framework', 'error');
    return false;
  }

  // Collect existing frameworks from inside the universal xcframework
  const frameworks /*: string[] */ = [];
  for (const entry of xcfwContents) {
    const fwPath = path.join(xcfwPath, entry, 'hermes.framework');
    if (fs.existsSync(fwPath) && fs.statSync(fwPath).isDirectory()) {
      macosLog(`Found slice: ${fwPath}`);
      frameworks.push('-framework', fwPath);
    }
  }

  // Add the standalone macOS framework
  macosLog(`Found standalone macOS slice: ${standaloneMacFw}`);
  frameworks.push('-framework', standaloneMacFw);

  // Build new xcframework at a temp path (frameworks reference paths inside the old xcfw)
  const xcfwNew = path.join(frameworksDir, 'universal', 'hermes-new.xcframework');
  macosLog(
    `Creating new universal xcframework with ${frameworks.filter(f => f !== '-framework').length} slices...`,
  );
  execSync(
    `xcodebuild -create-xcframework ${frameworks.map(f => `"${f}"`).join(' ')} -output "${xcfwNew}" -allow-internal-distribution`,
    {stdio: 'inherit'},
  );

  // Swap in the recomposed xcframework
  fs.rmSync(xcfwPath, {recursive: true, force: true});
  fs.renameSync(xcfwNew, xcfwPath);

  // Clean up standalone macOS dir (now included in universal)
  fs.rmSync(path.join(frameworksDir, 'macosx'), {recursive: true, force: true});

  macosLog('Recomposed xcframework:');
  execSync(`ls -la "${xcfwPath}/"`, {stdio: 'inherit'});

  return true;
}

function abort(message /*: string */) {
  macosLog(message, 'error');
  throw new Error(message);
}

/**
 * Appends a key=value pair to the GitHub Actions output file ($GITHUB_OUTPUT).
 * No-op if $GITHUB_OUTPUT is not set (e.g. running locally).
 */
function setActionOutput(key /*: string */, value /*: string */) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`);
  }
}

// CLI entry point — writes results to $GITHUB_OUTPUT for GitHub Actions.
// Usage:
//   node microsoft-resolveHermes.js download-hermes [Debug|Release]
//   node microsoft-resolveHermes.js recompose-xcframework <tarball> <destroot>
//   node microsoft-resolveHermes.js resolve-commit
if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);

  if (command === 'download-hermes') {
    const buildType = args[0] || 'Debug';
    downloadUpstreamHermesTarball(buildType).then(result => {
      if (result != null) {
        setActionOutput('tarball', result.tarballPath);
        setActionOutput('version', result.version);
        macosLog(
          `Downloaded upstream Hermes tarball for version ${result.version}`,
        );
      } else {
        macosLog('No upstream tarball available');
      }
    });
  } else if (command === 'recompose-xcframework') {
    const [tarball, destroot] = args;
    if (!tarball || !destroot) {
      console.error(
        'Usage: node microsoft-resolveHermes.js recompose-xcframework <tarball> <destroot>',
      );
      process.exit(1);
    }
    const recomposed = recomposeHermesXcframework(tarball, destroot);
    setActionOutput('recomposed', String(recomposed));
  } else if (command === 'resolve-commit') {
    const {commit} = hermesCommitAtMergeBase();
    setActionOutput('hermes-commit', commit);
    macosLog(`Resolved Hermes commit: ${commit}`);
  } else {
    console.error(
      `Unknown command: ${command ?? '(none)'}. Available: download-hermes, recompose-xcframework, resolve-commit`,
    );
    process.exit(1);
  }
}

module.exports = {
  findMatchingHermesVersion,
  hermesCommitAtMergeBase,
  findVersionAtMergeBase,
  getLatestStableVersionFromNPM,
  downloadUpstreamHermesTarball,
  recomposeHermesXcframework,
};
