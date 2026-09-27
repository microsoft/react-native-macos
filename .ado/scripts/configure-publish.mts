#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {
  createPublishPlan,
  isStableBranch,
  publishPrepared,
  readChangesetStatus,
  readWorkspaces,
} from '../../.github/scripts/publishing-contract.mjs';

const {values: options} = parseArgs({options: {
  'mock-branch': {type: 'string'},
  verbose: {type: 'boolean'},
  publish: {type: 'boolean'},
}});
const branch = process.env.GITHUB_REF_NAME ?? process.env.BUILD_SOURCEBRANCHNAME ??
  options['mock-branch'] ?? execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim();
const isPullRequest = Boolean(process.env.GITHUB_BASE_REF ||
  process.env.SYSTEM_PULLREQUEST_TARGETBRANCH || process.env.BUILD_REASON === 'PullRequest');

function output(name: string, value: string) {
  if (process.env.TF_BUILD === 'True') console.log(`##vso[task.setvariable variable=${name}]${value}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

output('publish_react_native_macos', '0');
if (!isStableBranch(branch) || isPullRequest) {
  console.log(`Publication disabled for ${isPullRequest ? 'pull requests' : branch}`);
} else {
  const plan = await createPublishPlan({
    branch,
    status: await readChangesetStatus(),
    workspaces: readWorkspaces(),
  });
  if (options.verbose) console.log(JSON.stringify(plan, null, 2));
  output('publishTag', plan.tag ?? '');
  if (plan.packages.length) {
    output('publish_react_native_macos', '1');
    if (options.publish) publishPrepared(plan);
  } else {
    console.log(plan.reason ?? 'All prepared versions are already published');
  }
}
