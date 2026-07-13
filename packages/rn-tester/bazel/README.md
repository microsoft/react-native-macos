This directory holds the Bazel *vertical slice* for building RNTester on macOS.
The actual targets live in `packages/rn-tester/BUILD.bazel` (they need to glob the
rn-tester JS and Obj-C sources, which Bazel can only do from the package root).

See `docs/bazel.md` for the full design and current status. In short, the slice:

  1. `metro_bundle` — bundles `js/RNTesterApp.macos.js` with Metro via rules_js.
  2. `rn_imported_xcframeworks()` — imports the prebuilt React/ReactNativeDependencies/
     hermes XCFrameworks produced by `scripts/ios-prebuild.js`.
  3. `macos_application` — links the XCFrameworks + rn-tester's AppDelegate/main and
     embeds the Metro bundle as an app resource.

Prerequisites (why the slice targets are tagged `manual` today):
  * First-party workspace packages need `BUILD.bazel` files so rules_js can link
    `//:node_modules/react-native` (the Metro CLI). Tracked in docs/bazel.md.
  * The XCFrameworks must exist: run
        (cd packages/react-native && node scripts/ios-prebuild.js -s -f Debug \
             && node scripts/ios-prebuild.js -b -f Debug -p macos \
             && node scripts/ios-prebuild.js -c -f Debug)
  * rules_apple must support the local Xcode (26.x); pin via DEVELOPER_DIR.

Once the above are in place:
    bazel run //packages/rn-tester:RNTesterMacBazel
