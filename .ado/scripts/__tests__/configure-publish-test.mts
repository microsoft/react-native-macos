import assert from 'node:assert/strict';
import {execFile as execFileCallback} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {describe, it} from 'node:test';

import {
  getAzurePipelineVariableCommands,
  getPublishTags,
} from '../configure-publish.mts';

const execFile = promisify(execFileCallback);

describe('configure-publish', () => {
  it('emits plain and named-step output variables', () => {
    assert.deepEqual(getAzurePipelineVariableCommands('publishTag', 'next'), [
      '##vso[task.setvariable variable=publishTag]next',
      '##vso[task.setvariable variable=publishTag;isOutput=true]next',
    ]);
    assert.deepEqual(
      getAzurePipelineVariableCommands('publish_react_native_macos', '1'),
      [
        '##vso[task.setvariable variable=publish_react_native_macos]1',
        '##vso[task.setvariable variable=publish_react_native_macos;isOutput=true]1',
      ],
    );
  });

  it('uses one tag per release line', () => {
    assert.deepEqual(
      getPublishTags(
        {state: 'STABLE_IS_LATEST', currentVersion: 83, latestVersion: 83, nextVersion: 84},
        '0.83-stable',
      ),
      {npmTags: ['latest']},
    );
    assert.deepEqual(
      getPublishTags(
        {state: 'STABLE_IS_OLD', currentVersion: 82, latestVersion: 83, nextVersion: 84},
        '0.82-stable',
      ),
      {npmTags: ['0.82-stable']},
    );
    assert.deepEqual(
      getPublishTags(
        {state: 'STABLE_IS_NEW', currentVersion: 84, latestVersion: 83, nextVersion: 84},
        '0.84-stable',
      ),
      {npmTags: ['next'], prerelease: 'rc'},
    );
    assert.deepEqual(
      getPublishTags(
        {state: 'STABLE_IS_NEW', currentVersion: 84, latestVersion: 83, nextVersion: 83},
        '0.84-stable',
        'latest',
      ),
      {npmTags: ['latest']},
    );
  });

  it('does not emit publish variables on main', async () => {
    const script = fileURLToPath(new URL('../configure-publish.mts', import.meta.url));
    const {stdout} = await execFile(process.execPath, [
      script,
      '--mock-branch',
      'main',
      '--skip-auth',
    ]);

    assert.match(stdout, /nightly publishing is currently disabled/);
    assert.doesNotMatch(stdout, /##vso\[task\.setvariable/);
  });
});
