// @flow

const
  nodeFs =
    require("node:fs"),

  nodePath =
    require("node:path")

const searchFiles = [
  "react-native.config.js",
  "react-native.config.cjs",
  "react-native.config.mjs",
]

/**
 * @param {string} root
 * @returns {string | null} Returns the config file path e.g. "/Users/rn-project/react-native.config.js". Returns `null` if the config file cannot be found.
 */
function findConfigFile(
  root,
) {
  /**
   * @type {ReturnType<typeof findConfigFile>}
   */
  let configFilePath = null

  for(const place of searchFiles) {
    const __configFilePath = nodePath.join(root, place)

    if(nodeFs.existsSync(__configFilePath)) {
      configFilePath = __configFilePath
      break
    }
  }

  return configFilePath || null
}

/**
 * Find and read user `react-native.config.js` file.
 * 
 * This is a similar function from
 * {@link https://github.com/react-native-community/cli/blob/main/packages/cli-config/src/readConfigFromDisk.ts|@react-native-community/cli-config}.
 * We have to re-invent how to read the user config, because the original function is not exported publicly.
 * It is better if we can use the original function from \@react-native-community/cli-config.
 * 
 * @param {string} root
 * @returns {import("@react-native-community/cli-types").Config | null}
 */
function readConfigFromDisk(
  root,
) {
  const configFilePath = findConfigFile(root)

  if(configFilePath) {
    try {
      return require(configFilePath)
    } catch {
      return null
    }
  }

  return null
}

module.exports = readConfigFromDisk
