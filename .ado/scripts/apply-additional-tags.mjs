// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as util from "node:util";

/**
 * Apply additional dist-tags to published packages
 * Usage: node apply-additional-tags.mjs --tags <tags> --token <token>
 *        node apply-additional-tags.mjs --tags <tags> --dry-run
 * Where tags is a comma-separated list of tags (e.g., "next,v0.79-stable")
 *
 * When running in GitHub Actions with actions/setup-node configured, the auth
 * token can be provided via the NODE_AUTH_TOKEN environment variable instead
 * of the --token flag.
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
function main({ tags, token: tokenArg, "dry-run": dryRun }) {
  if (!tags) {
    console.log("No additional tags to apply");
    return 0;
  }

  // Prefer explicit --token arg (ADO), fall back to NODE_AUTH_TOKEN env var (GHA OIDC).
  const token = tokenArg ?? process.env.NODE_AUTH_TOKEN;

  if (!dryRun && !token) {
    console.error(
      "Error: npm auth token is required (use --token, set NODE_AUTH_TOKEN, or use --dry-run to preview)"
    );
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

      // When --token is explicitly provided (ADO path), pass auth inline so
      // that npm picks it up without a pre-configured .npmrc.
      // When NODE_AUTH_TOKEN is used instead (GHA OIDC path), actions/setup-node
      // has already written .npmrc with `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`,
      // so no inline auth argument is needed.
      const npmArgs = [
        "dist-tag",
        "add",
        `${pkg}@${version}`,
        tag,
        "--registry",
        registry,
      ];
      if (tokenArg) {
        npmArgs.push(`--//registry.npmjs.org/:_authToken=${tokenArg}`);
      }

      const result = spawnSync(
        "npm",
        npmArgs,
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
