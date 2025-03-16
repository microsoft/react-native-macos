import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release/index.js';

import { spawnSync } from "node:child_process";
import * as util from "node:util";
// import {updateReactNativeArtifacts} from '../../releases/set-rn-artifacts-version.js';

async function main(options) {
    const { workspaceVersion, projectsVersionData } = await releaseVersion({
        specifier: options.version,
        dryRun: true,
        verbose: options.verbose,
    });

    const newRNMVersion = projectsVersionData["react-native-macos"].newVersion;
    spawnSync("node", ["scripts/releases/set-rn-artifacts-version.js", "--build-type", "release", "--to-version", newRNMVersion], { encoding: "utf-8" });
    spawnSync("git", ["add", 
      "packages/react-native/Libraries/Core/ReactNativeVersion.js",
      "packages/react-native/React/Base/RCTVersion.m",
      "packages/react-native/ReactCommon/cxxreact/ReactNativeVersion.h",
      "packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/systeminfo/ReactNativeVersion.java",
      "packages/react-native/ReactAndroid/gradle.properties"
    ], { encoding: "utf-8" });

  
    // await releaseChangelog({
    //     versionData: projectsVersionData,
    //     version: workspaceVersion,
    //     dryRun: true,
    //     verbose: options.verbose,
    // });

    // // publishResults contains a map of project names and their exit codes
    // const publishResults = await releasePublish({
    //     dryRun: true,
    //     verbose: options.verbose,
    // });
    
    // process.exit(
    //     Object.values(publishResults).every((result) => result.code === 0) ? 0 : 1
    // );
}

const { values } = util.parseArgs({
  args: process.argv.slice(2),
  options: {
    version: {
      type: "string",
    },
    'dry-run': {
      type: "boolean",
      short: "d",
      default: false,
    },
    verbose: {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
});

main(values);