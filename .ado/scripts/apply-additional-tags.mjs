// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as util from "node:util";

/**
 * Apply additional dist-tags to published packages
 * Usage: node apply-additional-tags.mjs --tags <tags> --token <token>
 *        node apply-additional-tags.mjs --tags <tags> --dry-run
 * Where tags is a comma-separated list of tags (e.g., "next,v0.79-stable")
 */

const registry = "https://registry.npmjs.org/";
const packages = [
  "@react-native-macos/virtualized-lists",
  "react-native-macos",
];

/**
 * @typedef {{
 *   tags?: string;
 *   token?: string;
 *   "dry-run"?: boolean;
 * }} Options;
 */

/**
 * @param {Options} options
 * @returns {number}
 */
function main({ tags, token, "dry-run": dryRun }) {
  if (!tags) {
    console.log("No additional tags to apply");
    return 0;
  }

  if (!dryRun && !token) {
    console.error("Error: npm auth token is required (use --dry-run to preview)");
    return 1;
  }

  const packageJson = JSON.parse(
    fs.readFileSync("./packages/react-native/package.json", "utf-8")
  );
  const version = packageJson.version;

  if (dryRun) {
    console.log("");
    console.log("=== Additional dist-tags that would be applied ===");
    for (const tag of tags.split(",")) {
      for (const pkg of packages) {
        console.log(`  ${pkg}@${version} -> ${tag}`);
      }
    }
    return 0;
  }

  for (const tag of tags.split(",")) {
    for (const pkg of packages) {
      console.log(`Adding dist-tag '${tag}' to ${pkg}@${version}`);
      const result = spawnSync(
        "npm",
        [
          "dist-tag",
          "add",
          `${pkg}@${version}`,
          tag,
          "--registry",
          registry,
          `--//registry.npmjs.org/:_authToken=${token}`,
        ],
        { stdio: "inherit", shell: true }
      );

      if (result.status !== 0) {
        console.error(`Failed to add dist-tag '${tag}' to ${pkg}@${version}`);
        return 1;
      }
    }
  }

  return 0;
}

const { values } = util.parseArgs({
  args: process.argv.slice(2),
  options: {
    tags: {
      type: "string",
    },
    token: {
      type: "string",
    },
    "dry-run": {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
});

process.exitCode = main(values);
