/**
 * @format
 * @noflow
 */

// Green proof that the rules_js Berry fork works end to end:
// this file is bundled/run by Bazel with node_modules materialized from a
// Yarn *Berry* yarn.lock (translated by tools/bazel/berry/berry_to_pnpm_lock.mjs
// via our patched npm_translate_lock — no committed pnpm-lock.yaml).
const isOdd = require('is-odd');

const cases = [
  [1, true],
  [2, false],
  [3, true],
  [10, false],
];
for (const [n, expected] of cases) {
  if (isOdd(n) !== expected) {
    console.error(`FAIL: isOdd(${n}) !== ${expected}`);
    process.exit(1);
  }
}
console.log('OK: is-odd (resolved from a Berry yarn.lock via the rules_js fork) works');
