# React Native

<!-- [macOS -->

## React Native for macOS: read first

This is Microsoft's macOS fork of React Native. Keep changes merge-friendly, and open other files only when a table below sends you there. Where other guidance in this file conflicts with this section, this section wins.

### Fork rules

- **I1** Keep upstream merges clean: make the smallest change that works, and tag every macOS change in a shared file ([fork.diff-tags](.agents/knowledge/fork/diff-tags.md)).
- **I2** Respect path ownership. Never put fork content in upstream-owned files, such as `__docs__` folders or the shared lint configs ([fork.ownership](.agents/knowledge/fork/ownership.md)).
- **I3** Extend the iOS implementation with `TARGET_OS_OSX` guards and RCTUIKit types instead of copying files.
- **I4** `main` runs only the New Architecture, but the legacy (Paper) sources still compile. Keep them compiling, and make Paper behavior fixes on `*-stable` branches.
- **I5** Write PR titles as Conventional Commits. Add a Changeset only to PRs into `*-stable` ([process.pull-requests](.agents/knowledge/process/pull-requests.md)).
- **I6** Keep one home per fact and link to it instead of copying it. Change agent instructions and knowledge only through the `rnmacos-organize-knowledge` skill.
- **I7** Report each validation command you ran with its exact result, and list the checks you didn't run.

### Where macOS code lives

| Path | Contents |
| --- | --- |
| `packages/react-native` | The `react-native-macos` package, with macOS code inline in shared iOS files |
| `packages/react-native/ReactApple/Libraries/RCTUIKit` | UIKit and AppKit compatibility layer |
| `packages/rn-tester` | RNTester, including the `RNTester-macOS` scheme |
| `docsite/` | Fork docs: diff tags, versioning, backporting, releases |
| `.github/workflows/microsoft-*.yml` and `.ado/` | Fork CI |

### Essentials <!-- [macOS] delete at the 0.88 merge -->

- Use Yarn 4 with the pnpm linker. Run `yarn install` and all other commands from the repository root.
- Check JavaScript changes with `yarn jest <path>`, `yarn flow-check`, `yarn lint`, and `yarn format-check`.

### Load on demand

| When you are | Read |
| --- | --- |
| Changing a file that upstream also has | [fork.diff-tags](.agents/knowledge/fork/diff-tags.md), [fork.ownership](.agents/knowledge/fork/ownership.md) |
| Running builds, tests, linters, or formatters | [tooling.commands](.agents/knowledge/tooling/commands.md), [tooling.format-lint](.agents/knowledge/tooling/format-lint.md) |
| Building or running RNTester-macOS | [testing.rntester-macos](.agents/knowledge/testing/rntester-macos.md) |
| Changing macOS accessibility, focus, or Tab order | [a11y.appkit](.agents/knowledge/a11y/appkit.md), then the matching `a11y` topic in the [index](.agents/knowledge/index.md) |
| Writing a PR, Changeset, or backport | [process.pull-requests](.agents/knowledge/process/pull-requests.md) |
| Doing anything else | [Knowledge index](.agents/knowledge/index.md) |

### Skills

- [`rnmacos-organize-knowledge`](.agents/skills/rnmacos-organize-knowledge/SKILL.md): record, fix, move, or retire agent instructions and knowledge.

<!-- macOS] -->
