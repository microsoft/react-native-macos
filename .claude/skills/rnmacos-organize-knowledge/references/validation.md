<!-- @format -->

# Validation

Load this before you report any knowledge change. Run every command from the repository root.

## Commands

```sh
node .agents/knowledge/tools/knowledge.mts index --write
node .agents/knowledge/tools/knowledge.mts check
node --test .agents/knowledge/tools/knowledge.test.mts
yarn markdownlint-cli2 --no-globs AGENTS.md ".agents/knowledge/**/*.md" ".claude/skills/rnmacos-*/**/*.md" .github/copilot-instructions.md
yarn exec prettier --check path/to/changed/files
```

- Run `index --write` a second time and confirm it reports no changes.
- Pass Prettier only the files that have a pragma: topics, skill files, the Copilot pointer, `taxonomy.yaml`, and the `.mts` tools. `AGENTS.md` and `index.md` have none.
- Run `node --test` only when you changed `knowledge.mts` or its tests.
- CI runs `check --ci`, which ignores untracked files. Stage new files and run it before you push.

## Telling new failures from old ones

Run `check` on a clean checkout of the base branch, or use `git stash`. A failure that also appears there is pre-existing: report it, but don't fix unrelated content in the same change.

## Report

Include:

- each command you ran with its result, such as "passed" or "1 error: KC-04 …"
- the topic and rule IDs you added, changed, redirected, or retired
- warnings you left in place, and why
- the checks you didn't run
