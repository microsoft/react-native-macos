load('@aspect_rules_js//js:defs.bzl', 'js_run_binary')

_GEN = 'build/generated/ios/'

# Top-level generated headers, consumed as `<ReactCodegen/...>` on Apple.
_TOP_HEADERS = [
    _GEN + 'AppSpecsJSI.h',
    _GEN + 'RCTModuleProviders.h',
    _GEN + 'RCTModulesConformingToProtocolsProvider.h',
    _GEN + 'RCTThirdPartyComponentsProvider.h',
    _GEN + 'RCTUnstableModulesRequiringMainQueueSetupProvider.h',
    _GEN + 'AppSpecs/AppSpecs.h',
]

# Consumed as `<ReactAppDependencyProvider/RCTAppDependencyProvider.h>`.
_APPDEP_HEADER = _GEN + 'RCTAppDependencyProvider.h'

# Fabric component headers, consumed as `<react/renderer/components/AppSpecs/...>`.
_FABRIC_HEADERS = [
    _GEN + 'react/renderer/components/AppSpecs/ComponentDescriptors.h',
    _GEN + 'react/renderer/components/AppSpecs/EventEmitters.h',
    _GEN + 'react/renderer/components/AppSpecs/Props.h',
    _GEN + 'react/renderer/components/AppSpecs/RCTComponentViewHelpers.h',
    _GEN + 'react/renderer/components/AppSpecs/ShadowNodes.h',
    _GEN + 'react/renderer/components/AppSpecs/States.h',
]

_SOURCES = [
    _GEN + 'RCTAppDependencyProvider.mm',
    _GEN + 'RCTModuleProviders.mm',
    _GEN + 'RCTModulesConformingToProtocolsProvider.mm',
    _GEN + 'RCTThirdPartyComponentsProvider.mm',
    _GEN + 'RCTUnstableModulesRequiringMainQueueSetupProvider.mm',
    _GEN + 'AppSpecs/AppSpecs-generated.mm',
    _GEN + 'AppSpecsJSI-generated.cpp',
    _GEN + 'react/renderer/components/AppSpecs/ComponentDescriptors.cpp',
    _GEN + 'react/renderer/components/AppSpecs/EventEmitters.cpp',
    _GEN + 'react/renderer/components/AppSpecs/Props.cpp',
    _GEN + 'react/renderer/components/AppSpecs/ShadowNodes.cpp',
    _GEN + 'react/renderer/components/AppSpecs/States.cpp',
]

_PODSPECS = [
    _GEN + 'ReactAppDependencyProvider.podspec',
    _GEN + 'ReactCodegen.podspec',
]

_CODEGEN_OUTS = _TOP_HEADERS + [_APPDEP_HEADER] + _FABRIC_HEADERS + _SOURCES + _PODSPECS

_HEADER_DEPS = [
    '//packages/react-native:rn_cxx_headers',
    '@rn_prebuilt_xcframeworks//:ReactNativeDependencies_headers',
] + select({
    '//:rn_from_source_enabled': ['@rn_source_headers//:headers'],
    '//conditions:default': ['@rn_prebuilt_xcframeworks//:React_headers'],
})

def rn_codegen(name, project_root, rn_tester_srcs, **kwargs):
    """Generate rn-tester's codegen (AppSpecs + providers) and compile it.

    Produces:
      * `<name>` -- the raw generated files (js_run_binary).
      * `<name>_lib` -- an objc_library compiling the generated providers + AppSpecs,
        exposing `<ReactCodegen/...>`, `<ReactAppDependencyProvider/...>` and
        `<react/renderer/components/AppSpecs/...>` to the app.
    """
    js_run_binary(
        name = name,
        srcs = rn_tester_srcs + ['//tools/bazel/react_native:codegen_lib'],
        outs = _CODEGEN_OUTS,
        env = {
            'PROJECT_ROOT': project_root,
            'OUTPUT_DIR': '$(RULEDIR)',
            'TARGET_PLATFORM': 'ios',
            'SOURCE': 'app',
            'CODEGEN_LIB_DIR': '$(location //tools/bazel/react_native:codegen_lib)',
        },
        tool = '//tools/bazel/react_native:codegen_runner_bin',
        **kwargs
    )

    native.cc_library(
        name = name + '_reactcodegen_hdrs',
        hdrs = _TOP_HEADERS,
        strip_include_prefix = 'build/generated/ios',
        include_prefix = 'ReactCodegen',
        tags = ['manual'],
    )
    native.cc_library(
        name = name + '_appdep_hdrs',
        hdrs = [_APPDEP_HEADER],
        strip_include_prefix = 'build/generated/ios',
        include_prefix = 'ReactAppDependencyProvider',
        tags = ['manual'],
    )
    native.cc_library(
        name = name + '_fabric_hdrs',
        hdrs = _FABRIC_HEADERS,
        strip_include_prefix = 'build/generated/ios',
        tags = ['manual'],
    )

    native.objc_library(
        name = name + '_lib',
        srcs = _SOURCES,
        deps = [
            ':' + name + '_reactcodegen_hdrs',
            ':' + name + '_appdep_hdrs',
            ':' + name + '_fabric_hdrs',
        ] + _HEADER_DEPS,
        tags = ['manual'],
    )
