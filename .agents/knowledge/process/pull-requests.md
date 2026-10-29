---
id: process.pull-requests
summary: PR titles, the PR body template, Changesets, and backport conventions for react-native-macos.
kind: rules
status: active
load_when: Writing a commit or PR title or body, adding a Changeset, or backporting to a stable branch
sources:
  - .github/PULL_REQUEST_TEMPLATE.md
  - .github/workflows/microsoft-pr.yml#commitlint-lite
  - .github/workflows/microsoft-pr.yml#check-changesets
  - docsite/docs/contributing/backporting.md
  - docsite/docs/contributing/versioning.md
verified: 2026-10-28
rules: [conventional-title, fill-template, changesets-for-stable]
related: [tooling.commands]
---

<!-- @format -->

# Pull requests

Use when: you write a PR title or body, add a Changeset, or backport a change. Not for: choosing which checks to run; see [tooling.commands](../tooling/commands.md).

## Rules

- **process.pull-requests.conventional-title:** Write PR titles as Conventional Commits, such as `fix(textinput): handle focus correctly`. CI lints the title with `@rnx-kit/commitlint-lite`.
- **process.pull-requests.fill-template:** Fill in the template's `## Summary:` and `## Test Plan:` sections. The Test Plan lists each exact command you ran with its result, plus screenshots for UI changes.
- **process.pull-requests.changesets-for-stable:** Add a Changeset with `yarn change` only when the PR targets a `*-stable` branch. PRs into `main` don't need one.

## Facts

- The template asks contributors to first consider fixing the problem upstream, or in a layer above react-native-macos.
- PR CI (`microsoft-pr.yml`) runs on PRs into `main`, `*-stable`, `release/*`, and `*-merge` branches.
- Backport branches are named `<version>/<branch>`, such as `0.81/fix-text-input`, and titles add the version to the scope, such as `fix(0.81, textinput): …`. The full procedure is in [Backporting](../../../docsite/docs/contributing/backporting.md).
- Minor versions track upstream React Native minor versions; patch versions differ.

## Pitfalls

- A PR from a `changeset-release/` branch is the version bump itself and skips the Changeset check.

## Verify

```sh
yarn change:check
```
