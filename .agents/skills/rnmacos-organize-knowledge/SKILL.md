---
name: rnmacos-organize-knowledge
description: Record, update, move, or retire react-native-macos agent knowledge in AGENTS.md, .agents/knowledge topics, rnmacos-* skills, and path pointers. Use to save a durable learning, fix stale or conflicting guidance, add or migrate a skill, change the taxonomy, or audit context cost. Defaults to a read-only preview. Not for product code or docsite pages.
license: MIT
---

<!-- @format -->

# Organize react-native-macos knowledge

## Contract

- Start with a read-only preview. Apply changes only when the user asks you to; running non-interactively is not permission.
- Don't commit, push, install packages, or change anything remote unless the user asks.
- Keep one home per fact. Link to it; never copy it.

## Choose a mode

| Mode         | Use when                                                                                  | Load                                                                           |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Record       | Saving a new fact, rule, or pitfall                                                       | [placement](references/placement.md), [conventions](references/conventions.md) |
| Refactor     | Fixing stale or conflicting guidance, or adding, splitting, renaming, or retiring a topic | [taxonomy](references/taxonomy.md), [conventions](references/conventions.md)   |
| Skill        | Creating, changing, or migrating a skill                                                  | [skills](references/skills.md)                                                 |
| Entry points | Changing `AGENTS.md`, the Copilot pointer, or path routes                                 | [entrypoints](references/entrypoints.md)                                       |
| Audit        | Checking freshness, budgets, and duplication                                              | [audit](references/audit.md)                                                   |

Every mode ends with [validation](references/validation.md).

## Procedure

1. Orient: read the [knowledge index](../../../.agents/knowledge/index.md). Open a topic only when its "Load when" matches the task.
2. Find the current home: `node .agents/knowledge/tools/knowledge.mts find <terms>`. Update the existing owner, or link to code or the docsite, before you create anything.
3. Verify each claim against code, CI configuration, or an official source. Mark claims you couldn't verify "(inferred)", and give a new topic with unverified claims `status: draft`.
4. Preview: run `node .agents/knowledge/tools/knowledge.mts preview`, then show the planned edits, ID changes, redirects, index changes, and budget changes. Stop here unless the user asked you to apply.
5. Apply: edit the files, set `verified` to today's date on topics you checked, and run `node .agents/knowledge/tools/knowledge.mts index --write`.
6. Validate: follow [validation](references/validation.md) until every check passes.
7. Report: the IDs you changed, your evidence, each command with its result, any conflicts you couldn't resolve, and any context-cost problem you noticed.

## Guardrails

- Edit only fork-owned paths. In `AGENTS.md`, edit only inside the `[macOS` block.
- Don't add `@path` imports, and don't add a Prettier pragma to `AGENTS.md`.
- Stay within the budgets in [taxonomy.yaml](../../../.agents/knowledge/taxonomy.yaml).
- This repository is public. Never record secrets, internal links, or customer data.
