// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as util from "node:util";
import { ReleaseClient } from "nx/release/index.js";

/**
 * Unified release script using Nx Release programmatic API
 *
 * This script consolidates:
 * - prepublish-check.mjs (config validation, tag determination)
 * - nx release CLI (versioning, changelog, GitHub release)
 * - nx-release-version custom executor (artifact updates)
 * - Manual npm publish (workaround for yarn 4 compatibility)
 * - apply-additional-tags.mjs (setting extra dist-tags)
 *
 * Usage:
 *   node release.mjs --dry-run --verbose
 *   node release.mjs --token <npmAuthToken>
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

const NPM_REGISTRY = "https://registry.npmjs.org/";
const NPM_TAG_LATEST = "latest";
const NPM_TAG_NEXT = "next";
const NPM_TAG_NIGHTLY = "nightly";

const PACKAGES = [
  { name: "react-native-macos", path: "./packages/react-native" },
  { name: "@react-native-macos/virtualized-lists", path: "./packages/virtualized-lists" },
];

// Files that get updated by updateReactNativeArtifacts
const ARTIFACT_FILES = [
  "packages/react-native/ReactAndroid/gradle.properties",
  "packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/systeminfo/ReactNativeVersion.kt",
  "packages/react-native/React/Base/RCTVersion.m",
  "packages/react-native/ReactCommon/cxxreact/ReactNativeVersion.h",
  "packages/react-native/Libraries/Core/ReactNativeVersion.js",
];

/**
 * @typedef {{
 *   "dry-run"?: boolean;
 *   "mock-branch"?: string;
 *   "skip-auth"?: boolean;
 *   token?: string;
 *   verbose?: boolean;
 * }} Options;
 */

// ============================================================================
// Logging utilities
// ============================================================================

/**
 * @param {string} message
 */
function error(message) {
  console.error("❌", message);
}

/**
 * @param {string} message
 */
function info(message) {
  console.log("ℹ️", message);
}

/**
 * @param {string} message
 */
function success(message) {
  console.log("✅", message);
}

// ============================================================================
// Branch detection
// ============================================================================

/**
 * Returns whether the given branch is considered main branch.
 * @param {string} branch
 */
function isMainBranch(branch) {
  return branch === "main";
}

/**
 * Returns whether the given branch is considered a stable branch.
 * @param {string} branch
 */
function isStableBranch(branch) {
  return /^\d+\.\d+-stable$/.test(branch);
}

/**
 * Returns the target branch name in a PR, or undefined if not in a PR.
 * @returns {string | undefined}
 */
function getTargetBranch() {
  // Azure Pipelines
  if (process.env["TF_BUILD"] === "True") {
    const targetBranch = process.env["SYSTEM_PULLREQUEST_TARGETBRANCH"];
    return targetBranch?.replace(/^refs\/heads\//, "");
  }

  // GitHub Actions
  if (process.env["GITHUB_ACTIONS"] === "true") {
    return process.env["GITHUB_BASE_REF"];
  }

  return undefined;
}

/**
 * Returns the current branch name. In a PR, returns the target branch.
 * @param {Options} options
 * @returns {string}
 */
function getCurrentBranch(options) {
  const targetBranch = getTargetBranch();
  if (targetBranch) {
    return targetBranch;
  }

  // Azure DevOps Pipelines
  if (process.env["TF_BUILD"] === "True") {
    const sourceBranch = process.env["BUILD_SOURCEBRANCHNAME"];
    if (sourceBranch) {
      return sourceBranch.replace(/^refs\/heads\//, "");
    }
  }

  // GitHub Actions
  if (process.env["GITHUB_ACTIONS"] === "true") {
    const headRef = process.env["GITHUB_HEAD_REF"];
    if (headRef) {
      return headRef;
    }
    const ref = process.env["GITHUB_REF"];
    if (ref) {
      return ref.replace(/^refs\/heads\//, "");
    }
  }

  if (options["mock-branch"]) {
    return options["mock-branch"];
  }

  const { stdout } = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.toString().trim();
}

// ============================================================================
// Version utilities
// ============================================================================

/**
 * Converts version string to a number for comparison.
 * @param {string} version
 * @returns {number}
 */
function versionToNumber(version) {
  const [major, minor] = version.split("-")[0].split(".");
  return Number(major) * 1000 + Number(minor);
}

/**
 * Returns the published version of react-native-macos for a given tag.
 * @param {"latest" | "next"} tag
 * @returns {number}
 */
function getPublishedVersion(tag) {
  const { stdout } = spawnSync("npm", ["view", `react-native-macos@${tag}`, "version"]);
  return versionToNumber(stdout.toString().trim());
}

// ============================================================================
// React Native artifact updates
// ============================================================================

/**
 * Updates React Native version artifacts (native files, gradle, etc.)
 * This replaces the custom nx-release-version executor.
 * @param {string} version
 * @param {boolean} dryRun
 */
async function updateReactNativeArtifacts(version, dryRun) {
  info(`Updating React Native artifacts to version ${version}...`);

  if (dryRun) {
    console.log("  [dry-run] Would update the following files:");
    for (const file of ARTIFACT_FILES) {
      console.log(`    - ${file}`);
    }
    return;
  }

  // Import the artifact update function from the existing script
  const { updateReactNativeArtifacts: doUpdate } = await import(
    path.join(REPO_ROOT, "scripts", "releases", "set-rn-artifacts-version.js")
  );

  await doUpdate(version);

  success("Updated React Native artifacts");
  console.table(ARTIFACT_FILES.map((file) => ({ file })));
}

/**
 * Stages and commits artifact files to git.
 * @param {string} version
 * @param {boolean} dryRun
 */
function commitArtifactChanges(version, dryRun) {
  const filesToCommit = [...ARTIFACT_FILES];

  info("Staging artifact changes...");

  if (dryRun) {
    console.log("  [dry-run] Would stage and amend commit with:");
    for (const file of filesToCommit) {
      console.log(`    - ${file}`);
    }
    return;
  }

  // Stage the artifact files
  const addResult = spawnSync("git", ["add", ...filesToCommit], {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });

  if (addResult.status !== 0) {
    throw new Error("Failed to stage artifact files");
  }

  // Amend the previous commit (which was created by Nx for version bumps)
  const commitResult = spawnSync(
    "git",
    ["commit", "--amend", "--no-edit", "--no-verify"],
    { stdio: "inherit", cwd: REPO_ROOT }
  );

  if (commitResult.status !== 0) {
    throw new Error("Failed to amend commit with artifact changes");
  }

  success("Committed artifact changes");
}

// ============================================================================
// Tag determination
// ============================================================================

/**
 * @typedef {"NIGHTLY" | "STABLE_LATEST" | "STABLE_NEW" | "STABLE_OLD" | "NOT_RELEASE_BRANCH"} ReleaseState
 *
 * NIGHTLY: main branch, publishes to @nightly
 * STABLE_LATEST: stable branch at current @latest version
 * STABLE_NEW: stable branch newer than @latest (RC or promoting to latest)
 * STABLE_OLD: stable branch older than @latest
 * NOT_RELEASE_BRANCH: not a release branch
 */

/**
 * @typedef {{
 *   state: ReleaseState;
 *   currentVersion: number;
 *   latestVersion: number;
 *   nextVersion: number;
 * }} ReleaseStateInfo
 */

/**
 * Determines the release state based on branch and published versions.
 * @param {string} branch
 * @param {typeof getPublishedVersion} [getVersion] - For testing
 * @returns {ReleaseStateInfo}
 */
function getReleaseState(branch, getVersion = getPublishedVersion) {
  if (isMainBranch(branch)) {
    return { state: "NIGHTLY", currentVersion: 0, latestVersion: 0, nextVersion: 0 };
  }

  if (!isStableBranch(branch)) {
    return { state: "NOT_RELEASE_BRANCH", currentVersion: 0, latestVersion: 0, nextVersion: 0 };
  }

  const latestVersion = getVersion(NPM_TAG_LATEST);
  const nextVersion = getVersion(NPM_TAG_NEXT);
  const currentVersion = versionToNumber(branch);

  /** @type {ReleaseState} */
  let state;
  if (currentVersion > latestVersion) {
    state = "STABLE_NEW";
  } else if (currentVersion === latestVersion) {
    state = "STABLE_LATEST";
  } else {
    state = "STABLE_OLD";
  }

  return { state, currentVersion, latestVersion, nextVersion };
}

/**
 * Gets the Nx release configuration based on release state.
 * This determines what tag to resolve current version from and the preid.
 *
 * Key insight: preid is only used by Nx for prerelease bumps (prepatch, prerelease).
 * For stable bumps (patch, minor), Nx ignores preid. So we can always set it.
 *
 * @param {ReleaseStateInfo} stateInfo
 * @param {string} branch
 * @returns {{ resolveFromTag: string; preid?: string } | null}
 */
function getNxConfig(stateInfo, branch) {
  switch (stateInfo.state) {
    case "NIGHTLY":
      return { resolveFromTag: NPM_TAG_NIGHTLY, preid: NPM_TAG_NIGHTLY };

    case "STABLE_NEW":
      // New version - resolve from @next (for RC continuation or promotion)
      // preid="rc" is only used if version plan is prepatch/prerelease
      return { resolveFromTag: NPM_TAG_NEXT, preid: "rc" };

    case "STABLE_LATEST":
      return { resolveFromTag: NPM_TAG_LATEST };

    case "STABLE_OLD":
      return { resolveFromTag: "v" + branch };

    case "NOT_RELEASE_BRANCH":
    default:
      return null;
  }
}

/**
 * Determines npm publish tags based on the new version after Nx versioning.
 * @param {string} newVersion - The version produced by Nx (e.g., "0.81.0-rc.0" or "0.81.1")
 * @param {string} branch - Current branch name
 * @param {typeof getPublishedVersion} [getVersion] - For testing
 * @returns {string[]} - Array of npm tags to publish to
 */
function getPublishTags(newVersion, branch, getVersion = getPublishedVersion) {
  // Nightly releases
  if (newVersion.includes("-nightly")) {
    return [NPM_TAG_NIGHTLY];
  }

  // RC releases go to @next
  if (newVersion.includes("-rc")) {
    return [NPM_TAG_NEXT];
  }

  // Stable release - determine tags based on version comparison
  const currentVersion = versionToNumber(newVersion);
  const latestVersion = getVersion(NPM_TAG_LATEST);
  const nextVersion = getVersion(NPM_TAG_NEXT);
  const versionTag = "v" + branch;

  if (currentVersion > latestVersion) {
    // New latest - add @latest, version tag, and @next if newer than @next
    const tags = [NPM_TAG_LATEST, versionTag];
    if (currentVersion > nextVersion) {
      tags.push(NPM_TAG_NEXT);
    }
    return tags;
  } else if (currentVersion === latestVersion) {
    // Patch to current latest
    return [NPM_TAG_LATEST, versionTag];
  } else {
    // Patch to old version
    return [versionTag];
  }
}

// ============================================================================
// npm auth verification
// ============================================================================

/**
 * Verifies npm authentication.
 * @param {string} registry
 */
function verifyNpmAuth(registry = NPM_REGISTRY) {
  const spawnOptions = /** @type {const} */ ({
    stdio: "pipe",
    shell: true,
  });

  const npmErrorRegex = /npm error code (\w+)/;

  info("Verifying npm authentication...");
  const whoami = spawnSync("npm", ["whoami", "--registry", registry], spawnOptions);
  if (whoami.status !== 0) {
    const errorOutput = whoami.stderr.toString();
    const m = errorOutput.match(npmErrorRegex);
    const errorCode = m?.[1];
    switch (errorCode) {
      case "EINVALIDNPMTOKEN":
        throw new Error(`Invalid auth token for npm registry: ${registry}`);
      case "ENEEDAUTH":
        throw new Error(`Missing auth token for npm registry: ${registry}`);
      default:
        throw new Error(errorOutput);
    }
  }
  success("npm authentication verified");
}

// ============================================================================
// Publishing
// ============================================================================

/**
 * Publishes packages to npm.
 * @param {string} tag
 * @param {string} token
 * @param {boolean} dryRun
 */
function publishPackages(tag, token, dryRun) {
  for (const { name, path } of PACKAGES) {
    info(`Publishing ${name} with tag '${tag}'...`);

    if (dryRun) {
      console.log(`  [dry-run] npm publish ${path} --tag ${tag}`);
    } else {
      const result = spawnSync(
        "npm",
        [
          "publish",
          path,
          "--tag",
          tag,
          "--registry",
          NPM_REGISTRY,
          `--//registry.npmjs.org/:_authToken=${token}`,
        ],
        { stdio: "inherit", shell: true }
      );

      if (result.status !== 0) {
        throw new Error(`Failed to publish ${name}`);
      }

      success(`Published ${name}@${tag}`);
    }
  }
}

/**
 * Applies additional dist-tags to packages.
 * @param {string[]} tags
 * @param {string} version
 * @param {string} token
 * @param {boolean} dryRun
 */
function applyAdditionalTags(tags, version, token, dryRun) {
  if (tags.length === 0) {
    info("No additional tags to apply");
    return;
  }

  for (const tag of tags) {
    for (const { name } of PACKAGES) {
      info(`Adding dist-tag '${tag}' to ${name}@${version}...`);

      if (dryRun) {
        console.log(`  [dry-run] npm dist-tag add ${name}@${version} ${tag}`);
      } else {
        const result = spawnSync(
          "npm",
          [
            "dist-tag",
            "add",
            `${name}@${version}`,
            tag,
            "--registry",
            NPM_REGISTRY,
            `--//registry.npmjs.org/:_authToken=${token}`,
          ],
          { stdio: "inherit", shell: true }
        );

        if (result.status !== 0) {
          throw new Error(`Failed to add dist-tag '${tag}' to ${name}@${version}`);
        }

        success(`Added dist-tag '${tag}' to ${name}@${version}`);
      }
    }
  }
}

// ============================================================================
// CI output helpers
// ============================================================================

/**
 * Exports a variable for Azure Pipelines.
 * @param {string} name
 * @param {string} value
 */
function setAzurePipelinesVariable(name, value) {
  console.log(`##vso[task.setvariable variable=${name}]${value}`);
}

/**
 * Exports a variable for GitHub Actions.
 * @param {string} name
 * @param {string} value
 */
function setGitHubActionsOutput(name, value) {
  if (process.env["GITHUB_OUTPUT"]) {
    fs.appendFileSync(process.env["GITHUB_OUTPUT"], `${name}=${value}\n`);
  }
}

// ============================================================================
// Main
// ============================================================================

/**
 * @param {Options} options
 * @returns {Promise<number>}
 */
async function main(options) {
  const dryRun = options["dry-run"] ?? false;
  const verbose = options.verbose ?? false;
  const log = verbose ? info : () => {};

  // Determine branch
  const branch = getCurrentBranch(options);
  if (!branch) {
    error("Could not determine current branch");
    return 1;
  }

  info(`Branch: ${branch}`);

  // Determine release state from branch and version plans
  const stateInfo = getReleaseState(branch);
  log(`react-native-macos@latest: ${stateInfo.latestVersion}`);
  log(`react-native-macos@next: ${stateInfo.nextVersion}`);
  log(`Current branch version: ${stateInfo.currentVersion}`);
  log(`Release state: ${stateInfo.state}`);

  if (stateInfo.state === "NOT_RELEASE_BRANCH") {
    info(`Branch '${branch}' is not a release branch, skipping release`);
    return 0;
  }

  // Get Nx configuration based on state
  const nxConfig = getNxConfig(stateInfo, branch);
  if (!nxConfig) {
    info("No Nx configuration for this release state");
    return 0;
  }

  log(`Resolving current version from: @${nxConfig.resolveFromTag}`);
  if (nxConfig.preid) {
    log(`Prerelease ID: ${nxConfig.preid}`);
  }

  // Verify npm auth (unless skipped or dry-run)
  if (!dryRun && !options["skip-auth"]) {
    verifyNpmAuth();
  } else if (options["skip-auth"]) {
    info("Skipped npm auth validation");
  }

  // Create Nx Release client with configuration derived from state
  const releaseClient = new ReleaseClient({
    changelog: {
      projectChangelogs: {
        file: false,
        createRelease: "github",
      },
      workspaceChangelog: false,
    },
    projects: ["packages/react-native", "packages/virtualized-lists"],
    versionPlans: true,
    version: {
      versionActionsOptions: {
        currentVersionResolver: "registry",
        currentVersionResolverMetadata: {
          tag: nxConfig.resolveFromTag,
        },
        ...(nxConfig.preid && { preid: nxConfig.preid }),
      },
    },
  });

  // Phase 1: Version
  info("Running version phase...");
  const { workspaceVersion, projectsVersionData } =
    await releaseClient.releaseVersion({
      dryRun,
      verbose,
    });

  // Check if there are actual version changes
  const hasVersionChanges = Object.values(projectsVersionData).some(
    (data) => data.newVersion && data.newVersion !== data.currentVersion
  );

  if (!hasVersionChanges) {
    info("No version changes detected (no version plans to apply)");
    return 0;
  }

  const newVersion =
    workspaceVersion ?? Object.values(projectsVersionData)[0]?.newVersion ?? "";

  info(`New version: ${newVersion}`);

  // Determine publish tags from the new version
  const publishTags = getPublishTags(newVersion, branch);
  const [primaryTag, ...additionalTags] = publishTags;

  info(`Primary npm tag: ${primaryTag}`);
  if (additionalTags.length > 0) {
    info(`Additional npm tags: ${additionalTags.join(", ")}`);
  }

  // Phase 1.5: Update React Native artifacts
  await updateReactNativeArtifacts(newVersion, dryRun);

  // Commit the artifact changes (amend the version commit)
  if (!dryRun) {
    commitArtifactChanges(newVersion, dryRun);
  }

  // Phase 2: Changelog (creates GitHub release)
  info("Running changelog phase...");
  try {
    await releaseClient.releaseChangelog({
      versionData: projectsVersionData,
      version: workspaceVersion,
      dryRun,
      verbose,
    });
  } catch (e) {
    // In dry-run mode, changelog may fail if there are no actual changes to commit
    const err = /** @type {Error} */ (e);
    if (dryRun && err.message?.includes("No changed files to commit")) {
      info("Skipping changelog in dry-run (no actual file changes)");
    } else {
      throw e;
    }
  }

  // Phase 3: Publish (using our custom npm publish to work around yarn 4 issues)
  if (!options.token && !dryRun) {
    error("npm auth token is required for publishing (use --token)");
    return 1;
  }

  info("Running publish phase...");
  publishPackages(primaryTag, options.token || "", dryRun);

  // Apply additional dist-tags
  if (additionalTags.length > 0) {
    info("Applying additional dist-tags...");
    applyAdditionalTags(additionalTags, newVersion, options.token || "", dryRun);
  }

  // Export CI variables
  if (!dryRun) {
    setAzurePipelinesVariable("publish_react_native_macos", "1");
    if (additionalTags.length > 0) {
      const tagsValue = additionalTags.join(",");
      setAzurePipelinesVariable("additionalTags", tagsValue);
      setGitHubActionsOutput("additionalTags", tagsValue);
    }
  }

  success("Release completed successfully");
  return 0;
}

// ============================================================================
// CLI (only run when executed directly, not when imported)
// ============================================================================

if (process.argv[1]?.endsWith("release.mjs")) {
  const { values } = util.parseArgs({
    args: process.argv.slice(2),
    options: {
      "dry-run": {
        type: "boolean",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      "mock-branch": {
        type: "string",
      },
      "skip-auth": {
        type: "boolean",
        default: false,
      },
      token: {
        type: "string",
      },
      verbose: {
        type: "boolean",
        default: false,
      },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
Usage: node release.mjs [options]

Unified release script for react-native-macos packages.

Options:
  --dry-run         Run without publishing (default: false)
  --mock-branch     Override branch detection (for testing)
  --skip-auth       Skip npm auth verification
  --token           npm auth token
  --verbose         Enable verbose logging
  -h, --help        Show this help message

Release behavior:
  main branch       -> nightly release (publishes to @nightly)
  X.Y-stable branch -> behavior depends on version plans:
    - prepatch/prerelease plan -> RC release (publishes to @next)
    - patch/minor plan -> stable release (publishes to @latest or version tag)

The npm publish tags are determined automatically from the new version:
  - Version with -nightly suffix -> @nightly
  - Version with -rc suffix -> @next
  - Stable version newer than @latest -> @latest + version tag
  - Stable version equal to @latest -> @latest + version tag
  - Stable version older than @latest -> version tag only
`);
    process.exit(0);
  }

  main(values).then((code) => {
    process.exit(code);
  }).catch((e) => {
    error(e.message);
    process.exit(1);
  });
}

export {
  isMainBranch,
  isStableBranch,
  versionToNumber,
  getReleaseState,
  getNxConfig,
  getPublishTags,
};
