# Merge React Native Minor Release(s)

Recreate, validate, publish, and document React Native minor-version merge branches without flattening history or mixing mainline and stable-release DAGs.

## Arguments

Accept:

```text
<minor> [--mode fork-merge|stable-sync|stack] [--base <ref>] [--onto <ref>] [--dry-run]
<start>..<end> [--mode stack] [--base <ref>] [--onto <ref>] [--dry-run]
```

Examples:

```text
0.84
0.84 --mode fork-merge
0.84 --mode stable-sync --base 0.84-merge --onto 0.84-stable
0.84..0.86 --mode stack
```

- Normalize each minor to `0.<number>`.
- Default mode for one minor is `fork-merge`.
- A range implies `stack`; process minors in ascending order.
- `--base` overrides the Microsoft predecessor ref.
- `--onto` overrides the Microsoft destination/base ref.
- `--dry-run` performs discovery, graph simulation, assertions, conflict counting, and reporting without creating refs, merging, rebasing, committing, or pushing.

## Non-negotiable DAG model

Maintain two separate histories:

```text
Microsoft mainline:
main -> 0.84-merge -> 0.85-merge -> 0.86-merge
         \ exact upstream fork points only

Stable release lines:
0.84-merge (landed result) -> 0.84-stable -> pinned facebook/0.84-stable tip
0.85-merge (landed result) -> 0.85-stable -> pinned facebook/0.85-stable tip
```

- A mainline minor merge chains from the prior landed `*-merge` result (or `main` for the first requested minor).
- A stable release branch forks from the matching landed minor result.
- **Never merge a `facebook/<minor>-stable` tip into `main`, another mainline merge branch, or a different minor.**
- A stable tip contains release-only commits and must stay isolated on its matching stable line.
- Refuse to mutate the currently checked-out branch if it is `main` or matches `*-stable`.
- Use a dedicated feature/worktree session for every writer. Never operate directly in the main checkout.

## State machine and resume contract

Persist an out-of-repository state record for each minor:

```text
discovered
backed-up
merge-paused
adjudicating
merge-committed
ports-committed
validated
fork-pushed
preview-anchored
pr-created-or-updated
complete
```

For `stable-sync`, replace `merge-paused` with `stable-merge-paused` and record the pinned stable-tip SHA.

Before every action:

1. Read the state record and current Git graph.
2. Re-run the assertions for all prior states.
3. Resume at the first incomplete state.
4. Do not repeat a completed push, create a duplicate PR, move a pinned tip, or recreate an identical commit.
5. Stop if persisted SHAs disagree with refs or if the worktree contains unexplained changes.

Only one heavy writer may mutate a given branch/worktree at a time. Parallel lanes may perform read-only provenance research, conflict classification, CI/log diagnosis, or review.

Use real visible project sessions for delegated work. Delegated lanes must receive complete instructions, must not ask the user to approve plans or resolutions, and must return blockers to the coordinating session. The coordinator owns user-facing decisions.

## Common preflight

1. Assert a clean worktree and exact expected branch/HEAD.
2. Fetch, without broad ref mutation:

   ```bash
   git fetch origin <expected-fork-branch>
   git fetch upstream main
   git fetch facebook main <minor>-stable
   ```

3. Record:
   - local HEAD and tree SHA;
   - origin branch SHA;
   - `upstream/main`;
   - `facebook/main`;
   - `facebook/<minor>-stable`;
   - merge bases and ahead/behind counts;
   - current PR title/body/base/head;
   - full first-parent and decorated graph.
4. Store all snapshots outside the repository.
5. Enable rerere repository-locally only:

   ```bash
   git config --local rerere.enabled true
   git config --local rerere.autoupdate false
   ```

   Rerere output is a candidate, never authorization to stage.
6. Create a local backup ref and push the same new backup ref to `origin` with a normal push. If either exists, require byte-identical SHA.
7. Refuse any rewrite unless:
   - the new base actually moved;
   - the expected old base is an ancestor of the new base;
   - the user explicitly authorized the required rebase/lease push;
   - the expected remote old SHA is recorded for an exact lease.

## Mode: `fork-merge`

### Compute the only valid upstream target

```bash
TARGET=$(git merge-base facebook/main facebook/<minor>-stable)
```

Assert:

- `TARGET` is non-empty;
- `TARGET` is an ancestor of `facebook/<minor>-stable`;
- `TARGET` is the upstream main commit where the stable line forked;
- `TARGET` is not silently replaced by the stable tip;
- predecessor and target are divergent when a real merge is expected.

Record the target SHA in state. Never allow it to drift after discovery.

### Create the mechanical merge

1. Create/switch to `<minor>-merge` from the selected Microsoft predecessor.
2. Run:

   ```bash
   git merge --no-ff "$TARGET"
   ```

3. The mechanical merge must be a real two-parent merge.
4. While conflicts remain, do not commit partial semantic ports or hide conflict markers.
5. Resolve the merge mechanically and minimally:
   - adopt non-semantic upstream structure;
   - preserve established macOS behavior through narrow additive `[macOS]` clauses;
   - avoid opportunistic cleanup and refactoring;
   - resolve safe structural changes in the merge;
   - defer hairy cross-layer ports to named follow-up commits.
6. Commit the mechanical merge only after every index conflict is resolved and marker scans are clean.

### Recreate after the Microsoft base moves

Preserve merge commits and ahead/behind topology:

```bash
git rebase --rebase-merges --onto <new-base> <old-base> <minor>-merge
```

Before continuing a recreated merge, inspect the generated rebase todo. Git may try to replay the Facebook-side ancestry. The final mechanical merge must still use the original exact fork point as parent 2. If necessary:

1. Save the audited resolved tree.
2. Abort the invalid replay.
3. Recreate the mechanical root with the saved tree and exact parents:

   ```bash
   git commit-tree <tree> -p <new-base> -p "$TARGET"
   ```

4. Replay only the focused follow-ups with:

   ```bash
   git rebase --rebase-merges --empty=keep --onto <new-merge> <old-merge> <minor>-merge
   ```

Keep empty follow-up commits when their fix is already upstream; this preserves the reversible review layers and old-to-new commit map.

## Mode: `stable-sync`

1. Require a matching landed minor result as the branch point.
2. Resolve and record the exact current stable tip:

   ```bash
   git fetch facebook <minor>-stable
   STABLE_TIP=$(git rev-parse facebook/<minor>-stable)
   ```

3. Create the release branch from the matching Microsoft minor result, never from the Facebook stable branch:

   ```bash
   git switch -c <minor>/release <matching-landed-minor>
   git merge --no-ff "$STABLE_TIP"
   ```

4. The recorded tip is immutable for this run. If `facebook/<minor>-stable` moves, report the new SHA and require an explicit new run; never silently widen the release.
5. Follow `docsite/docs/releases/patch-release.md`:

   ```bash
   yarn nx release plan \
     --message "Sync to upstream React Native <minor>.x release" \
     --only-touched=false \
     patch
   ```

6. Update the `react-native` peer dependency in `packages/react-native`.
7. Verify package versions, changelog/release-plan output, manifests, Yarn lock, CocoaPods lock, and generated projects.
8. Run immutable install, CocoaPods install, focused tests, package/type checks, and Apple build matrices appropriate to the release.
9. Stable-sync PRs target the newly cut matching stable branch after the minor merge lands.

## Mode: `stack`

For `<start>..<end>`:

1. Discover every exact Facebook fork point first.
2. Build each Microsoft `<minor>-merge` from the prior minor result.
3. Do not start a later heavy writer until the predecessor has a durable fork branch and preview anchor.
4. Before a predecessor lands, later PRs may use Microsoft preview anchors as bases.
5. After the predecessor lands, retarget the next PR to `main` or the newly cut matching stable branch.
6. Never use a Facebook stable tip as a cross-minor stack base.

## Microsoft preview anchors

Large cross-fork PR stacks cannot reliably use a contributor-fork branch as the base. Use temporary Microsoft preview anchors only for stack infrastructure:

1. Validate the complete branch locally and on `origin`.
2. Warn explicitly before any push to `upstream`:
   - name the exact destination ref and SHA;
   - state that it is temporary stack infrastructure;
   - confirm no existing upstream ref will be rewritten.
3. Push a new ref normally:

   ```bash
   git push upstream <exact-head>:refs/heads/<minor>-merge
   ```

4. Assert local, origin, and upstream anchor SHAs are identical.
5. Do not create or delete any other upstream branch.
6. Retarget dependent PRs after the predecessor lands.
7. Delete preview anchors only after dependent PRs no longer use them and with explicit authorization.
8. If workflow files are included and HTTPS credentials reject the push, use the repository's workflow-scoped GitHub keyring credentials; do not weaken scopes or expose tokens.

## Conflict evidence gate

### Authoritative conflict count

Count unique index paths, not index stages:

```bash
git ls-files -u | cut -f2 | sort -u
```

Cross-check:

```bash
git diff --name-only --diff-filter=U | sort -u
git status --porcelain=v1
```

Reconcile discrepancies. The unique `git ls-files -u` path count is authoritative.

### Bilateral provenance per path and hunk

Before staging each conflict, record:

- path and hunk;
- upstream introducing SHA, subject/PR, intent, and later superseding commits;
- local macOS SHA, subject/PR, intent, and present legitimacy;
- rerere candidate disposition: accepted, revised, or rejected;
- decision:
  1. upstream wins because the local delta is stale;
  2. preserve legitimate macOS behavior on upstream structure;
  3. combine independent valid changes;
  4. blocker requiring escalation;
- final basis, rationale, and follow-up layer.

Use path/hunk-aware `git log -p`, `git blame`, and rename-following history. A `[macOS]` comment alone is not provenance.

For modify/delete conflicts:

- identify the upstream removal/rename/replacement commit;
- identify the local requirement;
- map the local behavior to its new owner;
- never resurrect a deleted path without current evidence.

If multiple hunks differ in provenance or decision, record them separately.

### Rerere audit

For every rerere-modified path:

1. Compare the candidate to index stages 1/2/3 and the old resolved tree.
2. Check the new Microsoft-base delta.
3. Confirm the adjudicated per-hunk decision still holds.
4. Scan for conflict markers.
5. Stage the path individually only after acceptance.

Never bulk `git add` rerere output.

### Reviewer appendix

Classify every conflicted path exactly once into meaningful subsystems. Include:

- exact path count and hunk count;
- decision totals;
- complete path inventory in collapsible sections;
- Objective-C, Objective-C++, Swift, renderer C++, and macOS behavior summaries;
- upstream deletions/renames and their destinations;
- SwiftPM/CocoaPods ownership;
- Hermes and tooling decisions;
- post-merge corrective commits.

Omit trivial package/lock/config paths from detailed decision prose, but include every path in the exact inventory. Assert section totals equal the authoritative unique-path count.

## Reversible history layers

Keep reviewable commits in this order:

1. mechanical two-parent fork-point merge;
2. focused macOS API/type ports;
3. generated API snapshots;
4. Apple source/platform ports;
5. Hermes/toolchain compatibility;
6. narrowly scoped corrective commits;
7. CI fixes tied to distinct root causes.

Do not amend or squash by default. Do not mix opportunistic cleanup into merge resolution. Every commit must build on the prior layer and include the repository's required co-author trailer.

## CI diagnosis and remediation

Maintain an out-of-repository ledger:

```text
job -> root cause -> provenance -> code fix/test or justified non-action
```

Run fast focused checks first, then full gates:

- immutable Yarn install and constraints;
- Jest, Flow, lint, and format;
- package/type generation;
- CocoaPods and SwiftPM manifest checks;
- RNTester iOS/macOS/visionOS, old/new architecture;
- prebuild device/simulator slices;
- Hermes compiler, platform slices, and XCFramework assembly;
- CodeQL and PR-specific alert comparison.

Use a persistent watchable cmux/tmux pane with teed logs for long commands.

Treat a dynamic-framework canary as infrastructure-only only when evidence shows no runner assignment and zero executed steps. If any build step ran, diagnose it as a possible code regression.

Fix genuine merge regressions in new narrowly named commits. Never suppress CodeQL or ignore failed Apple matrices without evidence.

## Push policy

- Normal pushes are the default.
- Never use plain `--force`.
- After an authorized required rebase, use only the recorded exact lease:

  ```bash
  git push \
    --force-with-lease=refs/heads/<branch>:<expected-old-remote-sha> \
    origin <branch>
  ```

- Stop if the remote moved from the expected SHA.
- Push the contributor fork before creating/updating a Microsoft preview anchor.

## Pull request patterns

### Minor merge

Title:

```text
feat: merge `<minor>-merge` into main
```

Body:

```text
## Summary

Merge the exact fork point of facebook/<minor>-stable into the Microsoft mainline.
State explicitly that the stable tip itself is not merged.
Summarize macOS ports and reversible history layers.

## Conflict resolution appendix

Include exact counts, decision summaries, reviewer guide, and complete inventory.

## Test Plan

List the final local and CI gates.
Document infrastructure-only canaries separately.
```

### Stable sync

Title:

```text
chore(<minor>): sync upstream stable release
```

Target the matching Microsoft stable branch and state the pinned Facebook stable-tip SHA.

Update commit links and SHAs after any required history recreation. Preserve valid reviewer prose and the appendix unless the conflict set changed; if it changed, recompute totals and inventory.

## Final graph and completion gates

For `fork-merge`, require:

```bash
MERGE=<recreated-mechanical-merge>
git rev-parse "$MERGE^1"  # exact selected Microsoft base
git rev-parse "$MERGE^2"  # exact Facebook fork point
git merge-base <Microsoft-base> HEAD
git rev-list --left-right --count <Microsoft-base>...HEAD
```

Assert:

- exactly one intended mechanical merge on first-parent history;
- parent 1 equals the selected Microsoft predecessor exactly;
- parent 2 equals the computed Facebook fork point exactly;
- the Facebook stable tip is not an ancestor of the mainline branch;
- merge-base equals the selected Microsoft base;
- expected ahead/behind topology is preserved;
- no unmerged paths or conflict markers;
- clean status;
- local/origin/preview-anchor SHAs match where applicable;
- old-to-new commit mapping is recorded;
- all required tests and CI gates pass;
- PR title, body, base, and head are correct.

For `stable-sync`, verify the release branch's merge parent is the pinned stable tip and that no later stable commits drifted into the run.

Stop rather than guess when:

- graph, parent, or target assertions fail;
- refs move unexpectedly;
- provenance cannot justify a semantic resolution;
- a local behavior has no clear owner after upstream deletion;
- rerere differs from the adjudicated decision;
- validation reveals an unresolved cross-layer port;
- credentials would require weakening security;
- the current branch is `main` or `*-stable`.

Report final refs, parent SHAs, ahead/behind, conflict totals, decision totals, old-to-new commit map, validation logs, PR URL/state, preview-anchor proof, and any deferred blockers.
