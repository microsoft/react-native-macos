"""Helpers for exposing built first-party JS workspace packages to rules_js."""

load("@aspect_rules_js//js:defs.bzl", "js_run_binary")
load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("@npm//:defs.bzl", "npm_link_all_packages")

_EXCLUDES = [
    "**/node_modules/**",
    "**/.build/**",
    "**/build/**",
    "**/dist/**",
    "**/lib/**",
    "**/Pods/**",
    "**/__tests__/**",
    "**/__test_fixtures__/**",
    "**/__fixtures__/**",
    "**/*.bazel",
]

def first_party_js_package(name = "pkg", build_kind = "monorepo", visibility = None):
    """Build a first-party package before linking it into Bazel node_modules."""
    npm_link_all_packages()

    built_dir = name + "_built"
    js_run_binary(
        name = name + "_build",
        tool = "//tools/bazel/js:build_first_party",
        srcs = native.glob(["**/*"], exclude = _EXCLUDES, allow_empty = True),
        args = [
            native.package_name(),
            build_kind,
            native.package_name() + "/" + built_dir,
        ],
        out_dirs = [built_dir],
    )

    npm_package(
        name = name,
        srcs = [":" + name + "_build"],
        root_paths = [native.package_name() + "/" + built_dir],
        visibility = visibility,
    )
