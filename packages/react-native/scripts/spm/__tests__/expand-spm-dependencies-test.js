/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @noflow
 */

'use strict';

/**
 * Red tests for the transitive dependency expander.
 *
 * Library authors declare transitive native deps in their react-native.config.js:
 *
 *   module.exports = {
 *     dependency: { platforms: { ios: {} } },
 *     spm: { dependencies: ['react-native-test-library-common'] },
 *   };
 *
 * The expander takes the directly-autolinked deps (from autolinking.json) and
 * follows each one's spm.dependencies recursively, resolving names to package
 * roots via Node module resolution. Behavior mirrors podspec `s.dependency`:
 *
 *   - Transitive deps with iOS native code → added as autolinked targets
 *   - Transitive deps without iOS native code → silently skipped
 *   - Deduped by package name (first occurrence wins)
 *   - Cycles are detected (visited set keyed on name)
 *   - Unresolvable names throw with a clear message
 *
 * I/O is injected (readConfig, resolveDep) so the tests stay pure.
 */

const {
  SpmNameCollisionError,
  defaultReadConfig,
  expandSpmDependencies,
  isValidSwiftName,
  resolveSwiftName,
} = require('../expand-spm-dependencies');
const {
  REACT_HEADERS_TARGET_DIR,
  RESERVED_SWIFT_NAMES,
  toSwiftName,
} = require('../spm-utils');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function makeReadConfig(configs /*: {[string]: ?Object} */) {
  return (root /*: string */) =>
    Object.prototype.hasOwnProperty.call(configs, root) ? configs[root] : null;
}

// The reserved map its caller builds; these cases only exercise `spm.name`.
const NONE = new Map();

function makeResolveDep(resolutions /*: {[string]: ?string} */) {
  return (name /*: string */) =>
    Object.prototype.hasOwnProperty.call(resolutions, name)
      ? resolutions[name]
      : null;
}

// ---------------------------------------------------------------------------
// expandSpmDependencies
// ---------------------------------------------------------------------------

describe('expandSpmDependencies', () => {
  it('returns direct deps with auto-derived swiftName when none declare spm.dependencies', () => {
    const direct = [{name: 'a', root: '/a', platforms: {ios: {}}}];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({'/a': {}}),
      resolveDep: makeResolveDep({}),
    });
    expect(result).toEqual([
      {...direct[0], swiftName: toSwiftName('a'), spmDependencies: []},
    ]);
  });

  it('pulls in one transitive dep declared by a direct dep', () => {
    const direct = [{name: 'apple', root: '/apple', platforms: {ios: {}}}];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/apple': {spm: {dependencies: ['common']}},
        '/common': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({common: '/common'}),
    });
    expect(result.map(d => d.name)).toEqual(['apple', 'common']);
    expect(result[1].root).toBe('/common');
    expect(result[1].platforms.ios).toBeDefined();
  });

  it('recurses through a chain (A → B → C)', () => {
    const direct = [{name: 'a', root: '/a', platforms: {ios: {}}}];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/a': {spm: {dependencies: ['b']}},
        '/b': {
          dependency: {platforms: {ios: {}}},
          spm: {dependencies: ['c']},
        },
        '/c': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({b: '/b', c: '/c'}),
    });
    expect(result.map(d => d.name)).toEqual(['a', 'b', 'c']);
  });

  it('handles cycles without infinite recursion (A → B → A)', () => {
    const direct = [{name: 'a', root: '/a', platforms: {ios: {}}}];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/a': {
          dependency: {platforms: {ios: {}}},
          spm: {dependencies: ['b']},
        },
        '/b': {
          dependency: {platforms: {ios: {}}},
          spm: {dependencies: ['a']},
        },
      }),
      resolveDep: makeResolveDep({a: '/a', b: '/b'}),
    });
    expect(result.map(d => d.name).sort()).toEqual(['a', 'b']);
  });

  it('dedups a diamond (A → X, B → X) — X appears exactly once', () => {
    const direct = [
      {name: 'a', root: '/a', platforms: {ios: {}}},
      {name: 'b', root: '/b', platforms: {ios: {}}},
    ];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/a': {spm: {dependencies: ['x']}},
        '/b': {spm: {dependencies: ['x']}},
        '/x': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({x: '/x'}),
    });
    expect(result.filter(d => d.name === 'x')).toHaveLength(1);
    expect(result.map(d => d.name).sort()).toEqual(['a', 'b', 'x']);
  });

  it('throws with a clear message when a declared transitive cannot be resolved', () => {
    const direct = [{name: 'apple', root: '/apple', platforms: {ios: {}}}];
    expect(() =>
      expandSpmDependencies(direct, {
        readConfig: makeReadConfig({
          '/apple': {spm: {dependencies: ['ghost']}},
        }),
        resolveDep: makeResolveDep({}),
      }),
    ).toThrow(/ghost.*apple|apple.*ghost/i);
  });

  it('silently skips transitives that have no iOS native code (matches autolinkingDepToSpmTarget behavior)', () => {
    const direct = [{name: 'apple', root: '/apple', platforms: {ios: {}}}];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/apple': {spm: {dependencies: ['js-only']}},
        // js-only has no dependency.platforms.ios — pure JS package
        '/js-only': {},
      }),
      resolveDep: makeResolveDep({'js-only': '/js-only'}),
    });
    expect(result.map(d => d.name)).toEqual(['apple']);
  });

  it('does not re-add a transitive that is already a direct dep (first occurrence wins)', () => {
    const direct = [
      {name: 'apple', root: '/apple', platforms: {ios: {}}},
      {name: 'common', root: '/common-direct', platforms: {ios: {}}},
    ];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/apple': {spm: {dependencies: ['common']}},
        '/common-other': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({common: '/common-other'}),
    });
    expect(result.filter(d => d.name === 'common')).toHaveLength(1);
    // The direct-dep entry should be preserved, not overwritten by the transitive
    expect(result.find(d => d.name === 'common').root).toBe('/common-direct');
  });

  // -------------------------------------------------------------------------
  // spmDependencies field: each entry should carry the names of its iOS-native
  // transitive deps, so the downstream emitter can wire SPM target-level deps
  // (e.g. apple's .target(dependencies: [.target(name: "...Common")])).
  // -------------------------------------------------------------------------

  it('attaches spmDependencies: [] when the dep declares none', () => {
    const direct = [{name: 'a', root: '/a', platforms: {ios: {}}}];
    const [a] = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({'/a': {}}),
      resolveDep: makeResolveDep({}),
    });
    expect(a.spmDependencies).toEqual([]);
  });

  it('attaches spmDependencies with the declared transitive names (preserving declaration order)', () => {
    const direct = [{name: 'apple', root: '/apple', platforms: {ios: {}}}];
    const [apple, common] = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/apple': {spm: {dependencies: ['common', 'extra']}},
        '/common': {dependency: {platforms: {ios: {}}}},
        '/extra': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({common: '/common', extra: '/extra'}),
    });
    expect(apple.spmDependencies).toEqual(['common', 'extra']);
    expect(common.spmDependencies).toEqual([]);
  });

  it('omits JS-only transitives from spmDependencies (only iOS-native names appear)', () => {
    const direct = [{name: 'apple', root: '/apple', platforms: {ios: {}}}];
    const [apple] = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/apple': {spm: {dependencies: ['js-only', 'common']}},
        '/js-only': {},
        '/common': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({'js-only': '/js-only', common: '/common'}),
    });
    expect(apple.spmDependencies).toEqual(['common']);
  });

  it('records spmDependencies on both sides of a diamond (A→X, B→X)', () => {
    const direct = [
      {name: 'a', root: '/a', platforms: {ios: {}}},
      {name: 'b', root: '/b', platforms: {ios: {}}},
    ];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/a': {spm: {dependencies: ['x']}},
        '/b': {spm: {dependencies: ['x']}},
        '/x': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({x: '/x'}),
    });
    const a = result.find(d => d.name === 'a');
    const b = result.find(d => d.name === 'b');
    expect(a.spmDependencies).toEqual(['x']);
    expect(b.spmDependencies).toEqual(['x']);
  });

  it('passes the declaring dep root as the second argument to resolveDep (for Node resolution paths)', () => {
    const direct = [{name: 'apple', root: '/apple', platforms: {ios: {}}}];
    let receivedFromRoot /*: ?string */ = null;
    expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/apple': {spm: {dependencies: ['common']}},
        '/common': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: (name, fromRoot) => {
        if (name === 'common') {
          receivedFromRoot = fromRoot;
          return '/common';
        }
        return null;
      },
    });
    expect(receivedFromRoot).toBe('/apple');
  });

  // -------------------------------------------------------------------------
  // swiftName resolution: each dep gets a Swift target name on the way out.
  // Default is toSwiftName(npmName); the dep's react-native.config.js
  // `spm.name` overrides it. Required for libraries whose import prefix
  // differs from the auto-derived name (e.g. `react-native-worklets`
  // publishes headers under `<worklets/...>`).
  // -------------------------------------------------------------------------

  it('populates swiftName via toSwiftName when no spm.name override is set', () => {
    const direct = [
      {name: 'react-native-foo', root: '/foo', platforms: {ios: {}}},
    ];
    const [foo] = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({'/foo': {}}),
      resolveDep: makeResolveDep({}),
    });
    expect(foo.swiftName).toBe(toSwiftName('react-native-foo'));
    expect(foo.swiftName).toBe('ReactNativeFoo');
  });

  it('uses spm.name as swiftName when the direct dep declares one', () => {
    const direct = [
      {name: 'react-native-worklets', root: '/w', platforms: {ios: {}}},
    ];
    const [w] = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({'/w': {spm: {name: 'worklets'}}}),
      resolveDep: makeResolveDep({}),
    });
    expect(w.swiftName).toBe('worklets');
  });

  it('applies spm.name override to transitive deps too', () => {
    const direct = [
      {name: 'react-native-reanimated', root: '/r', platforms: {ios: {}}},
    ];
    const result = expandSpmDependencies(direct, {
      readConfig: makeReadConfig({
        '/r': {
          dependency: {platforms: {ios: {}}},
          spm: {name: 'reanimated', dependencies: ['react-native-worklets']},
        },
        '/w': {
          dependency: {platforms: {ios: {}}},
          spm: {name: 'worklets'},
        },
      }),
      resolveDep: makeResolveDep({'react-native-worklets': '/w'}),
    });
    const reanimated = result.find(d => d.name === 'react-native-reanimated');
    const worklets = result.find(d => d.name === 'react-native-worklets');
    expect(reanimated.swiftName).toBe('reanimated');
    expect(worklets.swiftName).toBe('worklets');
  });

  it('throws on swiftName collision between two deps (override vs auto-derived)', () => {
    // 'react-native-worklets' would auto-derive to 'ReactNativeWorklets', but
    // here a second dep overrides its spm.name to that same value.
    const direct = [
      {name: 'react-native-worklets', root: '/w', platforms: {ios: {}}},
      {name: 'other-package', root: '/o', platforms: {ios: {}}},
    ];
    expect(() =>
      expandSpmDependencies(direct, {
        readConfig: makeReadConfig({
          '/w': {},
          '/o': {spm: {name: 'ReactNativeWorklets'}},
        }),
        resolveDep: makeResolveDep({}),
      }),
    ).toThrow(/ReactNativeWorklets/);
  });

  it('throws SpmNameCollisionError on a dep-vs-dep collision too', () => {
    const direct = [
      {name: 'react-native-worklets', root: '/w', platforms: {ios: {}}},
      {name: 'other-package', root: '/o', platforms: {ios: {}}},
    ];
    expect(() =>
      expandSpmDependencies(direct, {
        readConfig: makeReadConfig({
          '/w': {},
          '/o': {spm: {name: 'ReactNativeWorklets'}},
        }),
        resolveDep: makeResolveDep({}),
      }),
    ).toThrow(SpmNameCollisionError);
  });

  it('throws on a CASE-INSENSITIVE swiftName collision (worklets vs Worklets)', () => {
    // Distinct as exact strings, but collide as directories on the default
    // case-insensitive macOS filesystem.
    const direct = [
      {name: 'react-native-worklets', root: '/w', platforms: {ios: {}}},
      {name: 'other-worklets', root: '/o', platforms: {ios: {}}},
    ];
    expect(() =>
      expandSpmDependencies(direct, {
        readConfig: makeReadConfig({
          '/w': {spm: {name: 'worklets'}},
          '/o': {spm: {name: 'Worklets'}},
        }),
        resolveDep: makeResolveDep({}),
      }),
    ).toThrow(/case/i);
  });

  it('rejects empty-string spm.name with a clear error citing the npm name', () => {
    const direct = [{name: 'a', root: '/a', platforms: {ios: {}}}];
    expect(() =>
      expandSpmDependencies(direct, {
        readConfig: makeReadConfig({'/a': {spm: {name: ''}}}),
        resolveDep: makeResolveDep({}),
      }),
    ).toThrow(/'a' has an invalid 'spm.name'/);
  });

  it('rejects non-string spm.name (e.g. number, object) with a clear error', () => {
    const direct = [{name: 'a', root: '/a', platforms: {ios: {}}}];
    expect(() =>
      expandSpmDependencies(direct, {
        readConfig: makeReadConfig({'/a': {spm: {name: 42}}}),
        resolveDep: makeResolveDep({}),
      }),
    ).toThrow(/invalid 'spm.name'/);
  });

  it('rejects spm.name with disallowed characters (spaces, slashes, dots)', () => {
    const resolve = name => () => resolveSwiftName('a', {spm: {name}}, NONE);
    expect(resolve('foo bar')).toThrow(/invalid 'spm.name'/);
    expect(resolve('foo/bar')).toThrow(/invalid 'spm.name'/);
    expect(resolve('foo.bar')).toThrow(/invalid 'spm.name'/);
  });

  it('accepts lowercase-with-hyphen and CamelCase spm.name values', () => {
    const resolve = name => resolveSwiftName('a', {spm: {name}}, NONE);
    expect(resolve('reanimated')).toBe('reanimated');
    expect(resolve('hermes-engine')).toBe('hermes-engine');
    expect(resolve('RNWorklets')).toBe('RNWorklets');
    expect(resolve('react_native_foo')).toBe('react_native_foo');
  });
});

// ---------------------------------------------------------------------------
// Scope disambiguation: a derived name that lands on one React Native reserves.
// ---------------------------------------------------------------------------

describe('expandSpmDependencies (scope disambiguation)', () => {
  function expand(direct, configs, options) {
    return expandSpmDependencies(direct, {
      readConfig: makeReadConfig(configs),
      resolveDep: makeResolveDep({}),
      ...options,
    });
  }

  it('prepends the scope when the derived name is reserved', () => {
    const [dep] = expand(
      [{name: '@powersync/react-native', root: '/ps', platforms: {ios: {}}}],
      {'/ps': {}},
    );
    expect(dep.swiftName).toBe('PowersyncReactNative');
  });

  it('logs one line naming the package, the reserved name and the name it got', () => {
    const log = jest.fn();
    expand(
      [{name: '@powersync/react-native', root: '/ps', platforms: {ios: {}}}],
      {'/ps': {}},
      {log},
    );
    expect(log).toHaveBeenCalledTimes(1);
    const [line] = log.mock.calls[0];
    expect(line).toContain('@powersync/react-native');
    expect(line).toContain("'ReactNative'");
    expect(line).toContain("'PowersyncReactNative'");
  });

  it('says nothing when no disambiguation happens', () => {
    const log = jest.fn();
    const [dep] = expand(
      [{name: '@powersync/common', root: '/c', platforms: {ios: {}}}],
      {'/c': {}},
      {log},
    );
    expect(dep.swiftName).toBe('Common');
    expect(log).not.toHaveBeenCalled();
  });

  it('title-cases a hyphenated scope', () => {
    const [dep] = expand(
      [{name: '@my-org/react-native', root: '/o', platforms: {ios: {}}}],
      {'/o': {}},
    );
    expect(dep.swiftName).toBe('MyOrgReactNative');
  });

  it('disambiguates a name that matches a reserved one only in case', () => {
    // toSwiftName('@scope/reactcodegen') === 'Reactcodegen' — distinct from
    // 'ReactCodegen' as a string, the same directory on a case-insensitive
    // filesystem.
    const [dep] = expand(
      [{name: '@scope/reactcodegen', root: '/s', platforms: {ios: {}}}],
      {'/s': {}},
    );
    expect(dep.swiftName).toBe('ScopeReactcodegen');
  });

  it('disambiguates a transitive dep too', () => {
    const result = expandSpmDependencies(
      [{name: 'top', root: '/top', platforms: {ios: {}}}],
      {
        readConfig: makeReadConfig({
          '/top': {spm: {dependencies: ['@scope/react-native']}},
          '/s': {dependency: {platforms: {ios: {}}}},
        }),
        resolveDep: makeResolveDep({'@scope/react-native': '/s'}),
      },
    );
    expect(result.map(d => d.swiftName)).toEqual(['Top', 'ScopeReactNative']);
  });

  it('disambiguates against a caller-supplied reserved name (remote identity)', () => {
    const [dep] = expand(
      [{name: '@acme/my-fork', root: '/f', platforms: {ios: {}}}],
      {'/f': {}},
      {extraReservedNames: ['MyFork']},
    );
    expect(dep.swiftName).toBe('AcmeMyFork');
  });

  it("leaves an explicit 'spm.name' alone on a package that would have collided", () => {
    const log = jest.fn();
    const [dep] = expand(
      [{name: '@powersync/react-native', root: '/ps', platforms: {ios: {}}}],
      {'/ps': {spm: {name: 'PowerSync'}}},
      {log},
    );
    expect(dep.swiftName).toBe('PowerSync');
    expect(log).not.toHaveBeenCalled();
  });

  it('throws when the disambiguated name is reserved as well', () => {
    const run = () =>
      expand(
        [{name: '@powersync/react-native', root: '/ps', platforms: {ios: {}}}],
        {'/ps': {}},
        {extraReservedNames: ['PowersyncReactNative']},
      );
    expect(run).toThrow(SpmNameCollisionError);
    expect(run).toThrow(/React Native reserves/);
  });

  it('gives two scoped packages that would take the same reserved name distinct names', () => {
    const result = expand(
      [
        {name: '@a/react-native', root: '/a', platforms: {ios: {}}},
        {name: '@b/react-native', root: '/b', platforms: {ios: {}}},
      ],
      {'/a': {}, '/b': {}},
    );
    expect(result.map(d => d.swiftName)).toEqual([
      'AReactNative',
      'BReactNative',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Scope disambiguation across deps: two libraries deriving one name.
// ---------------------------------------------------------------------------

describe('expandSpmDependencies (scope disambiguation across deps)', () => {
  function expand(direct, configs, options) {
    return expandSpmDependencies(direct, {
      readConfig: makeReadConfig(configs),
      resolveDep: makeResolveDep({}),
      ...options,
    });
  }

  const scoped = (name, root) => ({name, root, platforms: {ios: {}}});

  it('pulls two scoped deps apart with their scopes', () => {
    const result = expand([scoped('@a/foo', '/a'), scoped('@b/foo', '/b')], {
      '/a': {},
      '/b': {},
    });
    expect(result.map(d => d.swiftName)).toEqual(['AFoo', 'BFoo']);
  });

  it('logs one line per rewritten dep, naming the shared name and the new one', () => {
    const log = jest.fn();
    expand(
      [scoped('@a/foo', '/a'), scoped('@b/foo', '/b')],
      {
        '/a': {},
        '/b': {},
      },
      {log},
    );
    expect(log).toHaveBeenCalledTimes(2);
    const lines = log.mock.calls.map(([line]) => line);
    expect(lines[0]).toContain('@a/foo');
    expect(lines[0]).toContain("'Foo'");
    expect(lines[0]).toContain("'AFoo'");
    expect(lines[1]).toContain('@b/foo');
    expect(lines[1]).toContain("'BFoo'");
  });

  it('leaves an unscoped member alone — it has no scope to borrow', () => {
    const result = expand([scoped('@a/foo', '/a'), scoped('foo', '/f')], {
      '/a': {},
      '/f': {},
    });
    expect(result.map(d => d.swiftName)).toEqual(['AFoo', 'Foo']);
  });

  it("leaves a member's explicit 'spm.name' alone and moves the others around it", () => {
    const log = jest.fn();
    const result = expand(
      [scoped('@a/foo', '/a'), scoped('@b/foo', '/b')],
      {'/a': {spm: {name: 'Foo'}}, '/b': {}},
      {log},
    );
    expect(result.map(d => d.swiftName)).toEqual(['Foo', 'BFoo']);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain('@b/foo');
  });

  it('groups case-insensitively, so a lowercase override still moves the others', () => {
    const result = expand([scoped('@a/foo', '/a'), scoped('@b/foo', '/b')], {
      '/a': {spm: {name: 'foo'}},
      '/b': {},
    });
    expect(result.map(d => d.swiftName)).toEqual(['foo', 'BFoo']);
  });

  it('rewrites every scoped member of a three-way collision', () => {
    const result = expand(
      [scoped('@a/foo', '/a'), scoped('@b/foo', '/b'), scoped('@c/foo', '/c')],
      {'/a': {}, '/b': {}, '/c': {}},
    );
    expect(result.map(d => d.swiftName)).toEqual(['AFoo', 'BFoo', 'CFoo']);
  });

  it('rewrites the scoped members of a three-way collision and keeps the unscoped one', () => {
    const result = expand(
      [scoped('@a/foo', '/a'), scoped('@b/foo', '/b'), scoped('foo', '/f')],
      {'/a': {}, '/b': {}, '/f': {}},
    );
    expect(result.map(d => d.swiftName)).toEqual(['AFoo', 'BFoo', 'Foo']);
  });

  it('throws when a borrowed scope lands on a third package instead of producing two of the same name', () => {
    // 'a-foo' already derives 'AFoo', the name '@a/foo' borrows.
    const run = () =>
      expand(
        [
          scoped('@a/foo', '/a'),
          scoped('@b/foo', '/b'),
          scoped('a-foo', '/af'),
        ],
        {'/a': {}, '/b': {}, '/af': {}},
      );
    expect(run).toThrow(SpmNameCollisionError);
    expect(run).toThrow(/both resolve to 'AFoo'/);
  });

  it('throws when a borrowed scope lands on a name React Native reserves', () => {
    // Both derive 'Native'; the borrow takes '@react/native' to 'ReactNative'.
    const run = () =>
      expand([scoped('@react/native', '/r'), scoped('@other/native', '/o')], {
        '/r': {},
        '/o': {},
      });
    expect(run).toThrow(SpmNameCollisionError);
    expect(run).toThrow(/React Native reserves/);
  });

  it('still throws for two unscoped deps deriving the same name', () => {
    const run = () =>
      expand(
        [scoped('react-native-foo', '/a'), scoped('react_native_foo', '/b')],
        {'/a': {}, '/b': {}},
      );
    expect(run).toThrow(SpmNameCollisionError);
    expect(run).toThrow(
      /'react-native-foo' \('ReactNativeFoo'\) and 'react_native_foo' \('ReactNativeFoo'\) both resolve to 'ReactNativeFoo'\./,
    );
    expect(run).toThrow(/Set a distinct 'spm\.name'/);
  });

  it('changes nothing, and says nothing, for a set with no collisions', () => {
    const log = jest.fn();
    const result = expand(
      [scoped('@a/foo', '/a'), scoped('@b/bar', '/b'), scoped('baz', '/c')],
      {'/a': {}, '/b': {}, '/c': {}},
      {log},
    );
    expect(result.map(d => d.swiftName)).toEqual(['Foo', 'Bar', 'Baz']);
    expect(log).not.toHaveBeenCalled();
  });

  it('borrows a second time when an already-borrowed name collides, and the incumbent keeps its name', () => {
    // Both land on 'AReactNative': one by borrowing, one by derivation.
    const result = expand(
      [scoped('@a/react-native', '/a'), scoped('a-react-native', '/b')],
      {'/a': {}, '/b': {}},
    );
    expect(result.map(d => d.swiftName)).toEqual([
      'AAReactNative',
      'AReactNative',
    ]);
  });

  it('disambiguates a transitive dep against a direct one', () => {
    const result = expandSpmDependencies([scoped('@a/foo', '/a')], {
      readConfig: makeReadConfig({
        '/a': {spm: {dependencies: ['@b/foo']}},
        '/b': {dependency: {platforms: {ios: {}}}},
      }),
      resolveDep: makeResolveDep({'@b/foo': '/b'}),
    });
    expect(result.map(d => d.swiftName)).toEqual(['AFoo', 'BFoo']);
  });
});

// ---------------------------------------------------------------------------
// Reserved React Native names — the backstop for what a scope cannot resolve.
// ---------------------------------------------------------------------------

describe('expandSpmDependencies (reserved React Native names)', () => {
  function expand(direct, configs, options) {
    return expandSpmDependencies(direct, {
      readConfig: makeReadConfig(configs),
      resolveDep: makeResolveDep({}),
      ...options,
    });
  }

  it('throws when an unscoped dep auto-derives a reserved product name', () => {
    const run = () =>
      expand([{name: 'react-headers', root: '/rh', platforms: {ios: {}}}], {
        '/rh': {},
      });
    expect(run).toThrow(SpmNameCollisionError);
    expect(run).toThrow(
      /'react-headers' resolves to 'ReactHeaders', which React Native reserves/,
    );
    expect(run).toThrow(
      /Set a different 'spm\.name' in react-headers's react-native\.config\.js\./,
    );
  });

  it('throws when an explicit spm.name override lands on a reserved name', () => {
    expect(() =>
      expand([{name: 'some-lib', root: '/s', platforms: {ios: {}}}], {
        '/s': {spm: {name: 'ReactAppHeaders'}},
      }),
    ).toThrow(
      /'some-lib' resolves to 'ReactAppHeaders', which React Native reserves/,
    );
  });

  it('throws when a transitive dep lands on a reserved name', () => {
    expect(() =>
      expandSpmDependencies(
        [{name: 'top', root: '/top', platforms: {ios: {}}}],
        {
          readConfig: makeReadConfig({
            '/top': {spm: {dependencies: ['react-native-headers']}},
            '/rnh': {dependency: {platforms: {ios: {}}}},
          }),
          resolveDep: makeResolveDep({'react-native-headers': '/rnh'}),
        },
      ),
    ).toThrow(
      /'react-native-headers' resolves to 'ReactNativeHeaders', which React Native reserves/,
    );
  });

  it('reserves the caller-supplied extraReservedNames (remote package identity)', () => {
    const direct = [{name: 'my-fork', root: '/f', platforms: {ios: {}}}];
    expect(() =>
      expand(direct, {'/f': {}}, {extraReservedNames: ['MyFork']}),
    ).toThrow(/'my-fork' resolves to 'MyFork', which React Native reserves/);
  });

  it('accepts that same name when no extraReservedNames are supplied', () => {
    const [dep] = expand(
      [{name: 'my-fork', root: '/f', platforms: {ios: {}}}],
      {
        '/f': {},
      },
    );
    expect(dep.swiftName).toBe('MyFork');
  });

  it('leaves a non-colliding dep untouched', () => {
    const [dep] = expand(
      [{name: 'react-native-worklets', root: '/w', platforms: {ios: {}}}],
      {'/w': {spm: {name: 'worklets'}}},
      {extraReservedNames: ['SomeRemoteIdentity']},
    );
    expect(dep.swiftName).toBe('worklets');
  });

  it('reports the reserved-name diagnosis in preference to the dep-vs-dep one', () => {
    // Both unscoped deps derive 'ReactNative', so neither can borrow a scope.
    expect(() =>
      expand(
        [
          {name: 'react-native', root: '/a', platforms: {ios: {}}},
          {name: 'react_native', root: '/b', platforms: {ios: {}}},
        ],
        {'/a': {}, '/b': {}},
      ),
    ).toThrow(/React Native reserves/);
  });

  it('rejects every name in RESERVED_SWIFT_NAMES', () => {
    expect(RESERVED_SWIFT_NAMES.length).toBeGreaterThan(0);
    for (const reserved of RESERVED_SWIFT_NAMES) {
      expect(() =>
        expand([{name: 'some-lib', root: '/s', platforms: {ios: {}}}], {
          '/s': {spm: {name: reserved}},
        }),
      ).toThrow(/React Native reserves/);
    }
  });

  it('rejects the autolinking aggregator package name', () => {
    expect(() =>
      expand([{name: 'autolinked', root: '/a', platforms: {ios: {}}}], {
        '/a': {},
      }),
    ).toThrow(
      /'autolinked' resolves to 'Autolinked', which React Native reserves/,
    );
  });

  it('accepts the React headers TARGET dir name — it is not a package or product, so nothing collides', () => {
    const [dep] = expand(
      [{name: 'some-lib', root: '/s', platforms: {ios: {}}}],
      {
        '/s': {spm: {name: REACT_HEADERS_TARGET_DIR}},
      },
    );
    expect(dep.swiftName).toBe(REACT_HEADERS_TARGET_DIR);
  });

  it('reports a case-only match against a reserved name, naming both spellings', () => {
    const run = () =>
      expand([{name: 'some-lib', root: '/s', platforms: {ios: {}}}], {
        '/s': {spm: {name: 'reactnative'}},
      });
    expect(run).toThrow(SpmNameCollisionError);
    expect(run).toThrow(
      /'some-lib' resolves to 'reactnative', which differs from React Native's reserved 'ReactNative' only in case/,
    );
    expect(run).toThrow(/spm\.name/);
  });
});

// ---------------------------------------------------------------------------
// isValidSwiftName — the charset rule `spm.name` enforces.
// ---------------------------------------------------------------------------

describe('isValidSwiftName', () => {
  it.each(['worklets', 'ReactNativeFoo', 'hermes-engine', 'react_native_foo'])(
    'accepts %j',
    name => {
      expect(isValidSwiftName(name)).toBe(true);
    },
  );

  it.each(['', 'foo bar', 'foo/bar', 'foo.bar', '9lives', 42, null])(
    'rejects %j',
    name => {
      expect(isValidSwiftName(name)).toBe(false);
    },
  );
});
// defaultReadConfig
//
// The community CLI's own loaders disagree — sync reads named exports, async
// reads the default one — so a config that sets only `export default` must not
// be invisible here. Fixtures are transpiled by babel, so they present the
// `__esModule`/`default` interop shape; a Node namespace object from
// `require(ESM)` has no `__esModule` but exposes `.default` alongside
// enumerable named keys the same way, which is what the merge reads.
// ---------------------------------------------------------------------------

describe('defaultReadConfig', () => {
  let tmpRoot;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(
      path.join(fs.realpathSync(os.tmpdir()), 'spm-read-config-'),
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, {recursive: true, force: true});
  });

  function writeConfig(name, source) {
    const root = path.join(tmpRoot, name);
    fs.mkdirSync(root, {recursive: true});
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name}));
    fs.writeFileSync(path.join(root, 'react-native.config.js'), source);
    return root;
  }

  it('returns null when the library ships no config', () => {
    const root = path.join(tmpRoot, 'no-config');
    fs.mkdirSync(root, {recursive: true});
    expect(defaultReadConfig(root)).toBeNull();
  });

  it('reads a CommonJS config', () => {
    const root = writeConfig('cjs', "module.exports = {spm: {name: 'Cjs'}};\n");
    expect(defaultReadConfig(root).spm.name).toBe('Cjs');
  });

  it('unwraps an ESM config that only has a default export', () => {
    const root = writeConfig(
      'esm-default',
      "export default {spm: {name: 'EsmDefault'}};\n",
    );
    expect(defaultReadConfig(root).spm.name).toBe('EsmDefault');
  });

  it('reads an ESM config that only has named exports', () => {
    const root = writeConfig(
      'esm-named',
      "export const spm = {name: 'EsmNamed'};\n",
    );
    expect(defaultReadConfig(root).spm.name).toBe('EsmNamed');
  });

  it('prefers the named export when a config ships both (the PowerSync shape)', () => {
    const root = writeConfig(
      'esm-both',
      "export const spm = {name: 'Named'};\n" +
        "export default {spm: {name: 'Default'}, dependency: {platforms: {ios: {}}}};\n",
    );
    const config = defaultReadConfig(root);
    expect(config.spm.name).toBe('Named');
    // Only the merge satisfies this: `dependency` exists on the default export
    // alone, so reading the module raw would miss it.
    expect(config.dependency.platforms.ios).toEqual({});
  });

  it('keeps sibling keys of the default export (dependency.platforms.ios)', () => {
    const root = writeConfig(
      'esm-siblings',
      "export default {dependency: {platforms: {ios: {}}}, spm: {name: 'Siblings'}};\n",
    );
    const config = defaultReadConfig(root);
    expect(config.dependency.platforms.ios).toEqual({});
    expect(config.spm.name).toBe('Siblings');
  });

  it('passes a function-style config through unchanged (module.exports = () => ({...}))', () => {
    const root = writeConfig(
      'fn-style',
      "module.exports = () => ({spm: {name: 'FnStyle'}});\n",
    );
    const config = defaultReadConfig(root);
    expect(typeof config).toBe('function');
    expect(config().spm.name).toBe('FnStyle');
  });

  it('warns with the config path and the reason when the config fails to load, and returns null', () => {
    const root = writeConfig(
      'broken',
      "require('a-dev-dependency-that-is-not-installed');\n",
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(defaultReadConfig(root)).toBeNull();
      const message = warnSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(message).toContain(path.join(root, 'react-native.config.js'));
      expect(message).toContain('a-dev-dependency-that-is-not-installed');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
