#!/usr/bin/env node
import { $, echo, fs } from 'zx';

/**
 * Validate changesets in CI
 *
 * Checks:
 * 1. Changesets are present (PRs require changesets)
 * 2. No major version bumps (breaking changes disallowed)
 */

// ANSI color codes
const colors = {
  red: (msg: string) => `\x1b[31m${msg}\x1b[0m`,
  green: (msg: string) => `\x1b[32m${msg}\x1b[0m`,
  yellow: (msg: string) => `\x1b[33m${msg}\x1b[0m`,
};

// Logging helpers
const log = {
  error: (msg: string) => echo(colors.red(msg)),
  success: (msg: string) => echo(colors.green(msg)),
  warn: (msg: string) => echo(colors.yellow(msg)),
  info: (msg: string) => echo(msg),
};

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

async function checkChangesetPresence() {
  log.info('\n🔍 Checking for changeset presence...\n');

  const result = await $`yarn changeset status 2>&1`.nothrow();

  if (result.exitCode !== 0) {
    log.error('❌ Changeset validation failed\n');
    echo(result.stdout);
    return false;
  }

  log.success('✅ Changesets found');
  return true;
}

async function checkForMajorBumps() {
  log.info('\n🔍 Checking for major version bumps...\n');

  const result = await $`yarn changeset status --output bumps.json`.nothrow();

  // If no changesets, skip major bump check
  if (result.exitCode !== 0 && result.stdout.includes('no changesets were found')) {
    log.warn('No changesets found (skipping major check)');
    return true;
  }

  // Other errors
  if (result.exitCode !== 0 || !fs.existsSync('bumps.json')) {
    log.error('❌ Failed to check for major bumps\n');
    if (result.stderr) log.info(result.stderr);
    return false;
  }

  const bumpsData: ChangesetStatusOutput = JSON.parse(fs.readFileSync('bumps.json', 'utf-8'));
  fs.unlinkSync('bumps.json');

  const majorBumps = bumpsData.releases.filter(release => release.type === 'major');

  if (majorBumps.length > 0) {
    log.error('❌ Major version bumps detected!\n');
    for (const release of majorBumps) {
      log.error(`  ${release.name}: major`);
      if (release.changesets.length > 0) {
        log.error(`    (from changesets: ${release.changesets.join(', ')})`);
      }
    }
    log.error('\nMajor version bumps are not allowed.');
    log.warn('If you need to make a breaking change, please discuss with the team first.\n');
    return false;
  }

  log.success('✅ No major version bumps found');
  return true;
}

// Main execution
log.info(`\n${'='.repeat(60)}`);
log.info('Changesets Validation');
log.info(`${'='.repeat(60)}`);

const results = {
  presence: await checkChangesetPresence(),
  majorBumps: await checkForMajorBumps(),
};

log.info(`\n${'='.repeat(60)}`);
log.info('Validation Results:');
log.info(`${'='.repeat(60)}\n`);

log.info(`Changeset presence:      ${results.presence ? '✅ PASS' : '❌ FAIL'}`);
log.info(`Major version check:     ${results.majorBumps ? '✅ PASS' : '❌ FAIL'}\n`);

const allPassed = results.presence && results.majorBumps;

if (!allPassed) {
  log.error('Validation failed!\n');
  throw new Error('Validation failed');
}

log.success('All validations passed! ✅\n');
