// @ts-check
// @noflow

'use strict';

const {
  copyAndReplaceAll,
  createDir,
} = require('../generator-common');
const { styleText } = require('node:util');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const macOSDir = 'macos';
const oldProjectName = 'HelloWorld';

/**
 * @param {string} srcRootPath
 * @param {string} destPath
 * @param {string} newProjectName
 * @param {{ overwrite?: boolean }} options
 */
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
  createDir(path.join(destPath, srcDirPath(newProjectName, 'macOS')));
  createDir(path.join(destPath, xcodeprojPath(newProjectName)));
  createDir(path.join(destPath, schemesPath(newProjectName)));

  const templateVars = {
    [oldProjectName]: newProjectName,
  };

  [
    { from: path.join(srcRootPath, macOSDir, 'Podfile'), to: path.join(macOSDir, 'Podfile') },
    { from: path.join(srcRootPath, macOSDir, '_gitignore'), to: path.join(macOSDir, '.gitignore') },
    { from: path.join(srcRootPath, srcDirPath(oldProjectName, 'macOS')), to: srcDirPath(newProjectName, 'macOS') },
    { from: path.join(srcRootPath, pbxprojPath(oldProjectName)), to: pbxprojPath(newProjectName) },
    { from: path.join(srcRootPath, schemePath(oldProjectName, 'macOS')), to: schemePath(newProjectName, 'macOS') },
  ].forEach((mapping) => copyAndReplaceAll(mapping.from, destPath, mapping.to, templateVars, options.overwrite));
}

/**
 * @param {string} basename
 * @param {"iOS" | "macOS"} platform
 */
function projectName(basename, platform) {
  return basename + '-' + platform;
}

/**
 * @param {string} basename
 * @param {"iOS" | "macOS"} platform
 */
function srcDirPath(basename, platform) {
  return path.join(macOSDir, projectName(basename, platform));
}

/**
 * @param {string} basename
 */
function xcodeprojPath(basename) {
  return path.join(macOSDir, basename + '.xcodeproj');
}

/**
 * @param {string} basename
 */
function pbxprojPath(basename) {
  return path.join(xcodeprojPath(basename), 'project.pbxproj');
}

/**
 * @param {string} basename
 */
function schemesPath(basename) {
  return path.join(xcodeprojPath(basename), 'xcshareddata', 'xcschemes');
}

/**
 * @param {string} basename
 * @param {"iOS" | "macOS"} platform
 */
function schemePath(basename, platform) {
  return path.join(schemesPath(basename), projectName(basename, platform) + '.xcscheme');
}

/**
 * @param {{ verbose?: boolean }=} options
 */
function runPodInstall(options) {
  const verbose = options && options.verbose;
  console.log(`\nRunning ${styleText('bold', 'pod install --project-directory=macos')}...`);
  try {
    // Check if pod is available
    childProcess.execSync('which pod', { stdio: 'ignore' });
  } catch {
    console.warn(
      styleText('yellow',
        `\n${styleText('bold', 'CocoaPods')} not found. Please install it and run:\n` +
        `  ${styleText('cyan', 'pod install --project-directory=macos')}\n`
      )
    );
    return;
  }

  try {
    /** @type {{ stdio?: 'inherit' }} */
    const execOptions = verbose ? { stdio: 'inherit' } : {};
    childProcess.execSync('pod install --project-directory=macos', execOptions);
    console.log(styleText('green', 'Successfully installed CocoaPods dependencies.'));
  } catch (e) {
    if (!verbose && e.stderr) {
      console.error(e.stderr.toString());
    }
    console.warn(
      styleText('yellow',
        `\n${styleText('bold', 'pod install')} failed. You can retry manually:\n` +
        `  ${styleText('cyan', 'pod install --project-directory=macos')}\n`
      )
    );
  }
}

/**
 * @param {string} newProjectName
 */
function printFinishMessage(newProjectName) {
  console.log(`
  ${styleText('blue', `Run instructions for ${styleText('bold', 'macOS')}`)}:
    • ${styleText('cyan', 'npx react-native run-macos')}

  To start the Metro bundler separately:
    • ${styleText('cyan', 'npx react-native start')}
`);
}

module.exports = {
  copyProjectTemplateAndReplace,
  runPodInstall,
  printFinishMessage,
};
