#!/usr/bin/env node
// @ts-ignore
import { parseArgs, styleText } from 'node:util';

import { $, echo, fs } from 'zx';

/**
 * Wrapper around `changeset add` (default) and `changeset status` validation (--check).
 *
 * Without --check: runs `changeset add` interactively with the correct upstream remote
 * auto-detected from package.json's repository URL, temporarily patched into config.json.
 *
 * With --check (CI mode): validates that all changed public packages have changesets and that
 * no major version bumps are introduced.
 */

interface ChangesetStatusOutput {
  releases: Array<{
    name: string;
    type: 'major' | 'minor' | 'patch' | 'none';
    oldVersion: string;
    newVersion: string;
    changesets: string[];
  }>;
  changesets: string[];
}

const log = {
  error: (msg: string) => echo(styleText('red', msg)),
  success: (msg: string) => echo(styleText('green', msg)),
  warn: (msg: string) => echo(styleText('yellow', msg)),
  info: (msg: string) => echo(msg),
};

/** Find the remote that matches the repo's own URL (works for forks and CI alike). */
async function getBaseBranch(): Promise<string> {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const repoUrl: string = pkg.repository?.url ?? '';
  // Extract "org/repo" from https://github.com/org/repo.git or git@github.com:org/repo.git
  const repoPath = repoUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1] ?? '';

  const remotes = (await $`git remote -v`.quiet()).stdout;
  const remote = (repoPath && remotes.match(new RegExp(`^(\\S+)\\s+.*${repoPath}`, 'm'))?.[1]) ?? 'origin';

  // In CI, use the PR target branch (e.g., origin/0.81-stable)
  if (process.env['GITHUB_BASE_REF']) {
    return `${remote}/${process.env['GITHUB_BASE_REF']}`;
  }

  return `${remote}/main`;
}

/** Run `changeset status` and return the output and exit code. */
async function getChangesetStatus(baseBranch: string): Promise<{ data: ChangesetStatusOutput; exitCode: number }> {
  const STATUS_FILE = 'changeset-status.json';

  fs.writeJsonSync(STATUS_FILE, { releases: [], changesets: [] });
  const result = await $`yarn changeset status --since=${baseBranch} --output ${STATUS_FILE}`.nothrow();
  const data: ChangesetStatusOutput = fs.readJsonSync(STATUS_FILE);
  fs.removeSync(STATUS_FILE);

  return { data, exitCode: result.exitCode ?? 1 };
}

function checkMajorBumps(releases: ChangesetStatusOutput['releases']): void {
  const majorBumps = releases.filter((r) => r.type === 'major');
  if (majorBumps.length === 0) return;

  log.error('Major version bumps detected!\n');
  for (const release of majorBumps) {
    log.error(`  ${release.name}: major`);
    if (release.changesets.length > 0) {
      log.error(`    (from changesets: ${release.changesets.join(', ')})`);
    }
  }
  log.error('\nMajor version bumps are not allowed.');
  log.warn('If you need to make a breaking change, please discuss with the team first.\n');
  process.exit(1);
}

/** Validate that all changed public packages have changesets and no major bumps are introduced. */
async function runCheck(baseBranch: string): Promise<void> {
  log.info(`Validating changesets against ${baseBranch}...\n`);

  const { data, exitCode } = await getChangesetStatus(baseBranch);

  if (exitCode !== 0) {
    log.error('Some packages have been changed but no changesets were found.');
    log.warn('Run `yarn change` to create a changeset, or `yarn changeset --empty` if no release is needed.\n');
    process.exit(1);
  }

  checkMajorBumps(data.releases);

  const packages = data.releases.map((r) => r.name).join(', ');
  log.success(packages ? `All validations passed (${packages})` : 'All validations passed');
}

/** Run `changeset add` interactively against the correct upstream base branch. */
async function runAdd(baseBranch: string): Promise<void> {
  await $({ stdio: 'inherit' })`yarn changeset --since ${baseBranch}`;
}

const { values: args } = parseArgs({ options: { check: { type: 'boolean', default: false } } });

const baseBranch = await getBaseBranch();

if (args.check) {
  await runCheck(baseBranch);
} else {
  await runAdd(baseBranch);
}
