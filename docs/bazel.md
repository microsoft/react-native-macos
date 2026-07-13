# Bazel support for react-native-macos (draft / experimental)

This document describes the **experimental Bazel build** being added to
react-native-macos, why it is designed the way it is, what works today, and the
roadmap. It is intentionally additive: the existing yarn / Metro / xcodebuild / SPM /
CocoaPods workflows are unchanged.

## Goal

Provide a **full working vertical slice** at
`//packages/rn-tester/RNTester-macOS:app`: bundle rn-tester's JavaScript with Metro
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

## Scope: where Bazel earns its keep here (and where it doesn't)

Bazel is a *poor* choice for the JavaScript inner loop, and the critique in
["Bazel is incompatible with JavaScript" (pow.rs)](https://pow.rs/blog/bazel-is-incompatible-with-javascript/)
is largely fair **for that use case**. We hit its Problem 1 directly: rules_js uses a
strict, **non-hoisted, copied** `node_modules`, which is exactly why this slice needs
`tools/bazel/js/copy_tree.js` (to stage a symlink-free project dir Metro's file-map can
hash) and `first_party.bzl` (to consume first-party packages in built `dist` form
because their `src` entry points `require('../../../scripts/babel-register')` and escape
the copied tree). That is real friction and real disk/IO cost.

The important distinction: **we do not put the JS dev loop on Bazel.** `yarn`, Metro's
dev server, Jest, and JS debugging stay exactly as they are — Bazel is opt-in
(`manual`-tagged targets) and additive, so none of the day-to-day JS workflow is
affected. What Bazel is actually for here is the thing the JS ecosystem tools
(Turborepo/Nx/Lage) *cannot* do: run the **Apple toolchain**, link **XCFrameworks**,
run **codegen**, and assemble a signed **`.app`** — one reproducible, remotely-cacheable
graph over JS **and** native. Our build time is dominated by the native compiles
(Hermes, React C++), which is precisely where Bazel's action cache / RBE pays off; the
JS bundle is a small, leaf step.

Design guardrails we adopt as a result:

* **Keep the JS inner loop off Bazel.** Never make `bazel` a prerequisite for editing JS,
  running Metro, or debugging. The article's strongest point.
* **Consume artifacts at seams, don't re-Bazelify the world.** We already treat the
  XCFrameworks as prebuilt inputs; the JS bundle can be treated the same way (build it
  with plain Metro, feed the `.jsbundle` in) if the rules_js `node_modules` tax ever
  outweighs the benefit of an in-graph bundle. Prefer the `:node_modules` glob over
  hand-declaring individual packages (the article notes this keeps you correct).
* **Stay a two-way door.** Everything is additive and `manual`; no forced repo-wide
  migration. Adoption and *removal* are both cheap.
* **Mind the single Bazel server.** Bazel is massively parallel *within* a build, but one
  server per `--output_base` serializes separate `bazel` invocations ("Another Bazel
  command is running…"). Use distinct `--output_base`s for parallel lanes/CI shards
  rather than expecting two CLIs to share one. (The article's "single-threaded" framing
  conflates these — intra-build parallelism is a Bazel strength.)
* **Expect to enumerate outputs.** Declaring every generated file is inherent to Bazel's
  model (we hit it with codegen — see `rn_codegen`'s explicit `_CODEGEN_OUTS`). Use
  `out_dirs` TreeArtifacts where a step's outputs aren't statically known.

Net: use **JS-native tools (Turborepo/Nx/Lage/pnpm) for the JS package graph and dev
loop**, and **Bazel only for the native app slice** where it's genuinely better. They
coexist — Turborepo can even run inside a Bazel monorepo.

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

**`bazel build //packages/rn-tester/RNTester-macOS:app` produces a launchable macOS
RNTester `.app` on Xcode 26** — JS bundle, native host, and
prebuilt-XCFramework link. Specifically:

* `bazel test //tools/bazel/berry/example:verify` — a self-contained proof: a real Berry
  `yarn.lock` (is-odd → is-number) is translated by the fork, fetched and linked by
  rules_js, and a Node program that `require`s the npm dep runs green.
* On the **real monorepo** `yarn.lock`, `npm_translate_lock` parses the fork-generated
  lock and **fetches all 1333 packages** successfully.
* **First-party workspace linking**: every workspace package exposes a `:pkg` target
  (`npm_package`) so rules_js can link it, including `react-native-macos` (consumed as
  `react-native`).
* **rn-tester's macOS JS bundle builds *in Bazel*** — `//packages/rn-tester:rntester_macos_jsbundle`
  drives Metro (via `bazel/bundle.js`) to emit the real ~1.9 MB `RNTesterApp.macos.jsbundle`.
* **Codegen in Bazel** — `//tools/bazel/react_native:rn_tester_appspecs` builds
  `@react-native/codegen` hermetically and generates AppSpecs + `RCTAppDependencyProvider`.
* **The macOS app links + assembles** — `:RNTesterMacBazel` (`macos_application`) compiles a
  minimal `RCTReactNativeFactory` host, links the prebuilt React/hermes/ReactNativeDependencies
  XCFrameworks, and embeds the JS bundle. The resulting `.app` contains the arm64 binary,
  `Contents/Resources/RNTesterApp.macos.jsbundle`, and `Contents/Frameworks/hermes.framework`.
* **The full rn-tester host builds and launches offline** — the canonical `:app` target
  links rn-tester's *real,
  unmodified* `RNTester/AppDelegate.mm` with the Bazel-built codegen (`RCTAppDependencyProvider`
  + AppSpecs compiled into `//tools/bazel/react_native:rn_tester_appspecs_lib`), the C++
  TurboModule example (`NativeCxxModuleExample`), the Fabric `NativeComponentExample`
  (`RNTMyNativeView`), the sample TurboModules (`//packages/react-native:sample_turbo_modules`),
  and the RCTLinking/RCTPushNotification modules built from source (not in the prebuilt
  framework). Its embedded `main.jsbundle` contains the real native-example JS (no
  stubs), and no rn-tester source is modified or `#ifdef`'d out.
* **React is linked from source by default** with
  `bazel build //packages/rn-tester/RNTester-macOS:app`.
  This builds the generated 58-target SwiftPM graph, links the resulting static
  libraries into RNTester (no `React.framework` in the app), and launches offline.
  Bazel downloads SHA-pinned, ABI-compatible Hermes and ReactNativeDependencies
  bootstrap artifacts. Use `--//:rn_from_source=false` for the prebuilt-React canary.
* **Resources are complete**: Metro copies its 45 image/XML assets (including all six
  bottom-nav icons), while rules_apple compiles the macOS asset catalog/storyboard and
  embeds `Assets.car`, `AppIcon.icns`, entitlements, and `PrivacyInfo.xcprivacy`.

### Consuming the prebuilt XCFrameworks from Bazel (the header problem)

The SPM prebuild (`scripts/ios-prebuild.js`) flattens every SPM target's public headers into
`React.xcframework/…/Headers/<Module>/<basename>.h` (e.g. `Headers/React_Core/RCTBridge.h`).
But both the framework's own headers *and* app sources import them by canonical path
(`<React/RCTBridge.h>`, `<react/renderer/graphics/Float.h>`, `<jsi/jsi.h>`,
`<RCTReactNativeFactory.h>`), and the framework only ships a *partial* header set (the deep
Fabric/renderer C++ headers are missing). So the framework is not directly consumable. This
slice bridges it with two pieces:

1. **`@rn_prebuilt_xcframeworks//:React_headers`** — a repo rule runs
   `tools/bazel/apple/reconstruct_react_headers.py`, which scans the framework headers'
   `#include <…>` directives and rebuilds a canonical `-I` symlink tree for the **Obj-C**
   `<React/…>`, `<RCTDeprecation/…>`, `<RCTTypeSafety/…>`, `<RCTReactNativeFactory.h>` surface
   (disambiguating basename collisions by path-segment match). It also carries the RN
   `RCT_*` compile defines.
2. **`//packages/react-native:rn_cxx_headers`** — the complete, canonically-nested **C++**
   headers (`<react/renderer/…>`, `<ReactCommon/…>`, `<jsi/…>`, `<yoga/…>`) come from the RN
   *source* tree (same `main` version as the binary), exposed via the podspec-equivalent
   include roots (incl. the `platform/ios`, `platform/cxx`, and react-native-macos
   `platform/macos` overrides). Third-party `<folly/…>` etc. come from the
   `ReactNativeDependencies` xcframework's canonical `Headers/`.

RN's new-architecture C++ requires **C++20** (`-std=c++20`, set in `.bazelrc`).

## End-to-end RN-Tester: how the app is built

```
Berry yarn.lock ──(rules_js fork)──▶ node_modules ──(Metro)──▶ RNTesterApp.macos.jsbundle
prebuilt React.xcframework ──(reconstruct_react_headers.py)──▶ :React_headers (Obj-C hdrs)
RN source ReactCommon/** ────────────────────────────────────▶ :rn_cxx_headers (C++ hdrs)
   │
   ▼
bazel/MinimalAppDelegate.mm (RCTReactNativeFactory host)
   │  + link React/hermes/ReactNativeDependencies XCFrameworks
   ▼
macos_application :RNTesterMacBazel  ──▶  RNTesterMacBazel.app (embeds the jsbundle)
```

The minimal host (`bazel/MinimalAppDelegate.mm` + `bazel/minimal_main.m`) boots
`RCTReactNativeFactory` against the embedded bundle. It intentionally omits rn-tester's own
native example modules (NativeCxxModuleExample / RNTMyNativeView) so the app links against
only the prebuilt binaries; adding those (compiling the Phase B codegen + the example native
code) is the natural next increment toward the *full* rn-tester `AppDelegate.mm`.

### Prebuilt XCFrameworks build on Xcode 26

react-native-macos already carries the Hermes version-resolution patches
(`scripts/ios-prebuild/microsoft-hermes.js`): a release branch downloads a published Hermes;
`main` (`1000.0.0`) builds Hermes from source at the merge-base commit. Getting that working on
**Xcode 26** required two fixes in this branch:
* **Host `hermesc` mis-targeted to visionOS.** `ios-prebuild` sets `XROS_DEPLOYMENT_TARGET`
  for the cross-platform builds and it leaked into the *native* `build_host_hermesc`; Xcode 26's
  clang honors it and built the host tools for visionOS, failing llvh's `CheckAtomic`. Fixed in
  `sdks/hermes-engine/utils/build-apple-framework.sh` (force a macOS target for the host tools).
* **Upstream Hermes Mac Catalyst triple.** Hermes hardcodes an invalid universal Catalyst
  triple (`-target x86_64-arm64-apple-ios…-macabi`) that Xcode 26's clang rejects. Catalyst
  isn't needed for a macOS app, so `build-ios-framework.sh` accepts `HERMES_APPLE_PLATFORMS`
  to build a subset (e.g. `macosx`).
* Use **CMake 3.x** (`cmake@3.26.4`); Hermes doesn't configure under Homebrew-default CMake 4.x.

## What's next (increments)

* **`bazel run`**: wire an ad-hoc-signed run so the app launches directly from Bazel.
* **CI**: run the app build on the macos-26 runner reusing the prebuild artifacts.
* **From source**: build the React/hermes/ReactNativeDependencies XCFrameworks in Bazel
  (roadmap below) to drop the SPM prebuild + header reconstruction entirely.

## Apple: prebuilt XCFrameworks (swappable seam)

`tools/bazel/apple/xcframeworks.bzl` imports the prebuilt
`React` / `ReactNativeDependencies` / `hermes` XCFrameworks (produced by
`scripts/ios-prebuild.js`) via `apple_static_xcframework_import`, behind stable aliases
(`:React`, …). A future from-source build produces the *same* artifacts and drops in
behind these aliases with a `--//:rn_from_source` flag.

The default source mode does not require local XCFrameworks:

* ReactNativeDependencies 0.86.0 is downloaded from Maven with SHA-256
  `f6533c53527e75349346d07a2bba1a5cc1da4be8c41f93635a593047700b78f2`.
* Hermes comes from the RN 0.81.0 artifact with SHA-256
  `45ae8f9d4ec3e1e63813cd89487855c5dd6ebd1aeb196738008e16e16aa22fbe`.
  RN 0.81.0's `.hermesversion` names the exact `e0fc67142ec…` commit selected by
  react-native-macos's merge-base resolver. The archive's standalone macOS
  `hermes.framework` is imported because its universal XCFramework contains Apple
  mobile slices but no macOS slice.

The manual prebuild below is only needed for the
`--//:rn_from_source=false` prebuilt-React canary.

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

`.github/workflows/bazel.yml` runs the Berry-fork test on `ubuntu-latest` and the exact
RNTester source-build command on `macos-26` from a clean checkout. The macOS job checks
that no native artifacts exist before the build, then verifies the source-linked,
signed app (frameworks, bundle, native asset catalog, and Metro tab icons). It caches
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

`Package.swift` already enumerates the full target graph (each `RNTarget` ↔ a podspec).
`tools/bazel/apple/generate_spm_targets.js` now runs
`swift package dump-package`, normalizes the resolved macOS target metadata, and writes
`packages/react-native/bazel/spm_targets.bzl`. `rn_spm_native_graph()` turns those 56
targets into `spm_*` Bazel libraries without adding BUILD files throughout the React
source tree. The graph now compiles through the complete `spm_React` product (including a
Bazel-generated `FBReactNativeSpec`) using a canonical header projection generated
from source. Source mode is the default after validating a build and launch with all
local XCFrameworks hidden; `--//:rn_from_source=false` keeps the prebuilt-React canary.
Then output the same `.xcframework`s via
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

## Generating the `:pkg` BUILD files (no more boilerplate)

Most workspace packages need exactly one Bazel target: a `:pkg` `npm_package` so
`npm_link_all_packages` can link them into the copied `node_modules` (rules_js does
not hoist like Yarn), which is what lets Metro bundle first-party JS. That was ~17
identical 24-line `BUILD.bazel` files. Following the JS-ecosystem convention (derive
the build metadata from `package.json` instead of hand-authoring it — see
`docs`/research on Turborepo/Nx/Lage and Gazelle), those files are now **generated**:

* `tools/bazel/js/workspace_package.bzl` — the `rn_workspace_package()` macro; each
  generated `BUILD.bazel` is just a `load` + one call.
* `tools/bazel/js/gen_package_builds.mjs` — reads the `workspaces` globs from the root
  `package.json` and (re)writes the boilerplate files. It only owns *generator-owned*
  files (those carrying its `@generated-by` marker, or pure legacy `:pkg` boilerplate);
  any BUILD that declares other targets (`objc_library`, `cc_library`, `first_party`,
  `macos_application`, `rn_codegen`, …) is treated as hand-owned and skipped — the same
  "generate the 95%, allow local overrides" model as Gazelle's `# gazelle:` directives.

```
node tools/bazel/js/gen_package_builds.mjs            # refresh the boilerplate
node tools/bazel/js/gen_package_builds.mjs --all      # also create any missing ones
node tools/bazel/js/gen_package_builds.mjs --check     # CI: non-zero if stale
```

This is the incremental step toward full `bazel run //:gazelle`-style generation with
the Aspect JS/TS Gazelle plugin (which would also infer first-party `deps` from
imports); a custom Gazelle extension could later emit `rn_codegen`, the Metro bundle,
and the prebuilt-XCFramework targets too.

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
