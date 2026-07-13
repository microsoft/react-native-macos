#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @noflow
 */

'use strict';

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

const JS_FILES_PATTERN = /\.js$/;
const FLOW_PRAGMA = /@flow/;

const MONOREPO_BABEL_CONFIG = {
  presets: [
    require.resolve('@babel/preset-flow'),
    [require.resolve('@babel/preset-env'), {targets: {node: '18'}}],
  ],
  plugins: [
    require.resolve('babel-plugin-syntax-hermes-parser'),
    [
      require.resolve('babel-plugin-transform-define'),
      {'process.env.BUILD_EXCLUDE_BABEL_REGISTER': true},
    ],
    [
      require.resolve('babel-plugin-minify-dead-code-elimination'),
      {keepFnName: true, keepFnArgs: true, keepClassName: true},
    ],
  ],
};

const CODEGEN_BABEL_CONFIG = MONOREPO_BABEL_CONFIG;

function usage() {
  console.error(
    'Usage: build_first_party.js <package-dir> <monorepo|codegen> <out-dir>',
  );
  process.exit(2);
}

const [, , packageDirArg, buildKind, outDirArg] = process.argv;
if (packageDirArg == null || buildKind == null || outDirArg == null) {
  usage();
}

const packageDir = path.resolve(packageDirArg);
const outDir = path.resolve(outDirArg);
const prettierConfig = {parser: 'babel'};

function mkdirp(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

function rmrf(target) {
  fs.rmSync(target, {recursive: true, force: true});
}

function shouldSkipCopy(rel, dirent) {
  const parts = rel.split(path.sep);
  const outBase = path.basename(outDir);
  return (
    parts.includes(outBase) ||
    parts.includes('pkg') ||
    rel === 'BUILD.bazel' ||
    rel.endsWith('.bazel') ||
    parts.includes('node_modules') ||
    parts.includes('.build') ||
    parts.includes('build') ||
    parts.includes('dist') ||
    parts.includes('lib') ||
    parts.includes('__tests__') ||
    parts.includes('__test_fixtures__') ||
    parts.includes('__fixtures__') ||
    (dirent != null && dirent.isDirectory() && dirent.name === 'Pods')
  );
}

function copyPackageTree(srcRoot, destRoot, rel = '') {
  for (const dirent of fs.readdirSync(path.join(srcRoot, rel), {
    withFileTypes: true,
  })) {
    const childRel = path.join(rel, dirent.name);
    if (shouldSkipCopy(childRel, dirent)) {
      continue;
    }
    const src = path.join(srcRoot, childRel);
    const dest = path.join(destRoot, childRel);
    if (dirent.isDirectory()) {
      mkdirp(dest);
      copyPackageTree(srcRoot, destRoot, childRel);
    } else if (dirent.isSymbolicLink()) {
      const real = fs.realpathSync.native(src);
      fs.copyFileSync(real, dest);
      fs.chmodSync(dest, 0o644);
    } else if (dirent.isFile()) {
      mkdirp(path.dirname(dest));
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, 0o644);
    }
  }
}

function listFiles(root, rel = '') {
  const result = [];
  if (!fs.existsSync(path.join(root, rel))) {
    return result;
  }
  for (const dirent of fs.readdirSync(path.join(root, rel), {
    withFileTypes: true,
  })) {
    const childRel = path.join(rel, dirent.name);
    const full = path.join(root, childRel);
    if (dirent.isDirectory()) {
      result.push(...listFiles(root, childRel));
    } else if (dirent.isFile()) {
      result.push(full);
    }
  }
  return result;
}

function transformFile(src, dest, babelConfig) {
  mkdirp(path.dirname(dest));
  const transformed = babel.transformFileSync(src, babelConfig).code;
  fs.writeFileSync(dest, prettier.format(transformed, prettierConfig));
  const source = fs.readFileSync(src, 'utf8');
  if (FLOW_PRAGMA.test(source)) {
    fs.copyFileSync(src, dest + '.flow');
  }
}

function copyOrTransform(src, dest, babelConfig) {
  if (!JS_FILES_PATTERN.test(src)) {
    mkdirp(path.dirname(dest));
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o644);
    return;
  }
  transformFile(src, dest, babelConfig);
}

function rewriteExportsTarget(target, buildDir) {
  return target.replace('./src/', './' + buildDir + '/');
}

function rewriteExportsField(exportsField, buildDir) {
  if (typeof exportsField === 'string') {
    return rewriteExportsTarget(exportsField, buildDir);
  }
  if (exportsField == null || typeof exportsField !== 'object') {
    return exportsField;
  }
  const rewritten = Array.isArray(exportsField) ? [] : {};
  for (const key of Object.keys(exportsField)) {
    rewritten[key] = rewriteExportsField(exportsField[key], buildDir);
  }
  return rewritten;
}

function collectExportTargets(exportsField, targets = []) {
  if (typeof exportsField === 'string') {
    targets.push(exportsField);
  } else if (exportsField != null && typeof exportsField === 'object') {
    for (const value of Object.values(exportsField)) {
      collectExportTargets(value, targets);
    }
  }
  return targets;
}

function buildPathFor(srcFile, srcDir, buildDir) {
  const rel = path.relative(srcDir, srcFile).replace(/\.flow\.js$/, '.js');
  return path.join(buildDir, rel);
}

function buildMonorepoPackage() {
  const pkgPath = path.join(outDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const srcDir = path.join(outDir, 'src');
  const distDir = path.join(outDir, 'dist');
  const entryPoints = new Set();
  const wrappers = new Set();

  for (const target of collectExportTargets(pkg.exports)) {
    if (!target.endsWith('.js') || target.includes('*')) {
      continue;
    }
    const original = target.replace('./dist/', './src/');
    const wrapper = path.join(outDir, original);
    const flowEntry = wrapper.replace(/\.js$/, '.flow.js');
    if (fs.existsSync(wrapper) && fs.existsSync(flowEntry)) {
      wrappers.add(path.normalize(wrapper));
      entryPoints.add(path.normalize(flowEntry));
    }
  }

  for (const file of listFiles(srcDir)) {
    const normalized = path.normalize(file);
    if (wrappers.has(normalized) || entryPoints.has(normalized)) {
      continue;
    }
    copyOrTransform(file, buildPathFor(file, srcDir, distDir), MONOREPO_BABEL_CONFIG);
  }

  for (const entryPoint of entryPoints) {
    copyOrTransform(
      entryPoint,
      buildPathFor(entryPoint, srcDir, distDir),
      MONOREPO_BABEL_CONFIG,
    );
  }

  if (pkg.exports != null) {
    pkg.exports = rewriteExportsField(pkg.exports, 'dist');
  }
  if (pkg.main != null) {
    pkg.main = rewriteExportsTarget(pkg.main, 'dist');
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function buildCodegenPackage() {
  const srcDir = path.join(outDir, 'src');
  const libDir = path.join(outDir, 'lib');
  for (const file of listFiles(srcDir)) {
    copyOrTransform(file, buildPathFor(file, srcDir, libDir), CODEGEN_BABEL_CONFIG);
  }
}

rmrf(outDir);
mkdirp(outDir);
copyPackageTree(packageDir, outDir);

if (buildKind === 'monorepo') {
  buildMonorepoPackage();
} else if (buildKind === 'codegen') {
  buildCodegenPackage();
} else {
  usage();
}
