"""Expose the SPM-prebuilt React Native XCFrameworks to Bazel.

The XCFrameworks produced by `scripts/ios-prebuild.js` live under
`packages/react-native/.build` and `third-party/` (build outputs, gitignored, and in
`.bazelignore`). This repository rule symlinks them into an external repo and exposes
`apple_*_xcframework_import` targets so the Bazel `macos_application` can link them.

If the XCFrameworks are missing (e.g. a clean checkout / CI before the prebuild), the
generated targets fail with an actionable message instead of breaking analysis of the
whole repo.
"""

_REL_PATHS = {
    "React": "packages/react-native/.build/output/xcframeworks/Debug/React.xcframework",
    "ReactNativeDependencies": "packages/react-native/third-party/ReactNativeDependencies.xcframework",
    "hermes": "packages/react-native/.build/artifacts/hermes/destroot/Library/Frameworks/universal/hermes.xcframework",
}

# hermes ships as a dynamic framework; React + deps are static.
# The SPM prebuild ships all three as dynamic frameworks (dylibs), so they must be
# imported as dynamic and embedded in the app's Contents/Frameworks (otherwise dyld
# fails at launch with "Library not loaded: @rpath/React.framework/...").
_DYNAMIC = {"React": True, "ReactNativeDependencies": True, "hermes": True}

_REACT_NATIVE_DEPENDENCIES_URL = "https://repo1.maven.org/maven2/com/facebook/react/react-native-artifacts/0.86.0/react-native-artifacts-0.86.0-reactnative-dependencies-debug.tar.gz"
_REACT_NATIVE_DEPENDENCIES_SHA256 = "f6533c53527e75349346d07a2bba1a5cc1da4be8c41f93635a593047700b78f2"
_HERMES_URL = "https://repo1.maven.org/maven2/com/facebook/react/react-native-artifacts/0.81.0/react-native-artifacts-0.81.0-hermes-ios-debug.tar.gz"
_HERMES_SHA256 = "45ae8f9d4ec3e1e63813cd89487855c5dd6ebd1aeb196738008e16e16aa22fbe"

def _prebuilt_xcframeworks_impl(rctx):
    root = str(rctx.workspace_root)
    lines = [
        'load("@rules_apple//apple:apple.bzl", "apple_dynamic_framework_import", "apple_dynamic_xcframework_import", "apple_static_xcframework_import")',
        'package(default_visibility = ["//visibility:public"])',
        "",
    ]
    missing = []
    available = {}
    downloaded_hermes_framework = False
    for name, rel in _REL_PATHS.items():
        src = "{}/{}".format(root, rel)
        if rctx.path(src).exists:
            rctx.symlink(src, name + ".xcframework")
            available[name] = True
        elif name == "ReactNativeDependencies":
            rctx.download_and_extract(
                url = _REACT_NATIVE_DEPENDENCIES_URL,
                output = name + ".xcframework",
                sha256 = _REACT_NATIVE_DEPENDENCIES_SHA256,
                stripPrefix = "packages/react-native/third-party/ReactNativeDependencies.xcframework",
            )
            available[name] = True
        elif name == "hermes":
            rctx.download_and_extract(
                url = _HERMES_URL,
                output = "hermes_artifact",
                sha256 = _HERMES_SHA256,
                stripPrefix = "destroot",
            )
            rctx.symlink(
                rctx.path("hermes_artifact/Library/Frameworks/macosx/hermes.framework"),
                "hermes.framework",
            )
            available[name] = True
            downloaded_hermes_framework = True
        else:
            missing.append(rel)
            continue
        if name == "hermes" and downloaded_hermes_framework:
            lines.append('apple_dynamic_framework_import(name = "hermes", framework_imports = glob(["hermes.framework/**"]))')
        else:
            rule = "apple_dynamic_xcframework_import" if _DYNAMIC.get(name) else "apple_static_xcframework_import"
            lines.append('{rule}(name = "{name}", xcframework_imports = glob(["{name}.xcframework/**"]))'.format(
                rule = rule,
                name = name,
            ))

    # ReactNativeDependencies ships canonical, nested third-party headers
    # (folly/, boost/, glog/, fmt/, double-conversion/, fast_float/) at the
    # xcframework root `Headers/`. Expose them on the include path so C++ sources
    # that pull `<folly/...>` etc. compile.
    if available.get("ReactNativeDependencies"):
        lines.append("""
cc_library(
    name = "ReactNativeDependencies_headers",
    hdrs = glob(["ReactNativeDependencies.xcframework/Headers/**"], allow_empty = True),
    includes = ["ReactNativeDependencies.xcframework/Headers"],
)
""")

    if available.get("hermes"):
        hermes_headers = "{}/packages/react-native/.build/artifacts/hermes/destroot/include".format(root)
        if not rctx.path(hermes_headers).exists:
            hermes_headers = rctx.path("hermes_artifact/include")
        if rctx.path(hermes_headers).exists:
            rctx.symlink(hermes_headers, "hermes_headers")
            lines.append("""
cc_library(
    name = "hermes_headers",
    hdrs = glob(["hermes_headers/**"], allow_empty = True),
    includes = ["hermes_headers"],
)
""")

    # The React.xcframework flattens each SPM target's public headers into
    # `Headers/<Module>/<basename>.h`, which breaks the canonical `<React/...>`,
    # `<react/renderer/...>`, `<jsi/...>` imports used by both the framework's own
    # headers and app sources. Reconstruct a canonical `-I` tree of symlinks so the
    # headers are consumable from Bazel, and expose it as `:React_headers`.
    if available.get("React"):
        script = rctx.path(Label("//tools/bazel/apple:reconstruct_react_headers.py"))
        slice_dir = None
        for entry in rctx.path("React.xcframework").readdir():
            if entry.basename.startswith("macos-"):
                slice_dir = entry.basename
                break
        if slice_dir:
            fw_headers = "React.xcframework/{}/React.framework/Headers".format(slice_dir)
            res = rctx.execute(["python3", str(script), fw_headers, "flat_headers"], quiet = True)
            if res.return_code != 0:
                fail("reconstruct_react_headers failed: {}".format(res.stderr))
            lines.append("""
cc_library(
    name = "React_headers",
    hdrs = glob(["flat_headers/**"], allow_empty = True),
    includes = ["flat_headers"],
    defines = [
        "RCT_DEV=1",
        "RCT_ENABLE_INSPECTOR=1",
        "RCT_REMOTE_PROFILE=0",
        "RCT_PROFILE=0",
        "RCT_NEW_ARCH_ENABLED=1",
    ],
)
""")

    if missing:
        # Emit independent failure targets so source mode can omit React.xcframework
        # while still consuming downloaded RNDependencies and a separately-built Hermes.
        for name, rel in _REL_PATHS.items():
            if available.get(name):
                continue
            msg = ("Prebuilt XCFramework not found: {}. Build native artifacts with " +
                   "`cd packages/react-native && HERMES_APPLE_PLATFORMS=macosx node scripts/ios-prebuild.js -s -f Debug " +
                   "&& node scripts/ios-prebuild.js -b -f Debug -p macos && node scripts/ios-prebuild.js -c -f Debug` " +
                   "(use cmake@3.x on Xcode 26).").format(rel)
            missing_target = "_missing_" + name
            lines.append('genrule(name = "{target}", outs = ["{target}.txt"], cmd = "echo \'{msg}\' >&2; exit 1")'.format(
                target = missing_target,
                msg = msg,
            ))
            lines.append('alias(name = "{name}", actual = ":{target}")'.format(
                name = name,
                target = missing_target,
            ))
            if name == "React":
                lines.append('alias(name = "React_headers", actual = ":{target}")'.format(target = missing_target))
            elif name == "hermes":
                lines.append('alias(name = "hermes_headers", actual = ":{target}")'.format(target = missing_target))

    rctx.file("BUILD.bazel", "\n".join(lines) + "\n")

prebuilt_xcframeworks = repository_rule(
    implementation = _prebuilt_xcframeworks_impl,
    doc = "Symlinks the SPM-prebuilt React Native XCFrameworks into a Bazel repo.",
    local = True,
)

def _extension_impl(_module_ctx):
    prebuilt_xcframeworks(name = "rn_prebuilt_xcframeworks")

rn_prebuilt_xcframeworks_extension = module_extension(implementation = _extension_impl)
