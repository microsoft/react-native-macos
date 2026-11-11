---
id: tooling.format-lint
summary: Prettier pragma, markdownlint scope, and ESLint and Flow gaps for react-native-macos files, including agent knowledge files.
kind: rules
status: active
load_when: Formatting or linting a file, or writing Markdown with frontmatter
sources:
  - .prettierrc.js#requirePragma
  - .markdownlint-cli2.mjs#single-title
  - package.json#format-check
  - .eslintignore:17
  - .flowconfig:17-18
verified: 2026-10-28
rules: [pragma-placement, lint-markdown-explicitly, no-title-frontmatter]
related: [tooling.commands]
---

<!-- @format -->

# Formatting and linting

Use when: you format or lint files, or write Markdown that has frontmatter. Not for: choosing test commands; see [tooling.commands](commands.md).

## Rules

- **tooling.format-lint.pragma-placement:** Prettier only formats files with a pragma (`requirePragma: true`). Put `<!-- @format -->` in Markdown on the first line after any frontmatter, `# @format` at the top of YAML, and `@format` in the header docblock of JS and TS. Leave the pragma out of `AGENTS.md`, because upstream's copy has none.
- **tooling.format-lint.lint-markdown-explicitly:** Run markdownlint on fork Markdown with `--no-globs` and explicit paths. The shared config only globs `__docs__` folders.
- **tooling.format-lint.no-title-frontmatter:** Don't put a `title` key in Markdown frontmatter that also has an H1. markdownlint counts it as a second title (MD025).

## Facts

- `yarn format-check` runs Prettier on `**/*.{js,md,yml,ts,tsx}` in CI. It skips `.mts`, `.mjs`, and `.yaml` files, so check those explicitly.
- `__docs__` Markdown has its own Prettier override: no pragma required, and prose wraps.
- ESLint and Flow both ignore `*.macos.js` files. Put logic that should be type-checked in shared files behind `Platform.OS === 'macos'`.
- Native code uses clang-format, but `yarn clang-format` rewrites every native file in the repository. Run clang-format on only the files you changed.

## Pitfalls

- A pragma above the frontmatter breaks frontmatter parsing; markdownlint and skill hosts then see no metadata.
- Prettier pads Markdown table columns to equal widths, so one edited cell can rewrite the whole table. Run it before you commit so review diffs show the real change.

## Verify

```sh
yarn exec prettier --check path/to/file.md
yarn markdownlint-cli2 --no-globs path/to/file.md
yarn eslint path/to/file.js
```
