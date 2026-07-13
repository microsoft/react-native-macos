"""Bazel wrapper for bundling React Native JavaScript with Metro.

We deliberately drive the existing Metro/React Native CLI from Bazel via
`js_run_binary` (rules_js) rather than reimplementing Metro's transform/worker
pipeline the way Buck2's `js_bundle` prelude does. This keeps the rule tiny while
reusing the exact bundler the rest of the repo already uses. See docs/bazel.md.
"""

load("@aspect_rules_js//js:defs.bzl", "js_run_binary")

def metro_bundle(
        name,
        entry_point,
        platform,
        srcs,
        deps = [],
        config = None,
        dev = False,
        minify = None,
        bundle_out = None,
        assets_out = None,
        **kwargs):
    """Produce a `.jsbundle` (+ assets dir) from a React Native entry point.

    Args:
        name: target name; also the default bundle basename.
        entry_point: JS entry file (e.g. `js/RNTesterApp.macos.js`).
        platform: React Native platform (`macos`, `ios`, `android`, ...).
        srcs: JS/asset source files that make up the app.
        deps: additional targets (e.g. linked first-party packages / node_modules).
        config: optional `metro.config.js` target.
        dev: whether to build a dev (unminified, with warnings) bundle.
        minify: override minification (defaults to `not dev`).
        bundle_out: output bundle filename (default `<name>.jsbundle`).
        assets_out: output assets directory (default `<name>_assets`).
        **kwargs: passed through to js_run_binary (e.g. tags, visibility).
    """
    bundle_out = bundle_out or (name + ".jsbundle")
    assets_out = assets_out or (name + "_assets")
    minify = minify if minify != None else (not dev)

    args = [
        "bundle",
        "--platform",
        platform,
        "--dev",
        "true" if dev else "false",
        "--minify",
        "true" if minify else "false",
        "--entry-file",
        entry_point,
        "--bundle-output",
        bundle_out,
        "--assets-dest",
        assets_out,
        "--reset-cache",
    ]
    tool_srcs = list(srcs) + list(deps)
    if config:
        args += ["--config", "$(rootpath %s)" % config]
        tool_srcs.append(config)

    js_run_binary(
        name = name,
        # The React Native community CLI exposes the `bundle` command. This is a
        # first-party workspace package; linking it requires the per-package
        # BUILD.bazel migration described in docs/bazel.md.
        tool = "//:node_modules/react-native/bin",
        srcs = tool_srcs,
        args = args,
        outs = [bundle_out],
        out_dirs = [assets_out],
        **kwargs
    )
