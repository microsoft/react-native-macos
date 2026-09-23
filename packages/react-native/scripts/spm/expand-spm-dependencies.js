/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

const {RESERVED_SWIFT_NAMES, makeLogger, toSwiftName} = require('./spm-utils');
const fs = require('fs');
const path = require('path');

const {warn} = makeLogger('expand-spm-dependencies');

/**
 * expand-spm-dependencies.js — Resolves transitive native deps declared via
 * `spm.dependencies` in a library's react-native.config.js.
 *
 * SPM has no equivalent of CocoaPods' podspec `s.dependency`, so library
 * authors declare the same relationships explicitly:
 *
 *   // react-native-reanimated/react-native.config.js
 *   module.exports = {
 *     dependency: { platforms: { ios: {} } },
 *     spm: { dependencies: ['react-native-worklets'] },
 *   };
 *
 * This module reads the directly-autolinked deps (from autolinking.json),
 * follows each one's spm.dependencies recursively, and returns the deduped
 * list with autolinking-shaped entries so the downstream pipeline can convert
 * each to an SPM target without further branching.
 *
 * I/O is injected (readConfig, resolveDep, log) so the logic stays pure and
 * testable.
 */

/*::
import type {AutolinkedDep} from './spm-types';

// react-native.config.js entries have a user-defined shape, so we use an
// inexact object type and access properties dynamically.
type RnConfig = {...};
type ReadConfig = (root: string) => ?RnConfig;
type ResolveDep = (name: string, fromRoot: string) => ?string;
type Log = (message: string) => void;
// Keyed by lower case, valued with the canonical spelling: two names differing
// only in case are not distinct enough for the build to keep the two apart.
type ReservedNames = ReadonlyMap<string, string>;
type Options = {
  readConfig: ReadConfig,
  resolveDep: ResolveDep,
  // Names to reserve alongside RESERVED_SWIFT_NAMES, supplied by the caller
  // (remote mode relabels the RN package) since this module reads no config.
  extraReservedNames?: ?ReadonlyArray<string>,
  log?: ?Log,
};
*/

/**
 * A misconfiguration rather than a resolution failure: scaffoldAll degrades past
 * a transitive dep it cannot find, but must still surface this.
 */
class SpmNameCollisionError extends Error {
  constructor(message /*: string */) {
    super(message);
    this.name = 'SpmNameCollisionError';
  }
}

// The charset `spm.name` must satisfy — permissive on purpose, since it has to
// admit header-dir style (lowercase with hyphens) as well as Swift identifiers.
// Shared with the app's own `spm.modules` names.
function isValidSwiftName(name /*: unknown */) /*: boolean */ {
  return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name);
}

function reservedSwiftNames(
  extraReservedNames /*: ?ReadonlyArray<string> */,
) /*: ReservedNames */ {
  return new Map(
    [...RESERVED_SWIFT_NAMES, ...(extraReservedNames ?? [])].map(name => [
      name.toLowerCase(),
      name,
    ]),
  );
}

// The scope-borrowed form of a name: `@powersync/react-native`'s `ReactNative`
// becomes `PowersyncReactNative`.
function scopeBorrowedName(
  npmName /*: string */,
  swiftName /*: string */,
) /*: ?string */ {
  const scope = /^@([^/]+)\//.exec(npmName)?.[1];
  return scope == null ? null : `${toSwiftName(scope)}${swiftName}`;
}

// The Swift target name for one dep, judged in isolation. `spm.name` is for
// libraries whose import prefix differs from the derived name:
// `react-native-worklets` ships headers as `<worklets/...>` (podspec
// `s.header_dir`), so its target is `worklets`, not `ReactNativeWorklets`. A
// derived name that lands on a reserved one borrows the npm scope instead.
function resolveSwiftName(
  npmName /*: string */,
  config /*: ?RnConfig */,
  reserved /*: ReservedNames */,
  log /*:: ?: ?Log */,
) /*: string */ {
  // $FlowFixMe[prop-missing] config has dynamic shape
  const override = config?.spm?.name;
  if (override != null) {
    if (typeof override !== 'string' || override.length === 0) {
      throw new Error(
        `react-native autolinking: '${npmName}' has an invalid 'spm.name' override: expected a non-empty string, got ${JSON.stringify(override)}.`,
      );
    }
    if (!isValidSwiftName(override)) {
      throw new Error(
        `react-native autolinking: '${npmName}' has an invalid 'spm.name' override '${override}': must start with a letter or underscore and contain only letters, digits, underscores, or hyphens.`,
      );
    }
    return override;
  }

  const derived = toSwiftName(npmName);
  if (!reserved.has(derived.toLowerCase())) {
    return derived;
  }
  const disambiguated = scopeBorrowedName(npmName, derived);
  if (disambiguated == null || reserved.has(disambiguated.toLowerCase())) {
    return derived;
  }
  log?.(
    `'${npmName}' would take React Native's reserved name '${derived}', so its npm scope is prepended: '${disambiguated}'. ` +
      `Set 'spm.name' in ${npmName}'s react-native.config.js to choose the name yourself.`,
  );
  return disambiguated;
}

function assertNameNotReserved(
  swiftName /*: string */,
  reserved /*: ReservedNames */,
  labels /*: {label: string, remedy: string} */,
) /*: void */ {
  const reservedName = reserved.get(swiftName.toLowerCase());
  if (reservedName == null) {
    return;
  }
  // Vaguer about the case clash than the dep-vs-dep message on purpose: this
  // set spans package identities and product names, which collide differently.
  throw new SpmNameCollisionError(
    `react-native autolinking: SPM Swift name collision: ${labels.label} resolves to '${swiftName}', ` +
      (reservedName === swiftName
        ? `which React Native reserves for its own SPM package and products.`
        : `which differs from React Native's reserved '${reservedName}' only in case — not distinct enough for the build to keep the two apart.`) +
      ` ${labels.remedy}`,
  );
}

/**
 * Throws when `swiftName` is one React Native's own manifests use. `remedy` is
 * the fix: a library sets `spm.name`, an app renames its `spm.modules` entry.
 */
function assertSwiftNameNotReserved(
  swiftName /*: string */,
  options /*: {
    label: string,
    remedy: string,
    extraReservedNames?: ?ReadonlyArray<string>,
  } */,
) /*: void */ {
  const {label, remedy, extraReservedNames} = options;
  assertNameNotReserved(swiftName, reservedSwiftNames(extraReservedNames), {
    label,
    remedy,
  });
}

// Reserved-name backstop over the resolved set. Unconditional: a plugin-shipping
// library is checked like any other, so `spm scaffold` — which knows nothing
// about plugins — cannot disagree with the autolinker about the same dep.
function assertNoReservedSwiftNames(
  deps /*: ReadonlyArray<AutolinkedDep> */,
  reserved /*: ReservedNames */,
) /*: void */ {
  for (const dep of deps) {
    const swiftName = dep.swiftName;
    if (swiftName == null) {
      continue;
    }
    assertNameNotReserved(swiftName, reserved, {
      label: `'${dep.name}'`,
      remedy: `Set a different 'spm.name' in ${dep.name}'s react-native.config.js.`,
    });
  }
}

// Pulls apart deps that resolved to the same name by borrowing their npm scopes.
// Every scoped member of a colliding group moves: there is no non-arbitrary
// winner to keep. Exactly one pass — retrying would trade a diagnosable error
// for a name nobody can predict.
function disambiguateSharedSwiftNames(
  deps /*: ReadonlyArray<AutolinkedDep> */,
  autoNamed /*: ReadonlySet<string> */,
  log /*: ?Log */,
) /*: void */ {
  const groups /*: Map<string, Array<{dep: AutolinkedDep, swiftName: string}>> */ =
    new Map();
  for (const dep of deps) {
    const swiftName = dep.swiftName;
    if (swiftName == null) {
      continue;
    }
    const key = swiftName.toLowerCase();
    const group = groups.get(key);
    if (group == null) {
      groups.set(key, [{dep, swiftName}]);
    } else {
      group.push({dep, swiftName});
    }
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    for (const {dep, swiftName} of group) {
      // A name we derived can borrow a second time (`AAReactNative`); the
      // member whose name we did not derive is the incumbent and keeps it.
      if (!autoNamed.has(dep.name)) {
        continue;
      }
      const borrowed = scopeBorrowedName(dep.name, swiftName);
      if (borrowed == null) {
        continue;
      }
      const others = group
        .filter(other => other.dep !== dep)
        .map(other => `'${other.dep.name}'`)
        .join(', ');
      log?.(
        `'${dep.name}' would share the name '${swiftName}' with ${others}, so its npm scope is prepended: '${borrowed}'. ` +
          `Set 'spm.name' in ${dep.name}'s react-native.config.js to choose the name yourself.`,
      );
      dep.swiftName = borrowed;
    }
  }
}

function expandSpmDependencies(
  directDeps /*: Array<AutolinkedDep> */,
  options /*: Options */,
) /*: Array<AutolinkedDep> */ {
  const {readConfig, resolveDep, extraReservedNames, log} = options;
  const reserved = reservedSwiftNames(extraReservedNames);
  const byName /*: Map<string, AutolinkedDep> */ = new Map();
  for (const dep of directDeps) {
    byName.set(dep.name, {...dep, spmDependencies: []});
  }
  const autoNamed /*: Set<string> */ = new Set();
  const resolveName = (
    npmName /*: string */,
    config /*: ?RnConfig */,
  ) /*: string */ => {
    // $FlowFixMe[prop-missing] config has dynamic shape
    if (config?.spm?.name == null) {
      autoNamed.add(npmName);
    }
    return resolveSwiftName(npmName, config, reserved, log);
  };

  const queue /*: Array<string> */ = directDeps.map(d => d.name);
  while (queue.length > 0) {
    const currentName = queue.shift();
    if (typeof currentName !== 'string') {
      continue;
    }
    const current = byName.get(currentName);
    if (current == null) {
      continue;
    }
    const config = readConfig(current.root);
    // Resolve swiftName lazily from the same config read we already need for
    // spm.dependencies — saves a duplicate readConfig call per direct dep.
    if (current.swiftName == null) {
      current.swiftName = resolveName(currentName, config);
    }
    // $FlowFixMe[prop-missing] config has dynamic shape
    const transitives /*: Array<string> */ = config?.spm?.dependencies ?? [];

    const currentSpmDeps /*: Array<string> */ = [];
    for (const transitiveName of transitives) {
      if (!byName.has(transitiveName)) {
        const transitiveRoot = resolveDep(transitiveName, current.root);
        if (transitiveRoot == null) {
          throw new Error(
            `react-native autolinking: '${currentName}' declares an unresolvable spm.dependency '${transitiveName}'. Ensure '${transitiveName}' is installed and visible via Node module resolution from ${current.root}.`,
          );
        }

        const transitiveConfig = readConfig(transitiveRoot);
        // $FlowFixMe[prop-missing] config has dynamic shape
        const iosPlatform = transitiveConfig?.dependency?.platforms?.ios;
        if (iosPlatform == null) {
          // No iOS native code — nothing to autolink and nothing to declare
          // as an SPM target dep; mirrors the silent skip in
          // autolinkingDepToSpmTarget for android-only deps.
          continue;
        }

        byName.set(transitiveName, {
          name: transitiveName,
          root: transitiveRoot,
          platforms: {ios: iosPlatform},
          swiftName: resolveName(transitiveName, transitiveConfig),
          spmDependencies: [],
        });
        queue.push(transitiveName);
      }
      currentSpmDeps.push(transitiveName);
    }
    current.spmDependencies = currentSpmDeps;
  }

  const allDeps /*: Array<AutolinkedDep> */ = Array.from(byName.values());

  disambiguateSharedSwiftNames(allDeps, autoNamed, log);

  // Both checks below validate the FINAL set, after that pass: a borrowed scope
  // can land on a reserved name, or on one another dep already holds.
  assertNoReservedSwiftNames(allDeps, reserved);

  // Collision check: two deps mapping to the same Swift name (whether via
  // override or auto-derivation) would clobber each other in the synth
  // package layout and the centralized headers tree. Surface it now with a
  // clear message instead of letting SPM emit a confusing duplicate-target
  // error later.
  // Key case-INSENSITIVELY: resolveSwiftName permits lowercase ('worklets')
  // while toSwiftName produces TitleCase ('Worklets') — an exact-equality check
  // passes but the two still collide as directories on the default
  // case-insensitive macOS filesystem (synth package layout + headers tree).
  const seen /*: Map<string, {name: string, swiftName: string}> */ = new Map();
  for (const dep of allDeps) {
    const swiftName = dep.swiftName;
    if (swiftName == null) {
      continue;
    }
    const key = swiftName.toLowerCase();
    const existing = seen.get(key);
    if (existing != null) {
      const same = existing.swiftName === swiftName;
      throw new SpmNameCollisionError(
        `react-native autolinking: SPM Swift name collision: '${existing.name}' ('${existing.swiftName}') and '${dep.name}' ('${swiftName}') ` +
          (same
            ? `both resolve to '${swiftName}'.`
            : `differ only in case, which collides on case-insensitive filesystems.`) +
          ` Set a distinct 'spm.name' in one of their react-native.config.js files.`,
      );
    }
    seen.set(key, {name: dep.name, swiftName});
  }

  return allDeps;
}

// ---------------------------------------------------------------------------
// Default I/O implementations
// ---------------------------------------------------------------------------

function defaultReadConfig(root /*: string */) /*: ?RnConfig */ {
  const configPath = path.join(root, 'react-native.config.js');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    // $FlowFixMe[unsupported-syntax]
    const mod = require(configPath);
    // Read both export styles, because the community CLI's two loaders
    // disagree with each other: its sync path (`loadConfig`) requires the
    // module and sees named exports at top level, its async path
    // (`loadConfigAsync`) takes the default export only. Merging covers both,
    // with named exports winning — the shape the sync path already resolves.
    // Every sibling key of the default export is preserved
    // (`dependency.platforms.ios` is read from this result too).
    // A function-style config (`module.exports = () => ({...})`) and other
    // non-objects pass through untouched — there is no default export to
    // unwrap, and nulling them would hide a config that used to be read.
    if (mod == null || typeof mod !== 'object') {
      return mod;
    }
    const dflt = mod.default;
    if (dflt == null || typeof dflt !== 'object') {
      return mod;
    }
    const {default: _unused, ...named} = mod;
    return {...dflt, ...named};
  } catch (e) {
    // A config can fail to load for reasons unrelated to SPM (it may import a
    // devDependency absent in a consumer install), so this stays a warning —
    // but a silent null turns a dropped `spm` block into a link error much
    // later.
    warn(
      `Failed to load ${configPath}: ${e.message}. Any 'spm' settings in it are ignored.`,
    );
    return null;
  }
}

function defaultResolveDep(
  name /*: string */,
  fromRoot /*: string */,
) /*: ?string */ {
  try {
    const pkgJsonPath = require.resolve(`${name}/package.json`, {
      paths: [fromRoot],
    });
    return path.dirname(pkgJsonPath);
  } catch {
    return null;
  }
}

module.exports = {
  SpmNameCollisionError,
  assertSwiftNameNotReserved,
  expandSpmDependencies,
  isValidSwiftName,
  resolveSwiftName,
  defaultReadConfig,
  defaultResolveDep,
};
