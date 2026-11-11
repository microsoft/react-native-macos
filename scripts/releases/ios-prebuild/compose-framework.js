/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

const {HEADERS_FOLDER, TARGET_FOLDER} = require('./constants');
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

/*::
import type { Dependency, Platform } from './types';
*/

/**
 * Composes the final XCFramework from the artifacts in the build folder
 */
async function createFramework(
  scheme /*: string */,
  configuration /*: string */,
  dependencies /*: $ReadOnlyArray<Dependency> */,
  rootFolder /*: string */,
  buildFolder /*: string */,
  identity /*: ?string */,
) {
  console.log('✅ Composing iOS XCFramework...');

  // Get the build destination path from the prebuild step
  const frameworksOutputFolder = path.join(buildFolder, 'Build', 'Products');
  const frameworks = fs.readdirSync(frameworksOutputFolder);
  console.log('Frameworks found:', frameworks.join(', '));

  const frameworkPaths = frameworks.map(framework =>
    path.join(frameworksOutputFolder, framework),
  );

  const output = path.join(rootFolder, `${scheme}.xcframework`);

  // Check if output already exists and delete it
  fs.rmSync(output, {recursive: true, force: true});

  console.log('Output path:', output);

  const buildArguments = ['-create-xcframework'];
  frameworkPaths.forEach(framework => {
    buildArguments.push(
      '-framework',
      path.join(framework, 'PackageFrameworks', `${scheme}.framework`),
    );
  });
  buildArguments.push('-output', output);
  execFileSync('xcodebuild', buildArguments, {stdio: 'inherit'});

  // Copy bundles into the framework
  copyBundles(scheme, dependencies, output, frameworkPaths);

  // Copy Symbols to symbols folder - copy before headers since we're using the folders inside the xcframework
  // to get the arch slices.
  copySymbols(scheme, output, frameworkPaths);

  // Copy headers to the framework - start by building the Header folder
  copyHeaders(scheme, dependencies, rootFolder);

  if (identity) {
    signXCFramework(identity, output);
  }
}

/**
 * Copies headers needed from the package to a Header folder that we'll pass to
 * each framework arch type
 */
function copyHeaders(
  scheme /*: string */,
  dependencies /*: $ReadOnlyArray<Dependency> */,
  rootFolder /*: string */,
) {
  console.log('Copying header files for dependencies...');

  // Create and clean the header folder
  const headeDestinationFolder = path.join(
    rootFolder,
    `${scheme}.xcframework`,
    'Headers',
  );
  fs.rmSync(headeDestinationFolder, {force: true, recursive: true});
  fs.mkdirSync(headeDestinationFolder, {recursive: true});

  // Now we can go through all dependencies and copy header files for each depencendy
  dependencies.forEach(dep => {
    const depHeaders = path.join(
      rootFolder,
      dep.name,
      TARGET_FOLDER,
      HEADERS_FOLDER,
    );

    // Copy all header files from the dependency to headerTempFolder
    fs.readdirSync(depHeaders).forEach(header => {
      fs.cpSync(
        path.join(depHeaders, header),
        path.join(headeDestinationFolder, header),
        {recursive: true},
      );
    });
  });
}

/**
 * Copies the bundles in the source frameworks to the target xcframework inside the xcframework's Resources folder
 */
function copyBundles(
  scheme /*: string */,
  dependencies /*: $ReadOnlyArray<Dependency> */,
  outputFolder /*:string*/,
  frameworkPaths /*:Array<string>*/,
) {
  console.log('Copying bundles to the framework...');
  // Let's precalculate the target folder. It is the xcframework's output folder with
  // all its targets.
  const targetArchFolders = fs
    .readdirSync(outputFolder)
    .map(p => path.join(outputFolder, p))
    .filter(p => fs.statSync(p).isDirectory());
  // For each framework (in frameworkPaths), copy the bundles from the source folder.
  // A bundle is the name of the framework + _ + target name + .bundle. We can
  // check if the target has a bundle by checking if it defines one or more resources.
  frameworkPaths.forEach(frameworkPath => {
    const frameworkPlatforms = getArchsFromFramework(
      path.join(
        frameworkPath,
        'PackageFrameworks',
        scheme + '.framework',
        scheme,
      ),
    );

    dependencies.forEach(dep => {
      const resources = dep.files.resources;
      if (!resources || resources.length === 0) {
        return;
      }
      // Get bundle source folder
      const bundleName = `${scheme}_${dep.name}.bundle`;
      const sourceBundlePath = path.join(frameworkPath, bundleName);
      if (fs.existsSync(sourceBundlePath)) {
        // Target folder - needs to be copied to the resulting framework
        const targetFolder = targetArchFolders.find(
          targetArchFolder =>
            getArchsFromFramework(
              path.join(targetArchFolder, scheme + '.framework', scheme),
            ) === frameworkPlatforms,
        );
        if (targetFolder) {
          console.log(
            `  ${path.relative(outputFolder, sourceBundlePath)} → ${path.basename(targetFolder)}`,
          );
          const targetBundlePath = path.join(
            targetFolder,
            `${scheme}.framework`,
            bundleName,
          );

          // A bundle is a directory, so we need to copy the whole directory
          fs.cpSync(sourceBundlePath, targetBundlePath, {recursive: true});
        } else {
          throw Error(
            `Could not find target architecture for folder ${path.relative(outputFolder, frameworkPath)}. Expected to find ${frameworkPlatforms}`,
          );
        }
      } else {
        console.warn(`Bundle ${sourceBundlePath} not found`);
      }
    });
  });
}

function copySymbols(
  scheme /*: string */,
  outputFolder /*:string*/,
  frameworkPaths /*:Array<string>*/,
) {
  console.log('Copying dSym files...');

  const targetArchFolders = fs
    .readdirSync(outputFolder)
    .map(p => path.join(outputFolder, p))
    .filter(p => fs.statSync(p).isDirectory());

  // For each framework (in frameworkPaths), copy the symbols from the source folder.
  frameworkPaths.forEach(frameworkPath => {
    const frameworkPlatforms = getArchsFromFramework(
      path.join(
        frameworkPath,
        'PackageFrameworks',
        scheme + '.framework',
        scheme,
      ),
    );

    // Find the correct target folder based on the current architectures
    const targetFolder = targetArchFolders.find(
      targetArchFolder =>
        frameworkPlatforms ===
        getArchsFromFramework(
          path.join(targetArchFolder, scheme + '.framework', scheme),
        ),
    );

    if (!targetFolder) {
      throw new Error(`Could not find target folder for ${frameworkPath}`);
    }
    const sourceSymbolPath = path.join(
      frameworkPath,
      scheme + '.framework.dSYM',
    );
    if (!fs.existsSync(sourceSymbolPath)) {
      throw new Error(`dSYM folder ${sourceSymbolPath} not found`);
    }

    const archName = path.basename(targetFolder);
    console.log(
      ` ${path.relative(outputFolder, sourceSymbolPath)} → ${archName}`,
    );

    const targetSymbolPath = path.join(
      outputFolder,
      '..',
      'Symbols',
      archName,
      scheme + '.framework.dSYM',
    );
    fs.mkdirSync(targetSymbolPath, {recursive: true});
    fs.cpSync(sourceSymbolPath, targetSymbolPath, {recursive: true});
  });
}

function getArchsFromFramework(frameworkPath /*:string*/) {
  const platformLines = execFileSync('vtool', ['-show-build', frameworkPath])
    .toString()
    .split('\n')
    .filter(line => line.includes('platform'));
  if (platformLines.length === 0) {
    throw new Error(`No platforms found in framework ${frameworkPath}`);
  }
  return platformLines
    .map(p => p.trim().split(' ')[1])
    .sort((a, b) => a.localeCompare(b))
    .join(' ');
}

function signXCFramework(
  identity /*: string */,
  xcframeworkPath /*: string */,
) {
  console.log('Signing XCFramework...');
  execFileSync(
    'codesign',
    ['--timestamp', '--sign', identity, xcframeworkPath],
    {stdio: 'inherit'},
  );
}

module.exports = {createFramework};
