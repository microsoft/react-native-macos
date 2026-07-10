/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @noflow
 */

// Bazel entry point for bundling rn-tester's macOS JS with Metro.
//
// Runs under a rules_js `js_run_binary` with node_modules linked by Bazel. Unlike
// the source-tree metro.config.js (which uses source-relative watchFolders), this
// resolves everything from the Bazel-linked node_modules and aliases the
// `react-native` import to the `react-native-macos` package (the repo's convention).

'use strict';

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const crypto = require('crypto');
const fs = require('fs');
const Metro = require('metro');
const DependencyGraph = require('metro/src/node-haste/DependencyGraph');
const Module = require('module');
const path = require('path');


const ALIASES = new Map();
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    // Rewrite aliased packages (e.g. `react-native` -> `react-native-macos`),
    // including subpaths like `react-native/Libraries/Core/InitializeCore`, so
    // Node `require`/`require.resolve` calls (e.g. metro-config's
    // getModulesRunBeforeMainModule) resolve against the aliased package.
    for (const [name, root] of ALIASES) {
      if (request === name || request.startsWith(name + '/')) {
        const subpath = request.slice(name.length + 1);
        const aliased = subpath ? path.join(root, subpath) : root;
        try {
          return originalResolveFilename.call(
            this,
            aliased,
            parent,
            isMain,
            options,
          );
        } catch (_) {
          // fall through to the aspect-tree fallback below
        }
      }
    }
    const aspectPackage = findAspectPackage(request);
    if (aspectPackage != null) {
      return originalResolveFilename.call(
        this,
        aspectPackage,
        parent,
        isMain,
        options,
      );
    }
    throw error;
  }
};
function findAspectPackage(request) {
  const encoded = request.replace('/', '+');
  const aspectRoots = [
    path.resolve('node_modules/.aspect_rules_js'),
    path.resolve(__dirname, '../../..', 'node_modules/.aspect_rules_js'),
  ];
  for (const aspectRoot of aspectRoots) {
    if (!fs.existsSync(aspectRoot)) {
      continue;
    }
    for (const entry of fs.readdirSync(aspectRoot)) {
      if (entry.startsWith(encoded + '@')) {
        const candidate = path.join(aspectRoot, entry, 'node_modules', request);
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
          return candidate;
        }
      }
    }
  }
  return null;
}
const ASSET_EXTS = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp', 'xml']);
function resolveFromFileSystem(context, moduleName, platform) {
  try {
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    const packageFallback = resolvePackageFromAspectTree(moduleName);
    if (packageFallback != null) {
      return {type: 'sourceFile', filePath: packageFallback};
    }
    const fallback = resolveRelativeFromFileSystem(
      context.originModulePath,
      moduleName,
      platform,
    );
    if (fallback != null) {
      return fallback;
    }
    throw error;
  }
}
function resolvePackageFromAspectTree(moduleName) {
  if (moduleName.startsWith('.') || path.isAbsolute(moduleName)) {
    return null;
  }
  const parts = moduleName.split('/');
  const packageName = moduleName.startsWith('@')
    ? `${parts[0]}/${parts[1]}`
    : parts[0];
  const subpath = parts.slice(packageName.startsWith('@') ? 2 : 1).join('/');
  const packageRoot = ALIASES.get(packageName) || findAspectPackage(packageName);
  if (packageRoot == null) {
    return null;
  }
  let candidateBase = subpath ? path.join(packageRoot, subpath) : null;
  if (candidateBase == null) {
    const packageJsonPath = path.join(packageRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      candidateBase = path.join(packageRoot, pkg['react-native'] || pkg.main || 'index');
    } else {
      candidateBase = path.join(packageRoot, 'index');
    }
  }
  for (const candidate of [
    candidateBase,
    `${candidateBase}.js`,
    path.join(candidateBase, 'index.js'),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}
function resolveRelativeFromFileSystem(originModulePath, moduleName, platform) {
  if (!moduleName.startsWith('.') && !path.isAbsolute(moduleName)) {
    return null;
  }
  let basePath = path.isAbsolute(moduleName)
    ? moduleName
    : path.resolve(path.dirname(originModulePath), moduleName);
  // RNTester examples use source-relative imports such as
  // `../../../react-native/Libraries/...`. Staging RNTester under an output
  // directory adds one path segment, so resolve those imports against the same
  // react-native-macos package root used for the package alias.
  const reactNativeRelative = moduleName
    .replace(/\\/g, '/')
    .match(/(?:^|\/)react-native\/(.+)$/);
  if (reactNativeRelative != null) {
    basePath = path.join(ALIASES.get('react-native'), reactNativeRelative[1]);
  }
  const sourceExts = [
    `${platform}.js`,
    'native.js',
    'js',
    `${platform}.jsx`,
    'native.jsx',
    'jsx',
    `${platform}.json`,
    'native.json',
    'json',
    `${platform}.ts`,
    'native.ts',
    'ts',
    `${platform}.tsx`,
    'native.tsx',
    'tsx',
  ];
  for (const candidate of [
    basePath,
    ...sourceExts.map(ext => `${basePath}.${ext}`),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).slice(1);
      if (ASSET_EXTS.has(ext)) {
        return resolveAssetFiles(candidate);
      }
      return {type: 'sourceFile', filePath: candidate};
    }
  }
  // Directory imports: `./foo` -> `./foo/index.<ext>` (Node/Metro directory index).
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of sourceExts) {
      const indexCandidate = path.join(basePath, `index.${ext}`);
      if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
        return {type: 'sourceFile', filePath: indexCandidate};
      }
    }
  }
  const baseExt = path.extname(basePath).slice(1);
  if (ASSET_EXTS.has(baseExt)) {
    return resolveAssetFiles(basePath);
  }
  return null;
}
function resolveAssetFiles(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext).replace(/@\d+(?:\.\d+)?x$/, '');
  const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const assetPattern = new RegExp(
    `^${escaped}(?:@\\d+(?:\\.\\d+)?x)?${ext.replace('.', '\\.')}$`,
  );
  const filePaths = fs
    .readdirSync(dir)
    .filter(name => assetPattern.test(name))
    .map(name => path.join(dir, name));
  return filePaths.length ? {type: 'assetFiles', filePaths} : null;
}

function saveAssets(assets, assetsDest) {
  for (const asset of assets) {
    asset.scales.forEach((scale, index) => {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      const relativeDir = asset.httpServerLocation
        .slice(1)
        .replace(/\.\.\//g, '_');
      const destination = path.join(
        assetsDest,
        relativeDir,
        `${asset.name}${suffix}.${asset.type}`,
      );
      fs.mkdirSync(path.dirname(destination), {recursive: true});
      fs.copyFileSync(asset.files[index], destination);
    });
  }
}

const originalGetOrComputeSha1 = DependencyGraph.prototype.getOrComputeSha1;
DependencyGraph.prototype.getOrComputeSha1 = async function (filename) {
  try {
    return await originalGetOrComputeSha1.call(this, filename);
  } catch (error) {
    if (
      error != null &&
      typeof error.message === 'string' &&
      error.message.includes('Failed to get the SHA-1 for:') &&
      fs.existsSync(filename)
    ) {
      const content = await fs.promises.readFile(filename);
      return {
        content,
        sha1: crypto.createHash('sha1').update(content).digest('hex'),
      };
    }
    throw error;
  }
};

async function main() {
  const realpath = fsPath => fs.realpathSync.native(path.resolve(fsPath));
  const projectRoot = realpath(process.env.RN_TESTER_ROOT || process.cwd());
  const out = path.resolve(process.env.BUNDLE_OUT || 'RNTesterApp.macos.jsbundle');
  const assetsDest = process.env.ASSETS_DEST
    ? path.resolve(process.env.ASSETS_DEST)
    : undefined;
  const entryFile = realpath(path.join(projectRoot, 'js/RNTesterApp.macos.js'));

  // react-native-macos is published/consumed as `react-native`.
  const reactNativePath = realpath(
    path.dirname(require.resolve('react-native-macos/package.json')),
  );
  ALIASES.set('react-native', reactNativePath);
  const reactNativeRoot = realpath(path.dirname(reactNativePath));

  const baseConfig = await getDefaultConfig(projectRoot);
  const config = mergeConfig(baseConfig, {
    cacheStores: [],
    maxWorkers: 1,
    projectRoot,
    resetCache: true,
    useWatchman: false,
    watchFolders: [projectRoot, reactNativePath, reactNativeRoot],
    resolver: {
      blockList: [],
      extraNodeModules: {'react-native': reactNativePath},
      platforms: ['ios', 'macos', 'android'],
      resolveRequest: resolveFromFileSystem,
      // Watchman isn't available (or usable) inside the Bazel sandbox; use
      // Metro's Node crawler. Realpathing the roots keeps the crawler's SHA-1
      // map keys aligned with the entry file.
      useWatchman: false,
      unstable_enableSymlinks: true,
    },
  });

  // Use `bundleOut` (verbatim) rather than `out`; Metro's runBuild rewrites
  // `out` through `.replace(/(\.js)?$/, '.js')`, which would turn our declared
  // Bazel output `RNTesterApp.macos.jsbundle` into `...jsbundle.js`.
  const result = await Metro.runBuild(config, {
    entry: entryFile,
    platform: 'macos',
    dev: false,
    minify: true,
    bundleOut: out,
    assets: Boolean(assetsDest),
    assetsDest,
  });
  if (assetsDest != null) {
    if (result.assets == null) {
      throw new Error("Assets missing from Metro's runBuild result");
    }
    saveAssets(result.assets, assetsDest);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
