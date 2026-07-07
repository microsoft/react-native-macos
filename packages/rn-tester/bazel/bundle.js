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

const path = require('path');
const Metro = require('metro');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

async function main() {
  const projectRoot = path.resolve(process.env.RN_TESTER_ROOT || process.cwd());
  const out = path.resolve(process.env.BUNDLE_OUT || 'RNTesterApp.macos.jsbundle');
  const assetsDest = process.env.ASSETS_DEST
    ? path.resolve(process.env.ASSETS_DEST)
    : undefined;
  const entryFile = path.join(projectRoot, 'js/RNTesterApp.macos.js');

  // react-native-macos is published/consumed as `react-native`.
  const reactNativePath = path.dirname(
    require.resolve('react-native-macos/package.json'),
  );

  const baseConfig = await getDefaultConfig(projectRoot);
  const config = mergeConfig(baseConfig, {
    projectRoot,
    watchFolders: [reactNativePath, path.dirname(reactNativePath)],
    resolver: {
      extraNodeModules: {'react-native': reactNativePath},
      platforms: ['ios', 'macos', 'android'],
      // Watchman isn't available (or usable) inside the Bazel sandbox; use Metro's
      // Node crawler so the file map is populated. rules_js exposes sources as symlinks,
      // so the crawler must follow them.
      useWatchman: false,
      unstable_enableSymlinks: true,
    },
  });

  await Metro.runBuild(config, {
    entry: entryFile,
    platform: 'macos',
    dev: false,
    minify: true,
    out,
    assets: Boolean(assetsDest),
    assetsDest,
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
