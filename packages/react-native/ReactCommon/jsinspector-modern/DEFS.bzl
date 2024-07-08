load("@fbsource//tools/build_defs:buckconfig.bzl", "read_bool")
load("@fbsource//tools/build_defs/buck2:is_buck2.bzl", "is_buck2")
load("@fbsource//tools/build_defs/oss:rn_defs.bzl", "react_native_xplat_target")

FLAG_FORCE_ENABLE = "-DREACT_NATIVE_FORCE_ENABLE_FUSEBOX"
FLAG_FORCE_DISABLE = "-DREACT_NATIVE_FORCE_DISABLE_FUSEBOX"
FLAG_ENABLE_DEBUG = "-DREACT_NATIVE_ENABLE_FUSEBOX_DEBUG"

# Get the Fusebox preprocessor flags to apply based on the active build
# settings. We support per-app feature toggling as well as per-user opt-in/out
# overridding this.
def get_fusebox_enabled_flags():
    force_enable_fusebox = read_bool("react_native", "force_enable_fusebox", False)
    force_disable_fusebox = read_bool("react_native", "force_disable_fusebox", False)

    if force_enable_fusebox and force_disable_fusebox:
        fail(
            "Cannot force enable and disable Fusebox at the same time. " +
            "Please supply only one of @//xplat/mode/react-fusebox or " +
            "@//xplat/mode/no-react-fusebox.",
        )

    if force_enable_fusebox:
        return [FLAG_FORCE_ENABLE]
    if force_disable_fusebox:
        return [FLAG_FORCE_DISABLE]

    # Temporarily wrapped with is_buck2 to mitigate S429627
    return select({
        react_native_xplat_target("jsinspector-modern/settings:enable_fusebox_debug"): [FLAG_ENABLE_DEBUG],
        "DEFAULT": [],
    }) if is_buck2() else []
