---
id: tooling.commands
summary: Yarn 4 setup and the root commands for building, testing, linting, and formatting react-native-macos.
kind: reference
status: active
load_when: Choosing a command to install, build, test, lint, or format, or when a Yarn command fails
sources:
  - package.json#scripts
  - .yarnrc.yml#nodeLinker
  - packages/react-native/package.json#engines
  - .github/workflows/microsoft-pr.yml#node-version
verified: 2026-10-28
rules: [use-yarn-bin, no-install-scripts]
related: [tooling.format-lint, testing.rntester-macos]
asserts:
  - {file: .yarnrc.yml, yaml: nodeLinker, equals: pnpm}
  - {file: package.json, json: packageManager, matches: '^yarn@4\.'}
---

<!-- @format -->

# Commands

Use when: you need a build, test, lint, or format command, or a Yarn command fails. Not for: Prettier and markdownlint rules; see [tooling.format-lint](format-lint.md).

## Rules

- **tooling.commands.use-yarn-bin:** Run root scripts and dependency binaries through Yarn from the repository root, such as `yarn jest` or `yarn markdownlint-cli2`. The pnpm linker creates no `node_modules/.bin`, so bare binary names fail and `npx` may fetch a different version.
- **tooling.commands.no-install-scripts:** Don't turn on `enableScripts` or add install scripts. When a package needs a dependency its manifest omits, add a third-party entry to `packageExtensions` in `.yarnrc.yml`; never add `@react-native/*` packages there.

## Facts

- Yarn 4 is pinned through `packageManager`, with `nodeLinker: pnpm`, `enableScripts: false`, and a 7-day minimum package age (`npmMinimalAgeGate`). Upstream uses Yarn v1.
- `react-native` requires Node `>= 20.19.4`. Fork CI uses Node 22. Scripts written as `.mts` run directly with `node file.mts`.

| Purpose                  | Command                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Install                  | `yarn install`                                                                       |
| Jest, one file           | `yarn jest path/to/file-test.js --runInBand`                                         |
| Jest, one test           | `yarn jest path/to/file-test.js -t 'name' --runInBand`                               |
| Flow                     | `yarn flow-check`                                                                    |
| ESLint                   | `yarn lint`                                                                          |
| TypeScript declarations  | `yarn build-types`, then `yarn test-generated-typescript` and `yarn test-typescript` |
| Prettier                 | `yarn format-check`                                                                  |
| CI shell and code checks | `yarn lint-ci`                                                                       |
| Yarn constraints         | `yarn constraints`                                                                   |
| Changeset                | `yarn change`, checked with `yarn change:check`                                      |
| Metro for RNTester       | `yarn start`                                                                         |
| Android build and tests  | `yarn build-android`, `yarn test-android`                                            |

## Pitfalls

- `yarn test-ios` runs `scripts/objc-test.sh`, which targets the iOS simulator only. For macOS, follow [testing.rntester-macos](../testing/rntester-macos.md).
- `yarn clang-format` and `yarn format` rewrite every matching file in the repository. Format only the files you changed.
- A root script shadows a binary with the same name. `yarn prettier` runs the root `prettier` script even when you pass file paths, and that script writes every pragma file in the repository. Run `yarn exec prettier --check path/to/file` instead.

## Verify

```sh
yarn --version
node --version
```
