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

  createDir(path.join(destPath, macOSDir));
  createDir(path.join(destPath, macOSDir, newProjectName));
  // createDir(path.join(destPath, macOSDir, newProjectName, bundleDir));
//  createDir(path.join(destPath, macOSDir, newProjectName, 'BundleBuilder'));

  const language = 'cpp';
  const ns = 'CppNamespace';
  const srcPath = path.join(srcRootPath, language);
  const projectGuid = uuid.v4();
  const packageGuid = uuid.v4();
  const currentUser = username.sync(); // Gets the current username depending on the platform.

  const templateVars = {
    '// clang-format off': '',
    '// clang-format on': '',
    '<%=ns%>': ns,
    '<%=name%>': newProjectName,
    '<%=projectGuid%>': projectGuid,
    '<%=projectGuidUpper%>': projectGuid.toUpperCase(),
    '<%=packageGuid%>': packageGuid,
    '<%=currentUser%>': currentUser,
  };

  [
    { from: path.join(srcRootPath, 'react-native.config.js'), to: 'react-native.config.js' },
    { from: path.join(srcRootPath, 'metro.config.js'), to: 'metro.config.js' },
    // { from: path.join(srcRootPath, '_gitignore'), to: path.join(macOSDir, '.gitignore') },
    // { from: path.join(srcRootPath, 'b_gitignore'), to: path.join(macOSDir, newProjectName, bundleDir, '.gitignore') },
  //  { from: path.join(srcRootPath, 'index.windows.bundle'), to: path.join(macOSDir, newProjectName, bundleDir, 'index.windows.bundle') },
    // { from: path.join(srcPath, projDir, 'MyApp.sln'), to: path.join(macOSDir, newProjectName + '.sln') },
  ].forEach((mapping) => copyAndReplaceWithChangedCallback(mapping.from, destPath, mapping.to, templateVars, options.overwrite));

  if (language === 'cs') {
    [
      // { from: path.join(srcPath, projDir, 'MyApp.csproj'), to: path.join(macOSDir, newProjectName, newProjectName + '.csproj') },
    ].forEach((mapping) => copyAndReplaceWithChangedCallback(mapping.from, destPath, mapping.to, templateVars, options.overwrite));
  }
  else {
    [
      // { from: path.join(srcPath, projDir, 'MyApp.vcxproj'), to: path.join(macOSDir, newProjectName, newProjectName + '.vcxproj') },
      // { from: path.join(srcPath, projDir, 'MyApp.vcxproj.filters'), to: path.join(macOSDir, newProjectName, newProjectName + '.vcxproj.filters') },
    ].forEach((mapping) => copyAndReplaceWithChangedCallback(mapping.from, destPath, mapping.to, templateVars, options.overwrite));
  }

  // TODO
  // copyAndReplaceAll(path.join(srcPath, 'assets'), destPath, path.join(macOSDir, newProjectName, 'Assets'), templateVars, options.overwrite);
  // copyAndReplaceAll(path.join(srcPath, 'src'), destPath, path.join(macOSDir, newProjectName), templateVars, options.overwrite);

  console.log(chalk.white.bold('To run your app on macOS:'));
  console.log(chalk.white('   react-native run-macos'));
}

function installDependencies(options) {
  const cwd = process.cwd();

  /* TODO
  // Extract react-native peer dependency version
  const vnextPackageJsonPath = path.join(cwd, 'node_modules', 'react-native-macos', 'package.json');
  const vnextPackageJson = JSON.parse(fs.readFileSync(vnextPackageJsonPath, { encoding: 'UTF8' }));
  let reactNativeVersion = vnextPackageJson.peerDependencies['react-native'];
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
