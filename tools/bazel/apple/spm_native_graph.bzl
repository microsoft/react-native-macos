"""Generate experimental Bazel native libraries from Package.swift metadata."""

load("//packages/react-native/bazel:spm_targets.bzl", "SPM_TARGETS")

_BINARY_DEPS = {
    "ReactNativeDependencies": [
        "@rn_prebuilt_xcframeworks//:ReactNativeDependencies",
        "@rn_prebuilt_xcframeworks//:ReactNativeDependencies_headers",
    ],
    "hermes-prebuilt": ["@rn_prebuilt_xcframeworks//:hermes"],
}

def _target_labels(name):
    target = SPM_TARGETS[name]
    if target["type"] == "binary":
        return _BINARY_DEPS[name]
    return [":" + target["bazel_name"]]

def _deps(names):
    return [label for name in names for label in _target_labels(name)]

def rn_spm_native_graph(visibility = ["//visibility:public"]):
    """Declare the native target graph resolved from Package.swift.

    Package.swift remains the source of truth. The generated metadata captures its
    target paths, source/exclude sets, dependencies, defines, header search paths,
    C++ flags, and macOS frameworks. Targets use an `spm_` prefix while this graph is
    brought up leaf-first alongside the existing prebuilt-XCFramework path.
    """
    for name in sorted(SPM_TARGETS.keys()):
        target = SPM_TARGETS[name]
        if target["type"] != "regular":
            continue

        native.objc_library(
            name = target["bazel_name"],
            srcs = native.glob(
                target["srcs"],
                exclude = target["excludes"],
                allow_empty = True,
            ),
            hdrs = native.glob(
                target["hdrs"],
                exclude = target["excludes"],
                allow_empty = True,
            ),
            copts = target["copts"],
            defines = target["defines"] + target["debug_defines"],
            includes = target["includes"],
            sdk_frameworks = target["sdk_frameworks"],
            tags = ["manual"],
            visibility = visibility,
            deps = _deps(target["deps"]),
        )
