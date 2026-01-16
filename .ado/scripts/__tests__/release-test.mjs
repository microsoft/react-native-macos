/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Run with: node --test .ado/scripts/__tests__/release-test.mjs
 *
 * @format
 */

import { describe, it } from "node:test";
import assert from "node:assert";

// ============================================================================
// Replicated pure functions from release.mjs for testing
// ============================================================================

const NPM_TAG_NEXT = "next";
const NPM_TAG_NIGHTLY = "nightly";

/**
 * @typedef {"NIGHTLY" | "PATCH_LATEST" | "PATCH_OLD" | "PROMOTE_TO_LATEST" | "RELEASE_CANDIDATE" | "NOT_RELEASE_BRANCH"} ReleaseState
 */

/**
 * @typedef {{
 *   state: ReleaseState;
 *   currentVersion: number;
 *   latestVersion: number;
 *   nextVersion: number;
 * }} ReleaseStateInfo
 */

function isMainBranch(branch) {
  return branch === "main";
}

function isStableBranch(branch) {
  return /^\d+\.\d+-stable$/.test(branch);
}

function versionToNumber(version) {
  const [major, minor] = version.split("-")[0].split(".");
  return Number(major) * 1000 + Number(minor);
}

/**
 * Determines the release state based on branch, versions, and options
 * @param {string} branch
 * @param {{tag?: string}} options
 * @param {(tag: string) => number} getPublishedVersion
 * @returns {ReleaseStateInfo}
 */
function getReleaseState(branch, options, getPublishedVersion) {
  if (isMainBranch(branch)) {
    return { state: "NIGHTLY", currentVersion: 0, latestVersion: 0, nextVersion: 0 };
  }

  if (!isStableBranch(branch)) {
    return { state: "NOT_RELEASE_BRANCH", currentVersion: 0, latestVersion: 0, nextVersion: 0 };
  }

  const latestVersion = getPublishedVersion("latest");
  const nextVersion = getPublishedVersion("next");
  const currentVersion = versionToNumber(branch);

  /** @type {ReleaseState} */
  let state;
  if (currentVersion === latestVersion) {
    state = "PATCH_LATEST";
  } else if (currentVersion < latestVersion) {
    state = "PATCH_OLD";
  } else if (options.tag === "latest") {
    state = "PROMOTE_TO_LATEST";
  } else {
    state = "RELEASE_CANDIDATE";
  }

  return { state, currentVersion, latestVersion, nextVersion };
}

/**
 * Gets npm tags based on release state
 * @param {string} branch
 * @param {{tag?: string}} options
 * @param {(msg: string) => void} log
 * @param {(tag: string) => number} getPublishedVersion
 * @returns {{npmTags: string[], prerelease?: string} | null}
 */
function getTagInfo(branch, options, log, getPublishedVersion) {
  const { state, currentVersion, latestVersion, nextVersion } = getReleaseState(
    branch,
    options,
    getPublishedVersion
  );

  log(`react-native-macos@latest: ${latestVersion}`);
  log(`react-native-macos@next: ${nextVersion}`);
  log(`Current version: ${currentVersion}`);
  log(`Release state: ${state}`);

  switch (state) {
    case "NIGHTLY":
      log(`Expected npm tags: ${NPM_TAG_NIGHTLY}`);
      return { npmTags: [NPM_TAG_NIGHTLY], prerelease: NPM_TAG_NIGHTLY };

    case "PATCH_LATEST": {
      const versionTag = "v" + branch;
      log(`Expected npm tags: latest, ${versionTag}`);
      return { npmTags: ["latest", versionTag] };
    }

    case "PATCH_OLD": {
      const npmTag = "v" + branch;
      log(`Expected npm tags: ${npmTag}`);
      return { npmTags: [npmTag] };
    }

    case "PROMOTE_TO_LATEST": {
      const versionTag = "v" + branch;
      const npmTags = ["latest", versionTag];
      if (currentVersion > nextVersion) {
        npmTags.push(NPM_TAG_NEXT);
      }
      log(`Expected npm tags: ${npmTags.join(", ")}`);
      return { npmTags };
    }

    case "RELEASE_CANDIDATE":
      if (currentVersion < nextVersion) {
        throw new Error(
          `Current version cannot be a release candidate because it is too old: ${currentVersion} < ${nextVersion}`
        );
      }
      log(`Expected npm tags: ${NPM_TAG_NEXT}`);
      return { npmTags: [NPM_TAG_NEXT], prerelease: "rc" };

    case "NOT_RELEASE_BRANCH":
    default:
      return null;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("release.mjs", () => {
  describe("isMainBranch", () => {
    it('returns true for "main"', () => {
      assert.strictEqual(isMainBranch("main"), true);
    });

    it('returns false for "master"', () => {
      assert.strictEqual(isMainBranch("master"), false);
    });

    it("returns false for stable branches", () => {
      assert.strictEqual(isMainBranch("0.77-stable"), false);
    });

    it("returns false for feature branches", () => {
      assert.strictEqual(isMainBranch("feature/my-feature"), false);
    });
  });

  describe("isStableBranch", () => {
    it("returns true for valid stable branches", () => {
      assert.strictEqual(isStableBranch("0.77-stable"), true);
      assert.strictEqual(isStableBranch("0.78-stable"), true);
      assert.strictEqual(isStableBranch("1.0-stable"), true);
      assert.strictEqual(isStableBranch("12.34-stable"), true);
    });

    it("returns false for main branch", () => {
      assert.strictEqual(isStableBranch("main"), false);
    });

    it("returns false for invalid stable branch formats", () => {
      assert.strictEqual(isStableBranch("0.77-stable-hotfix"), false);
      assert.strictEqual(isStableBranch("stable"), false);
      assert.strictEqual(isStableBranch("v0.77-stable"), false);
      assert.strictEqual(isStableBranch("0.77.1-stable"), false);
      assert.strictEqual(isStableBranch("77-stable"), false);
    });

    it("returns false for feature branches", () => {
      assert.strictEqual(isStableBranch("feature/0.77-stable"), false);
    });
  });

  describe("versionToNumber", () => {
    it("converts version strings to numbers", () => {
      assert.strictEqual(versionToNumber("0.77"), 77);
      assert.strictEqual(versionToNumber("0.78"), 78);
      assert.strictEqual(versionToNumber("1.0"), 1000);
      assert.strictEqual(versionToNumber("1.5"), 1005);
      assert.strictEqual(versionToNumber("12.34"), 12034);
    });

    it("handles version strings with -stable suffix", () => {
      assert.strictEqual(versionToNumber("0.77-stable"), 77);
      assert.strictEqual(versionToNumber("0.78-stable"), 78);
      assert.strictEqual(versionToNumber("1.0-stable"), 1000);
    });

    it("handles full semver versions", () => {
      assert.strictEqual(versionToNumber("0.77.0"), 77);
      assert.strictEqual(versionToNumber("0.77.5"), 77);
      assert.strictEqual(versionToNumber("0.77.0-rc.1"), 77);
    });
  });

  describe("getReleaseState", () => {
    const mockGetPublishedVersion = (latestV, nextV) => (tag) => {
      if (tag === "latest") return latestV;
      if (tag === "next") return nextV;
      return 0;
    };

    it("returns NIGHTLY for main branch", () => {
      const result = getReleaseState("main", {}, mockGetPublishedVersion(77, 78));
      assert.strictEqual(result.state, "NIGHTLY");
    });

    it("returns NOT_RELEASE_BRANCH for feature branches", () => {
      const result = getReleaseState("feature/foo", {}, mockGetPublishedVersion(77, 78));
      assert.strictEqual(result.state, "NOT_RELEASE_BRANCH");
    });

    it("returns PATCH_LATEST when current equals latest", () => {
      const result = getReleaseState("0.77-stable", {}, mockGetPublishedVersion(77, 78));
      assert.strictEqual(result.state, "PATCH_LATEST");
      assert.strictEqual(result.currentVersion, 77);
      assert.strictEqual(result.latestVersion, 77);
    });

    it("returns PATCH_OLD when current is less than latest", () => {
      const result = getReleaseState("0.77-stable", {}, mockGetPublishedVersion(78, 79));
      assert.strictEqual(result.state, "PATCH_OLD");
      assert.strictEqual(result.currentVersion, 77);
      assert.strictEqual(result.latestVersion, 78);
    });

    it("returns PROMOTE_TO_LATEST when tag option is latest", () => {
      const result = getReleaseState("0.78-stable", { tag: "latest" }, mockGetPublishedVersion(77, 77));
      assert.strictEqual(result.state, "PROMOTE_TO_LATEST");
    });

    it("returns RELEASE_CANDIDATE when current > latest and no tag option", () => {
      const result = getReleaseState("0.78-stable", {}, mockGetPublishedVersion(77, 77));
      assert.strictEqual(result.state, "RELEASE_CANDIDATE");
    });
  });

  describe("getTagInfo", () => {
    const mockLog = () => {};

    it("returns nightly tags for NIGHTLY state (main branch)", () => {
      const getPublishedVersion = () => 0;
      const result = getTagInfo("main", {}, mockLog, getPublishedVersion);
      assert.deepStrictEqual(result, {
        npmTags: ["nightly"],
        prerelease: "nightly",
      });
    });

    it("returns null for NOT_RELEASE_BRANCH state (feature branches)", () => {
      const getPublishedVersion = () => 0;
      const result = getTagInfo("feature/my-feature", {}, mockLog, getPublishedVersion);
      assert.strictEqual(result, null);
    });

    it("returns null for NOT_RELEASE_BRANCH state (invalid branch names)", () => {
      const getPublishedVersion = () => 0;
      assert.strictEqual(getTagInfo("", {}, mockLog, getPublishedVersion), null);
      assert.strictEqual(getTagInfo("develop", {}, mockLog, getPublishedVersion), null);
      assert.strictEqual(getTagInfo("release", {}, mockLog, getPublishedVersion), null);
    });

    it("returns latest + version tag for PATCH_LATEST state", () => {
      const getPublishedVersion = (tag) => {
        if (tag === "latest") return 77;
        if (tag === "next") return 78;
        return 0;
      };
      const result = getTagInfo("0.77-stable", {}, mockLog, getPublishedVersion);
      assert.deepStrictEqual(result, {
        npmTags: ["latest", "v0.77-stable"],
      });
    });

    it("returns only version tag for PATCH_OLD state", () => {
      const getPublishedVersion = (tag) => {
        if (tag === "latest") return 78;
        if (tag === "next") return 79;
        return 0;
      };
      const result = getTagInfo("0.77-stable", {}, mockLog, getPublishedVersion);
      assert.deepStrictEqual(result, {
        npmTags: ["v0.77-stable"],
      });
    });

    it("returns latest + version + next for PROMOTE_TO_LATEST state (newer than next)", () => {
      const getPublishedVersion = (tag) => {
        if (tag === "latest") return 77;
        if (tag === "next") return 77;
        return 0;
      };
      const result = getTagInfo("0.78-stable", { tag: "latest" }, mockLog, getPublishedVersion);
      assert.deepStrictEqual(result, {
        npmTags: ["latest", "v0.78-stable", "next"],
      });
    });

    it("returns latest + version without next for PROMOTE_TO_LATEST state (not newer than next)", () => {
      const getPublishedVersion = (tag) => {
        if (tag === "latest") return 77;
        if (tag === "next") return 78;
        return 0;
      };
      const result = getTagInfo("0.78-stable", { tag: "latest" }, mockLog, getPublishedVersion);
      assert.deepStrictEqual(result, {
        npmTags: ["latest", "v0.78-stable"],
      });
    });

    it("returns next tag with rc prerelease for RELEASE_CANDIDATE state", () => {
      const getPublishedVersion = (tag) => {
        if (tag === "latest") return 77;
        if (tag === "next") return 77;
        return 0;
      };
      const result = getTagInfo("0.78-stable", {}, mockLog, getPublishedVersion);
      assert.deepStrictEqual(result, {
        npmTags: ["next"],
        prerelease: "rc",
      });
    });

    it("throws error for RELEASE_CANDIDATE state when version is too old", () => {
      const getPublishedVersion = (tag) => {
        if (tag === "latest") return 77;
        if (tag === "next") return 79;
        return 0;
      };
      assert.throws(
        () => getTagInfo("0.78-stable", {}, mockLog, getPublishedVersion),
        { message: /Current version cannot be a release candidate/ }
      );
    });
  });

  describe("constants", () => {
    it("NPM_TAG_NEXT is 'next'", () => {
      assert.strictEqual(NPM_TAG_NEXT, "next");
    });

    it("NPM_TAG_NIGHTLY is 'nightly'", () => {
      assert.strictEqual(NPM_TAG_NIGHTLY, "nightly");
    });
  });
});
