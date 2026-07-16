---
sidebar_label: 'Sync to a new patch release'
sidebar_position: 2
---

# Sync to a new upstream React Native patch release

This process brings a specific upstream React Native stable release into the matching React Native macOS stable
branch. Always identify and review the exact upstream release commit first. Merge its full SHA rather than the moving
tip of the upstream stable branch so the pull request cannot silently change while it is being prepared.

The example below uses `0.83-stable`; substitute the minor version and release SHA you are syncing:

```shell
RN_MINOR=0.83
RN_RELEASE_SHA=<full-upstream-release-commit-sha>

git fetch upstream "$RN_MINOR-stable"
git switch "$RN_MINOR-stable"
git merge --ff-only "upstream/$RN_MINOR-stable"
git switch -c "$RN_MINOR/sync-upstream-patch"

git fetch facebook "$RN_MINOR-stable"
git merge "$RN_RELEASE_SHA"
```

This branches from the matching, updated local React Native macOS stable branch and merges only the pinned React
Native commit.

## Record the sync

After resolving the upstream merge:

1. Update the `react-native` peer dependency in
   [`packages/react-native/package.json`](https://github.com/microsoft/react-native-macos/blob/main/packages/react-native/package.json)
   to the actual upstream React Native version represented by `RN_RELEASE_SHA`.
2. Run `yarn change`, select all public packages affected by the sync, and describe the upstream version being merged.
   Alternatively, create an explicitly named `.changeset/*.md` file with package frontmatter and the same
   user-facing summary.
3. Choose each package's bump based on its current version and the intended release. A later release in an existing
   minor line normally uses a patch bump. The first release of a new minor line may require a minor or prerelease
   transition from the package's seed/current version; do not select patch automatically.

For example, an explicitly authored Changeset for one package has this shape:

```markdown
---
'react-native-macos': patch
---

Sync to upstream React Native 0.83.x.
```

## Regenerate and validate

Regenerate dependency state and RNTester pods after the peer and merged sources change:

```shell
yarn install
(cd packages/rn-tester && bundle exec pod install)
```

Validate against the stable branch rather than `main`:

```shell
GITHUB_BASE_REF=0.83-stable yarn change:check
yarn changeset status --since upstream/0.83-stable
```

Commit the resulting Changeset, `yarn.lock`, and `packages/rn-tester/Podfile.lock` updates with the sync. CI runs
`yarn change:check` for pull requests targeting `*-stable`.

Once the sync pull request lands on the stable branch, the
[Changesets version workflow](https://github.com/microsoft/react-native-macos/blob/main/.github/workflows/microsoft-changesets-version.yml)
creates or updates a follow-up version-bump pull request. That pull request runs `yarn changeset:version` to consume
the Changeset and materialize package version and changelog updates. Do not manually add those generated edits to the
sync pull request.
