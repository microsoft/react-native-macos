"""Generate experimental Bazel native libraries from Package.swift metadata."""

load("//packages/react-native/bazel:spm_targets.bzl", "SPM_TARGETS")

_BINARY_DEPS = {
    "ReactNativeDependencies": [
        "@rn_prebuilt_xcframeworks//:ReactNativeDependencies",
        "@rn_prebuilt_xcframeworks//:ReactNativeDependencies_headers",
    ],
    "hermes-prebuilt": [
        "@rn_prebuilt_xcframeworks//:hermes",
        "@rn_prebuilt_xcframeworks//:hermes_headers",
    ],
}

_SOURCE_HEADER_BRIDGE = [
    "//tools/bazel/react_native:fbreactnativespec",
    "@rn_source_headers//:headers",
]

_SDK_FRAMEWORK_OVERRIDES = {
    "React-Core": ["CoreImage", "QuartzCore"],
    "React-RCTFabric": ["UniformTypeIdentifiers"],
    "React-RCTUIKit": ["CoreVideo", "QuartzCore"],
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
            # C++20 is set with --per_file_copt in .bazelrc so it is not passed
            # to plain Objective-C sources in mixed SwiftPM targets.
            copts = [flag for flag in target["copts"] if flag != "-std=c++20"],
            defines = target["defines"] + target["debug_defines"],
            includes = target["includes"],
            sdk_frameworks = target["sdk_frameworks"] + _SDK_FRAMEWORK_OVERRIDES.get(name, []),
            tags = ["manual"],
            visibility = visibility,
            deps = _SOURCE_HEADER_BRIDGE + _deps(target["deps"]),
        )

    # Package.swift's dynamic `React` product contains every regular target, not
    # merely the dependency closure of React-RCTAppDelegate.
    native.objc_library(
        name = "spm_React",
        tags = ["manual"],
        visibility = visibility,
        deps = [
            ":" + target["bazel_name"]
            for target in SPM_TARGETS.values()
            if target["type"] == "regular"
        ],
    )
