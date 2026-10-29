<!-- @format -->

# Knowledge conventions

Load this when you write or edit a topic. The machine-checked parts are listed in [evals.knowledge-checks](../../../../.agents/knowledge/evals/knowledge-checks.md).

## Layout

- Topics live in `.agents/knowledge/<domain>/<topic>.md`. Domains are one lowercase word registered in [taxonomy.yaml](../../../../.agents/knowledge/taxonomy.yaml). Topic file names are kebab-case.
- A topic's ID is `<domain>.<file name>`, matching its path, such as `fork.diff-tags` for `fork/diff-tags.md`. Moving or renaming the file changes the ID, so it needs a redirect; see [taxonomy](taxonomy.md).
- [index.md](../../../../.agents/knowledge/index.md) has a hand-written introduction and generated tables. Never edit between its `BEGIN GENERATED` and `END GENERATED` markers.

## Topic format

Start from [the topic template](../assets/topic.template.md). The frontmatter must be on line 1.

| Key                   | Required | Value                                                                                                        |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `id`                  | Yes      | `domain.topic-name`                                                                                          |
| `summary`             | Yes      | One sentence, at most 160 characters                                                                         |
| `kind`                | Yes      | `rules`, `reference`, `procedure`, `decision`, or `eval`                                                     |
| `status`              | Yes      | `draft`, `active`, or `deprecated`                                                                           |
| `load_when`           | Yes      | The task that needs this topic, at most 120 characters                                                       |
| `sources`             | Yes      | List of `path`, `path:line`, `path:line@sha`, `path#symbol`, or a URL                                        |
| `verified`            | Yes      | `YYYY-MM-DD`, the last date someone checked the sources                                                      |
| `rules`               | No       | Rule slugs; each needs a matching bullet                                                                     |
| `requires`, `related` | No       | Topic IDs to read first, or that are related                                                                 |
| `branch_scope`        | No       | Branches the topic applies to, when not all                                                                  |
| `watch`               | No       | `owner/repo#123` PRs or issues that could change the facts                                                   |
| `asserts`             | No       | Checks such as `{file: .yarnrc.yml, yaml: nodeLinker, equals: pnpm}`; also `json`, `matches`, and `contains` |

Any other key is an error. Never add `title`: it duplicates the H1 and fails markdownlint MD025.

After the frontmatter:

1. `<!-- @format -->` on the first line after the closing `---`.
2. One H1.
3. A paragraph that starts `Use when:` and names what the topic is not for.
4. Sections in this order, skipping empty ones: Rules, Procedure, Facts, Pitfalls, Verify.

## Rules and facts

- A rule bullet starts with its full ID in bold: `- **domain.topic.rule-slug:** Do this.` Declare each slug in the `rules` list. Rule IDs are permanent; never reuse a retired one.
- Write rules as instructions. Write facts as observations with a source.
- End a claim you couldn't verify with "(inferred)".
- Keep one fact in one place. Link to it with a relative Markdown link and a heading anchor if needed.

## Citations and links

- Prefer `path#symbol` over line numbers, because symbols survive edits. Use `path:line@sha` when you need a specific revision.
- Link to the docsite for public process and link to code for behavior. Summarize; don't restate.
- Never use `@path` imports. They load the file into every session.

## Writing style

- Write short, direct sentences in the second person, and lead with the action.
- Use backticks for paths, commands, symbols, and literal values.
- Give every fenced code block a language.
- Keep topics within the budgets in `taxonomy.yaml`. When a topic grows past them, split it.
