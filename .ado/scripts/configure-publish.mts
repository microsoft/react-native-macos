#!/usr/bin/env node
import { $, argv, echo, fs } from 'zx';
import { resolve } from 'node:path';

const NPM_DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
const NPM_TAG_NEXT = 'next';

export type ReleaseState = 'STABLE_IS_LATEST' | 'STABLE_IS_NEW' | 'STABLE_IS_OLD';

export interface ReleaseStateInfo {
  state: ReleaseState;
  currentVersion: number;
  latestVersion: number;
  nextVersion: number;
}

export interface TagInfo {
  npmTags: string[];
  prerelease?: string;
}

interface Options {
  'mock-branch'?: string;
  'skip-auth'?: boolean;
  tag?: string;
  verbose?: boolean;
}

/**
 * Exports a variable, `publish_react_native_macos`, to signal that we want to
 * enable publishing on Azure Pipelines.
 */
function enablePublishingOnAzurePipelines() {
  echo(`##vso[task.setvariable variable=publish_react_native_macos]1`);
}

export function isMainBranch(branch: string): boolean {
  return branch === 'main';
}

export function isStableBranch(branch: string): boolean {
  return /^\d+\.\d+-stable$/.test(branch);
}

export function versionToNumber(version: string): number {
  const [major, minor] = version.split('-')[0].split('.');
  return Number(major) * 1000 + Number(minor);
}

function getTargetBranch(): string | undefined {
  // Azure Pipelines
  if (process.env['TF_BUILD'] === 'True') {
    const targetBranch = process.env['SYSTEM_PULLREQUEST_TARGETBRANCH'];
    return targetBranch?.replace(/^refs\/heads\//, '');
  }

  // GitHub Actions
  if (process.env['GITHUB_ACTIONS'] === 'true') {
    return process.env['GITHUB_BASE_REF'];
  }

  return undefined;
}

async function getCurrentBranch(options: Options): Promise<string> {
  const targetBranch = getTargetBranch();
  if (targetBranch) {
    return targetBranch;
  }

  // Azure DevOps Pipelines
  if (process.env['TF_BUILD'] === 'True') {
    const sourceBranch = process.env['BUILD_SOURCEBRANCHNAME'];
    if (sourceBranch) {
      return sourceBranch.replace(/^refs\/heads\//, '');
    }
  }

  // GitHub Actions
  if (process.env['GITHUB_ACTIONS'] === 'true') {
    const headRef = process.env['GITHUB_HEAD_REF'];
    if (headRef) return headRef;

    const ref = process.env['GITHUB_REF'];
    if (ref) return ref.replace(/^refs\/heads\//, '');
  }

  if (options['mock-branch']) {
    return options['mock-branch'];
  }

  const result = await $`git rev-parse --abbrev-ref HEAD`;
  return result.stdout.trim();
}

function getPublishedVersionSync(tag: 'latest' | 'next'): number {
  const result = $.sync`npm view react-native-macos@${tag} version`;
  return versionToNumber(result.stdout.trim());
}

export function getReleaseState(
  branch: string,
  getVersion: (tag: 'latest' | 'next') => number = getPublishedVersionSync,
): ReleaseStateInfo {
  if (!isStableBranch(branch)) {
    throw new Error('Expected a stable branch');
  }

  const latestVersion = getVersion('latest');
  const nextVersion = getVersion('next');
  const currentVersion = versionToNumber(branch);

  let state: ReleaseState;
  if (currentVersion === latestVersion) {
    state = 'STABLE_IS_LATEST';
  } else if (currentVersion < latestVersion) {
    state = 'STABLE_IS_OLD';
  } else {
    state = 'STABLE_IS_NEW';
  }

  return { state, currentVersion, latestVersion, nextVersion };
}

export function getPublishTags(
  stateInfo: ReleaseStateInfo,
  branch: string,
  tag: string = NPM_TAG_NEXT,
): TagInfo {
  const { state, currentVersion, nextVersion } = stateInfo;

  switch (state) {
    case 'STABLE_IS_LATEST':
      // Patching the current latest version
      return { npmTags: ['latest', branch] };

    case 'STABLE_IS_OLD':
      // Patching an older stable version
      return { npmTags: [branch] };

    case 'STABLE_IS_NEW': {
      if (tag === 'latest') {
        // Promoting this branch to latest
        const npmTags = ['latest', branch];
        if (currentVersion > nextVersion) {
          npmTags.push(NPM_TAG_NEXT);
        }
        return { npmTags };
      }

      // Publishing a release candidate
      if (currentVersion < nextVersion) {
        throw new Error(
          `Current version cannot be a release candidate because it is too old: ${currentVersion} < ${nextVersion}`,
        );
      }

      return { npmTags: [NPM_TAG_NEXT], prerelease: 'rc' };
    }
  }
}

async function verifyNpmAuth(registry = NPM_DEFAULT_REGISTRY) {
  const whoami = await $`npm whoami --registry ${registry}`.nothrow();
  if (whoami.exitCode !== 0) {
    const errText = whoami.stderr;
    const m = errText.match(/npm error code (\w+)/);
    const errorCode = m && m[1];
    switch (errorCode) {
      case 'EINVALIDNPMTOKEN':
        throw new Error(`Invalid auth token for npm registry: ${registry}`);
      case 'ENEEDAUTH':
        throw new Error(`Missing auth token for npm registry: ${registry}`);
      default:
        throw new Error(errText);
    }
  }
}

async function enablePublishing(tagInfo: TagInfo, options: Options) {
  const [primaryTag, ...additionalTags] = tagInfo.npmTags;

  // Output publishTag for subsequent pipeline steps
  echo(`##vso[task.setvariable variable=publishTag]${primaryTag}`);
  if (process.env['GITHUB_OUTPUT']) {
    fs.appendFileSync(process.env['GITHUB_OUTPUT'], `publishTag=${primaryTag}\n`);
  }

  // Output additional tags
  if (additionalTags.length > 0) {
    const tagsValue = additionalTags.join(',');
    echo(`##vso[task.setvariable variable=additionalTags]${tagsValue}`);
    if (process.env['GITHUB_OUTPUT']) {
      fs.appendFileSync(process.env['GITHUB_OUTPUT'], `additionalTags=${tagsValue}\n`);
    }
  }

  if (options['skip-auth']) {
    echo('ℹ️ Skipped npm auth validation');
  } else {
    await verifyNpmAuth();
  }

  // Don't enable publishing in PRs
  if (!getTargetBranch()) {
    enablePublishingOnAzurePipelines();
  }
}

const isDirectRun =
  process.argv[1] != null &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname;

if (isDirectRun) {
  // Parse CLI args using zx's argv (minimist)
  const options: Options = {
    'mock-branch': argv['mock-branch'] as string | undefined,
    'skip-auth': Boolean(argv['skip-auth']),
    tag: typeof argv['tag'] === 'string' ? argv['tag'] : NPM_TAG_NEXT,
    verbose: Boolean(argv['verbose']),
  };

  const branch = await getCurrentBranch(options);
  if (!branch) {
    echo('❌ Could not get current branch');
    process.exit(1);
  }

  const log = options.verbose ? (msg: string) => echo(`ℹ️ ${msg}`) : () => {};

  try {
    if (isMainBranch(branch)) {
      // Nightlies are currently disabled — skip publishing from main
      echo('ℹ️ On main branch — nightly publishing is currently disabled');
    } else if (isStableBranch(branch)) {
      const stateInfo = getReleaseState(branch);
      log(`react-native-macos@latest: ${stateInfo.latestVersion}`);
      log(`react-native-macos@next: ${stateInfo.nextVersion}`);
      log(`Current version: ${stateInfo.currentVersion}`);
      log(`Release state: ${stateInfo.state}`);

      const tagInfo = getPublishTags(stateInfo, branch, options.tag);
      log(`Expected npm tags: ${tagInfo.npmTags.join(', ')}`);

      await enablePublishing(tagInfo, options);
    } else {
      echo(`ℹ️ Branch '${branch}' is not main or a stable branch — skipping`);
    }
  } catch (e) {
    echo(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}
