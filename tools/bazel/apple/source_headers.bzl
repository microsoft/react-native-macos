"""Expose a canonical React Native header tree generated from source."""

def _source_headers_impl(rctx):
    root = str(rctx.workspace_root)
    script = rctx.path(Label("//tools/bazel/apple:reconstruct_react_headers.py"))
    source_root = "{}/packages/react-native".format(root)
    rctx.watch(script)
    rctx.watch_tree(source_root)
    result = rctx.execute(
        [
            "python3",
            str(script),
            source_root,
            "headers",
            "--include-source-prefixes",
        ],
        quiet = True,
    )
    if result.return_code != 0:
        fail("source header reconstruction failed: {}".format(result.stderr))

    rctx.file("BUILD.bazel", """
package(default_visibility = ["//visibility:public"])

cc_library(
    name = "headers",
    hdrs = glob(["headers/**"], allow_empty = True),
    includes = ["headers", "headers/React"],
    defines = [
        "RCT_DEV=1",
        "RCT_ENABLE_INSPECTOR=1",
        "RCT_REMOTE_PROFILE=0",
        "RCT_PROFILE=0",
        "RCT_NEW_ARCH_ENABLED=1",
    ],
)
""")

source_headers = repository_rule(
    implementation = _source_headers_impl,
    doc = "Reconstructs canonical React/ReactCommon/C++ header paths from source.",
    local = True,
)

def _extension_impl(_module_ctx):
    source_headers(name = "rn_source_headers")

rn_source_headers_extension = module_extension(implementation = _extension_impl)
