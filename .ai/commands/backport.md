# Backport to Stable Branch(es)

Backport the current branch's commits to one or more stable release branches.

## Arguments

The user provides one or more target stable branches as space-separated arguments (e.g., `0.81-stable` or `0.81-stable 0.82-stable`).

## Conventions

- **Branch naming:** If the current feature branch is `foo` and the target is `0.81-stable`, the backport branch is `0.81/foo`.
- **PR title transformation:**
  - `type(scope): description` becomes `type(0.81, scope): description`
  - `type: description` (no scope) becomes `type(0.81): description`
  - The version number is extracted by stripping `-stable` from the target branch name.

## Steps

### 1. Validate

- Parse the arguments for one or more target branch names. If no arguments were provided, ask the user which stable branch(es) to target.
- Run `git branch --show-current` to get the current branch name. Call this `FEATURE_BRANCH`.
- **Refuse** if the current branch is `main` or matches `*-stable` — the user should be on a feature branch.
- Verify each target branch exists on the `upstream` remote by running `git ls-remote --heads upstream <target-branch>`. If a target doesn't exist, warn the user and skip it.

### 2. Identify commits to cherry-pick

- Find the merge base: `git merge-base main HEAD`
- List commits: `git log --reverse --format="%H" <merge-base>..HEAD`
- If there are no commits, warn the user and stop.
- Show the user the list of commits that will be cherry-picked and confirm before proceeding.

### 3. For each target branch

For each target branch (e.g., `0.81-stable`):

#### a. Extract version
Strip the `-stable` suffix to get the version number (e.g., `0.81`).

#### b. Fetch and create the backport branch
```bash
git fetch upstream <target-branch>
git checkout -b <version>/<FEATURE_BRANCH> upstream/<target-branch>
```

If the branch `<version>/<FEATURE_BRANCH>` already exists, ask the user whether to overwrite it or skip this target.

#### c. Cherry-pick commits
```bash
git cherry-pick <commit1> <commit2> ...
```

If a cherry-pick fails due to conflicts:
- Show the user the conflicting files (`git diff --name-only --diff-filter=U`)
- Read the conflicting files and help resolve the conflicts interactively
- After resolution, run `git add .` and `git cherry-pick --continue`

#### d. Transform the PR title

Take the title from the most recent commit message (or ask the user for the PR title). Apply the transformation:
- If it matches `type(scope): description` → `type(<version>, scope): description`
- If it matches `type: description` → `type(<version>): description`

#### e. Push and create PR
```bash
git push -u origin <version>/<FEATURE_BRANCH>
```

Then create the PR:
```bash
gh pr create \
  --repo microsoft/react-native-macos \
  --base <target-branch> \
  --title "<transformed-title>" \
  --body "## Summary
Backport of the changes from branch \`<FEATURE_BRANCH>\` to \`<target-branch>\`.

## Test Plan
Same as the original PR."
```

### 4. Return to original branch

After processing all target branches:
```bash
git checkout <FEATURE_BRANCH>
```

Report a summary of what was done: which backport PRs were created, and any that were skipped or had issues.
