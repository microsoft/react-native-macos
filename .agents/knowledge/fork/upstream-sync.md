---
id: fork.upstream-sync
summary: Classify local fixes from a version-sync branch before forwarding them to main.
kind: procedure
status: active
load_when: Reviewing a large upstream version merge or deciding which release fixes to forward-port to main
sources:
  - docsite/docs/releases/minor-release.md
  - https://github.com/microsoft/react-native-macos/pull/3022#discussion_r3719817893
  - https://github.com/microsoft/react-native-macos/pull/3022#discussion_r3722730469
  - https://github.com/microsoft/react-native-macos/pull/3099
verified: 2026-10-29
rules: [classify-each-fix, verify-target-branch, preserve-branch-config]
related: [fork.diff-tags, fork.ownership, process.pull-requests]
---

<!-- @format -->

# Forward-porting release fixes

Use when: you review local fixes on a version-sync branch and decide what belongs on `main`. Not for: merging upstream itself; follow the [minor-release procedure](../../../docsite/docs/releases/minor-release.md).

## Rules

- **fork.upstream-sync.classify-each-fix:** Classify every locally authored fix against the exact target branch; don't forward-port a whole release branch or infer applicability from a commit subject.
- **fork.upstream-sync.verify-target-branch:** Inspect the target branch's implementation and later merge branches before proposing a forward-port; cite the commit, file, or call site that supports the classification.
- **fork.upstream-sync.preserve-branch-config:** Keep release-specific configuration on its release branch and verify target-branch settings before copying config changes.

## Procedure

1. Identify the locally authored commits in the sync PR, separately from imported upstream history. Use the merge base and inspect the PR's local commits.
2. Classify each local fix as one of:
   - Already present on `main`: cite the matching commit or implementation.
   - Already fixed in a later merge branch: cite that branch and fix; don't duplicate it.
   - Applicable to `main`: propose a separate forward-port PR, and note its dependencies or stack.
   - Release-only: keep version bumps and branch-specific release configuration on the stable branch.
   - Not applicable: the target has no corresponding file, implementation, or call site; don't invent one just to carry the patch.
3. Split commits that mix categories when needed. For each decision, inspect the target branch itself and any relevant later merge branch; don't treat an open PR as already merged.
4. Verify configuration against the target. For example, Changesets `baseBranch` is `origin/0.83-stable` on that stable branch and `origin/main` on `main`.
5. Run the relevant checks on each forward-port target. Report the classification, evidence, validation, and any unmerged follow-up.

## Facts

- The 0.83 sync review in [#3022](https://github.com/microsoft/react-native-macos/pull/3022) separated changes already in `main`, fixes to forward-port, stable-only changes, fixes already present in later merge branches, and changes with no matching implementation. The review also kept the stable Changesets base branch distinct from `main`.
- In [#3099](https://github.com/microsoft/react-native-macos/pull/3099), shared fixes were submitted separately to `main`; the review tracked that they were not yet merged rather than calling them landed.

## Pitfalls

- A fix present in a later `*-merge` branch may not belong on `main` yet; trace where the behavior first applies and whether it is already guarded.
- An open forward-port PR is not evidence that the fix has landed. Track its status and stack explicitly.
- A stable-only setting such as Changesets `baseBranch` can break `main` if copied without checking its branch-specific value.
