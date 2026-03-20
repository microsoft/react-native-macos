---
sidebar_label: 'Backporting'
sidebar_position: 4
---

# Backporting

React Native macOS maintains multiple active release branches (e.g., `0.81-stable`, `0.82-stable`). When a fix or improvement lands on `main`, it often needs to be cherry-picked to one or more stable branches. This guide explains how to do that.

## Conventions

### Branch naming

Backport branches follow the pattern `<version>/<original-branch-name>`:

| Original branch | Target | Backport branch |
|---|---|---|
| `fix-text-input` | `0.81-stable` | `0.81/fix-text-input` |
| `fix-text-input` | `0.82-stable` | `0.82/fix-text-input` |

### PR title

Backport PR titles include the version number in the conventional commit scope:

| Original title | Backport title |
|---|---|
| `fix(textinput): handle focus correctly` | `fix(0.81, textinput): handle focus correctly` |
| `fix: handle focus correctly` | `fix(0.81): handle focus correctly` |

## Methods

### Method 1: AI-assisted (Claude Code / Copilot)

The repo includes a shared backport command at `.ai/commands/backport.md` that any AI coding assistant can follow.

**In Claude Code**, run:

```
/backport 0.81-stable
```

Or for multiple branches at once:

```
/backport 0.81-stable 0.82-stable
```

The assistant will:
1. Identify the commits on your current branch
2. Create backport branches for each target
3. Cherry-pick the commits (and help resolve conflicts interactively)
4. Transform the PR title
5. Push and create PRs

### Method 2: GitHub comment

On any PR (open or merged), comment:

```
/backport 0.81-stable
```

Or for multiple branches:

```
/backport 0.81-stable 0.82-stable
```

A GitHub Actions workflow will automatically:
1. Cherry-pick the PR's commits onto a new backport branch
2. Create a PR targeting the stable branch with the correct title format
3. React with a thumbs-up on your comment to confirm

**Auto-updating:** If you use `/backport` on an **open** PR, the backport PR will automatically update whenever you push new commits to the source PR. This is useful when you want to keep the backport in sync during code review.

**Conflict handling:** If cherry-picking fails due to conflicts, the workflow will comment on the original PR with instructions for manual backporting.

### Method 3: Manual

If you prefer to backport by hand:

```bash
# 1. Make sure you're on your feature branch
git checkout my-feature-branch

# 2. Note the commits to cherry-pick
git log --oneline $(git merge-base main HEAD)..HEAD

# 3. Fetch the latest stable branch
git fetch upstream 0.81-stable

# 4. Create the backport branch
git checkout -b 0.81/my-feature-branch upstream/0.81-stable

# 5. Cherry-pick your commits
git cherry-pick <commit-sha-1> <commit-sha-2> ...

# 6. Push and create a PR
git push -u origin 0.81/my-feature-branch
gh pr create \
  --repo microsoft/react-native-macos \
  --base 0.81-stable \
  --title "fix(0.81, scope): description"
```

## Handling conflicts

Cherry-pick conflicts are common when backporting, especially for older release branches. When they occur:

1. **Inspect the conflicts:** `git diff --name-only --diff-filter=U`
2. **Resolve each file** manually or with AI assistance
3. **Stage and continue:** `git add . && git cherry-pick --continue`

If conflicts are too complex, consider whether the change needs to be adapted for the older branch rather than cherry-picked directly.

## Multi-branch backports

You can backport to multiple branches in a single command. Each backport is independent — if one fails due to conflicts, the others still proceed. Both the AI command and the GitHub comment support space-separated branch names:

```
/backport 0.81-stable 0.82-stable
```
