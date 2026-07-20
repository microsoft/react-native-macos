import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
  getAzurePipelineVariableCommands,
  getPublishTags,
} from '../configure-publish.mts';

describe('configure-publish', () => {
  it('emits plain and named-step output variable commands', () => {
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

  it('preserves stable branch primary tag selection', () => {
    assert.deepEqual(
      getPublishTags(
        {
          state: 'STABLE_IS_LATEST',
          currentVersion: 83,
          latestVersion: 83,
          nextVersion: 84,
        },
        '0.83-stable',
      ),
      {npmTags: ['latest', '0.83-stable']},
    );
    assert.deepEqual(
      getPublishTags(
        {
          state: 'STABLE_IS_OLD',
          currentVersion: 82,
          latestVersion: 83,
          nextVersion: 84,
        },
        '0.82-stable',
      ),
      {npmTags: ['0.82-stable']},
    );
    assert.deepEqual(
      getPublishTags(
        {
          state: 'STABLE_IS_NEW',
          currentVersion: 84,
          latestVersion: 83,
          nextVersion: 84,
        },
        '0.84-stable',
      ),
      {npmTags: ['next'], prerelease: 'rc'},
    );
    assert.deepEqual(
      getPublishTags(
        {
          state: 'STABLE_IS_NEW',
          currentVersion: 84,
          latestVersion: 83,
          nextVersion: 83,
        },
        '0.84-stable',
        'latest',
      ),
      {npmTags: ['latest', '0.84-stable', 'next']},
    );
  });
});
