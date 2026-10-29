---
id: fork.diff-tags
summary: How to mark macOS changes in shared upstream files so merges and audits can find every fork diff.
kind: rules
status: active
load_when: Changing a file that upstream React Native also has, or adding a fork-only file
sources:
  - docsite/docs/contributing/diffs-with-upstream.md
  - .flowconfig:72-76
  - .yarnrc.yml:9
  - packages/react-native/ReactApple/Libraries/RCTUIKit/README.md:3
verified: 2026-10-28
rules: [tag-every-change, match-comment-syntax, keep-balanced, tag-new-files]
related: [fork.ownership]
---

<!-- @format -->

# Diff tags

Use when: you change a file that upstream also has, or you add a fork-only file. Not for: deciding who owns a path; see [fork.ownership](ownership.md).

The canonical syntax, with examples, is on the docsite page [How React Native macOS differs from React Native](../../../docsite/docs/contributing/diffs-with-upstream.md). This topic adds agent rules and observed exceptions.

## Rules

- **fork.diff-tags.tag-every-change:** Mark each macOS change in a shared file with `[macOS]` on one line, or `[macOS` … `macOS]` around a block, so `git grep "\[macOS"` finds every fork diff.
- **fork.diff-tags.match-comment-syntax:** Use the file's own comment syntax: `//` in Objective-C, C++, and JS; `#` in Ruby, YAML, and shell; `;` in `.flowconfig`; `<!-- [macOS] -->` in Markdown. Where a file already has tags, match them.
- **fork.diff-tags.keep-balanced:** Every `[macOS` block opener needs a `macOS]` closer. Count both before and after you edit.
- **fork.diff-tags.tag-new-files:** Tag a fork-only file once, near the top, instead of tagging each change in it.

## Facts

- `#if` blocks carry the tag on the directive. macOS-only code uses `#if TARGET_OS_OSX // [macOS` … `#endif // macOS]`. Original iOS-only code uses `#if !TARGET_OS_OSX // [macOS]` with a single-line tag, because the code inside is upstream's.
- `[visionOS]` marks visionOS diffs. Some lines carry both, such as `TARGET_OS_IOS // [macOS] [visionOS]` for APIs that exist only on iOS.
- On 2026-10-28, 675 tracked files contained `[macOS` and 31 contained `[visionOS`.
- `.flowconfig` and `.yarnrc.yml` open blocks with `[macOS] comment` rather than the docsite's `[macOS comment`. Prefer the docsite form in new code.

## Pitfalls

- Don't reformat, reorder, or rewrap upstream lines near your change; every extra changed line can conflict in the next merge.
- Remove a tag only when the code matches upstream again.
- Opener and closer counts can differ legitimately (for example, a tag inside a string). Treat a mismatch as a reason to read the file, not as proof of an error.

## Verify

```sh
git grep -n "\[macOS" -- path/to/file
grep -oE '\[macOS([^]]|$)' path/to/file | wc -l   # block openers
grep -oE '(^|[^[])macOS\]' path/to/file | wc -l   # block closers
```
