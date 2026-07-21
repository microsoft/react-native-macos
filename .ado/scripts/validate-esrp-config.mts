#!/usr/bin/env node
import {resolve} from 'node:path';

export const ESRP_CONFIG_KEYS = [
  'EsrpConnectedServiceName',
  'EsrpKeyVaultName',
  'EsrpAuthCertName',
  'EsrpSignCertName',
  'EsrpClientId',
  'EsrpTenantId',
  'EsrpOwners',
  'EsrpApprovers',
  'publishTag',
] as const;

type EsrpConfigKey = (typeof ESRP_CONFIG_KEYS)[number];

export function getInvalidEsrpConfigKeys(
  environment: Readonly<Record<string, string | undefined>>,
): EsrpConfigKey[] {
  return ESRP_CONFIG_KEYS.filter(key => {
    const value = environment[key]?.trim();
    return !value || /^\$\(.+\)$/.test(value);
  });
}

export function validateEsrpConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const invalidKeys = getInvalidEsrpConfigKeys(environment);
  if (invalidKeys.length > 0) {
    throw new Error(
      `Missing or unexpanded ESRP onboarding variable(s): ${invalidKeys.join(', ')}`,
    );
  }
}

const isDirectRun =
  process.argv[1] != null &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname;

if (isDirectRun) {
  try {
    validateEsrpConfig();
    console.log('ESRP onboarding configuration is valid');
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
