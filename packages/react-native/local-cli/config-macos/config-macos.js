// @flow

const
  nodePath =
    require("node:path"),

  readConfigFromDisk =
    require("./read-config-from-disk")

/**
 * This is an extension of `npx react-native config` cli result, but with some modifications.
 * 
 * Modifications:
 *  - Override the `reactNativePath` with `react-native-macos` package path instead of `react-native`
 *    only if users do not have their own `reactNativePath` property in their react-native.config.js file
 * 
 * @param {import("@react-native-community/cli-types").Config} ctx
 * @returns {import("@react-native-community/cli-types").Config}
 */
function configMacos(ctx) {
  /**
   * Actually, the `ctx.reactNativePath` is already using
   * `reactNativePath` from user config, but we actually do not know
   * if the output is from a user or a default result from \@react-native-community/cli-config,
   * hence, we need to read the user config again.
   */
  const userConfig = readConfigFromDisk(ctx.root)

  let reactNativePath = ctx.reactNativePath

  if(!userConfig?.reactNativePath) {
    const reactNativeMacosPackageJsonPath = require.resolve("react-native-macos/package.json", { paths: [ctx.root] })
    reactNativePath = nodePath.dirname(reactNativeMacosPackageJsonPath)
  }

  return {
    ...ctx,
    reactNativePath,
  }
}

module.exports = configMacos
