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

const {
  buildDepsHeadersXcframework,
  composeHeadersOnlyXcframework,
  stubSlicesFromXcframework,
} = require('../headers-xcframework');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('buildDepsHeadersXcframework set-equality gate', () => {
  let tmp /*: string */ = '';
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-headers-test-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  const mkHeaders = (namespaces /*: Array<string> */) => {
    const dir = path.join(tmp, 'Headers');
    fs.mkdirSync(dir, {recursive: true});
    for (const ns of namespaces) {
      fs.mkdirSync(path.join(dir, ns), {recursive: true});
    }
    return dir;
  };

  // Both gates throw BEFORE any staging or xcodebuild invocation, so these
  // tests run without macOS tooling.
  test('fails closed when a declared namespace is missing from the artifact', () => {
    const headers = mkHeaders(['folly']);
    expect(() =>
      buildDepsHeadersXcframework(tmp, headers, ['folly', 'glog'], []),
    ).toThrow(/missing from .*Headers: glog/);
  });

  test('fails closed when the artifact ships an undeclared namespace', () => {
    const headers = mkHeaders(['folly', 'brand-new-dep']);
    expect(() =>
      buildDepsHeadersXcframework(tmp, headers, ['folly'], []),
    ).toThrow(/undeclared in DEPS_NAMESPACES.*brand-new-dep/);
  });

  test('ignores loose files at the Headers root (directories are the namespace set)', () => {
    const headers = mkHeaders(['folly']);
    fs.writeFileSync(path.join(headers, 'stray.h'), '');
    expect(() =>
      buildDepsHeadersXcframework(tmp, headers, ['folly', 'glog'], []),
    ).toThrow(/missing from .*Headers: glog/); // throws for glog, not stray.h
  });
});

describe('stubSlicesFromXcframework', () => {
  // The plist shape is a pure function of plutil's JSON; mock it so the
  // SupportedPlatform/Variant -> key mapping and the unknown-slice guard can be
  // tested without a real xcframework or macOS tooling.
  const mockPlist = (obj /*: unknown */) =>
    jest
      .spyOn(childProcess, 'execFileSync')
      .mockReturnValue(Buffer.from(JSON.stringify(obj) ?? '', 'utf8'));

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('maps ios / ios-simulator slices to their stub recipes', () => {
    mockPlist({
      AvailableLibraries: [
        {SupportedPlatform: 'ios', SupportedArchitectures: ['arm64']},
        {
          SupportedPlatform: 'ios',
          SupportedPlatformVariant: 'simulator',
          SupportedArchitectures: ['arm64', 'x86_64'],
        },
      ],
    });
    const slices = stubSlicesFromXcframework('/fake.xcframework');
    expect(slices).toEqual([
      {name: 'ios', sdk: 'iphoneos', targets: ['arm64-apple-ios15.0']},
      {
        name: 'ios-simulator',
        sdk: 'iphonesimulator',
        targets: [
          'arm64-apple-ios15.0-simulator',
          'x86_64-apple-ios15.0-simulator',
        ],
      },
    ]);
  });

  test('throws for an unknown slice, pointing at PLATFORM_STUB_RECIPES', () => {
    mockPlist({
      AvailableLibraries: [
        {SupportedPlatform: 'watchos', SupportedArchitectures: ['arm64']},
      ],
    });
    expect(() => stubSlicesFromXcframework('/fake.xcframework')).toThrow(
      /no stub recipe for slice 'watchos'[\s\S]*PLATFORM_STUB_RECIPES/,
    );
  });

  const iosLibraries = [
    {SupportedPlatform: 'ios', SupportedArchitectures: ['arm64']},
    {
      SupportedPlatform: 'ios',
      SupportedPlatformVariant: 'simulator',
      SupportedArchitectures: ['arm64', 'x86_64'],
    },
  ];

  test('matches all five Microsoft platforms without adding Catalyst or architectures', () => {
    const exec = mockPlist({
      AvailableLibraries: [
        ...iosLibraries,
        {
          SupportedPlatform: 'macos',
          SupportedArchitectures: ['x86_64', 'arm64'],
        },
        {SupportedPlatform: 'xros', SupportedArchitectures: ['arm64']},
        {
          SupportedPlatform: 'xros',
          SupportedPlatformVariant: 'simulator',
          SupportedArchitectures: ['arm64'],
        },
      ],
    });
    expect(stubSlicesFromXcframework('/React.xcframework')).toEqual([
      {name: 'ios', sdk: 'iphoneos', targets: ['arm64-apple-ios15.0']},
      {
        name: 'ios-simulator',
        sdk: 'iphonesimulator',
        targets: [
          'arm64-apple-ios15.0-simulator',
          'x86_64-apple-ios15.0-simulator',
        ],
      },
      {
        name: 'macos',
        sdk: 'macosx',
        targets: ['x86_64-apple-macosx11.0', 'arm64-apple-macosx11.0'],
      },
      {name: 'xros', sdk: 'xros', targets: ['arm64-apple-xros1.0']},
      {
        name: 'xros-simulator',
        sdk: 'xrsimulator',
        targets: ['arm64-apple-xros1.0-simulator'],
      },
    ]);
    expect(exec).toHaveBeenCalledWith('plutil', [
      '-convert',
      'json',
      '-o',
      '-',
      '/React.xcframework/Info.plist',
    ]);
  });

  test('matches the three upstream platforms including Catalyst', () => {
    mockPlist({
      AvailableLibraries: [
        ...iosLibraries,
        {
          SupportedPlatform: 'ios',
          SupportedPlatformVariant: 'maccatalyst',
          SupportedArchitectures: ['arm64', 'x86_64'],
        },
      ],
    });
    const slices = stubSlicesFromXcframework('/React.xcframework');
    expect(slices.map(s => s.name)).toEqual([
      'ios',
      'ios-simulator',
      'ios-maccatalyst',
    ]);
    expect(slices[2]).toEqual({
      name: 'ios-maccatalyst',
      sdk: 'macosx',
      targets: ['arm64-apple-ios15.0-macabi', 'x86_64-apple-ios15.0-macabi'],
    });
  });

  test.each([
    ['macos', undefined, 'macosx', 'macosx11.0'],
    ['ios', 'simulator', 'iphonesimulator', 'ios15.0-simulator'],
    ['xros', undefined, 'xros', 'xros1.0'],
    ['tvos', undefined, 'appletvos', 'tvos15.1'],
    ['tvos', 'simulator', 'appletvsimulator', 'tvos15.1-simulator'],
  ])('preserves a single %s / %s slice', (platform, variant, sdk, target) => {
    mockPlist({
      AvailableLibraries: [
        {
          SupportedPlatform: platform,
          SupportedPlatformVariant: variant,
          SupportedArchitectures: ['arm64'],
        },
      ],
    });
    expect(stubSlicesFromXcframework('/single.xcframework')).toEqual([
      {
        name: variant == null ? platform : `${platform}-${variant}`,
        sdk,
        targets: [`arm64-apple-${target}`],
      },
    ]);
  });

  test.each([
    null,
    {},
    {AvailableLibraries: null},
    {AvailableLibraries: {}},
    {AvailableLibraries: []},
  ])('rejects missing or empty libraries: %p', plist => {
    mockPlist(plist);
    expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
      /non-empty AvailableLibraries/,
    );
  });

  test.each([
    null,
    {},
    {SupportedPlatform: ''},
    {SupportedPlatform: 1},
    {SupportedPlatform: 'ios', SupportedPlatformVariant: ''},
    {SupportedPlatform: 'ios', SupportedPlatformVariant: null},
    {SupportedPlatform: 'ios', SupportedPlatformVariant: 1},
  ])('rejects malformed platform metadata: %p', lib => {
    mockPlist({AvailableLibraries: [lib]});
    expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
      /invalid platform metadata/,
    );
  });

  test.each(['watchos', 'visionos', 'toString', '__proto__'])(
    'rejects unknown platform %s',
    platform => {
      mockPlist({
        AvailableLibraries: [
          {SupportedPlatform: platform, SupportedArchitectures: ['arm64']},
        ],
      });
      expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
        /no stub recipe/,
      );
    },
  );

  test('rejects an unknown variant', () => {
    mockPlist({
      AvailableLibraries: [
        {...iosLibraries[0], SupportedPlatformVariant: 'unknown'},
      ],
    });
    expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
      /no stub recipe for slice 'ios-unknown'/,
    );
  });

  test.each(
    [
      undefined,
      null,
      [],
      'arm64',
      [null],
      [1],
      [''],
      ['arm64-apple-ios'],
      ['arm64', 'arm64'],
    ].map(archs => [archs]),
  )(
    'rejects malformed architectures instead of inventing a default: %p',
    archs => {
      mockPlist({
        AvailableLibraries: [
          {SupportedPlatform: 'ios', SupportedArchitectures: archs},
        ],
      });
      expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
        /invalid SupportedArchitectures/,
      );
    },
  );

  test('rejects duplicate platform/variant entries', () => {
    mockPlist({AvailableLibraries: [iosLibraries[0], iosLibraries[0]]});
    expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
      /duplicate slice 'ios'/,
    );
  });

  test('reports invalid JSON with the artifact path', () => {
    jest
      .spyOn(childProcess, 'execFileSync')
      .mockReturnValue(Buffer.from('not JSON'));
    expect(() => stubSlicesFromXcframework('/bad.xcframework')).toThrow(
      /failed to parse Info.plist of \/bad.xcframework/,
    );
  });

  test('reports a missing or unreadable plist', () => {
    jest.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
      throw new Error('missing plist');
    });
    expect(() => stubSlicesFromXcframework('/missing.xcframework')).toThrow(
      /failed to parse Info.plist.*missing plist/,
    );
  });

  test('rejects empty emitter input before invoking native tools', () => {
    const exec = jest.spyOn(childProcess, 'execFileSync');
    expect(() =>
      composeHeadersOnlyXcframework('/unused', 'Headers', '/unused', []),
    ).toThrow(/requires non-empty slices/);
    expect(exec).not.toHaveBeenCalled();
  });
});
