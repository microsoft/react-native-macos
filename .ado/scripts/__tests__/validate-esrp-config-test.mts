import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
  ESRP_CONFIG_KEYS,
  getInvalidEsrpConfigKeys,
  validateEsrpConfig,
} from '../validate-esrp-config.mts';

const populatedEnvironment = () =>
  Object.fromEntries(ESRP_CONFIG_KEYS.map(key => [key, `${key}-value`]));

describe('validate-esrp-config', () => {
  it('accepts a fully populated configuration', () => {
    assert.doesNotThrow(() => validateEsrpConfig(populatedEnvironment()));
  });

  it('rejects missing, blank, and unexpanded values by key name only', () => {
    const environment: Record<string, string | undefined> = populatedEnvironment();
    delete environment.EsrpClientId;
    environment.EsrpOwners = '   ';
    environment.publishTag = '$(publishTag)';

    assert.deepEqual(getInvalidEsrpConfigKeys(environment), [
      'EsrpClientId',
      'EsrpOwners',
      'publishTag',
    ]);

    assert.throws(
      () => validateEsrpConfig(environment),
      error =>
        error instanceof Error &&
        error.message ===
          'Missing or unexpanded ESRP onboarding variable(s): EsrpClientId, EsrpOwners, publishTag' &&
        !error.message.includes('$(publishTag)'),
    );
  });
});
