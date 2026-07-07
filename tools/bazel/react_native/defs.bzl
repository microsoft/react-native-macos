load('@aspect_rules_js//js:defs.bzl', 'js_run_binary')

_CODEGEN_OUTS = [
    'build/generated/ios/AppSpecs/AppSpecs-generated.mm',
    'build/generated/ios/AppSpecs/AppSpecs.h',
    'build/generated/ios/AppSpecsJSI-generated.cpp',
    'build/generated/ios/AppSpecsJSI.h',
    'build/generated/ios/RCTAppDependencyProvider.h',
    'build/generated/ios/RCTAppDependencyProvider.mm',
    'build/generated/ios/RCTModuleProviders.h',
    'build/generated/ios/RCTModuleProviders.mm',
    'build/generated/ios/RCTModulesConformingToProtocolsProvider.h',
    'build/generated/ios/RCTModulesConformingToProtocolsProvider.mm',
    'build/generated/ios/RCTThirdPartyComponentsProvider.h',
    'build/generated/ios/RCTThirdPartyComponentsProvider.mm',
    'build/generated/ios/RCTUnstableModulesRequiringMainQueueSetupProvider.h',
    'build/generated/ios/RCTUnstableModulesRequiringMainQueueSetupProvider.mm',
    'build/generated/ios/ReactAppDependencyProvider.podspec',
    'build/generated/ios/ReactCodegen.podspec',
]

def rn_codegen(name, project_root, rn_tester_srcs, **kwargs):
    js_run_binary(
        name = name,
        srcs = rn_tester_srcs + ['//tools/bazel/react_native:codegen_lib'],
        outs = _CODEGEN_OUTS,
        out_dirs = ['build/generated/ios/react/renderer/components/AppSpecs'],
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
