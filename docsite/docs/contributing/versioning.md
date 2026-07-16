---
sidebar_label: 'Versioning'
sidebar_position: 3
---

# Versioning

React Native macOS uses [Changesets](https://github.com/changesets/changesets) to record release intent.
React Native macOS package versions are managed independently from upstream React Native versions, so their
patch numbers do not have to match. For example, `react-native-macos@0.78.5` can correspond to
`react-native@0.78.2`. On stable branches, the `react-native` peer dependency in
[`packages/react-native/package.json`](https://github.com/microsoft/react-native-macos/blob/main/packages/react-native/package.json)
is the source of truth for that correspondence.

## Add release intent to a pull request

For a normal pull request that changes a public package, run:

```shell
yarn change
```

Select the affected packages, choose the appropriate bump, and write a concise user-facing summary. This creates a
file under `.changeset/` that should be committed with the pull request. Run `yarn change:check` to perform the same
validation used by CI: every changed public package must have release intent, and major bumps are rejected. You can
also inspect the calculated releases directly with `yarn changeset status --since <base-branch>`.

If a pull request changes package files but should not produce a release, add an empty Changeset instead:

```shell
yarn changeset --empty
```

The repository's [`yarn change` and `yarn change:check` scripts](https://github.com/microsoft/react-native-macos/blob/main/.github/scripts/change.mts)
select the appropriate repository remote and validate Changesets. CI requires this validation for pull requests into
active `*-stable` branches.

## Materialize a release

Pushing Changesets to an active `*-stable` branch triggers the
[Changesets version workflow](https://github.com/microsoft/react-native-macos/blob/main/.github/workflows/microsoft-changesets-version.yml).
The Changesets action creates or updates a follow-up version-bump pull request. That pull request runs
`yarn changeset:version`, which consumes the pending Changesets, updates package versions and changelogs, updates
native version artifacts, and refreshes the lockfile. Version and changelog edits therefore belong in that generated
version pull request, not in the original feature or stable-sync pull request.
