#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readChangesetStatus, readWorkspaces, releasePackages, validateRelease, validateReleaseVersions} from './publishing-contract.mjs';
import {isCurrentHead} from './check-version-head.mjs';

// Stable branches accept patch releases only. Every coupled package must be in
// the Changesets plan so each changelog describes the version actually published.
export function releaseAlignmentChangeset(workspaces, status) {
  const names = new Set(releasePackages(workspaces).map(pkg => pkg.name));
  const bumped = new Set();
  for (const release of status.releases) {
    if (!names.has(release.name)) continue;
    if (!['none', 'patch'].includes(release.type)) {
      throw new Error(`Stable release policy permits only patch bumps: ${release.name} ${release.type}`);
    }
    if (release.type === 'patch') bumped.add(release.name);
  }
  const missing = [...names].filter(name => !bumped.has(name));
  return bumped.size && missing.length
    ? `---\n${missing.map(name => `"${name}": patch`).join('\n')}\n---\n\nAlign the React Native macOS release with its public workspace packages.\n`
    : undefined;
}

async function prepareReleaseAlignment(workspaces) {
  const contents = releaseAlignmentChangeset(workspaces, await readChangesetStatus());
  if (!contents) return () => {};
  const path = `.changeset/rnm-alignment-${randomUUID()}.md`;
  writeFileSync(path, contents, {flag: 'wx'});
  return () => rmSync(path, {force: true});
}

export async function withReleaseConfig(callback, root = process.cwd()) {
  const path = join(root, '.changeset/config.json');
  const original = readFileSync(path, 'utf8');
  const config = JSON.parse(original);
  // Match the API adapter. Otherwise the CLI refuses explicit registry deps on
  // private upstream workspaces, even though they are not local release edges.
  writeFileSync(path, JSON.stringify({...config, bumpVersionsWithWorkspaceProtocolOnly: true}, null, 2) + '\n');
  try {
    return await callback();
  } finally {
    writeFileSync(path, original);
  }
}

export async function versionWithPostbump({
  run = execFileSync,
  getWorkspaces = readWorkspaces,
  prepareAlignment = prepareReleaseAlignment,
  withConfig = withReleaseConfig,
  branch = process.env.GITHUB_REF_NAME ?? execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim(),
  updateArtifacts = async (version: string) => {
    const {updateReactNativeArtifacts} = await import('../../scripts/releases/set-rn-artifacts-version.js');
    await updateReactNativeArtifacts(version);
  },
} = {}) {
  const before = getWorkspaces();
  validateReleaseVersions(before, branch);
  const oldVersion = before.find(pkg => pkg.name === 'react-native-macos')?.version;
  await withConfig(async () => {
    const cleanup = await prepareAlignment(before);
    try {
      run('yarn', ['changeset', 'version'], {stdio: 'inherit'});
    } finally {
      cleanup();
    }
  });

  // Reject incomplete Changesets alignment before constraints can hide it.
  const versioned = validateReleaseVersions(getWorkspaces(), branch);
  // Apply shared dependency/private-workspace constraints before artifacts. These
  // constraints must not change public release versions after changelog generation.
  run('yarn', ['constraints', '--fix'], {stdio: 'inherit'});
  const packages = validateRelease(getWorkspaces(), branch);
  for (const pkg of versioned) {
    if (packages.find(candidate => candidate.name === pkg.name)?.version !== pkg.version) {
      throw new Error(`Constraints changed the Changesets version of ${pkg.name}`);
    }
  }
  const {version} = packages.find(pkg => pkg.name === 'react-native-macos');
  if (version !== oldVersion) await updateArtifacts(version);

  run('yarn', ['install', '--mode', 'update-lockfile'], {stdio: 'inherit'});
  console.log('Version bump complete');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await versionWithPostbump();
  if (process.env.GITHUB_ACTIONS === 'true' && !isCurrentHead()) {
    throw new Error('Stable branch advanced during the version bump; a newer workflow must update the PR');
  }
}
