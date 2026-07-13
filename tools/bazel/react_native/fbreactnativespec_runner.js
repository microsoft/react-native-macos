#!/usr/bin/env node
/**
 * Copyright (c) Microsoft Corporation.
 *
 * @format
 * @noflow
 */

'use strict';

const fs = require('fs');
const Module = require('module');
const path = require('path');

const cwd = process.cwd();
const marker = `${path.sep}bazel-out${path.sep}`;
const workspaceRoot = cwd.includes(marker)
  ? cwd.slice(0, cwd.indexOf(marker))
  : cwd;
const outputDir = path.resolve(workspaceRoot, mustEnv('OUTPUT_DIR'));
const codegenLibDir = path.resolve(workspaceRoot, mustEnv('CODEGEN_LIB_DIR'));
const bazelReactNativeRoot = path.join(
  workspaceRoot,
  process.env.BAZEL_BINDIR || '',
  'packages/react-native/pkg',
);
const reactNativeRoot = fs.existsSync(bazelReactNativeRoot)
  ? bazelReactNativeRoot
  : path.join(workspaceRoot, 'packages/react-native');
const scratchCodegenRepo = path.join(outputDir, '_codegen_repo');

function mustEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function assertOutput(name) {
  const output = path.join(outputDir, name);
  if (!fs.existsSync(output)) {
    throw new Error(`Expected FBReactNativeSpec output missing: ${output}`);
  }
}

fs.rmSync(outputDir, {recursive: true, force: true});
fs.mkdirSync(outputDir, {recursive: true});
fs.mkdirSync(scratchCodegenRepo, {recursive: true});
fs.symlinkSync(codegenLibDir, path.join(scratchCodegenRepo, 'lib'), 'dir');

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
    const resolved = path.join(
      codegenLibDir,
      request.slice('@react-native/codegen/lib/'.length),
    );
    return path.extname(resolved) ? resolved : `${resolved}.js`;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const executorRoot = path.join(
  reactNativeRoot,
  'scripts/codegen/generate-artifacts-executor',
);
const constants = require(path.join(executorRoot, 'constants.js'));
constants.CODEGEN_REPO_PATH = scratchCodegenRepo;
constants.CORE_LIBRARIES_WITH_OUTPUT_FOLDER.FBReactNativeSpec.ios = outputDir;

try {
  const {generateFBReactNativeSpecIOS} = require(path.join(
    executorRoot,
    'generateFBReactNativeSpecIOS.js',
  ));
  generateFBReactNativeSpecIOS(reactNativeRoot);
  [
    'FBReactNativeSpec/FBReactNativeSpec-generated.mm',
    'FBReactNativeSpec/FBReactNativeSpec.h',
    'FBReactNativeSpecJSI-generated.cpp',
    'FBReactNativeSpecJSI.h',
    'react/renderer/components/FBReactNativeSpec/ComponentDescriptors.cpp',
    'react/renderer/components/FBReactNativeSpec/ComponentDescriptors.h',
    'react/renderer/components/FBReactNativeSpec/EventEmitters.cpp',
    'react/renderer/components/FBReactNativeSpec/EventEmitters.h',
    'react/renderer/components/FBReactNativeSpec/Props.cpp',
    'react/renderer/components/FBReactNativeSpec/Props.h',
    'react/renderer/components/FBReactNativeSpec/RCTComponentViewHelpers.h',
    'react/renderer/components/FBReactNativeSpec/ShadowNodes.cpp',
    'react/renderer/components/FBReactNativeSpec/ShadowNodes.h',
    'react/renderer/components/FBReactNativeSpec/States.cpp',
    'react/renderer/components/FBReactNativeSpec/States.h',
  ].forEach(assertOutput);
} finally {
  fs.rmSync(scratchCodegenRepo, {recursive: true, force: true});
}
