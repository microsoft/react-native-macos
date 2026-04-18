#!/usr/bin/env node
/**
 * CI entry point for resolving Hermes artifacts.
 *
 * Commands:
 *   node resolve-hermes.mts download-hermes [Debug|Release]
 *   node resolve-hermes.mts recompose-xcframework <tarball> <destroot>
 *   node resolve-hermes.mts resolve-commit
 *
 * Each command writes results to $GITHUB_OUTPUT for use in GitHub Actions.
 */
import os from 'node:os';
import { parseArgs } from 'node:util';
import { $, echo, fs, path } from 'zx';

// Import library functions from the react-native package
const {
  findMatchingHermesVersion,
  findVersionAtMergeBase,
  getLatestStableVersionFromNPM,
  hermesCommitAtMergeBase,
} = require('../../packages/react-native/scripts/ios-prebuild/microsoft-hermes.js');
const {
  computeNightlyTarballURL,
} = require('../../packages/react-native/scripts/ios-prebuild/utils.js');

function setActionOutput(key: string, value: string) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`);
  }
}

/**
 * Downloads the upstream Hermes tarball from Maven or Sonatype.
 *
 * Tries multiple version resolution strategies in order:
 * 1. Mapped version from peerDependencies (stable branches)
 * 2. Version at merge base with facebook/react-native (main branch)
 * 3. Latest stable version from npm (last resort)
 *
 * Returns {tarballPath, version} on success, or null if no tarball is available.
 */
async function downloadUpstreamHermesTarball(
  buildType: string = 'Debug',
): Promise<{ tarballPath: string; version: string } | null> {
  const packageJsonPath = path.resolve(
    import.meta.dirname!, '..', '..', 'packages', 'react-native', 'package.json',
  );

  // Build a list of candidate versions to try (in priority order)
  const candidates: string[] = [];

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
  } catch {
    // npm lookup failed, continue with what we have
  }

  if (candidates.length === 0) {
    echo('Could not determine any upstream version to download Hermes tarball');
    return null;
  }

  const mavenRepoUrl = 'https://repo1.maven.org/maven2';
  const namespace = 'com/facebook/react';

  for (const version of candidates) {
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
      echo(`Trying upstream Hermes tarball (version: ${version}, ${buildType}) at ${tarballUrl}...`);

      try {
        const response = await fetch(tarballUrl);
        if (!response.ok) {
          echo(`Tarball not available: ${response.status} ${response.statusText}`);
          continue;
        }

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-'));
        const tarballPath = path.join(tmpDir, 'hermes-ios.tar.gz');
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tarballPath, Buffer.from(buffer));

        echo(`Downloaded upstream Hermes tarball (${version}) to ${tarballPath}`);
        return { tarballPath, version };
      } catch (e: any) {
        echo(`Error downloading tarball for ${version}: ${e.message}`);
        continue;
      }
    }
  }

  echo('No upstream Hermes tarball found for any candidate version — will build from source.');
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
 * Tracking PRs:
 *   - https://github.com/facebook/hermes/pull/1958
 *   - https://github.com/facebook/hermes/pull/1970
 *   - https://github.com/facebook/hermes/pull/1971
 */
async function recomposeHermesXcframework(
  tarballPath: string,
  destroot: string,
): Promise<boolean> {
  // Extract tarball
  fs.mkdirSync(destroot, { recursive: true });
  await $`tar -xzf ${tarballPath} -C ${destroot} --strip-components=2`;

  const frameworksDir = path.join(destroot, 'Library', 'Frameworks');
  const xcfwPath = path.join(frameworksDir, 'universal', 'hermes.xcframework');

  echo('Upstream tarball contents:');
  await $`ls -la ${frameworksDir}`;

  // Check if macOS is already in the universal xcframework — if so, no recompose needed
  const xcfwContents = fs.readdirSync(xcfwPath);
  const hasMacSlice = xcfwContents.some(
    (entry: string) => entry.startsWith('macos') && entry.includes('arm64'),
  );
  if (hasMacSlice) {
    echo('macOS slice already present in universal xcframework, skipping recompose');
    const standaloneMacDir = path.join(frameworksDir, 'macosx');
    if (fs.existsSync(standaloneMacDir)) {
      fs.removeSync(standaloneMacDir);
    }
    return true;
  }

  // Check for standalone macOS framework
  const standaloneMacFw = path.join(frameworksDir, 'macosx', 'hermes.framework');
  if (!fs.existsSync(standaloneMacFw)) {
    echo('ERROR: Upstream tarball missing macosx/hermes.framework');
    return false;
  }

  // Collect existing frameworks from inside the universal xcframework
  const frameworkArgs: string[] = [];
  for (const entry of xcfwContents) {
    const fwPath = path.join(xcfwPath, entry, 'hermes.framework');
    if (fs.existsSync(fwPath) && fs.statSync(fwPath).isDirectory()) {
      echo(`Found slice: ${fwPath}`);
      frameworkArgs.push('-framework', fwPath);
    }
  }

  // Add the standalone macOS framework
  echo(`Found standalone macOS slice: ${standaloneMacFw}`);
  frameworkArgs.push('-framework', standaloneMacFw);

  // Build new xcframework at a temp path (frameworks reference paths inside the old xcfw)
  const xcfwNew = path.join(frameworksDir, 'universal', 'hermes-new.xcframework');
  const sliceCount = frameworkArgs.filter(f => f !== '-framework').length;
  echo(`Creating new universal xcframework with ${sliceCount} slices...`);
  await $`xcodebuild -create-xcframework ${frameworkArgs} -output ${xcfwNew} -allow-internal-distribution`;

  // Swap in the recomposed xcframework
  fs.removeSync(xcfwPath);
  fs.renameSync(xcfwNew, xcfwPath);

  // Clean up standalone macOS dir (now included in universal)
  fs.removeSync(path.join(frameworksDir, 'macosx'));

  echo('Recomposed xcframework:');
  await $`ls -la ${xcfwPath}/`;

  return true;
}

// --- CLI dispatch ---

const { positionals } = parseArgs({
  allowPositionals: true,
  strict: false,
});

const [command, ...args] = positionals;

switch (command) {
  case 'download-hermes': {
    const buildType = args[0] || 'Debug';
    const result = await downloadUpstreamHermesTarball(buildType);
    if (result != null) {
      setActionOutput('tarball', result.tarballPath);
      setActionOutput('version', result.version);
      echo(`Downloaded upstream Hermes tarball for version ${result.version}`);
    } else {
      echo('No upstream tarball available');
    }
    break;
  }
  case 'recompose-xcframework': {
    const [tarball, destroot] = args;
    if (!tarball || !destroot) {
      echo('Usage: node resolve-hermes.mts recompose-xcframework <tarball> <destroot>');
      process.exit(1);
    }
    const recomposed = await recomposeHermesXcframework(tarball, destroot);
    setActionOutput('recomposed', String(recomposed));
    break;
  }
  case 'resolve-commit': {
    const { commit } = hermesCommitAtMergeBase();
    setActionOutput('hermes-commit', commit);
    echo(`Resolved Hermes commit: ${commit}`);
    break;
  }
  default:
    echo(`Unknown command: ${command ?? '(none)'}. Available: download-hermes, recompose-xcframework, resolve-commit`);
    process.exit(1);
}
