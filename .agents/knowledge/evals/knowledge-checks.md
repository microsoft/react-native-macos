---
id: evals.knowledge-checks
summary: Catalog of the KC checks that knowledge.mts runs on agent knowledge files, with severity and how to fix each failure.
kind: eval
status: active
load_when: A knowledge check fails, or you are changing knowledge.mts or its checks
sources:
  - .agents/knowledge/tools/knowledge.mts#runChecks
  - .agents/knowledge/taxonomy.yaml#checks
  - .github/workflows/microsoft-pr.yml#javascript-tests
verified: 2026-10-28
rules: [fix-not-suppress]
related: [tooling.format-lint]
---

<!-- @format -->

# Knowledge checks

Use when: `knowledge.mts check` reports a failure, or you change a check. Not for: writing conventions; see the organize skill's [conventions](../../../.claude/skills/rnmacos-organize-knowledge/references/conventions.md).

## Rules

- **evals.knowledge-checks.fix-not-suppress:** Fix the content that fails a check. Change a check's severity in `taxonomy.yaml` only with maintainer approval, and record why in the PR.

## Catalog

Checks are errors unless `checks` in [taxonomy.yaml](../taxonomy.yaml) lowers them. CI runs `check --ci` on tracked files only.

| Check  | What it enforces                                                                                                                              | Typical fix                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| KC-01  | Frontmatter on line 1, required topic keys, no `title`, pragma placement, exactly one H1, a `Use when:` line                                  | Match the topic template                                            |
| KC-02  | Topic and rule IDs are well formed, registered, unique, and not retired; `requires` and `related` resolve                                     | Rename, register the domain, or add a redirect                      |
| KC-03  | Index tables and path pointers match a fresh generation                                                                                       | `knowledge.mts index --write`                                       |
| KC-04  | Relative links and heading anchors resolve                                                                                                    | Fix the path or heading                                             |
| KC-05  | Cited sources and backticked repository paths exist (warning)                                                                                 | Update the citation                                                 |
| KC-06  | `yarn <name>` in code is a root script, root binary, or Yarn built-in, and doesn't pass arguments to a script that shadows a binary (warning) | Use a real command, `yarn exec <binary>`, or add it to `yarn_allow` |
| KC-07  | Size budgets; 80% warns                                                                                                                       | Split, or move detail to a reference                                |
| KC-08  | Skill name, prefix, description, frontmatter allowlist, reference depth, and listing in `AGENTS.md`                                           | Follow the skill template                                           |
| KC-09  | Copilot pointer links only to `AGENTS.md`; path pointers have valid `applyTo` globs                                                           | Regenerate pointers                                                 |
| KC-10  | No `@path` imports                                                                                                                            | Use a Markdown link                                                 |
| KC-11a | No exact duplicate bullets across knowledge files                                                                                             | Keep one copy and link to it                                        |
| KC-11b | Near-duplicate text (advisory, `report --similar`)                                                                                            | Merge or link                                                       |
| KC-12  | `AGENTS.md` keeps upstream's first line and one fork block; no fork content in upstream-owned files                                           | Move content into the block or a topic                              |
| KC-13  | `AGENTS.md` links the index; routes target active topics                                                                                      | Fix the route or link                                               |
| KC-14  | Topic `asserts` hold against the repository (warning)                                                                                         | Re-verify the topic                                                 |
| KC-15  | Freshness: verification age and source changes (advisory, `report --stale`)                                                                   | Re-verify and bump `verified`                                       |

## Verify

```sh
node .agents/knowledge/tools/knowledge.mts check
node --test .agents/knowledge/tools/knowledge.test.mts
```
