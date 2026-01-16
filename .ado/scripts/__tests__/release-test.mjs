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
import {
  isMainBranch,
  isStableBranch,
  versionToNumber,
  getReleaseState,
  getNxConfig,
  getPublishTags,
} from "../release.mjs";

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
    it("compares major.minor versions correctly", () => {
      assert.ok(versionToNumber("0.78") > versionToNumber("0.77"));
      assert.ok(versionToNumber("1.0") > versionToNumber("0.99"));
      assert.ok(versionToNumber("1.5") > versionToNumber("1.0"));
      assert.ok(versionToNumber("12.34") > versionToNumber("12.33"));
    });

    it("treats -stable suffix as equivalent", () => {
      assert.strictEqual(versionToNumber("0.77-stable"), versionToNumber("0.77"));
      assert.strictEqual(versionToNumber("1.0-stable"), versionToNumber("1.0"));
    });

    it("ignores patch version for comparison", () => {
      assert.strictEqual(versionToNumber("0.77.0"), versionToNumber("0.77.5"));
      assert.strictEqual(versionToNumber("0.77.0"), versionToNumber("0.77.99"));
    });

    it("ignores prerelease suffix for comparison", () => {
      assert.strictEqual(versionToNumber("0.77.0-rc.1"), versionToNumber("0.77.0"));
      assert.strictEqual(versionToNumber("0.77.0-nightly"), versionToNumber("0.77"));
    });
  });

  describe("getReleaseState", () => {
    /** @param {{latest: number, next: number}} versions */
    const mockVersions = (versions) => (tag) => versions[tag] ?? 0;

    it("returns NIGHTLY for main branch", () => {
      const result = getReleaseState("main", mockVersions({ latest: 77, next: 78 }));
      assert.strictEqual(result.state, "NIGHTLY");
    });

    it("returns NOT_RELEASE_BRANCH for feature branches", () => {
      const result = getReleaseState("feature/foo", mockVersions({ latest: 77, next: 78 }));
      assert.strictEqual(result.state, "NOT_RELEASE_BRANCH");
    });

    it("returns STABLE_LATEST when current equals latest", () => {
      const result = getReleaseState("0.77-stable", mockVersions({ latest: 77, next: 78 }));
      assert.strictEqual(result.state, "STABLE_LATEST");
      assert.strictEqual(result.currentVersion, 77);
      assert.strictEqual(result.latestVersion, 77);
    });

    it("returns STABLE_OLD when current is less than latest", () => {
      const result = getReleaseState("0.77-stable", mockVersions({ latest: 78, next: 79 }));
      assert.strictEqual(result.state, "STABLE_OLD");
    });

    it("returns STABLE_NEW when current is greater than latest", () => {
      const result = getReleaseState("0.78-stable", mockVersions({ latest: 77, next: 77 }));
      assert.strictEqual(result.state, "STABLE_NEW");
    });
  });

  describe("getNxConfig", () => {
    it("returns nightly config for NIGHTLY state", () => {
      const stateInfo = { state: "NIGHTLY", currentVersion: 0, latestVersion: 0, nextVersion: 0 };
      const result = getNxConfig(stateInfo, "main");
      assert.deepStrictEqual(result, { resolveFromTag: "nightly", preid: "nightly" });
    });

    it("returns @next config with rc preid for STABLE_NEW state", () => {
      const stateInfo = { state: "STABLE_NEW", currentVersion: 78, latestVersion: 77, nextVersion: 78 };
      const result = getNxConfig(stateInfo, "0.78-stable");
      assert.deepStrictEqual(result, { resolveFromTag: "next", preid: "rc" });
    });

    it("returns @latest config for STABLE_LATEST state", () => {
      const stateInfo = { state: "STABLE_LATEST", currentVersion: 77, latestVersion: 77, nextVersion: 78 };
      const result = getNxConfig(stateInfo, "0.77-stable");
      assert.deepStrictEqual(result, { resolveFromTag: "latest" });
    });

    it("returns version tag config for STABLE_OLD state", () => {
      const stateInfo = { state: "STABLE_OLD", currentVersion: 76, latestVersion: 77, nextVersion: 78 };
      const result = getNxConfig(stateInfo, "0.76-stable");
      assert.deepStrictEqual(result, { resolveFromTag: "v0.76-stable" });
    });

    it("returns null for NOT_RELEASE_BRANCH state", () => {
      const stateInfo = { state: "NOT_RELEASE_BRANCH", currentVersion: 0, latestVersion: 0, nextVersion: 0 };
      const result = getNxConfig(stateInfo, "feature/foo");
      assert.strictEqual(result, null);
    });
  });

  describe("getPublishTags", () => {
    /** @param {{latest: number, next: number}} versions */
    const mockVersions = (versions) => (tag) => versions[tag] ?? 0;

    it("returns nightly for nightly versions", () => {
      const result = getPublishTags("0.79.0-nightly.123", "main", mockVersions({ latest: 77, next: 78 }));
      assert.deepStrictEqual(result, ["nightly"]);
    });

    it("returns next for RC versions", () => {
      const result = getPublishTags("0.78.0-rc.0", "0.78-stable", mockVersions({ latest: 77, next: 78 }));
      assert.deepStrictEqual(result, ["next"]);
    });

    it("returns latest + version tag for stable version equal to @latest", () => {
      const result = getPublishTags("0.77.5", "0.77-stable", mockVersions({ latest: 77, next: 78 }));
      assert.deepStrictEqual(result, ["latest", "v0.77-stable"]);
    });

    it("returns only version tag for stable version older than @latest", () => {
      const result = getPublishTags("0.76.3", "0.76-stable", mockVersions({ latest: 77, next: 78 }));
      assert.deepStrictEqual(result, ["v0.76-stable"]);
    });

    it("returns latest + version + next for new stable version newer than both", () => {
      const result = getPublishTags("0.78.0", "0.78-stable", mockVersions({ latest: 77, next: 77 }));
      assert.deepStrictEqual(result, ["latest", "v0.78-stable", "next"]);
    });

    it("returns latest + version for new stable version not newer than @next", () => {
      const result = getPublishTags("0.78.0", "0.78-stable", mockVersions({ latest: 77, next: 78 }));
      assert.deepStrictEqual(result, ["latest", "v0.78-stable"]);
    });
  });
});