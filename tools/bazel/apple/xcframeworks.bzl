"""Import the prebuilt React Native XCFrameworks into the Bazel graph.

The draft-PR slice consumes the XCFrameworks produced by the existing Swift Package
Manager prebuild pipeline (`packages/react-native/scripts/ios-prebuild.js`):

    React.xcframework, ReactNativeDependencies.xcframework, hermes.xcframework

We wrap them behind stable aliases (`:React`, `:ReactNativeDependencies`, `:hermes`)
so a future *from-source* Bazel build (see docs/bazel.md "from-source roadmap") can
produce the same `.xcframework` artifacts with rules_apple `apple_static_xcframework`
and drop in behind these aliases without touching the app BUILD files.

Usage (from a BUILD file, after running ios-prebuild so the artifacts exist):

    load("//tools/bazel/apple:xcframeworks.bzl", "rn_imported_xcframeworks")
    rn_imported_xcframeworks()
"""

load(
    "@rules_apple//apple:apple.bzl",
    "apple_static_xcframework_import",
)

# Repo-relative locations of the prebuilt XCFrameworks emitted by ios-prebuild.
_DEFAULT_XCFRAMEWORKS = {
    "React": "//packages/react-native:xcframeworks/React.xcframework",
    "ReactNativeDependencies": "//packages/react-native:xcframeworks/ReactNativeDependencies.xcframework",
    "hermes": "//packages/react-native:xcframeworks/hermes.xcframework",
}

def rn_imported_xcframeworks(xcframeworks = _DEFAULT_XCFRAMEWORKS, visibility = ["//visibility:public"]):
    """Declare `apple_static_xcframework_import` targets for the prebuilt XCFrameworks.

    Each is exposed as `:<name>` (e.g. `:React`). The underlying import target is
    `:<name>_import`; the alias makes the from-source swap seamless later.
    """
    for name, filegroup in xcframeworks.items():
        apple_static_xcframework_import(
            name = name + "_import",
            xcframework_imports = [filegroup],
            visibility = visibility,
        )
        native.alias(
            name = name,
            actual = ":" + name + "_import",
            visibility = visibility,
        )
