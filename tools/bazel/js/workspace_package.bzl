"""Convention macro for a first-party workspace package.

Most workspace packages need exactly one thing from Bazel: expose their files as a
`:pkg` `npm_package` so `npm_link_all_packages` can link them into the copied
`node_modules` (rules_js does not hoist like Yarn), which is what lets Metro bundle
first-party JS. That boilerplate was duplicated in ~17 identical `BUILD.bazel`
files; this macro collapses it to a single call so those files can be *generated*
(see tools/bazel/js/gen_package_builds.mjs) instead of hand-maintained.

Usage (the entire BUILD.bazel of a leaf workspace package):

    load("//tools/bazel/js:workspace_package.bzl", "rn_workspace_package")
    rn_workspace_package()
"""

load("@aspect_rules_js//npm:defs.bzl", "npm_package")
load("@npm//:defs.bzl", "npm_link_all_packages")

# Build outputs / tooling that must never end up in a package tarball.
_DEFAULT_EXCLUDES = [
    "**/node_modules/**",
    "**/.build/**",
    "**/build/**",
    "**/Pods/**",
    "**/__tests__/**",
    "**/*.bazel",
]

def rn_workspace_package(name = "pkg", srcs = None, exclude = None, visibility = ["//visibility:public"], **kwargs):
    """Link this package's deps and expose it as `:<name>` (default `:pkg`).

    Args:
      name: npm_package target name (default "pkg").
      srcs: optional explicit srcs; defaults to a sensible glob of the package.
      exclude: optional extra glob excludes appended to the defaults.
      visibility: target visibility.
      **kwargs: forwarded to npm_package.
    """
    npm_link_all_packages()
    npm_package(
        name = name,
        srcs = srcs if srcs != None else native.glob(
            ["**/*"],
            exclude = _DEFAULT_EXCLUDES + (exclude or []),
            allow_empty = True,
        ),
        visibility = visibility,
        **kwargs
    )
