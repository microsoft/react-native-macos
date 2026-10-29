<!-- @format -->

# Skills

Load this when you create, change, or migrate a skill.

## Location and names

- Skills live in `.claude/skills/<name>/SKILL.md`. Copilot CLI, the Copilot cloud agent, VS Code, and Claude Code all discover that folder.
- Names follow `rnmacos-<verb>-<object>`, in lowercase kebab-case, at most 64 characters. The folder name must equal `name`. The prefix keeps fork skills from colliding with skills upstream React Native adds.
- Every skill is listed in the `AGENTS.md` skills table with a link to its `SKILL.md`. Hosts without skill discovery use that table.

## Frontmatter

- Allowed keys are listed under `skills.frontmatter` in [taxonomy.yaml](../../../../.agents/knowledge/taxonomy.yaml). Anything else is an error.
- Put trigger words first in `description`, say when not to use the skill, and keep it under 400 characters. Never use angle brackets in it.
- Never pre-approve shell access in `allowed-tools`.
- A skill with side effects says it acts only when the user explicitly asks.

## Body

- Start from [the skill template](../assets/skill.template.md). `<!-- @format -->` goes on the first line after the frontmatter.
- Keep `SKILL.md` short: a contract, a procedure, and guardrails. Move detail that only some steps need into `references/<topic>.md`, one level deep, and link each reference from the step that needs it.
- Link to knowledge topics instead of restating them.
- Put fill-in templates in `assets/` and name them `*.template.md`.

## Migrating a command or prompt into a skill

1. Find every place that refers to the command, including the docsite.
2. Write the skill, keeping the steps but replacing argument placeholders such as `$ARGUMENTS` with "from the request".
3. Update the references to point to the skill, and remove the old command in the same PR.
4. Test that the skill triggers from a plain-language request in each required host.
