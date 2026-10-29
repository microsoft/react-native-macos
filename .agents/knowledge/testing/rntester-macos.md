---
id: testing.rntester-macos
summary: Install Pods for and build RNTester-macOS the way CI does, then run it with Metro.
kind: procedure
status: active
load_when: Building, running, or debugging RNTester-macOS, or validating a native macOS change
sources:
  - .github/workflows/microsoft-build-rntester.yml#RCT_NEW_ARCH_ENABLED
  - .ado/scripts/xcodebuild.sh#derivedDataPath
  - packages/rn-tester/Podfile:6-28
  - packages/rn-tester/js/utils/RNTesterList.macos.js
  - .yarnrc.yml#nodeLinker
  - packages/community-cli-plugin/src/commands/start/middleware.js#cli-server-api
verified: 2026-10-28
rules: [build-like-ci, open-workspace]
related: [tooling.commands]
---

<!-- @format -->

# RNTester-macOS

Use when: you build or run RNTester-macOS, or you need to prove a native macOS change compiles. Not for: Jest or other JavaScript checks; see [tooling.commands](../tooling/commands.md).

## Rules

- **testing.rntester-macos.build-like-ci:** Install Pods with `RCT_NEW_ARCH_ENABLED=1` and build through `.ado/scripts/xcodebuild.sh`, as CI does. Report the exact commands you ran and their result.
- **testing.rntester-macos.open-workspace:** Open `packages/rn-tester/RNTesterPods.xcworkspace`, not the `.xcodeproj`. CocoaPods generates the workspace.

## Procedure

```sh
cd packages/rn-tester
bundle install
RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
cd ../..
.ado/scripts/xcodebuild.sh packages/rn-tester/RNTesterPods.xcworkspace macosx Debug RNTester-macOS build
cd packages/rn-tester   # then start Metro in a second terminal before you launch the app:
NODE_PATH="$PWD/node_modules" node ../react-native/cli.js start
```

## Facts

- CI builds three schemes on a `macos-26` runner: `RNTester-macOS` (`macosx`), `RNTester` (`iphonesimulator`), and `RNTester-visionOS` (`xrsimulator`). It builds them but runs no native tests.
- Each scheme builds with static libraries and with `USE_FRAMEWORKS=dynamic`. Dynamic builds are still in progress and don't fail the check.
- The wrapper passes `CODE_SIGNING_ALLOWED=NO`, writes derived data next to the workspace, and installs `xcbeautify` with Homebrew if it's missing. Set `USE_CCACHE=1` to build through ccache.
- The Podfile needs cmake and installs it with Homebrew if it's missing. It builds for iOS, macOS, and visionOS.
- The macOS example list re-exports the iOS list, so an example added to the iOS list also appears on macOS.

## Pitfalls

- After you change native dependencies or switch branches, run `pod install` again before building.
- `yarn start` fails under the repository's `nodeLinker: pnpm`: Yarn resolves the `react-native-macos` binary under `.yarn/__virtual__`, which the pnpm linker never creates. Running `cli.js` without `NODE_PATH` starts Metro without `/status`, and the app then reports "No script URL provided".
- A green macOS build doesn't prove iOS or visionOS still compile. When you change shared Apple code, build the `RNTester` scheme with `iphonesimulator` too.

## Verify

The wrapper exits 0 when the build succeeds. Before you launch the app, `curl localhost:8081/status` prints `packager-status:running`.
