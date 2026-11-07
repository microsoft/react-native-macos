<!-- @format -->

# Entry points

Load this when you change `AGENTS.md`, `.github/copilot-instructions.md`, path routes, or which hosts the system supports.

## Which host reads what

Last verified 2026-10-29.

| Host                            | Always loads                                                                                                                               | Discovers skills in                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Copilot CLI                     | `AGENTS.md`, `.github/copilot-instructions.md`, matching `.github/instructions/**/*.instructions.md`, `CLAUDE.md`, `.claude/rules/**/*.md` | `.github/skills`, `.claude/skills`, `.agents/skills` |
| Copilot cloud agent and VS Code | `AGENTS.md`, `.github/copilot-instructions.md`, matching `*.instructions.md`                                                               | `.github/skills`, `.claude/skills`, `.agents/skills` |
| Claude Code 2.1.277 or later    | `AGENTS.md`                                                                                                                                | `.claude/skills`, following per-skill symlinks       |
| Codex                           | `AGENTS.md`                                                                                                                                | `.agents/skills`, following symlinks                 |

Copilot CLI lists its sources under `/instructions` and `/env`. A local `CLAUDE.local.md`, or a Claude Code version older than 2.1.277, can keep Claude from loading `AGENTS.md`.

## Skill folders

- Skills live in `.agents/skills`, the only folder that Copilot and Codex both read. Each `.claude/skills/<name>` entry is a relative symlink to it, for Claude Code.
- Copilot CLI 1.0.105 finds a linked skill through both folders but lists it once, at its `.agents/skills` path (`copilot skill list --json`). Claude Code also loads it once.
- On Windows, a checkout without `core.symlinks` turns each link into a text file, so Claude Code there doesn't see the skill. Copilot and Codex are unaffected.

## AGENTS.md

- It is the only always-loaded instruction file. Upstream ships its own `AGENTS.md`, so the fork's copy keeps upstream's `# React Native` first line and puts all fork content in one `<!-- [macOS -->` … `<!-- macOS] -->` block.
- The block holds the fork rules (I1 to I7, their only home), fork-only locations, a load-on-demand table, and the skills table. Procedures, command lists, and domain detail go in topics.
- Fix upstream text that is wrong for the fork in place, and tag the line with `<!-- [macOS] -->`.
- Budgets: the block at most 60 lines and 4 KB, and the whole file at most 150 lines and 12 KB.
- No Prettier pragma and no `@path` imports.

## Pointers

- `.github/copilot-instructions.md` contains a pragma, an H1, and one sentence that links to `../AGENTS.md`. Copilot loads both files, so anything more would be duplicated.
- Path pointers in `.github/instructions/rnmacos-*.instructions.md` are generated from `routes` in `taxonomy.yaml`. Never edit them by hand.

## Files the fork doesn't add

| File               | Why not                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`        | Claude Code 2.1.277 reads `AGENTS.md` directly. Upstream's 0.88 branch adds a one-line `@AGENTS.md`; delete it at that merge. |
| `.claude/rules/`   | Would duplicate path pointers. Deferred until a spike shows Copilot doesn't load both.                                        |
| Nested `AGENTS.md` | Some hosts prefer the nearest file and would skip the root rules.                                                             |

## Legacy files

`.ai/commands/backport.md` and `.claude/commands/backport.md` predate this system. Migrating them into an `rnmacos-backport` skill is pending; until then, leave them as they are.

## The 0.88 merge

1. Start from upstream's `AGENTS.md`.
2. Insert the fork block after upstream's introduction.
3. Delete the Essentials section.
4. Correct upstream lines that are wrong for the fork, such as Yarn v1, with tagged in-place edits.
5. Delete `CLAUDE.md`.
6. Run `node .agents/knowledge/tools/knowledge.mts check`, then remove anything in `tooling.commands` that upstream's commands now cover.
