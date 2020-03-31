'use strict';
const chalk = require('chalk');
const path = require('path');
const username = require('username');
const uuid = require('uuid');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const {
  createDir,
  copyAndReplaceAll,
  copyAndReplaceWithChangedCallback,
} = require('../generator-common');

const macOSDir = 'macos';

function copyProjectTemplateAndReplace(
  srcRootPath,
  destPath,
  newProjectName,
  options = {}
) {
  if (!srcRootPath) {
    throw new Error('Need a path to copy from');
  }

  if (!destPath) {
    throw new Error('Need a path to copy to');
  }

  if (!newProjectName) {
    throw new Error('Need a project name');
  }

  const projectNameMacOS = newProjectName + '-macOS';
  const projectNameIOS = newProjectName;
  const xcodeProjName = newProjectName + '.xcodeproj';

  createDir(path.join(destPath, macOSDir));
  createDir(path.join(destPath, macOSDir, projectNameIOS));
  createDir(path.join(destPath, macOSDir, projectNameMacOS));

  const templateVars = {
    'HelloWorld': newProjectName,
  };

  [
    { from: path.join(srcRootPath, 'macos/HelloWorld'), to: path.join(macOSDir, projectNameIOS) },
    { from: path.join(srcRootPath, 'macos/HelloWorld-macOS'), to: path.join(macOSDir, projectNameMacOS) },
    { from: path.join(srcRootPath, 'macos/HelloWorld.xcodeproj'), to: path.join(macOSDir, xcodeProjName) },
  ].forEach((mapping) => copyAndReplaceAll(mapping.from, destPath, mapping.to, templateVars, options.overwrite));

  [
    { from: path.join(srcRootPath, 'react-native.config.js'), to: 'react-native.config.js' },
    { from: path.join(srcRootPath, 'metro.config.macos.js'), to: 'metro.config.macos.js' },
  ].forEach((mapping) => copyAndReplaceWithChangedCallback(mapping.from, destPath, mapping.to, templateVars, options.overwrite));

  console.log(chalk.white.bold('To run your app on macOS:'));
  console.log(chalk.white('   react-native run-macos'));
}

function installDependencies(options) {
  const cwd = process.cwd();

  /* TODO
  // Extract react-native peer dependency version
  const reactNativeMacOSPackageJsonPath = path.join(cwd, 'node_modules', 'react-native-macos', 'package.json');
  const reactNativeMacOSPackageJson = JSON.parse(fs.readFileSync(reactNativeMacOSPackageJsonPath, { encoding: 'UTF8' }));
  let reactNativeVersion = reactNativeMacOSPackageJson.peerDependencies['react-native'];
  const depDelim = ' || ';
  const delimIndex = reactNativeVersion.indexOf(depDelim);
  if (delimIndex !== -1) {
    reactNativeVersion = reactNativeVersion.slice(0, delimIndex);
  }

  console.log(chalk.green('Updating to compatible version of react-native:'));
  console.log(chalk.white(`    ${reactNativeVersion}`));

  // Patch package.json to have proper react-native version and install
  const projectPackageJsonPath = path.join(cwd, 'package.json');
  const projectPackageJson = JSON.parse(fs.readFileSync(projectPackageJsonPath, { encoding: 'UTF8' }));
  projectPackageJson.scripts.start = 'react-native start';
  projectPackageJson.dependencies['react-native'] = reactNativeVersion;
  fs.writeFileSync(projectPackageJsonPath, JSON.stringify(projectPackageJson, null, 2));
  */

  // Install dependencies using correct package manager
  const isYarn = fs.existsSync(path.join(cwd, 'yarn.lock'));
  const execOptions = options && options.verbose ? { stdio: 'inherit' } : {};
  childProcess.execSync(isYarn ? 'yarn' : 'npm i', execOptions);
}

module.exports = {
  copyProjectTemplateAndReplace,
  installDependencies,
};
