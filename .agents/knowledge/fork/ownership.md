---
id: fork.ownership
summary: Which paths the fork owns, which it shares with upstream, and which it must never edit.
kind: rules
status: active
load_when: Adding a file, choosing where fork content goes, or editing configs that upstream also ships
sources:
  - .agents/knowledge/taxonomy.yaml#upstream_owned
  - docsite/docs/contributing/diffs-with-upstream.md
  - https://github.com/react/react-native/blob/main/AGENTS.md
verified: 2026-10-29
rules:
  [check-upstream-first, never-edit-upstream-owned, prefer-fork-owned-paths]
related: [fork.diff-tags]
---

<!-- @format -->

# Path ownership

Use when: you add a file, move fork content, or edit a file that upstream also ships. Not for: tag syntax; see [fork.diff-tags](diff-tags.md).

## Rules

- **fork.ownership.check-upstream-first:** Before you edit a path, find out whether upstream has it. If it does, the path is shared: keep the change small and tag it.
- **fork.ownership.never-edit-upstream-owned:** Never put fork content in the paths listed under `ownership.upstream_owned` in [taxonomy.yaml](../taxonomy.yaml). The knowledge checks (KC-12) reject `[macOS`, `rnmacos-`, and `.agents/knowledge` there.
- **fork.ownership.prefer-fork-owned-paths:** Put large macOS-only code and fork tooling in fork-owned paths, so merges never touch it.

## Facts

- Upstream is `react/react-native`, formerly `facebook/react-native`.
- **Fork-owned** paths don't exist upstream: `docsite/`, `.ado/`, `.github/workflows/microsoft-*.yml`, `packages/react-native-macos-init/`, `packages/react-native/ReactApple/Libraries/RCTUIKit/`, `*.macos.js` files, `.agents/`, and the `.claude/skills/rnmacos-*` symlinks.
- **Shared** paths exist in both repositories, including most of `packages/react-native/React/` and `packages/react-native/Libraries/`. Edit them with [diff tags](diff-tags.md).
- **Upstream-owned** paths are shared paths the fork never changes: `__docs__/` architecture notes and the shared lint and format configs.
- Upstream ships a root `AGENTS.md`. The fork's copy keeps upstream's `# React Native` first line and adds a single `[macOS` block, so the 0.88 merge touches as little as possible.

## Pitfalls

- Fork content in an upstream-owned file conflicts with every merge.
- A shared folder can hold fork-only files: `packages/react-native/ReactApple/` exists upstream, but its `RCTUIKit/` subfolder doesn't. Check the exact path.

## Verify

```sh
# Exits 0 if the path exists on upstream main.
gh api "repos/react/react-native/contents/<path>?ref=main" --silent
node .agents/knowledge/tools/knowledge.mts check
```
