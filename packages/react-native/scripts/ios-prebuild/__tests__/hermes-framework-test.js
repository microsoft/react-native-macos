/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @format
 */

// [macOS]

'use strict';

jest.mock('child_process', () => ({execFileSync: jest.fn()}));

const {recomposeHermesXCFramework} = require('../hermes-framework');
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const libraries = [
  {
    LibraryIdentifier: 'ios-arm64',
    LibraryPath: 'hermesvm.framework',
    SupportedPlatform: 'ios',
  },
  {
    LibraryIdentifier: 'ios-arm64_x86_64-simulator',
    LibraryPath: 'hermesvm.framework',
    SupportedPlatform: 'ios',
    SupportedPlatformVariant: 'simulator',
  },
  {
    LibraryIdentifier: 'ios-arm64_x86_64-maccatalyst',
    LibraryPath: 'hermesvm.framework',
    SupportedPlatform: 'ios',
    SupportedPlatformVariant: 'maccatalyst',
  },
  {
    LibraryIdentifier: 'xros-arm64',
    LibraryPath: 'nested path/hermesvm.framework',
    SupportedPlatform: 'xros',
  },
];
const macOSLibrary = {
  LibraryIdentifier: 'macos-arm64_x86_64',
  LibraryPath: 'hermesvm.framework',
  SupportedPlatform: 'macos',
};
let tmp;
let framework;
let standalone;
let replacement;
let infoPath;

function writeInfo(folder, availableLibraries) {
  fs.writeFileSync(
    path.join(folder, 'Info.plist'),
    JSON.stringify({AvailableLibraries: availableLibraries}),
  );
}

function expectOriginalInputs(expectedLibraries = libraries) {
  expect(JSON.parse(fs.readFileSync(infoPath, 'utf8'))).toEqual({
    AvailableLibraries: expectedLibraries,
  });
  libraries.forEach(library => {
    expect(
      fs.readFileSync(
        path.join(
          framework,
          library.LibraryIdentifier,
          library.LibraryPath,
          'hermesvm',
        ),
        'utf8',
      ),
    ).toBe(library.LibraryIdentifier);
  });
  expect(fs.readFileSync(path.join(standalone, 'hermesvm'), 'utf8')).toBe(
    'macOS binary',
  );
  expect(fs.readlinkSync(path.join(standalone, 'hermesvm'))).toBe(
    'Versions/Current/hermesvm',
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes framework test-'));
  const frameworks = path.join(tmp, 'destroot/Library/Frameworks');
  framework = path.join(frameworks, 'universal/hermesvm.xcframework');
  replacement = path.join(frameworks, 'universal/hermesvm-new.xcframework');
  standalone = path.join(frameworks, 'macosx/hermesvm.framework');
  infoPath = path.join(framework, 'Info.plist');
  fs.mkdirSync(framework, {recursive: true});
  writeInfo(framework, libraries);
  libraries.forEach(library => {
    const slice = path.join(
      framework,
      library.LibraryIdentifier,
      library.LibraryPath,
    );
    fs.mkdirSync(slice, {recursive: true});
    fs.writeFileSync(path.join(slice, 'hermesvm'), library.LibraryIdentifier);
  });
  fs.mkdirSync(path.join(standalone, 'Versions/Current'), {recursive: true});
  fs.writeFileSync(
    path.join(standalone, 'Versions/Current/hermesvm'),
    'macOS binary',
  );
  fs.symlinkSync(
    'Versions/Current/hermesvm',
    path.join(standalone, 'hermesvm'),
  );
  jest.spyOn(console, 'log').mockImplementation(() => {});
  execFileSync.mockImplementation((command, args) => {
    if (command === 'plutil') {
      return fs.readFileSync(args[4], 'utf8');
    }
    if (command === 'xcodebuild') {
      // Exercise the real helper against disk; only simulate Xcode's output.
      expectOriginalInputs();
      expect(fs.existsSync(replacement)).toBe(false);
      fs.mkdirSync(replacement);
      writeInfo(replacement, [...libraries, macOSLibrary]);
      return;
    }
    throw new Error(`Unexpected command: ${command}`);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(tmp, {recursive: true, force: true});
});

test('preserves every plist slice path and replaces only after composition succeeds', () => {
  fs.mkdirSync(replacement);
  fs.writeFileSync(path.join(replacement, 'stale'), 'old failed output');
  recomposeHermesXCFramework(tmp);
  expect(execFileSync).toHaveBeenCalledWith(
    'plutil',
    ['-convert', 'json', '-o', '-', infoPath],
    {encoding: 'utf8'},
  );
  expect(execFileSync).toHaveBeenCalledWith(
    'xcodebuild',
    [
      '-create-xcframework',
      ...libraries.flatMap(library => [
        '-framework',
        path.join(framework, library.LibraryIdentifier, library.LibraryPath),
      ]),
      '-framework',
      standalone,
      '-output',
      replacement,
      '-allow-internal-distribution',
    ],
    {stdio: 'inherit'},
  );
  expect(JSON.parse(fs.readFileSync(infoPath, 'utf8'))).toEqual({
    AvailableLibraries: [...libraries, macOSLibrary],
  });
  expect(fs.readdirSync(path.dirname(framework))).toEqual([
    'hermesvm.xcframework',
  ]);
  expect(fs.readFileSync(path.join(standalone, 'hermesvm'), 'utf8')).toBe(
    'macOS binary',
  );
  execFileSync.mockClear();
  recomposeHermesXCFramework(tmp);
  expect(execFileSync.mock.calls.map(([command]) => command)).toEqual([
    'plutil',
  ]);
});

test('an existing macOS slice needs no standalone framework', () => {
  writeInfo(framework, [...libraries, macOSLibrary]);
  fs.rmSync(standalone, {recursive: true});
  recomposeHermesXCFramework(tmp);
  expect(execFileSync.mock.calls.map(([command]) => command)).toEqual([
    'plutil',
  ]);
});

test.each(['plist', 'framework', 'binary', 'broken symlink'])(
  'requires the missing %s unless macOS is optional',
  missing => {
    const missingPath =
      missing === 'plist'
        ? infoPath
        : missing === 'framework'
          ? standalone
          : missing === 'binary'
            ? path.join(standalone, 'hermesvm')
            : path.join(standalone, 'Versions/Current/hermesvm');
    fs.rmSync(missingPath, {recursive: true});
    expect(() => recomposeHermesXCFramework(tmp)).toThrow(
      'Cannot prepare required macOS slice: missing',
    );
    expect(() => recomposeHermesXCFramework(tmp, false)).not.toThrow();
    expect(
      execFileSync.mock.calls.some(([command]) => command === 'xcodebuild'),
    ).toBe(false);
    expect(fs.existsSync(framework)).toBe(true);
  },
);

test.each([true, false])(
  'propagates plist failures even when macOS is optional (%s)',
  requireMacOS => {
    execFileSync.mockImplementationOnce(() => {
      throw new Error('invalid plist');
    });
    expect(() => recomposeHermesXCFramework(tmp, requireMacOS)).toThrow(
      'invalid plist',
    );
    expectOriginalInputs();
    execFileSync.mockReturnValueOnce('not JSON');
    expect(() => recomposeHermesXCFramework(tmp, requireMacOS)).toThrow();
    expectOriginalInputs();
  },
);

test.each([true, false])(
  'preserves original inputs on failed composition (required: %s)',
  requireMacOS => {
    const execute = execFileSync.getMockImplementation();
    execFileSync.mockImplementation((command, args) => {
      if (command === 'xcodebuild') {
        fs.mkdirSync(replacement);
        fs.writeFileSync(path.join(replacement, 'partial'), 'failed output');
        throw new Error('unsupported framework input');
      }
      return execute(command, args);
    });
    expect(() => recomposeHermesXCFramework(tmp, requireMacOS)).toThrow(
      'unsupported framework input',
    );
    expectOriginalInputs();
    expect(fs.existsSync(replacement)).toBe(false);
  },
);

test('restores the original if replacement installation fails', () => {
  const rename = fs.renameSync.bind(fs);
  jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
    if (from === replacement) {
      throw new Error('replacement rename failed');
    }
    rename(from, to);
  });
  expect(() => recomposeHermesXCFramework(tmp)).toThrow(
    'replacement rename failed',
  );
  expectOriginalInputs();
  expect(fs.readdirSync(path.dirname(framework))).toEqual([
    'hermesvm.xcframework',
  ]);
});

describe('symbol sidecars', () => {
  const identifier = libraries[0].LibraryIdentifier;
  const dsymName = 'hermesvm.framework.dSYM';
  const mapNames = ['first.bcsymbolmap', 'second.bcsymbolmap'];
  const symbolLibraries = [
    {
      ...libraries[0],
      DebugSymbolsPath: 'original symbols',
      BitcodeSymbolMapsPath: 'original maps',
    },
    ...libraries.slice(1),
  ];
  // Xcode chooses its own output directories; the helper must read them.
  const outputLibraries = [
    {
      ...libraries[0],
      DebugSymbolsPath: 'dSYMs',
      BitcodeSymbolMapsPath: 'BCSymbolMaps',
    },
    ...libraries.slice(1),
    macOSLibrary,
  ];
  let inputDSYM;
  let inputMaps;

  function writeSymbols(root, library) {
    const slice = path.join(root, identifier);
    const dsym = path.join(slice, library.DebugSymbolsPath, dsymName);
    fs.mkdirSync(path.join(dsym, 'Contents/Resources/DWARF'), {
      recursive: true,
    });
    fs.writeFileSync(path.join(dsym, 'Contents/Info.plist'), 'dSYM plist');
    fs.writeFileSync(
      path.join(dsym, 'Contents/Resources/DWARF/hermesvm'),
      'DWARF data',
    );
    const maps = path.join(slice, library.BitcodeSymbolMapsPath);
    fs.mkdirSync(maps, {recursive: true});
    mapNames.forEach(name => fs.writeFileSync(path.join(maps, name), name));
  }

  function expectInputSymbols() {
    expectOriginalInputs(symbolLibraries);
    expect(
      fs.readFileSync(path.join(inputDSYM, 'Contents/Info.plist'), 'utf8'),
    ).toBe('dSYM plist');
    expect(
      fs.readFileSync(
        path.join(inputDSYM, 'Contents/Resources/DWARF/hermesvm'),
        'utf8',
      ),
    ).toBe('DWARF data');
    inputMaps.forEach((file, index) => {
      expect(fs.readFileSync(file, 'utf8')).toBe(mapNames[index]);
    });
  }

  beforeEach(() => {
    writeInfo(framework, symbolLibraries);
    writeSymbols(framework, symbolLibraries[0]);
    inputDSYM = path.join(framework, identifier, 'original symbols', dsymName);
    inputMaps = mapNames.map(name =>
      path.join(framework, identifier, 'original maps', name),
    );
    execFileSync.mockImplementation((command, args) => {
      if (command === 'plutil') {
        return fs.readFileSync(args[4], 'utf8');
      }
      if (command === 'xcodebuild') {
        expectInputSymbols();
        expect(args).toEqual([
          '-create-xcframework',
          '-framework',
          path.join(framework, identifier, libraries[0].LibraryPath),
          '-debug-symbols',
          inputDSYM,
          ...inputMaps.flatMap(file => ['-debug-symbols', file]),
          ...libraries
            .slice(1)
            .flatMap(library => [
              '-framework',
              path.join(
                framework,
                library.LibraryIdentifier,
                library.LibraryPath,
              ),
            ]),
          '-framework',
          standalone,
          '-output',
          replacement,
          '-allow-internal-distribution',
        ]);
        fs.mkdirSync(replacement);
        writeInfo(replacement, outputLibraries);
        writeSymbols(replacement, outputLibraries[0]);
        return;
      }
      throw new Error(`Unexpected command: ${command}`);
    });
  });

  test('passes each actual symbol path and validates Xcode metadata and files', () => {
    recomposeHermesXCFramework(tmp);
    expect(execFileSync.mock.calls.map(([command]) => command)).toEqual([
      'plutil',
      'xcodebuild',
      'plutil',
    ]);
    expect(JSON.parse(fs.readFileSync(infoPath, 'utf8'))).toEqual({
      AvailableLibraries: outputLibraries,
    });
    expect(
      fs.readFileSync(
        path.join(
          framework,
          identifier,
          'dSYMs',
          dsymName,
          'Contents/Resources/DWARF/hermesvm',
        ),
        'utf8',
      ),
    ).toBe('DWARF data');
    mapNames.forEach(name => {
      expect(
        fs.readFileSync(
          path.join(framework, identifier, 'BCSymbolMaps', name),
          'utf8',
        ),
      ).toBe(name);
    });
    expect(fs.readdirSync(path.dirname(framework))).toEqual([
      'hermesvm.xcframework',
    ]);
  });

  test.each(['metadata', 'slice', 'dSYM', 'DWARF', 'map', 'map metadata'])(
    'preserves all inputs when Xcode output lacks %s',
    missing => {
      const execute = execFileSync.getMockImplementation();
      execFileSync.mockImplementation((command, args) => {
        const result = execute(command, args);
        if (command === 'xcodebuild') {
          const slice = path.join(replacement, identifier);
          if (missing === 'metadata') {
            writeInfo(replacement, [...libraries, macOSLibrary]);
          } else if (missing === 'slice') {
            writeInfo(replacement, outputLibraries.slice(1));
          } else if (missing === 'map metadata') {
            const {BitcodeSymbolMapsPath, ...library} = outputLibraries[0];
            writeInfo(replacement, [library, ...outputLibraries.slice(1)]);
          } else {
            const file =
              missing === 'map'
                ? path.join(slice, 'BCSymbolMaps', mapNames[1])
                : path.join(
                    slice,
                    'dSYMs',
                    dsymName,
                    ...(missing === 'DWARF'
                      ? ['Contents/Resources/DWARF/hermesvm']
                      : []),
                  );
            fs.rmSync(file, {recursive: true});
          }
        }
        return result;
      });
      expect(() => recomposeHermesXCFramework(tmp)).toThrow();
      expectInputSymbols();
      expect(fs.readdirSync(path.dirname(framework))).toEqual([
        'hermesvm.xcframework',
      ]);
    },
  );

  test.each(['directory', 'empty directory', 'DWARF', 'map file'])(
    'rejects invalid input symbols before Xcode: %s',
    invalid => {
      if (invalid === 'directory') {
        fs.rmSync(path.dirname(inputDSYM), {recursive: true});
      } else if (invalid === 'empty directory') {
        fs.rmSync(inputDSYM, {recursive: true});
      } else if (invalid === 'DWARF') {
        fs.unlinkSync(
          path.join(inputDSYM, 'Contents/Resources/DWARF/hermesvm'),
        );
      } else {
        fs.unlinkSync(inputMaps[0]);
        fs.mkdirSync(inputMaps[0]);
      }
      expect(() => recomposeHermesXCFramework(tmp)).toThrow();
      expectOriginalInputs(symbolLibraries);
      expect(execFileSync.mock.calls.map(([command]) => command)).toEqual([
        'plutil',
      ]);
      expect(fs.existsSync(replacement)).toBe(false);
    },
  );
});
