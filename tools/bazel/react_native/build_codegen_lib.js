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
const workspaceRoot =
  process.env.BUILD_WORKSPACE_DIRECTORY ||
  (cwd.includes(marker) ? cwd.slice(0, cwd.indexOf(marker)) : cwd);
const bazelPackageDir = path.join(
  workspaceRoot,
  process.env.BAZEL_BINDIR || '',
  'packages/react-native-codegen/pkg',
);
const packageDir = fs.existsSync(path.join(bazelPackageDir, 'src'))
  ? bazelPackageDir
  : path.join(workspaceRoot, 'packages/react-native-codegen');
const bazelPackageNodeModules = path.join(
  workspaceRoot,
  process.env.BAZEL_BINDIR || '',
  'packages/react-native-codegen/node_modules',
);
const nodeModulesDir = fs.existsSync(bazelPackageNodeModules)
  ? bazelPackageNodeModules
  : path.join(packageDir, 'node_modules');
const aspectStoreDir = path.join(
  workspaceRoot,
  process.env.BAZEL_BINDIR || '',
  'node_modules/.aspect_rules_js',
);
const aspectNodeModulePaths = fs.existsSync(aspectStoreDir)
  ? fs
      .readdirSync(aspectStoreDir)
      .map(entry => path.join(aspectStoreDir, entry, 'node_modules'))
      .filter(entry => fs.existsSync(entry))
  : [];
process.env.NODE_PATH = [
  ...aspectNodeModulePaths,
  process.env.NODE_PATH || '',
]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();
const moduleSearchPaths = [
  nodeModulesDir,
  path.join(workspaceRoot, 'node_modules'),
  packageDir,
  ...aspectNodeModulePaths,
];
const resolveFromCodegen = moduleName =>
  require.resolve(moduleName, {paths: moduleSearchPaths});
const requireFromCodegen = moduleName => require(resolveFromCodegen(moduleName));
const babel = requireFromCodegen('@babel/core');
const glob = requireFromCodegen('glob');
const micromatch = requireFromCodegen('micromatch');
const prettier = requireFromCodegen('prettier');
const srcDir = path.join(packageDir, 'src');
const outputDir = path.resolve(workspaceRoot, process.env.OUTPUT_DIR || 'tools/bazel/react_native/codegen_lib');
const prettierConfig = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: false,
  requirePragma: true,
  singleQuote: true,
  trailingComma: 'all',
};
const babelPlugins = [
  '@babel/plugin-transform-flow-strip-types',
  '@babel/plugin-syntax-dynamic-import',
  '@babel/plugin-transform-class-properties',
  '@babel/plugin-transform-nullish-coalescing-operator',
  '@babel/plugin-transform-optional-chaining',
].map(plugin => resolveFromCodegen(plugin));

fs.rmSync(outputDir, {recursive: true, force: true});
fs.mkdirSync(outputDir, {recursive: true});

function outputPathFor(file) {
  return path.join(outputDir, path.relative(srcDir, file));
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from, to);
}

const inputFiles = glob.sync(path.join(srcDir, '**/*'), {nodir: true, dot: true});
if (inputFiles.length === 0) {
  throw new Error(`No react-native-codegen inputs found under ${srcDir}; packageDir exists=${fs.existsSync(packageDir)} src exists=${fs.existsSync(srcDir)}`);
}
for (const file of inputFiles) {
  const relative = path.relative(srcDir, file);
  if (micromatch.isMatch(relative, '**/(__tests__|__test_fixtures__)/**')) {
    continue;
  }

  const dest = outputPathFor(file);
  if (!micromatch.isMatch(relative, '**/*.js')) {
    copyFile(file, dest);
    continue;
  }

  const transformed = babel.transformFileSync(file, {
    cwd: packageDir,
    root: packageDir,
    babelrc: false,
    configFile: false,
    plugins: babelPlugins,
  }).code;
  const formatted = prettier.format(transformed, {
    ...prettierConfig,
    parser: 'babel',
  });
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.writeFileSync(dest, formatted);

  const source = fs.readFileSync(file, 'utf8');
  if (/@flow/.test(source)) {
    fs.writeFileSync(dest + '.flow', source);
  }
}


function copyRuntimePackage(packageName, seen = new Set()) {
  if (seen.has(packageName)) {
    return;
  }
  seen.add(packageName);
  let packageJsonPath;
  try {
    packageJsonPath = resolveFromCodegen(path.join(packageName, 'package.json'));
  } catch {
    return;
  }
  const packagePath = path.dirname(packageJsonPath);
  const destinationPath = path.join(outputDir, 'node_modules', packageName);
  fs.rmSync(destinationPath, {recursive: true, force: true});
  fs.mkdirSync(path.dirname(destinationPath), {recursive: true});
  fs.cpSync(packagePath, destinationPath, {
    recursive: true,
    dereference: true,
    filter: src => !src.includes(`${path.sep}.cache${path.sep}`),
  });

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  for (const dependency of Object.keys(packageJson.dependencies || {})) {
    copyRuntimePackage(dependency, seen);
  }
}

for (const runtimePackage of [
  '@babel/core',
  '@babel/parser',
  'balanced-match',
  'concat-map',
  'glob',
  'hermes-estree',
  'hermes-parser',
  'invariant',
  'nullthrows',
  'yargs',
]) {
  copyRuntimePackage(runtimePackage);
}

console.log(`Built react-native-codegen lib at ${outputDir}`);
