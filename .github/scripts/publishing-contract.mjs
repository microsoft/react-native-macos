import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
const semver = require('semver');
const micromatch = require('micromatch');

export const registry = 'https://registry.npmjs.org';

export function parseVersion(version) {
  const parsed = typeof version === 'string' && semver.parse(version);
  if (!parsed || parsed.major === 1000 || !/^\d/.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  return {major: parsed.major, minor: parsed.minor, prerelease: parsed.prerelease.length > 0};
}

export function isStableBranch(branch) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)-stable$/.test(branch);
}

function readWorkspaceEntries(root, run) {
  const output = run('yarn', ['workspaces', 'list', '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  return output.trim().split('\n').map(line => {
    const {location} = JSON.parse(line);
    return {location, pkg: JSON.parse(readFileSync(join(root, location, 'package.json'), 'utf8'))};
  });
}

export function readWorkspaces(root = process.cwd(), run = execFileSync) {
  return readWorkspaceEntries(root, run).map(({pkg}) => pkg);
}

// The init CLI has its own version and release process. Never include all public
// workspaces: only these packages follow the React Native macOS release line.
export function releasePackages(workspaces) {
  return workspaces.filter(pkg => !pkg.private && (
    pkg.name === 'react-native-macos' || pkg.name.startsWith('@react-native-macos/')
  ));
}

export function validateReleaseVersions(workspaces, branch) {
  if (!isStableBranch(branch)) {
    throw new Error(`Expected a stable branch, got: ${branch}`);
  }
  const packages = releasePackages(workspaces);
  const core = packages.find(pkg => pkg.name === 'react-native-macos');
  if (!core) {
    throw new Error('Missing public react-native-macos workspace');
  }
  const version = parseVersion(core.version);
  if (`${version.major}.${version.minor}-stable` !== branch) {
    throw new Error(`Version ${core.version} does not match ${branch}`);
  }
  for (const pkg of packages) {
    parseVersion(pkg.version);
    if (pkg.version !== core.version) {
      throw new Error(`${pkg.name}@${pkg.version} does not match ${core.version}`);
    }
  }
  return packages;
}

export function validateRelease(workspaces, branch) {
  const packages = validateReleaseVersions(workspaces, branch);
  const core = packages.find(pkg => pkg.name === 'react-native-macos');
  const byName = new Map(workspaces.map(pkg => [pkg.name, pkg]));
  const selected = new Set(packages.map(pkg => pkg.name));
  for (const pkg of packages) {
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        const dependency = byName.get(name);
        // Private upstream workspaces are valid registry dependencies only when
        // the manifest contains a registry range, not a local workspace link.
        if (dependency?.private && !name.startsWith('@react-native/')) {
          throw new Error(`${pkg.name} has a private runtime dependency: ${name}`);
        }
        if (/(^|[^\d])1000\./.test(range) || /^(file|link|portal):/.test(range)) {
          throw new Error(`${pkg.name} has an unreleasable ${field} entry: ${name}@${range}`);
        }
        if (range.startsWith('workspace:') && (!dependency || dependency.private || !selected.has(name))) {
          throw new Error(`${pkg.name} has a private or out-of-scope runtime workspace dependency: ${name}`);
        }
        if (selected.has(name) && ![
          core.version, `^${core.version}`, `~${core.version}`,
          'workspace:*', 'workspace:^', 'workspace:~',
          `workspace:${core.version}`, `workspace:^${core.version}`, `workspace:~${core.version}`,
        ].includes(range)) {
          throw new Error(`${pkg.name} has a mismatched runtime dependency: ${name}@${range}`);
        }
      }
    }
  }
  return packages;
}

export async function readChangesetStatus(root = process.cwd(), getReleasePlan = require('@changesets/get-release-plan').default) {
  // Unlike `changeset status`, this API does not default to config.baseBranch.
  // Omit sinceRef to inspect ALL pending Changesets, including empty changesets.
  // Explicit registry dependencies on private upstream workspaces are external
  // releases. Only workspace: links participate in dependency bump propagation.
  const status = await getReleasePlan(root, undefined, {bumpVersionsWithWorkspaceProtocolOnly: true});
  if (!Array.isArray(status.changesets) || !Array.isArray(status.releases)) {
    throw new Error('Invalid Changesets status');
  }
  return status;
}

function changelogSection(changelog, version) {
  const headings = [...changelog.matchAll(/^#{1,2} .+$/gm)];
  const matches = headings.filter(heading => heading[0].trim() === `## ${version}`);
  if (matches.length > 1) throw new Error(`Duplicate changelog section: ${version}`);
  if (!matches.length) return undefined;
  const heading = matches[0];
  const next = headings[headings.indexOf(heading) + 1];
  let section = changelog.slice(heading.index + heading[0].length, next?.index);
  // Removing a comment can reconstruct another comment delimiter.
  while (/<!--[^]*?-->/.test(section)) {
    section = section.replace(/<!--[^]*?-->/g, '');
  }
  return section.replace(/^#{1,6} .+$/gm, '').trim();
}

// A consumed Changeset is valid only when the PR contains the complete release
// evidence. Head branch names are not evidence and never grant an exemption.
export async function validatePreparedVersionPR({
  baseBranch,
  branch = baseBranch.split('/').at(-1),
  root = process.cwd(),
  run = execFileSync,
  getStatus = readChangesetStatus,
}) {
  const status = await getStatus(root);
  if (!Array.isArray(status.changesets) || !Array.isArray(status.releases)) {
    throw new Error('Invalid Changesets status');
  }
  // Keep the normal check for pending releases, including empty Changesets.
  if (status.changesets.length || status.releases.length || !isStableBranch(branch)) return false;

  const git = args => run('git', args, {cwd: root, encoding: 'utf8'});
  const mergeBase = git(['merge-base', baseBranch, 'HEAD']).trim();
  const changed = git(['diff', '--name-only', '--no-renames', '-z', mergeBase, 'HEAD']).split('\0').filter(Boolean);
  const entries = readWorkspaceEntries(root, run);
  const baseFiles = new Set(git(['ls-tree', '-r', '--name-only', '-z', mergeBase]).split('\0'));
  const baseRoot = JSON.parse(git(['show', `${mergeBase}:package.json`]));
  const patterns = Array.isArray(baseRoot.workspaces) ? baseRoot.workspaces : baseRoot.workspaces?.packages ?? [];
  const baseLocations = micromatch([...baseFiles]
    .filter(path => path.endsWith('/package.json'))
    .map(path => path.slice(0, -'/package.json'.length)), patterns, {
    dot: true, ignore: ['**/node_modules/**', '**/.git/**', '**/.yarn/**'],
  });
  const byLocation = new Map(entries.map(({location, pkg}) => [location, pkg]));
  // Current Yarn metadata cannot report a deleted workspace. Use the base root's
  // workspace patterns, not arbitrary fixture manifests, to check lost packages.
  for (const location of ['.', ...baseLocations]) {
    const previous = location === '.' ? baseRoot : JSON.parse(git(['show', `${mergeBase}:${location}/package.json`]));
    if (!previous.private && byLocation.get(location)?.name !== previous.name) {
      throw new Error(`Deleted or moved public workspace: ${previous.name} (${location})`);
    }
  }
  // Use current visibility: a private-to-public workspace needs release evidence.
  const publicChanges = entries.filter(({location, pkg}) => !pkg.private && changed.some(path =>
    location === '.' || path.startsWith(`${location}/`)));
  if (!publicChanges.length) return false;

  const selected = new Set(validateRelease(entries.map(({pkg}) => pkg), branch).map(pkg => pkg.name));
  for (const {location, pkg} of publicChanges) {
    if (!selected.has(pkg.name)) {
      throw new Error(`Changed public package is outside the release group: ${pkg.name}`);
    }
    const manifest = join(location, 'package.json');
    const changelog = join(location, 'CHANGELOG.md');
    if (!baseFiles.has(manifest)) {
      throw new Error(`Missing merge-base version for ${pkg.name}`);
    }
    const previous = JSON.parse(git(['show', `${mergeBase}:${manifest}`]));
    const current = JSON.parse(git(['show', `HEAD:${manifest}`]));
    if (current.version !== pkg.version || current.name !== pkg.name || current.private) {
      throw new Error(`Workspace differs from HEAD: ${pkg.name}`);
    }
    const bootstrap = previous.version === '1000.0.0' && pkg.version === `0.${parseVersion(pkg.version).minor}.0`;
    if (!bootstrap) {
      parseVersion(previous.version);
      if (!semver.gt(pkg.version, previous.version)) {
        throw new Error(`Version must increase for ${pkg.name}: ${previous.version} -> ${pkg.version}`);
      }
    }
    const before = baseFiles.has(changelog) ? git(['show', `${mergeBase}:${changelog}`]) : '';
    if (changelogSection(before, pkg.version) !== undefined ||
        !changed.includes(changelog) || !changelogSection(git(['show', `HEAD:${changelog}`]), pkg.version)) {
      throw new Error(`Missing nonempty new changelog section for ${pkg.name}@${pkg.version}`);
    }
  }
  return true;
}

export async function publishedMetadata(name, fetchRegistry = fetch) {
  const response = await fetchRegistry(`${registry}/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (response.status === 404) return {versions: [], tags: {}};
  if (!response.ok) throw new Error(`Registry query failed for ${name}: ${response.status}`);
  const metadata = await response.json();
  if (!metadata?.versions || typeof metadata.versions !== 'object' || Array.isArray(metadata.versions) ||
      !metadata['dist-tags'] || typeof metadata['dist-tags'] !== 'object' || Array.isArray(metadata['dist-tags'])) {
    throw new Error(`Invalid registry metadata for ${name}`);
  }
  for (const version of [...Object.keys(metadata.versions), ...Object.values(metadata['dist-tags'])]) {
    parseVersion(version);
  }
  return {versions: Object.keys(metadata.versions), tags: metadata['dist-tags']};
}

export function publishTag(version, branch, published) {
  const current = parseVersion(version);
  if (current.prerelease) return 'next';
  const newerLine = published.some(value => {
    const other = parseVersion(value);
    return !other.prerelease && (other.major > current.major ||
      (other.major === current.major && other.minor > current.minor));
  });
  return newerLine ? branch : 'latest';
}

// Never move a tag backwards, even if its current pointer is stale or absent.
// Compare full SemVer (including numeric prerelease identifiers), per package.
export function canAdvanceTag(version, tag, metadata) {
  const target = parseVersion(version);
  const candidates = metadata.versions.filter(value => {
    const other = parseVersion(value);
    if (tag === 'next') return other.prerelease;
    if (tag === 'latest') return !other.prerelease;
    return !other.prerelease && other.major === target.major && other.minor === target.minor;
  });
  if (metadata.tags[tag]) candidates.push(metadata.tags[tag]);
  return candidates.every(value => semver.gte(version, value));
}

export async function createPublishPlan({workspaces, branch, status, getMetadata = publishedMetadata}) {
  if (!Array.isArray(status.changesets) || !Array.isArray(status.releases)) {
    throw new Error('Invalid Changesets status');
  }
  // Even an empty changeset must first pass through the automatic version PR.
  if (status.changesets.length || status.releases.length) {
    return {packages: [], reason: 'Pending Changesets; waiting for the version PR'};
  }
  const packages = validateRelease(workspaces, branch);
  const core = packages.find(pkg => pkg.name === 'react-native-macos');
  const published = new Map();
  for (const pkg of packages) published.set(pkg.name, await getMetadata(pkg.name));
  const tag = publishTag(core.version, branch, published.get(core.name).versions);
  // Validate the complete graph before the first publish, including on retries.
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  const byName = new Map(packages.map(pkg => [pkg.name, pkg]));
  function visit(pkg) {
    if (visited.has(pkg.name)) return;
    if (visiting.has(pkg.name)) throw new Error(`Runtime dependency cycle: ${pkg.name}`);
    visiting.add(pkg.name);
    for (const name of Object.keys({...pkg.dependencies, ...pkg.optionalDependencies})) {
      if (byName.has(name)) visit(byName.get(name));
    }
    visiting.delete(pkg.name);
    visited.add(pkg.name);
    const metadata = published.get(pkg.name);
    const exists = metadata.versions.includes(pkg.version);
    if (!exists) {
      const packageTag = publishTag(pkg.version, branch, metadata.versions);
      if (!canAdvanceTag(pkg.version, packageTag, metadata)) {
        throw new Error(`Refusing non-monotonic publication: ${pkg.name}@${pkg.version} -> ${packageTag}`);
      }
      ordered.push({name: pkg.name, version: pkg.version, tag: packageTag});
    }
  }
  for (const pkg of packages) visit(pkg);
  return {packages: ordered, tag};
}

export function publishPrepared(plan, run = execFileSync) {
  for (const pkg of plan.packages) {
    run('yarn', ['workspace', pkg.name, 'npm', 'publish', '--provenance',
      '--tag', pkg.tag, '--tolerate-republish'], {stdio: 'inherit'});
  }
}
