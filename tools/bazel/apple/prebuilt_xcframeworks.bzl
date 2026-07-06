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
_DYNAMIC = {"hermes": True}

def _prebuilt_xcframeworks_impl(rctx):
    root = str(rctx.workspace_root)
    lines = [
        'load("@rules_apple//apple:apple.bzl", "apple_dynamic_xcframework_import", "apple_static_xcframework_import")',
        'package(default_visibility = ["//visibility:public"])',
        "",
    ]
    missing = []
    for name, rel in _REL_PATHS.items():
        src = "{}/{}".format(root, rel)
        if not rctx.path(src).exists:
            missing.append(rel)
            continue
        rctx.symlink(src, name + ".xcframework")
        rule = "apple_dynamic_xcframework_import" if _DYNAMIC.get(name) else "apple_static_xcframework_import"
        lines.append('{rule}(name = "{name}", xcframework_imports = glob(["{name}.xcframework/**"]))'.format(
            rule = rule,
            name = name,
        ))

    if missing:
        # Emit a target that fails at build time with guidance, rather than failing analysis.
        msg = ("Prebuilt XCFrameworks not found: {}. Build them first with " +
               "`cd packages/react-native && HERMES_APPLE_PLATFORMS=macosx node scripts/ios-prebuild.js -s -f Debug " +
               "&& node scripts/ios-prebuild.js -b -f Debug -p macos && node scripts/ios-prebuild.js -c -f Debug` " +
               "(use cmake@3.x on Xcode 26).").format(", ".join(missing))
        lines = [
            'package(default_visibility = ["//visibility:public"])',
            'genrule(name = "_missing", outs = ["missing.txt"], cmd = "echo \'{}\' >&2; exit 1")'.format(msg),
        ]
        for name in _REL_PATHS:
            lines.append('alias(name = "{name}", actual = ":_missing")'.format(name = name))

    rctx.file("BUILD.bazel", "\n".join(lines) + "\n")

prebuilt_xcframeworks = repository_rule(
    implementation = _prebuilt_xcframeworks_impl,
    doc = "Symlinks the SPM-prebuilt React Native XCFrameworks into a Bazel repo.",
    local = True,
)

def _extension_impl(_module_ctx):
    prebuilt_xcframeworks(name = "rn_prebuilt_xcframeworks")

rn_prebuilt_xcframeworks_extension = module_extension(implementation = _extension_impl)
