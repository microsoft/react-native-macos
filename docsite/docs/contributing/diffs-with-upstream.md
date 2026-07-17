---
sidebar_label: 'macOS Tags'
sidebar_position: 2
---

# How React Native macOS differs from React Native

React Native macOS elected to implement our fork via inline diffs of existing React Native code. This means additions and changes of extra code to support macOS, usually in the same file as the existing iOS or JS implementation.

## Rationale

UIKit (The native iOS framework that React Native's iOS implementation is built off) is quite similar to Appkit (the macOS equivalent) which encourages a lot of code sharing and re-use. We found that to encourage maximum code sharing, the use of preprocessor `#ifdef` blocks was best to modify the existing iOS implementation to compile on macOS. This also aides in merging upstream changes from React Native, as it's easier to compare and update our diffs when they're in the same file than if macOS was in a separate implementation file altogether.

## Tracked divergences at React Native 0.85

The table below records behavioral and architectural differences that remain after merging the React Native 0.85 fork point. Dependency versions, generated files, and mechanical package renames are intentionally omitted.

### JavaScript, public API, and tests

| Area | Upstream 0.85 context | React Native macOS difference and rationale |
| --- | --- | --- |
| AccessibilityInfo | Apple accessibility events and Flow declarations were modernized. | macOS retains high-contrast state and events, with matching Jest behavior, because AppKit exposes this setting separately from the upstream mobile APIs. |
| View and Pressable events | Pointer and mouse event ownership changed. | macOS retains drag/drop, auxiliary-click, double-click, hover, focus, and handled-key props and payload fields required by AppKit input. |
| TextInput and keyboard events | TextInput and synthetic keyboard event types moved to the 0.85 `Readonly` model. | macOS retains key-down/up events, modifier state, handled-key declarations, focus-ring behavior, and AppKit text-system integration. |
| Text rendering | Upstream refactored Text style processing. | A macOS-only minimal border radius prevents a background color from spilling outside a Text frame when no radius is supplied. |
| LogBox presentation | Upstream simplified component-stack parsing and expanded platform font maps. | The parser remains upstream-owned; macOS keeps Menlo as its monospace inspector font. |
| Virtualized lists | Upstream list APIs and strict generated declarations changed. | The fork package remains `@react-native-macos/virtualized-lists` and exports the public types consumed by `react-native-macos`. |
| Jest preset | The preset moved from `react-native` to `@react-native/jest-preset`. | The fork maps `react-native` imports to `react-native-macos`, adds `macos` haste resolution, and supplies strict-linker workspace dependencies. |

### Apple runtime and rendering

| Area | Upstream 0.85 context | React Native macOS difference and rationale |
| --- | --- | --- |
| RCTUIKit abstractions | AppDelegate, root-view, core-module, and component-view code adopted newer UIKit/tvOS/visionOS APIs. | Shared Apple code continues to use `RCTPlatformView`, `RCTPlatformColor`, `RCTPlatformDisplayLink`, and other RCTUIKit aliases so the same implementation builds on AppKit. |
| Image decoding | Upstream preserves image orientation through `UIImageOrientation`. | UIImage orientation conversion is excluded on macOS, while NSImage decoding preserves the target size and Core Graphics image. |
| Device and screen orientation | Upstream reads `UIDevice` orientation outside tvOS. | macOS uses its window/screen abstractions; visionOS avoids unavailable device-orientation APIs; tvOS remains landscape. |
| Fabric animation scheduling | Upstream uses `CADisplayLink` directly. | macOS uses `RCTPlatformDisplayLink` and computes the target frame time from timestamp plus duration. |
| Fabric component views | VirtualView, modal, scroll, paragraph, text input, and view component implementations changed upstream. | Existing AppKit lifecycle, hit testing, selection, scrolling, colors, and view types remain narrow platform branches in the upstream-shaped components. |
| VirtualView replacement | `VirtualViewExperimental` was replaced by `VirtualView`. | The experimental files stay deleted; macOS behavior is carried by the current VirtualView implementation instead of resurrecting the old component. |
| Legacy view-manager interop | Upstream moved the coordinator under `platform/ios` and added a platform descriptor implementation. | macOS retains its RCTUIKit coordinator. CocoaPods builds the new descriptor and exactly one coordinator implementation for each Apple platform. |
| Legacy UIManager | Upstream continues removing legacy-architecture paths. | macOS still compiles the legacy UIManager implementation and its RCTPlatformView registry until the fork no longer ships those APIs. |
| Core modules and developer UI | Clipboard, device info, keyboard, perf monitor, RedBox, and related UIKit code changed. | AppKit implementations and windows remain behind RCTUIKit or `TARGET_OS_OSX` branches. |
| SwiftUI wrapper | Upstream evolved the wrapper pod. | The macOS target retains its RCTUIKit dependency and platform-compatible wrapper ownership. |

### Build and distribution

| Area | Upstream 0.85 context | React Native macOS difference and rationale |
| --- | --- | --- |
| SwiftPM Fabric sources | Upstream enumerates new animation and platform sources. | `Package.swift` retains macOS source/exclusion arrays so platform view sources are selected once without inventing nonexistent macOS directories. |
| Fabric CocoaPods ownership | Upstream added or moved per-component Apple sources. | The fork keeps its duplicate-scrollview-source workaround and platform-specific legacy interop ownership to prevent duplicate symbols. |
| Hermes V1 | Hermes V1 and its prebuilt artifacts are now the default. | RNM maps its package version to the compatible upstream release, pins the matching compiler, and retains a merge-base-aware source-build fallback instead of using a moving nightly. |
| iOS prebuild tooling | Header collection and XCFramework generation expanded. | The fork supports multiline podspec source declarations, argument-safe process execution, macOS framework slices, and string-only child-process environments. |
| Package manager layout | Upstream development assumes its supported workspace linking layout. | The fork uses Yarn's pnpm linker and declares missing direct dependencies explicitly so tests and tools do not depend on hoisting. |

### Differences removed or upstreamed in 0.85

The following are no longer tracked as fork divergences:

- `ReactNativeViewAttributes.js` was deleted upstream and is not restored.
- `VirtualViewExperimental` was replaced upstream and is not restored.
- The old `react-native/jest/mocks/AccessibilityInfo.js` file was deleted; the extracted Jest preset owns the current mock.
- `private/react-native-bots/package.json` was deleted with the upstream package removal.
- Upstream-owned Flow modernization, Windows LogBox fonts, and general tvOS/visionOS guards are not marked as macOS differences unless a macOS branch is still required.

When a minor-version merge changes one of these rows, its reviewer guide must state whether the divergence was retained, adapted, upstreamed, or removed. New iOS-to-macOS ports and workarounds should be represented both here and in the merge's conflict-resolution appendix.

## How do we track diffs?

We track diffs through the use of "diff tags" in code comments. Wherever we add or modify code, we try to add a diff tag to mark the beginning and end of the modified code. The diff tags are designed so that you can easily do a search of the string "[macOS" across the entire repository and collect a list of all of our diffs.

### Diff tag format

- Single Line diff
```text
// [macOS]
```
- Single Line diff with comment
```text
// [macOS] comment explaining change
```
- Block Diff
```text
...
// [macOS
...
// macOS]
...
```
- Block Diff with comment
```text
...
// [macOS comment explaining change
...
// macOS]
...
```
- Inline diff
```text
/* blah blah blah `RCTUIView` [macOS] blah blah */
```

### Forked files

We try to make changes in the same file where possible. However, we sometimes find the need to make completely new files for macOS only code, or for a parallel implementation to the iOS and Android implementations. For these entirely new files, we find it sufficient to simply add a single line diff tag near the top to show that the _file_ is an addition by React Native macOS.

```text
Foo.macos.js
====================
/**
 * Copyright notice
 */

// [macOS]

... rest of file
=====================
```

### ifdef blocks

Oftentimes we add a few types of ifdef blocks to React Native's iOS code. We follow a few guidelines to keep these consistent and manageable between merges.

1. ifdef macOS only code

```text
#if TARGET_OS_OSX // [macOS
  ...macOS only code
#endif // macOS]
```
Here, we used the block start and end tags to signify the code inside the ifdef is an _addition_ from React Native macOS.

2. ifdef iOS only code

```text
#if !TARGET_OS_OSX // [macOS]
  ...iOS only code
#endif // [macOS]
```
Here, we used single line diff tags to show that the code inside the tags is the original React Native code (as opposed to an iOS block added by React Native macOS)


3. ifdef between an iOS and macOS block

```text
#if !TARGET_OS_OSX // [macOS]
  ...original iOS only code
#else // [macOS
  ...macOS only code
#endif // macOS]
```
This case is a mix of the earlier two cases. We use a single line tag for the starting if tag to show that the first block of iOS only code is the original code from React Native. Then, we use block tags with the else/endif to show that the macOS code is an addition by React Native macOS.

