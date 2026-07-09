#!/usr/bin/env node
/**
 * @format
 * @noflow
 */

'use strict';

const fs = require('fs');
const Module = require('module');
const path = require('path');


const cwd = process.cwd();
const marker = `${path.sep}bazel-out${path.sep}`;
const workspaceRoot = cwd.includes(marker) ? cwd.slice(0, cwd.indexOf(marker)) : cwd;
const requestedProjectRoot = path.resolve(workspaceRoot, mustEnv('PROJECT_ROOT'));
const outputDir = path.resolve(workspaceRoot, mustEnv('OUTPUT_DIR'));
const targetPlatform = process.env.TARGET_PLATFORM || 'ios';
const source = process.env.SOURCE || 'app';
const codegenLibDir = path.resolve(workspaceRoot, mustEnv('CODEGEN_LIB_DIR'));
const bazelReactNativePackageRoot = path.join(
  workspaceRoot,
  process.env.BAZEL_BINDIR || '',
  'packages/react-native/pkg',
);
const reactNativePackageRoot = fs.existsSync(bazelReactNativePackageRoot)
  ? bazelReactNativePackageRoot
  : path.join(workspaceRoot, 'packages/react-native');
function prepareRnTesterProject() {
  const scratchProjectRoot = path.join(outputDir, '_rn_tester_project');
  fs.rmSync(scratchProjectRoot, {recursive: true, force: true});
  fs.mkdirSync(scratchProjectRoot, {recursive: true});

  fs.writeFileSync(
    path.join(scratchProjectRoot, 'package.json'),
    JSON.stringify(
      {
        name: '@react-native/tester',
        version: '0.81.0-main',
        private: true,
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        codegenConfig: {
          name: 'AppSpecs',
          type: 'all',
          jsSrcsDir: '.',
          android: {
            javaPackageName: 'com.facebook.fbreact.specs',
          },
          ios: {
            modules: {
              SampleTurboModule: {
                unstableRequiresMainQueueSetup: true,
              },
            },
            components: {
              RNTMyNativeView: {
                className: 'RNTMyNativeViewComponentView',
              },
            },
          },
        },
      },
      null,
      2,
    ),
  );

  const generatedInputsRoot = path.join(
    workspaceRoot,
    process.env.BAZEL_BINDIR || '',
    'tools/bazel/react_native/rn_tester_inputs',
  );
  const sourceRoot = fs.existsSync(generatedInputsRoot)
    ? generatedInputsRoot
    : requestedProjectRoot;

  for (const relativePath of [
    'NativeComponentExample/js/MyLegacyViewNativeComponent.js',
    'NativeComponentExample/js/MyNativeViewNativeComponent.js',
    'NativeCxxModuleExample/NativeCxxModuleExample.js',
    'NativeModuleExample/NativeScreenshotManager.js',
  ]) {
    const from = path.join(sourceRoot, relativePath);
    const to = path.join(scratchProjectRoot, relativePath);
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.copyFileSync(from, to);
  }

  return scratchProjectRoot;
}
function mustEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}
function assertExists(relativePath) {
  const absolutePath = path.join(outputDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected codegen output missing: ${absolutePath}`);
  }
}
fs.mkdirSync(outputDir, {recursive: true});
const scratchDir = path.join(outputDir, '_codegen_scratch');
fs.rmSync(scratchDir, {recursive: true, force: true});
fs.mkdirSync(scratchDir, {recursive: true});
process.env.TMPDIR = scratchDir;
process.env.NODE_PATH = [
  path.join(codegenLibDir, 'node_modules'),
  process.env.NODE_PATH || '',
]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@react-native/codegen/lib/')) {
    const resolved = path.join(codegenLibDir, request.slice('@react-native/codegen/lib/'.length));
    return path.extname(resolved) ? resolved : `${resolved}.js`;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const scratchCodegenRepo = path.join(outputDir, '_codegen_repo');
let projectRoot;

try {
  projectRoot = prepareRnTesterProject();
  const libPath = path.join(scratchCodegenRepo, 'lib');
  fs.rmSync(scratchCodegenRepo, {recursive: true, force: true});
  fs.mkdirSync(scratchCodegenRepo, {recursive: true});
  fs.symlinkSync(codegenLibDir, libPath, 'dir');

  const constantsPath = path.join(
    reactNativePackageRoot,
    'scripts/codegen/generate-artifacts-executor/constants.js',
  );
  const constants = require(constantsPath);
  constants.CODEGEN_REPO_PATH = scratchCodegenRepo;
  constants.CORE_LIBRARIES_WITH_OUTPUT_FOLDER.FBReactNativeSpec.ios = path.join(
    scratchDir,
    'FBReactNativeSpec',
  );

  const executor = require(path.join(
    reactNativePackageRoot,
    'scripts/codegen/generate-artifacts-executor',
  ));
  executor.execute(projectRoot, targetPlatform, outputDir, source);

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  [
    'build/generated/ios/AppSpecs/AppSpecs.h',
    'build/generated/ios/AppSpecs/AppSpecs-generated.mm',
    'build/generated/ios/AppSpecsJSI.h',
    'build/generated/ios/AppSpecsJSI-generated.cpp',
    'build/generated/ios/RCTAppDependencyProvider.h',
    'build/generated/ios/RCTAppDependencyProvider.mm',
    'build/generated/ios/RCTThirdPartyComponentsProvider.h',
    'build/generated/ios/RCTThirdPartyComponentsProvider.mm',
    'build/generated/ios/RCTModuleProviders.h',
    'build/generated/ios/RCTModuleProviders.mm',
    'build/generated/ios/RCTModulesConformingToProtocolsProvider.h',
    'build/generated/ios/RCTModulesConformingToProtocolsProvider.mm',
    'build/generated/ios/RCTUnstableModulesRequiringMainQueueSetupProvider.h',
    'build/generated/ios/RCTUnstableModulesRequiringMainQueueSetupProvider.mm',
    'build/generated/ios/react/renderer/components/AppSpecs/ComponentDescriptors.h',
  ].forEach(assertExists);
} finally {
  fs.rmSync(scratchDir, {recursive: true, force: true});
  if (projectRoot) {
    fs.rmSync(projectRoot, {recursive: true, force: true});
  }
  fs.rmSync(scratchCodegenRepo, {recursive: true, force: true});
}
