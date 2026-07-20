# Merge React Native Minor Release(s)

Prepare, recreate, validate, and document React Native minor-version merge and
stable-release branches without flattening history or mixing mainline and stable
DAGs.

## Arguments

Accept:

```text
<minor> [--mode fork-merge|stable-sync|stack|stack-recreate|focused-extraction] [--base <ref>] [--onto <ref>] [--dry-run]
<start>..<end> [--mode stack|stack-recreate] [--base <ref>] [--onto <ref>] [--dry-run]
```

Examples:

```text
0.84
0.84 --mode fork-merge
0.84 --mode stable-sync --base 0.84-merge --onto 0.84-stable
0.84..0.87 --mode stack
0.86 --mode stack-recreate --base <old-main-sha> --onto <new-main-sha>
0.87 --mode focused-extraction
```

- Normalize each minor to `0.<number>`.
- Default one minor to `fork-merge`; a range defaults to `stack`.
- Process ranges in ascending order.
- `--base` overrides the Microsoft predecessor ref.
- `--onto` overrides the Microsoft destination/base ref.
- `--dry-run` performs discovery, graph simulation, assertions, conflict
  counting, and reporting without creating refs, merging, rebasing, committing,
  pushing, or changing publication state.

## Conventions

### Non-negotiable DAG model

Maintain two separate histories:

```text
Microsoft mainline:
main -> 0.84-merge -> 0.85-merge -> 0.86-merge -> 0.87-merge
          \ exact upstream fork points only

Stable release lines:
0.84-merge (landed result) -> 0.84-stable -> pinned facebook/0.84-stable tip
0.85-merge (landed result) -> 0.85-stable -> pinned facebook/0.85-stable tip
```

- A mainline minor chains from the prior landed `*-merge` result, or `main` for
  the first requested minor.
- A stable line forks from the matching landed minor result.
- Never merge a `facebook/<minor>-stable` tip into `main`, another mainline
  merge branch, or a different minor.
- The `fork-merge` mechanical commit is an ordered two-parent Git merge:
  parent 1 is the exact Microsoft predecessor and parent 2 is the exact
  Facebook main/stable fork point.
- The `stable-sync` mechanical commit is also ordered: parent 1 is the exact
  matching Microsoft stable base and parent 2 is the pinned Facebook stable
  tip.
- Refuse to mutate `main`, any `*-stable` branch, or the main checkout. Every
  writer uses a dedicated feature worktree/session.

`*-merge`, release, and stacked branches are recreatable preparation baselines,
not immutable release truth. Human review edits can require rebasing or
recreation. Preserve backup refs, evidence, and old-to-new commit maps, then
rerun every semantic gate and obtain a fresh independent judgment. The upstream
fork-point or stable-tip SHA selected for one run remains immutable; a moved
upstream ref starts a new run.

### Git is authoritative

Resolve all refs to full object IDs before canonical commands:

```bash
BASE_SHA=$(git rev-parse --verify "<base>^{commit}")
TARGET_SHA=$(git rev-parse --verify "<target>^{commit}")
HEAD_SHA=$(git rev-parse --verify "HEAD^{commit}")
printf '%s\n' "$BASE_SHA" "$TARGET_SHA" "$HEAD_SHA"
```

Use full SHAs in state, assertions, merge/rebase commands, evidence, and PR
notes. Abbreviations are display-only. Record relevant repository-local config,
Git version, argument order and label text, and `LC_ALL`; conflict renderings and
derived hashes can change with `merge.conflictStyle`, `core.abbrev`, argument
labels/order, Git version, and locale. Compare canonical objects and trees, not
unstable display text.

### Roles and publication boundary

Use distinct real app sessions, all in autopilot, for:

1. **Planner:** discovers scope and writes the approved plan; never writes or
   publishes repository changes.
2. **Executor:** implements only the approved plan and returns commit/evidence;
   never pushes, creates/updates a PR or preview anchor, marks a PR ready, or
   merges.
3. **Judge:** independently judges the executor's actual execution and evidence,
   including a fresh diff-tag audit; never lands.
4. **Coordinator:** routes work, preserves durable evidence, requests explicit
   user approval, and is the sole role allowed to publish or land.

Delegated lanes do not prompt the user. They stop and return ambiguity or
failure to the coordinator. A PASS is not publication approval.

### State and resume contract

Persist state outside the repository:

```text
discovered
backed-up
merge-paused
adjudicating
merge-committed
ports-committed
validated
judged
publication-approved
fork-pushed
preview-anchored
pr-created-or-updated
ready-approved
complete
```

For `stable-sync`, use `stable-merge-paused` and record the pinned stable-tip
SHA. Before every action:

1. Read state and the current Git graph.
2. Reassert every completed state.
3. Resume at the first incomplete state.
4. Stop if persisted SHAs disagree with refs or unexplained files are present.
5. Never repeat a push, PR mutation, anchor mutation, or merge.

Only one writer may mutate a branch/worktree or run a heavy build at a time.
Each live cmux/tmux surface has a unique lane/session name, a transcript, and an
ownership marker. Never send keys to an inherited pane. Quarantine ambiguous
panes and confirm old processes have exited before handing off ownership.

Detect stale executors and races before accepting a handoff: compare the
executor's recorded branch, HEAD, base, target, worktree, and session identity to
live state. Reject results produced from a superseded baseline. Copy evidence to
coordinator-owned storage before archiving a dead or completed session; archive
only after no lane depends on its worktree, logs, or refs.

## Steps

### 1. Common preflight

1. Assert a clean worktree, expected feature branch, exact HEAD, and no other
   writer.
2. Fetch only needed refs:

   ```bash
   git fetch origin <expected-fork-branch>
   git fetch upstream main
   git fetch facebook main <minor>-stable
   ```

3. Resolve and record full SHAs for local HEAD, origin branch, `upstream/main`,
   `facebook/main`, `facebook/<minor>-stable`, merge bases, and any PR
   base/head. Record tree SHAs, ahead/behind counts, first-parent history, and a
   decorated graph.
4. Store snapshots outside the repository.
5. Enable rerere repository-locally only:

   ```bash
   git config --local rerere.enabled true
   git config --local rerere.autoupdate false
   ```

   Rerere output is a candidate, never authorization to stage.
6. Create a local backup ref. A remote backup is a publication action and needs
   explicit user approval through the coordinator. If a backup already exists,
   require the exact recorded SHA.
7. Refuse a rewrite unless the base actually moved, the old base is an ancestor
   of the new base, backup/evidence are durable, and the coordinator has the
   required approval. Prefer normal/additive pushes; never use plain `--force`.

### 2. Optional resolution engine: isolated Jujutsu v0.43

Jujutsu is optional. Use exactly an isolated, non-colocated jj v0.43 workspace;
never initialize jj in the canonical Git worktree or allow auto-snapshot to
mutate it. Git refs, commits, ordered merge parents, trees, and validation remain
authoritative.

1. Import the exact Git objects into a disposable non-colocated workspace.
2. Record jj Change IDs and their imported Git commit/tree IDs.
3. Resolve by Change ID in focused changes. Avoid whole-file restores and
   working-copy-wide resolution at semantic layer boundaries: either can absorb
   unrelated changes or collapse reversible layers.
4. Compare jj's conflict set with Git's index conflict set. The sets may differ;
   reconcile every path/hunk rather than assuming either representation is
   complete.
5. Set a temporary export bookmark at the reviewed Change ID, export it to the
   isolated workspace's Git store, and copy that exact full-SHA object to a
   temporary ref in the canonical Git repository:

   ```bash
   jj --repository "$JJ_WORKSPACE" bookmark set "export-<minor>" -r "<change-id>"
   jj --repository "$JJ_WORKSPACE" git export
   ```

6. Verify the copied Git object:

   ```bash
   EXPORTED_SHA=$(git rev-parse --verify "<temporary-export-ref>^{commit}")
   git fsck --no-dangling "$EXPORTED_SHA"
   git diff --exit-code "<expected-tree-sha>" "$EXPORTED_SHA^{tree}"
   git rev-parse "$EXPORTED_SHA^1" "$EXPORTED_SHA^2"
   ```

7. Move the preparation branch only after Git verifies the expected tree,
   parent order, conflict absence, and Change-ID-to-Git-object map. The optional
   engine's only accepted output is verified Git objects.

### 3. Mode: `fork-merge`

Compute the only valid upstream target:

```bash
FACEBOOK_MAIN_SHA=$(git rev-parse --verify "facebook/main^{commit}")
STABLE_TIP_SHA=$(git rev-parse --verify "facebook/<minor>-stable^{commit}")
TARGET_SHA=$(git merge-base "$FACEBOOK_MAIN_SHA" "$STABLE_TIP_SHA")
test -n "$TARGET_SHA"
git merge-base --is-ancestor "$TARGET_SHA" "$STABLE_TIP_SHA"
```

Assert that `TARGET_SHA` is the upstream main commit where the stable line
forked, is not the stable tip, and is divergent from the Microsoft predecessor
when a real merge is expected. Pin it in state.

Create `<minor>-merge` from `BASE_SHA` and run:

```bash
git merge --no-ff "$TARGET_SHA"
```

Resolve mechanically and minimally:

- adopt non-semantic upstream structure;
- preserve legitimate macOS behavior through narrow additive `[macOS]` clauses;
- do not select an entire semantic side when hunks have different provenance;
- avoid opportunistic cleanup;
- keep the merge focused on safe structural resolution;
- defer coherent cross-layer ports to named follow-up commits.

Commit only after every index conflict and serialized marker is gone. Verify the
mechanical commit has exactly two ordered parents:

```bash
MERGE_SHA=$(git rev-parse --verify "HEAD^{commit}")
test "$(git rev-list --parents -n 1 "$MERGE_SHA" | wc -w | tr -d ' ')" = 3
test "$(git rev-parse "$MERGE_SHA^1")" = "$BASE_SHA"
test "$(git rev-parse "$MERGE_SHA^2")" = "$TARGET_SHA"
```

The stable tip must not be an ancestor:

```bash
if git merge-base --is-ancestor "$STABLE_TIP_SHA" HEAD; then
  echo "stable tip leaked into mainline" >&2
  exit 1
fi
```

### 4. Mode: `stable-sync`

Require the matching landed minor result. Resolve and pin the stable tip:

```bash
MATCHING_BASE_SHA=$(git rev-parse --verify "<matching-landed-minor>^{commit}")
STABLE_TIP_SHA=$(git rev-parse --verify "facebook/<minor>-stable^{commit}")
git switch -c "<minor>/release" "$MATCHING_BASE_SHA"
git merge --no-ff "$STABLE_TIP_SHA"
```

If the remote stable branch moves, report the new full SHA and begin a new run;
never widen the current run.

Use Changesets, not the obsolete `yarn nx release plan` flow:

```bash
yarn change
yarn change:check
yarn changeset status --since="<matching-stable-base-sha>"
```

#### Prerelease lifecycle

- Verify `.changeset/config.json`, public and private package versions, ignored
  packages, exact `react-native` peer pins, and whether `.changeset/pre.json`
  exists before doing anything.
- For an RC line, enter prerelease mode explicitly with
  `yarn changeset pre enter rc` and record `pre.json`. The intended transition
  is `rc.0` plus prerelease mode plus a patch Changeset to `rc.1`; inspect
  `yarn changeset status` before materializing versions.
- Run `yarn changeset:version` at most once for the approved Changeset state.
  That script already runs `yarn changeset version`, post-bumps native artifacts,
  and updates the lockfile. Do not run raw `yarn changeset version` first or
  otherwise double-version.
- Compare all public/private package versions, changelogs, native artifact
  versions, and exact peer dependencies before and after materialization.
- Refuse an accidental final version, a duplicate bump, a broad peer range, or a
  missing/private package transition.
- Keep `pre.json` for subsequent RCs. Run `yarn changeset pre exit` only for an
  explicitly approved final release, inspect the planned final versions,
  materialize once, and verify `pre.json` removal. Never infer that RC
  completion authorizes a final.

Verify the stable merge's parent 1 is `MATCHING_BASE_SHA` and parent 2 is the
pinned `STABLE_TIP_SHA`.

### 5. Mode: `stack`

For `<start>..<end>`:

1. Discover and pin every exact Facebook fork point first.
2. Build each Microsoft `<minor>-merge` from the prior minor result.
3. Keep every Facebook stable tip out of cross-minor ancestry.
4. Do not start a later heavy writer until its predecessor has durable local
   refs and coordinator-owned evidence.
5. Treat any preview anchor as optional publication infrastructure, never as
   release truth.
6. After a predecessor changes or lands, recreate, retarget, revalidate, and
   rejudge each downstream branch.

### 6. Mode: `stack-recreate`

Use after human review edits, focused PR landings, or a moved Microsoft base:

```bash
OLD_BASE_SHA=$(git rev-parse --verify "<old-base>^{commit}")
NEW_BASE_SHA=$(git rev-parse --verify "<new-base>^{commit}")
git merge-base --is-ancestor "$OLD_BASE_SHA" "$NEW_BASE_SHA"
git rebase --rebase-merges --onto "$NEW_BASE_SHA" "$OLD_BASE_SHA" <minor>-merge
```

Inspect the generated todo before continuing. Git may try to replay
Facebook-side ancestry. The recreated mechanical root must still have the new
Microsoft base as parent 1 and the original pinned fork point as parent 2. If
necessary:

1. Save the audited resolved tree and abort the invalid replay.
2. Recreate the mechanical root:

   ```bash
   NEW_MERGE_SHA=$(printf '%s\n' "<message>" |
     git commit-tree "<audited-tree-sha>" \
       -p "$NEW_BASE_SHA" \
       -p "$TARGET_SHA")
   ```

3. Replay only focused follow-ups:

   ```bash
   git rebase --rebase-merges --empty=keep \
     --onto "$NEW_MERGE_SHA" "$OLD_MERGE_SHA" <minor>-merge
   ```

Keep intentionally empty follow-ups when their fix is now upstream. Preserve the
old-to-new map. Rerun conflict provenance, diff tags, generated artifacts,
determinism, builds, evidence, and independent judgment for this execution.

### 7. Mode: `focused-extraction`

Extract a coherent change when it can land independently and make the large
merge smaller or reviewable:

1. Identify the earliest valid Microsoft base, normally `main`.
2. Extract only the focused commit(s); do not copy the mechanical merge.
3. Preserve bilateral provenance, diff tags, tests, and a focused description.
4. Record the candidate branch/commit in merge state and evidence.
5. Do not push or open a PR; return the prepared local result to the coordinator.
6. After the focused change lands, recreate the merge so the conflict becomes
   upstreamed or mechanical. Never duplicate the change in both histories.

Good candidates include a new iOS/RN feature port, cross-layer API migration,
release/tooling fix, generator hardening, codegen path quoting, or a general
Hermes correction.

### 8. Conflict evidence gate

Count unique conflicted paths, index entries, and serialized conflict blocks
separately:

```bash
git ls-files -u | cut -f2 | LC_ALL=C sort -u > conflicted-paths.txt
git ls-files -u | wc -l
wc -l < conflicted-paths.txt
git diff --name-only --diff-filter=U | LC_ALL=C sort -u
git status --porcelain=v1
git grep -n -E '^(<<<<<<<|=======|>>>>>>>)( |$)' -- . || true
grep -c '^<<<<<<< ' "<canonical-serialized-conflict-file>"
```

- The unique `git ls-files -u` path count is authoritative for index conflicts;
  stage-entry count is not a path count.
- Count conflict hunks from one canonical serialized representation as the
  number of opening markers, and retain the serialized file/hash with its Git
  config, labels, command arguments, version, and locale.
- Raw conflict text/hashes are diagnostic only. Normalize paths, full SHAs,
  labels, line endings, and locale before comparing runs, and retain both raw
  and normalized hashes.
- Verify required terms are present and forbidden/stale terms are absent.
  Presence-only checks miss bad combined resolutions.
- Reconcile every discrepancy among index paths, diff-filter output, jj
  conflicts, rerere status, and serialized markers.

Before staging each conflict, record bilateral provenance **per hunk**:

- path and hunk identifier;
- upstream introducing full SHA, subject/PR, intent, and superseding commits;
- local macOS full SHA, subject/PR, intent, and current legitimacy;
- rerere candidate disposition;
- decision: upstream delta is authoritative because local is stale, preserve
  legitimate macOS behavior on upstream structure, combine independent valid
  changes, or stop;
- final basis and follow-up layer.

Use path/hunk-aware `git log -p`, `git blame`, and rename-following history. A
tag is not provenance. Never choose `ours`, `theirs`, or a whole semantic file
when different hunks require different decisions. For modify/delete conflicts,
find the upstream replacement owner and map the local requirement there; never
resurrect a deleted file without current evidence. Audit rerere against index
stages 1/2/3 and stage accepted paths individually.

### 9. Diff-tag gate

Read `docsite/docs/contributing/diffs-with-upstream.md`. Audit each semantic
layer against its selected Microsoft base, not only the final combined diff.

- Preserve inherited valid findings and their provenance across layers.
- Compute both the raw delta and a normalized NEW delta that removes moves,
  formatting, generated churn, and already-inherited tagged fork differences.
  Tag only genuinely new/retained fork behavior, not normalization noise.
- Use `// [macOS]` for a modified line, `[macOS` / `macOS]` around additions,
  and a file-level marker near the top of macOS-only files, including `.mts` and
  `.d.ts`.
- Audit multiline preprocessor expressions as one condition. Prefer the minimal
  additive condition, such as adding `|| TARGET_OS_OSX` to the existing iOS
  clause, rather than restructuring the entire branch.
- Apply documented shapes to iOS-only guards, mixed `iOS || macOS` conditions,
  `#else` branches, and block endings.
- Search NEW additions for `TARGET_OS_OSX`, `RCTPlatform*`, `RCTUIKit`, AppKit,
  `.macos.*`, and untagged macOS file patterns. Record justified exceptions.
- Remove a tag only when its fork difference genuinely disappeared or moved to
  a documented new owner.

Rerun the raw/normalized audit after the mechanical merge and after every
semantic, generated, Apple, Hermes, tooling, and CI layer. Executor and judge
each produce independent evidence; tag compliance is a publication blocker.

### 10. Determinism gates

#### Yarn

- Preserve the baseline lockfile and package-manager version. Do not enable
  global age-zero behavior or `YARN_ENABLE_HARDENED_MODE`, and do not perform a
  full lock regeneration to solve a targeted tuple.
- Respect Yarn's package-age gate. If a required artifact is too new, record the
  exact descriptor/resolution/checksum and wait or use the repository-approved
  targeted mechanism; never disable the gate globally.
- Reconstruct only affected descriptors from the same baseline and record tuple
  provenance: package, descriptor, locator, version, source/registry, checksum,
  dependents, and why it changed.
- Run targeted lock generation twice from identical clean baselines and require
  byte-identical `yarn.lock` hashes. Then run normal `yarn install --immutable`;
  the normal immutable run is authoritative.
- Reject opportunistic upgrades, unexpected tuple churn, or baseline drift.

#### Ruby, Bundler, and CocoaPods

- Keep `Gemfile` and `Gemfile.lock` consistent; use the locked Bundler, Ruby, and
  CocoaPods versions rather than a host default.
- Run pod generation from the same path shape and environment. Record podspec
  source paths, pod checksums, lockfile hashes, and generated-project deltas.
- Treat path-derived podspec content, changing checksums, absolute build paths,
  or an unlocked CocoaPods version as nondeterministic failures.
- Exercise the embedded
  `packages/react-native/scripts/hermes/prepare-hermes-for-build.js` path and the
  `prepare_command` in
  `packages/react-native/sdks/hermes-engine/hermes-engine.podspec`, not a
  hand-simulated substitute.

#### Public C++ API

- For release/stable generation, use the canonical Linux environment with
  Doxygen 1.16.1 and Python 3.12. Do not regenerate with host macOS tools.
- Run the generator twice from the same clean input and require byte-identical
  output. Compare against the expected public API snapshot and reject
  truncation, path leakage, ordering drift, or partial/corrupt output.
- Skip this generator in the `fork-merge` workflow when the canonical upstream
  workflow skips it; do not commit a host-generated replacement merely to make
  the snapshot quiet.
- Keep `private/cxx-public-api` checks separate from the canonical release
  Doxygen generator when both exist in the selected minor.

#### Hermes

- Verify the exact Hermes commit/version pins, host compiler, CMake version, and
  explicit `CMAKE_BUILD_TYPE`; never infer build type from a reused directory.
- Use the path-independent podspec at
  `packages/react-native/sdks/hermes-engine/hermes-engine.podspec`. Its
  source/prebuilt choice, embedded prepare command, and package mapping must work
  outside the repository's absolute path.
- Decide and record prebuilt versus source. Prebuilt validation checks archive
  hashes, all required platform binaries, public headers, inspector headers,
  module/header mappings, and podspec pins. Source validation checks the pinned
  commit, host `hermesc`, target frameworks, and packaging.
- Treat absent inspector/public headers as a packaging failure, not an optional
  omission. Do not paper over them with stale headers from another artifact.
- If source or exported headers change after an RC artifact was built or
  published, generate fresh matching prebuilts and rerun packaging before any
  publication. A prior green artifact is stale.

### 11. Reversible history and review workflow

Keep reviewable commits in order:

1. mechanical ordered two-parent merge;
2. focused macOS API/type ports;
3. generated API snapshots;
4. Apple source/platform ports;
5. Hermes/toolchain compatibility;
6. narrowly scoped corrections;
7. CI fixes tied to distinct root causes.

Do not amend or squash by default. Keep backups and evidence across recreation.
After human feedback, use `stack-recreate`, preserve coherent review layers,
rerun every downstream semantic gate, and obtain a fresh judge decision.

Normal/additive publication is preferred. A history rewrite is exceptional and
requires explicit approval plus an exact lease:

```bash
git push \
  --force-with-lease=refs/heads/<branch>:<expected-old-remote-full-sha> \
  origin <branch>
```

Never use plain `--force`; stop if the remote moved.

### 12. Validation and CI

Run focused checks first, then full gates in this order:

1. immutable Yarn install, Changesets checks, constraints, format, lint, Jest,
   and Flow as applicable;
2. build/generated types **before** legacy TypeScript:

   ```bash
   yarn build-types
   yarn test-generated-typescript
   yarn test-typescript
   ```

3. CocoaPods and SwiftPM manifests/generation;
4. public API and deterministic generators;
5. Hermes source/prebuilt/header packaging;
6. Apple platform builds and RNTester.

The generated-types command validates the output of `build-types`; do not omit
that generation step or reverse the generated and legacy
`packages/react-native/types` checks.

For Apple prebuilds, require the five release slices recorded for the target
release: iOS device, iOS simulator, macOS, visionOS device, and visionOS
simulator. Validate Mac Catalyst too when included by the selected release
configuration. Compose the XCFramework, verify every expected library and
architecture, and retain matching dSYMs. Run RNTester on the required iOS/macOS
architectures and old/new architecture matrix; do not substitute a packaging
success for product execution.

Use a visible TTY with teed logs for long commands. Only one heavy writer/build
may run on a host at once. Diagnose CPU, memory, disk, simulator, runner, and
timeout saturation before labeling red as product failure. Distinguish:

- **harness/infrastructure error:** no meaningful product step ran, runner or
  simulator failed, host overloaded, or logs prove setup failure;
- **product failure:** a relevant compile, test, package, or runtime step ran
  against the exact head and failed.

Record exact head and toolchain provenance for both. Hosted CI is a fallback
only after explicit user approval through the coordinator; never push merely to
obtain compute.

### 13. Evidence corpus and review body

Before session archival, copy executor and judge evidence to a
coordinator-owned artifact directory. Include:

- plan, prompts, state, refs, full-SHA graphs, Git config, and environment;
- raw and normalized conflict inventories/hashes;
- per-hunk bilateral provenance and decisions;
- per-layer raw/normalized diff-tag audits;
- old-to-new commit maps, deterministic two-run hashes, validation logs, and
  exact-head proof;
- package/lock/pod/Hermes/prebuilt provenance;
- final diff, status, commit bundle, and judge verdict.

Create a durable archive and Git bundle:

```bash
tar -C "<coordinator-artifact-parent>" -czf "<evidence>.tar.gz" "<evidence-dir>"
shasum -a 256 "<evidence>.tar.gz" > "<evidence>.tar.gz.sha256"
git bundle create "<evidence>.bundle" "<exact-local-branch>"
shasum -a 256 "<evidence>.bundle" > "<evidence>.bundle.sha256"
```

Verify archives can be listed and the bundle verifies before deleting any
session/worktree. Keep artifacts out of the repository.

Generate PR body text locally even when publication is not authorized. Preserve
both exact bytes and a normalized form. Normalize line endings to LF and define
whether the canonical body has exactly one trailing newline before hashing:

```bash
perl -pi -e 's/\r\n?/\n/g' "<body-file>"
printf '\n' >> "<body-file>"
perl -0pi -e 's/\n+\z/\n/' "<body-file>"
shasum -a 256 "<body-file>"
```

If a PR already exists, fetch the live body bytes, normalize with the same
procedure, and compare both byte/hash forms. Update SHAs, links, conflict totals,
test evidence, and body hashes after final gates and any recreation.

### 14. Focused mainline candidates

Record each candidate as already on main, extracted locally, pending, rejected,
or obsolete. Do not silently reimplement something already present:

- Changesets origin/base fallback;
- canonical C++ generator hardening;
- codegen path quoting;
- general Hermes resolution, podspec, or packaging fixes;
- `test-all`/CI build-types-before-legacy-TypeScript ordering;
- removal of obsolete `yarn nx release plan` documentation.

Keep candidates out of the merge resolution unless required for coherent
behavior. Use `focused-extraction` when independent review is better.

### 15. Publication controls

Never push any ref, create or update a PR, create/delete a preview anchor, mark a
PR ready, or merge without explicit user approval obtained by the coordinator
for that exact action, destination, and SHA. Executor and judge do no
publication. Coordinator is the sole landing role.

After approval, the coordinator still rechecks the exact judged SHA, remote
state, evidence hashes, and downstream dependencies. A changed SHA invalidates
the judgment and requires recreation/revalidation/rejudgment. Preview anchors
must be new additive refs, must never rewrite unrelated refs, and require
separate approval to delete.

### 16. Final graph and completion gates

For `fork-merge`, assert with full SHAs:

```bash
test "$(git rev-parse "$MERGE_SHA^1")" = "$BASE_SHA"
test "$(git rev-parse "$MERGE_SHA^2")" = "$TARGET_SHA"
test "$(git merge-base "$BASE_SHA" HEAD)" = "$BASE_SHA"
git rev-list --left-right --count "$BASE_SHA...HEAD"
```

Require:

- exactly one intended mechanical merge on first-parent history;
- exact ordered parents and no stable-tip ancestry;
- expected merge base and ahead/behind topology;
- clean index/worktree and no serialized conflict markers;
- reconciled conflict metrics and bilateral per-hunk decisions;
- every semantic layer's raw/normalized diff-tag audit;
- deterministic dependency, generator, pod, and Hermes results;
- required type, Apple slice, XCFramework/dSYM, and RNTester gates;
- fresh matching prebuilts after any post-RC source/header change;
- durable coordinator evidence, archive/hash/bundle verification;
- fresh independent judge PASS for the exact current SHA.

For `stable-sync`, also require the pinned stable tip as parent 2, correct
Changesets prerelease/final state, exact peer pins, and proof that no later stable
commit drifted into the run.

Stop rather than guess when:

- graph, parent, target, ref, or state assertions fail;
- conventions or provenance are ambiguous;
- conflict sets or metrics do not reconcile;
- a local behavior has no owner after upstream deletion;
- diff-tag, determinism, packaging, build, or product validation fails;
- a harness failure cannot be separated from product red;
- source/header changes lack fresh matching prebuilts;
- another lane moved the branch, remote, PR, or evidence baseline;
- credentials would need weakening;
- publication approval is absent or does not match the exact action/SHA.

Report final refs and parents, topology, conflict/decision totals, old-to-new
maps, validation logs, artifact hashes, judge state, and all blockers to the
coordinator. Stop before publication.
