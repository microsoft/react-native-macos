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
import { createRequire } from 'node:module';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { $, echo, fs, path } from 'zx';

// Use createRequire to import CommonJS modules from ESM context
const require = createRequire(import.meta.url);
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
 * Reads the Hermes artifact version from
 * packages/react-native/sdks/hermes-engine/version.properties.
 *
 * Returns HERMES_V1_VERSION_NAME when RCT_HERMES_V1_ENABLED=1, otherwise
 * HERMES_VERSION_NAME. Returns null if the file or the key is missing.
 */
function resolveHermesArtifactVersion(): string | null {
  const propsPath = path.resolve(
    import.meta.dirname!, '..', '..',
    'packages', 'react-native', 'sdks', 'hermes-engine', 'version.properties',
  );
  try {
    const props: Record<string, string> = {};
    for (const line of fs.readFileSync(propsPath, 'utf8').split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) {
        props[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      }
    }
    const key =
      process.env.RCT_HERMES_V1_ENABLED === '1'
        ? 'HERMES_V1_VERSION_NAME'
        : 'HERMES_VERSION_NAME';
    const version = props[key];
    return version != null && version.length > 0 ? version : null;
  } catch {
    return null;
  }
}

/**
 * Reads the pinned Hermes tag from packages/react-native/sdks/.hermesversion
 * (or .hermesv1version when RCT_HERMES_V1_ENABLED=1). The value is a git tag in
 * facebook/hermes. Returns null if the file is missing or empty.
 */
function resolveHermesTag(): string | null {
  const tagFile =
    process.env.RCT_HERMES_V1_ENABLED === '1'
      ? '.hermesv1version'
      : '.hermesversion';
  const tagPath = path.resolve(
    import.meta.dirname!, '..', '..',
    'packages', 'react-native', 'sdks', tagFile,
  );
  try {
    const tag = fs.readFileSync(tagPath, 'utf8').trim();
    return tag.length > 0 ? tag : null;
  } catch {
    return null;
  }
}

/**
 * Downloads the prebuilt Hermes tarball from Maven (release) or Sonatype
 * snapshots (nightly), under com/facebook/hermes/hermes-ios/<version>.
 *
 * Returns {tarballPath, version} on success, or null if no tarball is available
 * (callers then build Hermes from source).
 */
async function downloadUpstreamHermesTarball(
  buildType: string = 'Debug',
): Promise<{ tarballPath: string; version: string } | null> {
  const version = resolveHermesArtifactVersion();
  if (version == null) {
    echo('Could not read Hermes version from sdks/hermes-engine/version.properties');
    return null;
  }

  const mavenRepoUrl = 'https://repo1.maven.org/maven2';
  const namespace = 'com/facebook/hermes';
  const flavor = buildType.toLowerCase();

  const releaseUrl = `${mavenRepoUrl}/${namespace}/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-${flavor}.tar.gz`;
  const nightlyUrl = await computeNightlyTarballURL(
    version,
    buildType,
    'hermes-ios',
    `hermes-ios-${flavor}.tar.gz`,
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

  echo('No upstream Hermes tarball found — will build from source.');
  return null;
}

/**
 * Extracts an upstream Hermes tarball and recomposes the xcframework to include
 * the macOS slice, if needed.
 *
 * The tarball ships a universal `hermesvm.xcframework` (iOS, simulator,
 * catalyst, tvOS, visionOS) plus a standalone `macosx/hermesvm.framework`. This
 * merges the standalone macOS framework into the universal xcframework using
 * `xcodebuild -create-xcframework`.
 *
 * NOTE: The universal xcframework gained a native macOS slice in Hermes V1
 * 250829098.0.15 (facebook/hermes#1971); the V0 line (0.14.x) does not include
 * it. When the tarball already contains a macOS slice this detects it and skips
 * the recompose, so once the pinned versions include it natively this step can
 * be removed entirely.
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
  const xcfwPath = path.join(frameworksDir, 'universal', 'hermesvm.xcframework');

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
  const standaloneMacFw = path.join(frameworksDir, 'macosx', 'hermesvm.framework');
  if (!fs.existsSync(standaloneMacFw)) {
    echo('ERROR: Upstream tarball missing macosx/hermesvm.framework');
    return false;
  }

  // Collect existing frameworks from inside the universal xcframework
  const frameworkArgs: string[] = [];
  for (const entry of xcfwContents) {
    const fwPath = path.join(xcfwPath, entry, 'hermesvm.framework');
    if (fs.existsSync(fwPath) && fs.statSync(fwPath).isDirectory()) {
      echo(`Found slice: ${fwPath}`);
      frameworkArgs.push('-framework', fwPath);
    }
  }

  // Add the standalone macOS framework
  echo(`Found standalone macOS slice: ${standaloneMacFw}`);
  frameworkArgs.push('-framework', standaloneMacFw);

  // Build new xcframework at a temp path (frameworks reference paths inside the old xcfw)
  const xcfwNew = path.join(frameworksDir, 'universal', 'hermesvm-new.xcframework');
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
    const tag = resolveHermesTag();
    if (tag == null) {
      echo('Could not read pinned Hermes tag from sdks/.hermesversion or sdks/.hermesv1version');
      process.exit(1);
    }
    setActionOutput('hermes-commit', tag);
    echo(`Resolved Hermes tag: ${tag}`);
    break;
  }
  default:
    echo(`Unknown command: ${command ?? '(none)'}. Available: download-hermes, recompose-xcframework, resolve-commit`);
    process.exit(1);
}
