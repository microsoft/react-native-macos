# Bazel support for react-native-macos (draft / experimental)

This document describes the **experimental Bazel build** being added to
react-native-macos, why it is designed the way it is, what works today, and the
roadmap. It is intentionally additive: the existing yarn / Metro / xcodebuild / SPM /
CocoaPods workflows are unchanged.

## Goal

Prove a **full working vertical slice**: bundle rn-tester's JavaScript with Metro
(driven by Bazel via aspect-build `rules_js`) and link/embed it into a macOS app
(`macos_application` via `rules_apple`) that consumes the prebuilt React Native
XCFrameworks — an end-to-end `bazel run` of a macOS RN app. Longer term, build those
XCFrameworks from source in Bazel too (see the roadmap).

## Why Bazel

* **Incrementality + caching**: fine-grained, content-addressed caching of JS bundling
  and (later) native compilation, shared between CI and local dev via a remote cache.
* **One graph across languages**: the JS→native seam (a Metro bundle becoming an app
  resource) is modeled explicitly, the way Meta does it in Buck2's `js`/`apple`
  preludes — but reusing Metro and rules_apple instead of reimplementing them.

## The single-source-of-truth lockfile problem (and the rules_js Berry fork)

The repo uses **Yarn 4 (Berry)**; `yarn.lock` is `__metadata: version: 8`. We keep
that Berry `yarn.lock` as the **single source of truth** — no committed second lockfile.

aspect `rules_js` normalizes every lockfile to an internal pnpm model. `npm_translate_lock`
does this in two stages:

1. **foreign lock → `pnpm-lock.yaml`**: for a `yarn_lock`/`npm_package_lock` input it
   shells out to the `pnpm import` binary
   (`update_cmd = ["import"] …` in `npm/private/npm_translate_lock.bzl`).
2. **`pnpm-lock.yaml` → Bazel repo**: a Starlark parser (`npm/private/pnpm.bzl`) builds
   `importers`/`packages`/`snapshots` and strictly cross-validates them.

**The gap is isolated to stage 1**: `pnpm import` (and hence rules_js's `yarn_lock` path)
supports Yarn *Classic* v1 and npm — **but not Yarn Berry v2+** (pnpm issue #2991).
Stage 2 is format-agnostic and requires **pnpm lockfile v9**.

### The fork

We patch rules_js at exactly that seam
(`tools/bazel/patches/aspect_rules_js_berry.patch`, applied via bzlmod
`single_version_override`). The patch adds `_generate_pnpm_lock_from_berry`, which runs
at the top of `parse_and_verify_lock`: when the input `yarn.lock` is a Berry lockfile and
no `pnpm-lock.yaml` exists yet, it invokes our **dependency-free Node converter**
(`tools/bazel/berry/berry_to_pnpm_lock.mjs`) to translate the Berry lock into a
**pnpm-lock v9** written into the source root. That file is **gitignored** — generated at
rule time, never committed. `update_pnpm_lock` is left `False` (the `pnpm import` path is
never taken). The patch `rctx.watch`es the yarn.lock and the converter so changes
retrigger it.

The converter reconstructs the whole graph from the Berry lock alone:

* **descriptors → versions**: every Berry descriptor (`name@range`) maps to its resolved
  entry, so package dependency ranges resolve to concrete versions (and thus to
  `snapshots` keys).
* **workspaces → importers** with `link:` deps computed as importer-relative paths.
* **npm aliases** (e.g. `rxjs → @react-native-community/rxjs@6.5.4-custom`) map to the
  aliased package's full snapshot key.
* It self-validates internal consistency exactly like `pnpm.bzl` does.

On the real monorepo lock this yields **33 importers / 1333 packages, zero dangling
references**.

### Known limitation: integrity

Berry's `checksum` is Yarn's **own content hash**, *not* the npm tarball's `sha512`
integrity that pnpm/rules_js expect, so we cannot derive `resolution.integrity` from the
Berry lock. rules_js requires `integrity` **or** `tarball`, so the converter emits the
deterministic npm registry **tarball URL** and packages are downloaded **without integrity
verification**. This is acceptable for a draft but should be hardened for production by
sourcing real integrities — e.g. a one-time npm-registry packument fetch (cached) or a
small Yarn plugin that exports npm integrities alongside `yarn.lock`.

### Why a fork and not BYONM

"Bring your own node_modules" (a `repository_rule` running `yarn install`) also works and
is documented by aspect, but it gives coarse-grained caching and bypasses rules_js's
package graph. The fork keeps rules_js's fine-grained model while reading the Berry lock.
BYONM remains a viable fallback.

## What works today (verified green)

* `bazel test //tools/bazel/berry/example:verify` — a self-contained proof: a real Berry
  `yarn.lock` (is-odd → is-number) is translated by the fork, fetched and linked by
  rules_js, and a Node program that `require`s the npm dep runs green.
* On the **real monorepo** `yarn.lock`, `npm_translate_lock` parses the fork-generated
  lock and **fetches all 1333 packages** successfully.
* **First-party workspace linking**: every workspace package now exposes a `:pkg` target
  (`npm_package`) so rules_js can link it. `bazel build //packages/react-native:pkg`
  builds; rn-tester's `node_modules` links `react-native-macos` (the package the repo
  consumes as `react-native`).
* **rn-tester's macOS JS bundle builds** (outside Bazel, proving the JS is bundleable):
  after building the codegen lib, `react-native bundle --platform macos --entry-file
  js/RNTesterApp.macos.js` produces a ~7 MB `RNTesterApp.macos.jsbundle` + 50 assets.

## End-to-end RN-Tester: status & remaining work

Two concrete blockers separate the current state from a running RNTester macOS app:

1. **The macOS app needs the prebuilt XCFrameworks, which can't be produced *in this
   environment* because the local Xcode is too new.** This is a toolchain/environment
   issue, **not** a fork gap — react-native-macos already carries the patches that resolve
   the correct Hermes for the branch (`scripts/ios-prebuild/microsoft-hermes.js`):
   * On a **release branch**, `findMatchingHermesVersion` maps to the upstream RN version in
     `peerDependencies` and ios-prebuild **downloads** a published Hermes artifact.
   * On **main (`1000.0.0`)**, it returns `null` and **builds Hermes from source** at the
     Hermes commit at the merge-base with facebook/react-native (`hermesCommitAtMergeBase`).

   Building that from source here fails for two environment reasons:
   * the default Homebrew CMake is **4.x**, too new for Hermes (use the installed
     `cmake@3.26.4`); and, after that,
   * **Xcode 26 / AppleClang 21** trips LLVM's `CheckAtomic` ("Host compiler appears to
     require libatomic, but cannot find it"). The prebuild CI pins **Xcode 16.2 / 16.1**
     (see `.github/workflows/prebuild-ios-core.yml`), which is what actually builds these
     XCFrameworks. No Xcode 16.x is installed on this machine.

   Net: on CI (Xcode 16.2) — or from a release branch that downloads prebuilt Hermes — the
   XCFrameworks build and the `macos_application` links. Locally with only Xcode 26, the
   from-source Hermes build can't complete. (An earlier revision of this doc wrongly blamed
   a "Hermes nightly 404"; that was caused by forcing `HERMES_VERSION=nightly`, which
   bypasses the macOS version-resolution patches — don't set that env var.)

2. **The hermetic Bazel Metro bundle needs a dependency-closure step.** Two prerequisites:
   * `@react-native/codegen`'s `lib/` must be built (babel-plugin-codegen requires it):
     `(cd packages/react-native-codegen && yarn build)`.
   * rules_js uses a **strict, non-hoisted** `node_modules`. Metro's tooling (`metro`,
     `@react-native/metro-config`, `@react-native/metro-babel-transformer`) are
     transitive/root devDeps, so they are not resolvable from rn-tester's `node_modules`.
     To make `//packages/rn-tester:rntester_macos_jsbundle` green, declare that tooling as
     deps of the bundler (e.g. add them to rn-tester's `package.json` and regenerate the
     Berry `yarn.lock`) so rules_js links the full closure. The bundle itself runs via
     `packages/rn-tester/bazel/bundle.js` (Metro's API, with the
     `react-native → react-native-macos` alias and a sandbox-safe config).

## What's next (WIP, scaffolded — all `manual`)

* **Metro bundle**: `//packages/rn-tester:rntester_macos_jsbundle` (`js_run_binary` around
  `bazel/bundle.js`). Blocked only on the closure step above.
* **macOS app**: `//packages/rn-tester:RNTesterMacBazel` (`macos_application`) links the
  imported XCFrameworks and embeds the Metro bundle as an app resource, reusing
  rn-tester's existing `AppDelegate.mm`/`main.m`. Blocked on the XCFrameworks (Hermes 404).

## Apple: prebuilt XCFrameworks (swappable seam)

`tools/bazel/apple/xcframeworks.bzl` imports the prebuilt
`React` / `ReactNativeDependencies` / `hermes` XCFrameworks (produced by
`scripts/ios-prebuild.js`) via `apple_static_xcframework_import`, behind stable aliases
(`:React`, …). A future from-source build produces the *same* artifacts and drops in
behind these aliases with a `--//:rn_from_source` flag.

Generate the XCFrameworks with:

```sh
cd packages/react-native
node scripts/ios-prebuild.js -s -f Debug
node scripts/ios-prebuild.js -b -f Debug -p macos
node scripts/ios-prebuild.js -c -f Debug
```

## Xcode compatibility

rules_apple tracks Xcode closely. rules_apple `master` already targets Xcode 26.4; the
pinned release here is `4.5.3` (with `rules_swift` 3.6.1). If the CI/local Xcode isn't
supported by the pinned rules_apple, either bump rules_apple (5.0.0-rc / master) or select
a supported Xcode via `DEVELOPER_DIR` / `--xcode_version`. Bazel is pinned to `8.7.0`
(`.bazelversion`).

## CI and remote cache

`.github/workflows/bazel.yml` runs the green Berry-fork test on `ubuntu-latest`. It caches
Bazel's `--disk_cache` via `actions/cache` (a zero-infra remote-cache stand-in). For a
real remote cache at scale, point `--remote_cache` at **BuildBuddy** (free tier: `grpcs`
endpoint + API-key secret) or a self-hosted **bazel-remote** (GCS/S3): read-only on PRs,
read-write on trunk.

## Downstream / tarball safety

The published npm package is `react-native-macos` (`packages/react-native`); its `files`
allowlist governs the tarball. All Bazel scaffolding lives at the repo root, in
`tools/bazel/`, and in `packages/rn-tester` (which is **private**, never published), so
tarballs are unaffected. The generated `pnpm-lock.yaml` and `MODULE.bazel.lock` are
gitignored and repo-dev-only. The only change to a published-adjacent file is an empty
`pnpm.onlyBuiltDependencies: []` in the **private monorepo root** `package.json` (matching
the repo's `enableScripts: false`), which is inert for Yarn and not published.

## Future roadmap: build the XCFrameworks from source in Bazel

`Package.swift` already enumerates the full target graph (each `RNTarget` ↔ a podspec),
giving a ready-made port map. Output the same `.xcframework`s via
`apple_static_xcframework`, swapped in behind the P3 alias + `--//:rn_from_source`:

* **FA — Hermes**: keep the prebuilt Hermes (`http_archive`) initially; optionally wrap
  the CMake build with `rules_foreign_cc` later.
* **FB — ReactNativeDependencies** (boost/folly/glog/fmt/double-conversion/…): model each
  as `cc_library` (native or `rules_foreign_cc`), compose an `apple_static_xcframework`.
* **FC — Codegen in Bazel**: wrap `react-native-codegen` as a rules_js `js_run_binary`
  genrule so generated C++/ObjC specs are Bazel-tracked inputs.
* **FD — React core**: port the `Package.swift` graph leaf-first (Yoga → jsi → ReactCommon
  → React-Core / RCTUIKit → Fabric / TurboModule → RCT modules) to
  `swift_library`/`objc_library`/`cc_library`; assemble `React.xcframework`.
* **FE — Swap + validate + CI**: flip `--//:rn_from_source`, validate ABI/behavior parity
  vs the SPM XCFrameworks, and land the heavy native compiles on the remote cache (the
  primary CI/local speedup).

## Layout

```
MODULE.bazel                        # bzlmod: rules_js/ts/apple/swift + Berry fork override
.bazelrc, .bazelversion, .bazelignore
BUILD.bazel                         # npm_link_all_packages(name="node_modules")
tools/bazel/berry/
  berry_to_pnpm_lock.mjs            # Berry yarn.lock -> pnpm-lock v9 converter
  example/                          # self-contained GREEN proof of the fork
tools/bazel/patches/
  aspect_rules_js_berry.patch       # the one-seam rules_js patch
tools/bazel/js/metro.bzl            # metro_bundle macro (thin Metro wrapper)
tools/bazel/apple/xcframeworks.bzl  # import prebuilt React XCFrameworks
packages/rn-tester/BUILD.bazel      # the macOS vertical-slice app (manual, WIP)
```
