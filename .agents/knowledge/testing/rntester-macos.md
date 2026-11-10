---
id: testing.rntester-macos
summary: Install Pods for and build RNTester-macOS the way CI does, then run it with Metro.
kind: procedure
status: active
load_when: Building, running, or debugging RNTester-macOS, or validating a native macOS change
sources:
  - .github/workflows/microsoft-build-rntester.yml
  - packages/rn-tester/Podfile:6-28
  - packages/rn-tester/js/utils/RNTesterList.macos.js
verified: 2026-11-10
rules: [build-like-ci, open-workspace]
related: [tooling.commands]
---

<!-- @format -->

# RNTester-macOS

Use when: you build or run RNTester-macOS, or you need to prove a native macOS change compiles. Not for: Jest or other JavaScript checks; see [tooling.commands](../tooling/commands.md).

## Rules

- **testing.rntester-macos.build-like-ci:** Follow the [RNTester build workflow](../../../.github/workflows/microsoft-build-rntester.yml) for the current runner, toolchain versions, dependency setup, and build commands. If building with CocoaPods, install Pods with `RCT_NEW_ARCH_ENABLED=1`. Report the exact commands you ran and their result.
- **testing.rntester-macos.open-workspace:** If building with CocoaPods, open `packages/rn-tester/RNTesterPods.xcworkspace`, not the `.xcodeproj`. CocoaPods generates the workspace.

## Procedure

For CI-equivalent steps, use the [RNTester build workflow](../../../.github/workflows/microsoft-build-rntester.yml).
When building locally with CocoaPods:

```sh
cd packages/rn-tester
bundle install
RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
```

Start Metro in a second terminal before launching the app.

## Facts

- The [RNTester build workflow](../../../.github/workflows/microsoft-build-rntester.yml) is the source of truth for the CI runner, schemes, SDKs, and build configuration.
- When using CocoaPods, the Podfile requires cmake and installs it with Homebrew if it's missing and Homebrew is available. It builds for iOS, macOS, and visionOS.
- The macOS example list re-exports the iOS list, so an example added to the iOS list also appears on macOS.

## Pitfalls

- When building with CocoaPods, run `pod install` again after changing native dependencies or switching branches.
- A green macOS build doesn't prove iOS or visionOS still compile. When you change shared Apple code, build the `RNTester` scheme with `iphonesimulator` too.

## Verify

The build succeeds, and the app launches with Metro running.
