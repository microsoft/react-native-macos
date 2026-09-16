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

const headers = require('../headers');
const {
  NATURAL_PATH_SOURCE_PREFERENCES,
  PLATFORM_DISPATCH_AUXILIARY_HEADERS,
  PLATFORM_DISPATCH_IMPLEMENTATIONS,
  buildInventory,
  computeInventory,
  scanHeader,
} = require('../headers-inventory');
const fs = require('fs');
const path = require('path');

describe('scanHeader include classification', () => {
  test('an unguarded include is not cxx-guarded', () => {
    const r = scanHeader('#import <React/RCTBridge.h>\n');
    expect(r.includes).toEqual([
      {token: 'React/RCTBridge.h', cxxGuarded: false},
    ]);
  });

  test('an include under #ifdef __cplusplus is cxx-guarded', () => {
    const r = scanHeader(
      '#ifdef __cplusplus\n#include <folly/dynamic.h>\n#endif\n',
    );
    expect(r.includes).toEqual([{token: 'folly/dynamic.h', cxxGuarded: true}]);
  });

  test('#else flips the __cplusplus guard', () => {
    const src = [
      '#ifdef __cplusplus',
      '#include <cpp/only.h>',
      '#else',
      '#include <c/only.h>',
      '#endif',
      '',
    ].join('\n');
    expect(scanHeader(src).includes).toEqual([
      {token: 'cpp/only.h', cxxGuarded: true},
      {token: 'c/only.h', cxxGuarded: false},
    ]);
  });

  test('#elif __cplusplus enters a cxx-only region', () => {
    const src = [
      '#if SOMETHING',
      '#include <a.h>',
      '#elif __cplusplus',
      '#include <b.h>',
      '#endif',
      '',
    ].join('\n');
    expect(scanHeader(src).includes).toEqual([
      {token: 'a.h', cxxGuarded: false},
      {token: 'b.h', cxxGuarded: true},
    ]);
  });
});

describe('scanHeader C++ / ObjC surface detection', () => {
  test('an unguarded namespace is unguarded C++', () => {
    const r = scanHeader('namespace facebook { struct X; }\n');
    expect(r.hasUnguardedCxx).toBe(true);
    expect(r.hasGuardedCxx).toBe(false);
  });

  test('a namespace under __cplusplus is guarded, not unguarded', () => {
    const r = scanHeader('#ifdef __cplusplus\nnamespace facebook {}\n#endif\n');
    expect(r.hasGuardedCxx).toBe(true);
    expect(r.hasUnguardedCxx).toBe(false);
  });

  test('a named aggregate with a member initializer is ObjC++', () => {
    const r = scanHeader('struct RCTFontProperties { CGFloat size = NAN; };\n');
    expect(r.hasUnguardedCxx).toBe(true);
  });

  test('an ANONYMOUS aggregate with a member initializer is ObjC++', () => {
    // Regression: the tag name is optional, so a typedef'd anonymous struct
    // carrying a C++ default member initializer is still detected as ObjC++.
    const r = scanHeader('typedef struct { CGFloat x = NAN; } Foo;\n');
    expect(r.hasUnguardedCxx).toBe(true);
  });

  test('@interface marks the header as ObjC', () => {
    const r = scanHeader('@interface RCTBridge : NSObject\n@end\n');
    expect(r.hasObjC).toBe(true);
  });
});

describe('scanHeader comment handling', () => {
  test('a multi-line block comment mentioning C++ keywords does not trip the detector', () => {
    const src = [
      '/*',
      ' * namespace foo is documented here',
      ' * template <typename T> and constexpr too',
      ' */',
      '@interface RCTFoo',
      '@end',
      '',
    ].join('\n');
    const r = scanHeader(src);
    expect(r.hasUnguardedCxx).toBe(false);
    expect(r.hasGuardedCxx).toBe(false);
    expect(r.hasObjC).toBe(true);
  });

  test('an inline block comment does not trip the detector', () => {
    expect(scanHeader('int x; /* namespace y */\n').hasUnguardedCxx).toBe(
      false,
    );
  });

  test('a // line comment mentioning a keyword does not trip the detector', () => {
    expect(scanHeader('// using namespace std;\n').hasUnguardedCxx).toBe(false);
  });
});

describe('header source precedence', () => {
  test('resolves known platform dispatch collisions explicitly', () => {
    const rnRoot = path.join(__dirname, '..', '..', '..');
    const inventory = computeInventory(rnRoot);

    expect(inventory.collisions).toEqual([]);
    expect(Array.from(PLATFORM_DISPATCH_IMPLEMENTATIONS.keys())).toEqual(
      [
        'HostPlatformTouch.h',
        'HostPlatformViewEventEmitter.h',
        'HostPlatformViewProps.h',
        'HostPlatformViewTraitsInitializer.h',
        'KeyEvent.h',
        'MouseEvent.h',
      ].map(name => `react/renderer/components/view/${name}`),
    );
    for (const [
      naturalPath,
      {preferredSource: source},
    ] of NATURAL_PATH_SOURCE_PREFERENCES) {
      const header = inventory.headers.find(
        candidate => candidate.naturalPath === naturalPath,
      );
      expect(header?.identities.map(identity => identity.source)).toEqual([
        source,
      ]);
    }
    for (const source of PLATFORM_DISPATCH_IMPLEMENTATIONS.values()) {
      const naturalPath = source.slice('ReactCommon/'.length);
      const header = inventory.headers.find(
        candidate => candidate.naturalPath === naturalPath,
      );
      expect(header?.identities.map(identity => identity.source)).toEqual([
        source,
      ]);
    }
    for (const source of PLATFORM_DISPATCH_AUXILIARY_HEADERS.keys()) {
      const naturalPath = source.slice('ReactCommon/'.length);
      const header = inventory.headers.find(
        candidate => candidate.naturalPath === naturalPath,
      );
      expect(header?.identities.map(identity => identity.source)).toEqual([
        source,
      ]);
    }
    const expectedConsumers = [
      'RCTText/RCTUITextField.h',
      'RCTText/RCTUITextView.h',
      'RCTText/RCTWrappedTextView.h',
      'React/RCTUITextField.h',
      'React/RCTUITextView.h',
      'React/RCTUnimplementedNativeComponentView.h',
      'React/RCTWrappedTextView.h',
    ];
    const textUIKitConsumers = inventory.headers.filter(header =>
      expectedConsumers.includes(header.naturalPath),
    );
    expect(textUIKitConsumers.map(header => header.naturalPath).sort()).toEqual(
      expectedConsumers.sort(),
    );
    expect(
      textUIKitConsumers.flatMap(header => header.includes.quotedNotShipped),
    ).toEqual([]);
    const byPath = new Map(inventory.headers.map(h => [h.naturalPath, h]));
    for (const [wrapperPath, source] of PLATFORM_DISPATCH_IMPLEMENTATIONS) {
      const wrapper = byPath.get(wrapperPath);
      expect(wrapper).toBeDefined();
      expect(wrapper?.includes.internal).toContainEqual({
        naturalPath: source.slice('ReactCommon/'.length),
        cxxGuarded: false,
      });
      if (NATURAL_PATH_SOURCE_PREFERENCES.has(wrapperPath)) {
        const cxxPath = source.replace('/platform/macos/', '/platform/cxx/');
        expect(byPath.has(cxxPath.slice('ReactCommon/'.length))).toBe(true);
        expect(wrapper?.includes.internal).toContainEqual({
          naturalPath: cxxPath.slice('ReactCommon/'.length),
          cxxGuarded: false,
        });
      }
    }
  });
});

describe('bounded source exceptions', () => {
  const root = '/header-inventory-fixture';
  const rules = Array.from(NATURAL_PATH_SOURCE_PREFERENCES);
  const mockHeaders = (naturalPath, sources) => {
    jest.spyOn(headers, 'getHeaderFilesFromPodspecs').mockReturnValue({
      fixture: [
        {
          specName: 'React-Fabric',
          headerDir: '',
          headers: sources.map(source => ({
            source: path.join(root, source),
            target: naturalPath,
          })),
        },
      ],
    });
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  };

  afterEach(() => jest.restoreAllMocks());

  test.each(rules)(
    'resolves only the exact known pair for %s',
    (naturalPath, rule) => {
      mockHeaders(naturalPath, [rule.competingSource, rule.preferredSource]);
      const result = buildInventory(root);
      expect(result.collisions).toEqual([]);
      expect(
        result.entries.get(naturalPath)?.identities.map(i => i.source),
      ).toEqual([rule.preferredSource]);
      expect(
        result.sourceToNatural.get(path.join(root, rule.competingSource)),
      ).not.toContain(naturalPath);
      if (rule.competingSource.includes('/platform/')) {
        expect(
          result.entries.has(rule.competingSource.slice('ReactCommon/'.length)),
        ).toBe(true);
      }
    },
  );

  test.each(rules)(
    'preserves an unexpected third source for %s',
    (naturalPath, rule) => {
      const sources = [
        rule.preferredSource,
        rule.competingSource,
        'unexpected/Header.h',
      ];
      mockHeaders(naturalPath, sources);
      const result = buildInventory(root);
      expect(result.collisions).toEqual([
        {naturalPath, sources: [...sources].sort()},
      ]);
      expect(
        result.entries.get(naturalPath)?.identities.map(i => i.source),
      ).toEqual(sources);
      for (const source of sources) {
        expect(result.sourceToNatural.get(path.join(root, source))).toContain(
          naturalPath,
        );
      }
    },
  );

  test.each(rules)(
    'does not suppress a replacement competitor for %s',
    (naturalPath, rule) => {
      const sources = [rule.preferredSource, 'unexpected/Header.h'];
      mockHeaders(naturalPath, sources);
      expect(buildInventory(root).collisions).toEqual([
        {naturalPath, sources: sources.sort()},
      ]);
    },
  );

  test.each(rules)(
    'keeps an upstream-only source for %s',
    (naturalPath, rule) => {
      const source = naturalPath.includes('/view/')
        ? rule.competingSource
        : rule.preferredSource;
      mockHeaders(naturalPath, [source]);
      const result = buildInventory(root);
      expect(result.collisions).toEqual([]);
      expect(
        result.entries.get(naturalPath)?.identities.map(i => i.source),
      ).toEqual([source]);
      expect(
        Array.from(result.entries.keys()).some(p =>
          p.includes('/platform/macos/'),
        ),
      ).toBe(false);
    },
  );

  test.each(rules)(
    'retains collisions when the preferred source is absent for %s',
    (naturalPath, rule) => {
      const sources = [rule.competingSource, 'unexpected/Header.h'];
      mockHeaders(naturalPath, sources);
      expect(buildInventory(root).collisions).toEqual([
        {naturalPath, sources: sources.sort()},
      ]);
    },
  );

  test.each(Array.from(PLATFORM_DISPATCH_IMPLEMENTATIONS))(
    'does not activate macOS additions for an unrelated source at %s',
    (naturalPath, implementation) => {
      mockHeaders(naturalPath, ['unexpected/Header.h']);
      const result = buildInventory(root);
      expect(
        result.entries.has(implementation.slice('ReactCommon/'.length)),
      ).toBe(false);
      for (const source of PLATFORM_DISPATCH_AUXILIARY_HEADERS.keys()) {
        expect(result.entries.has(source.slice('ReactCommon/'.length))).toBe(
          false,
        );
      }
    },
  );
});

describe('packaged quoted include resolution', () => {
  const root = '/header-inventory-fixture';
  const classify = (token, targets, guarded = false) => {
    jest.spyOn(headers, 'getHeaderFilesFromPodspecs').mockReturnValue({
      fixture: [
        {
          specName: 'Fixture',
          headerDir: '',
          headers: [
            {source: path.join(root, 'source/A.h'), target: 'ns/A.h'},
            ...targets.map(([target, source]) => ({
              source: path.join(root, source),
              target,
            })),
          ],
        },
      ],
    });
    jest.spyOn(fs, 'readFileSync').mockImplementation(file => {
      if (file !== path.join(root, 'source/A.h')) {
        return '';
      }
      const include = `#include "${token}"\n`;
      return guarded ? `#ifdef __cplusplus\n${include}#endif\n` : include;
    });
    return computeInventory(root).headers.find(h => h.naturalPath === 'ns/A.h')
      ?.includes;
  };

  afterEach(() => jest.restoreAllMocks());

  test.each(['sub/B.h', './sub/B.h', 'sub/../sub/B.h', '../ns/sub/B.h'])(
    'normalizes the packaged sibling %s',
    token => {
      const includes = classify(token, [['ns/sub/B.h', 'elsewhere/B.h']]);
      expect(includes?.internal).toEqual([
        {naturalPath: 'ns/sub/B.h', cxxGuarded: false},
      ]);
      expect(includes?.quotedNotShipped).toEqual([]);
    },
  );

  test('prefers the packaged sibling over root and physical-source matches', () => {
    const includes = classify(
      'sub/B.h',
      [
        ['ns/sub/B.h', 'elsewhere/B.h'],
        ['sub/B.h', 'root/B.h'],
        ['relocated/B.h', 'source/sub/B.h'],
      ],
      true,
    );
    expect(includes?.internal).toEqual([
      {naturalPath: 'ns/sub/B.h', cxxGuarded: true},
    ]);
  });

  test.each(['other/B.h', './other/B.h', 'other/sub/../B.h'])(
    'falls back to the normalized include-root spelling %s',
    token => {
      expect(
        classify(token, [['other/B.h', 'elsewhere/B.h']])?.internal,
      ).toEqual([{naturalPath: 'other/B.h', cxxGuarded: false}]);
    },
  );

  test('retains the source mapping for relocated pod headers', () => {
    expect(
      classify('B.h', [['relocated/B.h', 'source/B.h']])?.internal,
    ).toEqual([{naturalPath: 'relocated/B.h', cxxGuarded: false}]);
  });

  test('resolves a bare name within the packaged namespace', () => {
    expect(classify('B.h', [['ns/B.h', 'elsewhere/B.h']])?.internal).toEqual([
      {naturalPath: 'ns/B.h', cxxGuarded: false},
    ]);
  });

  test.each(['missing/B.h', '../../other/B.h', '/other/B.h'])(
    'does not invent a packaged target for %s',
    token => {
      const includes = classify(token, [['other/B.h', 'elsewhere/B.h']]);
      expect(includes?.internal).toEqual([]);
      expect(includes?.quotedNotShipped).toEqual([`"${token}"`]);
    },
  );
});
