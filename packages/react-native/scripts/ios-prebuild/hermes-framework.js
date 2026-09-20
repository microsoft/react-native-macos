/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

const {createLogger} = require('./utils');
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const hermesLog = createLogger('Hermes');

// XCFramework symbol metadata names directories, but xcodebuild needs each
// individual dSYM bundle and bcsymbolmap as an absolute -debug-symbols argument.
function symbolPaths(
  slicePath /*: string */,
  library /*: {DebugSymbolsPath?: string, BitcodeSymbolMapsPath?: string, ...} */,
) /*: Array<string> */ {
  const keys /*: Array<'DebugSymbolsPath' | 'BitcodeSymbolMapsPath'> */ = [
    'DebugSymbolsPath',
    'BitcodeSymbolMapsPath',
  ];
  return keys.flatMap(key => {
    if (library[key] == null) {
      return [];
    }
    const directory = path.resolve(slicePath, library[key]);
    const extension = key === 'DebugSymbolsPath' ? '.dSYM' : '.bcsymbolmap';
    const symbols = fs
      .readdirSync(directory)
      .filter(name => name.endsWith(extension))
      .map(name => path.join(directory, name));
    if (symbols.length === 0) {
      throw new Error(`[Hermes] Missing symbol sidecars in ${directory}`);
    }
    for (const symbol of symbols) {
      const files =
        key === 'DebugSymbolsPath'
          ? [
              path.join(symbol, 'Contents', 'Info.plist'),
              path.join(symbol, 'Contents', 'Resources', 'DWARF', 'hermesvm'),
            ]
          : [symbol];
      for (const file of files) {
        if (!fs.statSync(file).isFile()) {
          throw new Error(`[Hermes] Invalid symbol sidecar: ${file}`);
        }
      }
    }
    return symbols;
  });
}

// [macOS] Older artifacts, including main's legacy Hermes artifacts, keep macOS
// outside the universal XCFramework. Check capabilities rather than versions:
// newer defaults do not cover cached artifacts or explicit version overrides.
function recomposeHermesXCFramework(
  artifactsPath /*: string */,
  requireMacOS /*: boolean */ = true,
) {
  const frameworksPath = path.join(
    artifactsPath,
    'destroot',
    'Library',
    'Frameworks',
  );
  const xcframeworkPath = path.join(
    frameworksPath,
    'universal',
    'hermesvm.xcframework',
  );
  const infoPath = path.join(xcframeworkPath, 'Info.plist');
  const macOSFrameworkPath = path.join(
    frameworksPath,
    'macosx',
    'hermesvm.framework',
  );

  if (!fs.existsSync(infoPath)) {
    if (requireMacOS) {
      throw new Error(
        `[Hermes] Cannot prepare required macOS slice: missing ${infoPath}`,
      );
    }
    return;
  }

  const info = JSON.parse(
    execFileSync('plutil', ['-convert', 'json', '-o', '-', infoPath], {
      encoding: 'utf8',
    }).toString(),
  );
  if (
    info.AvailableLibraries.some(
      library => library.SupportedPlatform === 'macos',
    )
  ) {
    return;
  }

  const macOSBinaryPath = path.join(macOSFrameworkPath, 'hermesvm');
  if (!fs.existsSync(macOSBinaryPath)) {
    if (requireMacOS) {
      throw new Error(
        `[Hermes] Cannot prepare required macOS slice: missing ${macOSBinaryPath}`,
      );
    }
    return;
  }

  const symbolsByLibrary /*: Map<string, Array<string>> */ = new Map();
  const frameworkArgs = info.AvailableLibraries.flatMap(library => {
    const slicePath = path.join(xcframeworkPath, library.LibraryIdentifier);
    const symbols = symbolPaths(slicePath, library);
    if (symbols.length > 0) {
      symbolsByLibrary.set(library.LibraryIdentifier, symbols);
    }
    return [
      '-framework',
      path.join(slicePath, library.LibraryPath),
      ...symbols.flatMap(symbol => ['-debug-symbols', symbol]),
    ];
  });
  frameworkArgs.push('-framework', macOSFrameworkPath);

  const replacementPath = path.join(
    frameworksPath,
    'universal',
    'hermesvm-new.xcframework',
  );
  fs.rmSync(replacementPath, {recursive: true, force: true});
  try {
    execFileSync(
      'xcodebuild',
      [
        '-create-xcframework',
        ...frameworkArgs,
        '-output',
        replacementPath,
        '-allow-internal-distribution',
      ],
      {stdio: 'inherit'},
    );
    // Trust only Xcode's generated metadata and actual output files. Validate
    // before moving the original so a successful command cannot lose symbols.
    if (symbolsByLibrary.size > 0) {
      const replacementInfo = JSON.parse(
        execFileSync(
          'plutil',
          [
            '-convert',
            'json',
            '-o',
            '-',
            path.join(replacementPath, 'Info.plist'),
          ],
          {encoding: 'utf8'},
        ).toString(),
      );
      for (const [identifier, symbols] of symbolsByLibrary) {
        const library = replacementInfo.AvailableLibraries.find(
          entry => entry.LibraryIdentifier === identifier,
        );
        const outputSymbols = library
          ? symbolPaths(path.join(replacementPath, identifier), library).map(
              symbol => path.basename(symbol),
            )
          : [];
        for (const symbol of symbols) {
          if (!outputSymbols.includes(path.basename(symbol))) {
            throw new Error(
              `[Hermes] Missing recomposed symbol sidecar: ${symbol}`,
            );
          }
        }
      }
    }
    // Keep the original until the replacement is installed, including if the
    // final rename fails after xcodebuild succeeds.
    const backupFolder = fs.mkdtempSync(`${xcframeworkPath}-backup-`);
    const backupPath = path.join(backupFolder, 'hermesvm.xcframework');
    fs.renameSync(xcframeworkPath, backupPath);
    try {
      fs.renameSync(replacementPath, xcframeworkPath);
    } catch (error) {
      fs.renameSync(backupPath, xcframeworkPath);
      fs.rmSync(backupFolder, {recursive: true, force: true});
      throw error;
    }
    fs.rmSync(backupFolder, {recursive: true, force: true});
  } finally {
    fs.rmSync(replacementPath, {recursive: true, force: true});
  }
  hermesLog(
    'Added the standalone macOS framework to the universal XCFramework',
  );
}

module.exports = {recomposeHermesXCFramework};
