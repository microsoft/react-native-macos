#!/usr/bin/env node
/**
 * @format
 * @noflow
 */

'use strict';

const fs = require('fs');
const path = require('path');

const [, , srcArg, outArg] = process.argv;
if (srcArg == null || outArg == null) {
  console.error('Usage: copy_tree.js <src-dir> <out-dir>');
  process.exit(2);
}

const srcRoot = path.resolve(srcArg);
const outRoot = path.resolve(outArg);
const outBase = path.basename(outRoot);

function mkdirp(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

function copyDir(rel = '') {
  for (const dirent of fs.readdirSync(path.join(srcRoot, rel), {
    withFileTypes: true,
  })) {
    const childRel = path.join(rel, dirent.name);
    const parts = childRel.split(path.sep);
    if (
      parts.includes(outBase) ||
      parts.includes('node_modules') ||
      parts.includes('Pods') ||
      parts.includes('build')
    ) {
      continue;
    }
    const src = path.join(srcRoot, childRel);
    const dest = path.join(outRoot, childRel);
    if (dirent.isDirectory()) {
      mkdirp(dest);
      copyDir(childRel);
    } else if (dirent.isFile() || dirent.isSymbolicLink()) {
      mkdirp(path.dirname(dest));
      fs.copyFileSync(dirent.isSymbolicLink() ? fs.realpathSync.native(src) : src, dest);
      fs.chmodSync(dest, 0o644);
    }
  }
}

fs.rmSync(outRoot, {recursive: true, force: true});
mkdirp(outRoot);
copyDir();

if (srcArg.replace(/\\/g, '/').endsWith('packages/rn-tester')) {
  writeStub(
    'NativeComponentExample/js/MyNativeView.js',
    "import {View} from 'react-native';\nexport default View;\n",
  );
  writeStub(
    'NativeModuleExample/NativeScreenshotManager.js',
    "module.exports = {takeScreenshot: () => Promise.resolve(null)};\n",
  );
  writeStub(
    'NativeCxxModuleExample/NativeCxxModuleExample.js',
    "export const EnumInt = {IA: 23, IB: 42};\nexport const EnumNone = {NA: 0, NB: 1};\nexport const EnumStr = {SA: 's---a', SB: 's---b'};\nexport default null;\n",
  );
}

function writeStub(rel, content) {
  const dest = path.join(outRoot, rel);
  mkdirp(path.dirname(dest));
  fs.writeFileSync(dest, content);
  fs.chmodSync(dest, 0o644);
}
