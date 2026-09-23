/**
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license in the root LICENSE file.
 * @format
 * @noflow
 */

const {
  combineSchemasInFileList,
} = require('../../../../react-native-codegen/src/cli/combine/combine-js-to-schema');
const {
  generate,
} = require('../../../../react-native-codegen/src/generators/RNCodegen');
const headers = require('../headers');
const {
  buildInventory,
  computeInventory,
  scanHeader,
} = require('../headers-inventory');
const {
  collectIncludeHealth,
  diffAgainstBaseline,
} = require('../headers-verify');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = '/header-inventory-fixture';

function classify(text, targets = []) {
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
  jest
    .spyOn(fs, 'readFileSync')
    .mockImplementation(file =>
      file === path.join(root, 'source/A.h') ? text : '',
    );
  return computeInventory(root);
}

afterEach(() => jest.restoreAllMocks());

const excluded = [
  '#ifdef __ANDROID__',
  '#ifdef ANDROID',
  '#if defined(__ANDROID__)',
  '#if defined __ANDROID__',
  '#if (__ANDROID__)',
  '#if defined(ANDROID)',
  '#if defined(__ANDROID__) && UNKNOWN_FEATURE',
  '#if UNKNOWN_FEATURE && (defined(__ANDROID__))',
  '#if !(!defined(__ANDROID__))',
  '#if defined /* comment */ (__ANDROID__)',
  '#if defined(__ANDROID__) && \\\n UNKNOWN_FEATURE',
];
const eligible = [
  '#if !defined(__ANDROID__)',
  '#ifndef __ANDROID__',
  '#if !__ANDROID__',
  '#if UNKNOWN_PLATFORM',
  '#if defined(__ANDROID__) || UNKNOWN_FEATURE',
  '#if defined(__ANDROID__) == UNKNOWN_FEATURE',
  '#if defined(__ANDROID__) ? UNKNOWN_FEATURE : OTHER_FEATURE',
  '#if defined(__ANDROID__) + UNKNOWN_FEATURE',
  '#if defined(__ANDROID__)_SUFFIX',
  '#if defined(__APPLE__) && TARGET_OS_OSX',
  '#if defined(TARGET_OS_OSX) && TARGET_OS_OSX',
  '#if !TARGET_OS_OSX',
];

test.each(excluded)('excludes only a proven non-Apple branch: %s', guard => {
  const inventory = classify(
    `${guard}\n#include "platform/android/Missing.h"\n#include <ns/Missing.h>\n#endif`,
  );
  expect(collectIncludeHealth(inventory)).toEqual([]);
  expect(inventory.headers[0].includes.otherPlatform).toEqual([
    '"platform/android/Missing.h"',
    'ns/Missing.h',
  ]);
});

test.each(eligible)('keeps a possibly Apple branch visible: %s', guard => {
  expect(
    collectIncludeHealth(
      classify(`${guard}\n#include "platform/android/Missing.h"\n#endif`),
    ),
  ).toEqual(['quotedNotShipped ns/A.h -> "platform/android/Missing.h"']);
});

test('does not hide unguarded Android-spelled imports', () => {
  expect(
    collectIncludeHealth(classify('#include "platform/android/Missing.h"')),
  ).toHaveLength(1);
});

test.each(['if', 'elif'])(
  'reads complete #%s expressions across multiline comments',
  directive => {
    const prefix = directive === 'elif' ? '#if defined(__ANDROID__)\n' : '';
    const text = `${prefix}#${directive} defined(__ANDROID__) /* split\n comment */ || defined(__APPLE__)\n#include "platform/macos/Missing.h"\n#endif`;
    expect(collectIncludeHealth(classify(text))).toEqual([
      'quotedNotShipped ns/A.h -> "platform/macos/Missing.h"',
    ]);
  },
);

test.each(['\r\n', '\r', 'mixed'])(
  'normalizes line endings and directive comments: %p',
  newline => {
    const guards = [
      ...[
        '__ANDROID__',
        'ANDROID',
        '__APPLE__',
        'TARGET_OS_OSX',
        'UNKNOWN_PLATFORM',
        '__cplusplus',
      ].flatMap(macro => [
        `#ifdef ${macro}`,
        `#ifndef ${macro}`,
        `#if ${macro}`,
        `#if !${macro}`,
        `#if defined(${macro})`,
        `#if !defined ${macro}`,
      ]),
      '#if defined(__APPLE__) && TARGET_OS_OSX',
      '#if defined(TARGET_OS_OSX) && TARGET_OS_OSX',
      '#if defined(__ANDROID__) && UNKNOWN_FEATURE',
      '#if defined(__ANDROID__) || UNKNOWN_FEATURE',
      '#if defined(__ANDROID__) == UNKNOWN_FEATURE',
      '#if defined(__ANDROID__) ? UNKNOWN_FEATURE : OTHER_FEATURE',
      '#if defined(__ANDROID__) /* split\n comment */ || defined(__APPLE__)',
      '#if defined(__ANDROID__) && \\\n UNKNOWN_FEATURE',
    ].flatMap(guard => [
      guard,
      '#if UNKNOWN_FEATURE // first branch\n' +
        guard
          .replace(/^#ifdef (.*)$/, '#elif defined($1)')
          .replace(/^#ifndef (.*)$/, '#elif !defined($1)')
          .replace(/^#if\b/, '#elif'),
    ]);
    for (const guard of guards) {
      for (let mask = 0; mask < 16; mask++) {
        const comment = bit =>
          Math.floor(mask / 2 ** bit) % 2 ? ' // comment' : '';
        const lf = `${guard}${comment(0)}\n#include "Branch.h"\n#elif defined(__ANDROID__)${comment(1)}\n#include "Android.h"\n#else${comment(2)}\n#ifdef __cplusplus\n#include <folly/dynamic.h>\n#endif\n#endif${comment(3)}\n#include "platform/macos/Missing.h"\n`;
        let i = 0;
        const converted = lf.replace(/\n/g, () =>
          newline === 'mixed' ? ['\n', '\r\n', '\r'][i++ % 3] : newline,
        );
        expect(scanHeader(converted)).toEqual(scanHeader(lf));
        const expected = collectIncludeHealth(classify(lf));
        expect(expected).toContain(
          'quotedNotShipped ns/A.h -> "platform/macos/Missing.h"',
        );
        expect(collectIncludeHealth(classify(converted))).toEqual(expected);
      }
    }
  },
);

test('restores outer conditions and preserves independent C++ guards', () => {
  const text =
    '#ifdef __cplusplus\n#if defined(__ANDROID__)\n#include "Android.h"\n#else\n#include <folly/dynamic.h>\n#endif\n#endif\n#include "Apple.h"';
  expect(scanHeader(text).includes).toEqual([
    {token: '"Android.h"', cxxGuarded: true, appleExcluded: true},
    {token: 'folly/dynamic.h', cxxGuarded: true},
    {token: '"Apple.h"', cxxGuarded: false},
  ]);
});

test.each(['\n', '\r\n'])(
  'splices newlines before recognizing block delimiters: %p',
  newline => {
    const text = [
      '#if defined(__ANDROID__) /\\',
      '* split',
      '#endif // inside block',
      'comment *\\',
      '/ || UNKNOWN_FEATURE',
      '#include "Apple.h"',
      '#endif',
    ].join(newline);
    expect(scanHeader(text).includes).toEqual([
      {token: '"Apple.h"', cxxGuarded: false},
    ]);
  },
);

test('line comments and quoted include tokens do not open block comments', () => {
  const text = [
    '// /* not a block',
    '#include "path//Apple.h"',
    '// continued \\',
    '#if defined(__ANDROID__)',
    '#include "Apple.h"',
  ].join('\n');
  expect(scanHeader(text).includes).toEqual([
    {token: '"path//Apple.h"', cxxGuarded: false},
    {token: '"Apple.h"', cxxGuarded: false},
  ]);
});

test.each(['if', 'elif'])(
  'real-source #%s regression remains visible with multiline comments',
  directive => {
    const rnRoot = path.resolve(__dirname, '../../..');
    const before = collectIncludeHealth(computeInventory(rnRoot));
    const wrapper = 'react/renderer/components/view/HostPlatformViewProps.h';
    const file = path.join(rnRoot, 'ReactCommon', wrapper);
    const read = fs.readFileSync;
    jest.spyOn(fs, 'readFileSync').mockImplementation((name, ...args) => {
      const text = read(name, ...args);
      return name === file
        ? `${text}\n${directive === 'elif' ? '#if defined(__ANDROID__)\n' : ''}#${directive} defined(__ANDROID__) /* split\n comment */ || defined(__APPLE__)\n#include "platform/macos/Missing.h"\n#endif\n`
        : text;
    });
    expect(
      diffAgainstBaseline(
        collectIncludeHealth(computeInventory(rnRoot)),
        before,
      ),
    ).toEqual({
      newOffenders: [
        `quotedNotShipped ${wrapper} -> "platform/macos/Missing.h"`,
      ],
      resolved: [],
    });
  },
);

test.each(['sub/B.h', './sub/B.h', 'sub/../sub/B.h', '../ns/sub/B.h'])(
  'resolves packaged relative path %s',
  token => {
    const inventory = classify(`#include "${token}"`, [
      ['ns/sub/B.h', 'elsewhere/B.h'],
    ]);
    expect(
      inventory.headers.find(h => h.naturalPath === 'ns/A.h').includes.internal,
    ).toEqual([{naturalPath: 'ns/sub/B.h', cxxGuarded: false}]);
  },
);

test('prefers packaged siblings over root and source spellings', () => {
  const inventory = classify('#ifdef __cplusplus\n#include "sub/B.h"\n#endif', [
    ['ns/sub/B.h', 'elsewhere/B.h'],
    ['sub/B.h', 'root/B.h'],
    ['relocated/B.h', 'source/sub/B.h'],
  ]);
  expect(
    inventory.headers.find(h => h.naturalPath === 'ns/A.h').includes.internal,
  ).toEqual([{naturalPath: 'ns/sub/B.h', cxxGuarded: true}]);
});

test.each(['missing/B.h', '../../other/B.h', '/other/B.h'])(
  'does not invent a packaged target for %s',
  token => {
    expect(
      collectIncludeHealth(
        classify(`#include "${token}"`, [['other/B.h', 'elsewhere/B.h']]),
      ),
    ).toEqual([`quotedNotShipped ns/A.h -> "${token}"`]);
  },
);

test.each([2, 3])('never suppresses %s conflicting physical sources', count => {
  const sources = [
    'ReactCommon/react/renderer/components/view/HostPlatformTouch.h',
    'ReactCommon/react/renderer/components/view/platform/cxx/react/renderer/components/view/HostPlatformTouch.h',
    'unexpected/Header.h',
  ].slice(0, count);
  jest.spyOn(headers, 'getHeaderFilesFromPodspecs').mockReturnValue({
    fixture: [
      {
        specName: 'React-Fabric',
        headerDir: '',
        headers: sources.map(source => ({
          source: path.join(root, source),
          target: 'react/renderer/components/view/HostPlatformTouch.h',
        })),
      },
    ],
  });
  const inventory = buildInventory(root);
  expect(inventory.collisions).toEqual([
    {
      naturalPath: 'react/renderer/components/view/HostPlatformTouch.h',
      sources: [...sources].sort(),
    },
  ]);
  expect(inventory.entries.size).toBe(1); // No donor-only physical aliases.
});

test('real inventory retains 1154 entries with generated FBReactNativeSpec headers and no include-health drift', () => {
  const rnRoot = path.resolve(__dirname, '../../..');
  const generatedRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'header-codegen-'),
  );
  try {
    // Prebuild generates these eight ignored headers, but a clean Jest checkout
    // does not. Generate from this head's schema in isolation, even when a local
    // native build has left older FBReactNativeSpec outputs in the source tree.
    const config =
      require('../../../package.json').codegenConfig.libraries.find(
        library => library.name === 'FBReactNativeSpec',
      );
    expect(
      generate(
        {
          libraryName: config.name,
          schema: combineSchemasInFileList(
            [path.join(rnRoot, config.jsSrcsDir)],
            'ios',
          ),
          outputDirectory: path.join(generatedRoot, 'React/FBReactNativeSpec'),
          packageName: 'com.facebook.fbreact.specs',
          assumeNonnull: true,
          useLocalIncludePaths: false,
          includeGetDebugPropsImplementation: true,
        },
        {generators: ['componentsIOS', 'modulesIOS', 'modulesCxx']},
      ),
    ).toBe(true);
    const spec = 'React/React-RCTFBReactNativeSpec.podspec';
    fs.copyFileSync(path.join(rnRoot, spec), path.join(generatedRoot, spec));
    const discover = headers.getHeaderFilesFromPodspecs;
    const generatedMaps =
      discover(generatedRoot)[path.join(generatedRoot, spec)];
    expect(generatedMaps.flatMap(map => map.headers)).toHaveLength(8);
    jest
      .spyOn(headers, 'getHeaderFilesFromPodspecs')
      .mockImplementation(folder => ({
        ...discover(folder),
        [path.join(folder, spec)]: generatedMaps,
      }));
    const inventory = computeInventory(rnRoot);
    const baseline = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../headers-include-baseline.json'),
        'utf8',
      ),
    );
    expect(inventory.headers).toHaveLength(1154);
    expect(inventory.collisions).toEqual([]);
    expect(baseline).toHaveLength(21);
    expect(
      diffAgainstBaseline(collectIncludeHealth(inventory), baseline),
    ).toEqual({newOffenders: [], resolved: []});
  } finally {
    fs.rmSync(generatedRoot, {recursive: true, force: true});
  }
});
