# React Native macOS publication contract

- `microsoft-changesets-version.yml` automatically creates the Changesets version PR.
- `microsoft-npm-publish.yml` publishes prepared versions on stable-branch pushes through Yarn 4.12 Trusted Publishing.
- `.ado/publish.yml` and `.ado/jobs/npm-publish.yml` retain hard-false conditions. ADO publication remains disabled until explicitly re-enabled.

## Scope and preparation

The automatic release consists of `react-native-macos` and public `@react-native-macos/*` workspaces discovered through Yarn. `react-native-macos-init` has an independent release process and is excluded, even when its local version is unpublished.

The version wrapper permits only patch bumps for the coupled release packages on stable branches. It adds a temporary Changeset for every coupled package absent from a patch plan. Changesets then generates every release version and changelog together. The wrapper rejects mismatched versions before `yarn constraints --fix`, and rejects any subsequent public version override by those constraints. Shared dependency constraints still run before native artifacts and the lockfile. An init-only bump does not regenerate core artifacts.

Pending Changesets come from the declared `@changesets/get-release-plan` API, with no `sinceRef`; the CLI's default base-branch comparison is not used. The API and version wrapper use `bumpVersionsWithWorkspaceProtocolOnly: true`, because explicit registry references to private upstream workspaces are external dependencies. The wrapper restores the original Changesets configuration after the CLI returns, including on failure.

Stable branches must already have their initial release version and React Native peer configured. The publication script does not turn `1000.0.0` into a release. All public release packages must match the core version and branch. Private runtime workspace links are invalid; explicit registry references to the separately published upstream `@react-native/*` packages are valid. Development-only private workspace links are allowed.

Main and merge-stage branches keep the `1000.0.0` development graph, including private virtualized-lists and upstream workspace links. Their Changesets config defers `react-native-macos` with `ignore`; `@react-native/tester` is also listed for compatibility with older Changesets' dependent validation. This preserves pending core changesets until stable preparation, without changing package privacy or enabling private versions or tags. The independent init package remains versionable. Stable preparation must clear `ignore`, set the stable `baseBranch`, make virtualized-lists public, and configure the release versions and upstream registry dependencies before versioning. The repository-graph test checks these branch-specific source settings.

## Publication and tags

Any pending Changeset, including an empty Changeset, skips publication. Registry failures fail the run. The script validates the complete package graph and queries every selected package before publication. It publishes only absent versions in dependency order, so retries skip versions already published. A release consists of multiple npm writes, not an atomic registry transaction.

A new upload receives exactly one npm tag, matching the single-tag policy in `9cc1f0aeca8`. A real prerelease uses `next`. A stable version uses `latest` unless that package already has a stable version from a newer release line. An older release line uses its branch tag, such as `0.83-stable`. Full SemVer comparison checks each package's published versions and current tag pointers. An unpublished older patch or prerelease fails before any package is published if its tag would regress.

For example, `0.83.0` publishes with `latest` when it is the newest stable line. After `0.84.0` exists, a new `0.83` patch publishes with `0.83-stable`. Yarn applies that one tag during publication; there is no separate tag call.

Existing versions skip successfully, including partial retries and versions with absent or different tags. The workflow does not promote existing versions or repair tags. The original `.ado/scripts/apply-additional-tags.mjs` remains retained and inactive behind the disabled ADO route. Trusted Publishing needs no additional credentials for this single-tag policy.

## Concurrency

Publication remains push-triggered. Its global concurrency group uses `queue: max`, which [GitHub.com documents](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) as up to 100 pending runs. Overflow runs are canceled; queue order is the order runs start waiting, not necessarily push order. Registry monotonicity checks therefore remain necessary. No manual trigger was added.

Changesets uses a separate per-branch concurrency group with `cancel-in-progress: true`. It checks the remote stable head before the action and again after the version script, to reject stale reruns or a branch advance during preparation. A branch can still advance after the final check; concurrency cancellation limits that race but is not a compare-and-swap update of the version PR.

Each selected package needs an npm Trusted Publisher for:

- Repository: `microsoft/react-native-macos`
- Workflow: `microsoft-npm-publish.yml`
- Environment: `npm-publish`
- Direct publication permission

These remote package settings cannot be established by the local tests. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## Checks

Run with Node 22.22.0:

```sh
node --test .github/scripts/__tests__/publishing-contract.test.mjs
actionlint .github/workflows/microsoft-npm-publish.yml .github/workflows/microsoft-changesets-version.yml
```

The tests use real `get-release-plan` and real Changesets version commands on temporary package graphs, including absent Git base refs and both core-only and scoped-only changes. They verify both generated changelogs. Registry publication remains mocked; tests verify one tag per upload and no separate tag mutations.

`actionlint` 1.7.12 does not recognize the documented `queue` property. Its unfiltered run reports that one syntax diagnostic; use a newer supporting release when available. This is a local lint compatibility limitation, not proof of a successful GitHub workflow run.
