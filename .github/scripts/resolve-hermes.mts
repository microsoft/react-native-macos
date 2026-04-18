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
import { $, echo, fs, path } from 'zx';

// Import library functions from the react-native package
const {
  downloadUpstreamHermesTarball,
  hermesCommitAtMergeBase,
} = require('../../packages/react-native/scripts/ios-prebuild/microsoft-resolveHermes.js');

function setActionOutput(key: string, value: string) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`);
  }
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

const command = process.argv[2];
const args = process.argv.slice(3);

if (command === 'download-hermes') {
  const buildType = args[0] || 'Debug';
  const result = await downloadUpstreamHermesTarball(buildType);
  if (result != null) {
    setActionOutput('tarball', result.tarballPath);
    setActionOutput('version', result.version);
    echo(`Downloaded upstream Hermes tarball for version ${result.version}`);
  } else {
    echo('No upstream tarball available');
  }
} else if (command === 'recompose-xcframework') {
  const [tarball, destroot] = args;
  if (!tarball || !destroot) {
    echo('Usage: node resolve-hermes.mts recompose-xcframework <tarball> <destroot>');
    process.exit(1);
  }
  const recomposed = await recomposeHermesXcframework(tarball, destroot);
  setActionOutput('recomposed', String(recomposed));
} else if (command === 'resolve-commit') {
  const { commit } = hermesCommitAtMergeBase();
  setActionOutput('hermes-commit', commit);
  echo(`Resolved Hermes commit: ${commit}`);
} else {
  echo(`Unknown command: ${command ?? '(none)'}. Available: download-hermes, recompose-xcframework, resolve-commit`);
  process.exit(1);
}
