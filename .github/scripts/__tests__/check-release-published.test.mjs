import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isReleasePublished} from '../check-release-published.mjs';

test('a successful registry response distinguishes released and new minors', () => {
  const query = () => JSON.stringify(['0.81.9', '0.83.0-rc.0', '0.84.0']);
  assert.equal(isReleasePublished('0.83', query), true);
  assert.equal(isReleasePublished('0.85', query), false);
  assert.equal(isReleasePublished('0.8', query), false);
  assert.equal(isReleasePublished('0.83', () => '[]'), false);
});

test('registry failures propagate instead of skipping integration', () => {
  const error = new Error('Registry unavailable');
  assert.throws(() => isReleasePublished('0.83', () => { throw error; }), error);
});

test('invalid registry data and invalid minor versions fail', () => {
  for (const response of ['not JSON', '{}', 'null', '[null]']) {
    assert.throws(() => isReleasePublished('0.83', () => response));
  }
  assert.throws(() => isReleasePublished('undefined', () => '[]'));
});
