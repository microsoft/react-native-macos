// @ts-check

/** @type {import('@yarnpkg/types')} */
const {defineConfig} = require('@yarnpkg/types');

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Context} Context
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 */

// Helpers

// These packages in tools/ were private upstream in React Native and don't follow the same versioning as the public packages
const PACKAGES_TO_IGNORE = ['@react-native/eslint', 'public-api'];

/**
 * Get the React Native macOS workspace
 * @param {Context} context
 * @returns {Workspace | null} Workspace
 */
const getReactNativeMacOSWorkspace = ({Yarn}) => {
    const rnmWorkspace = Yarn.workspace({ident: 'react-native-macos'});
    if (!rnmWorkspace) {
        // Report error on root workspace since react-native-macos doesn't exist
        Yarn.workspace().error('react-native-macos workspace must exist in the monorepo');
    }
    return rnmWorkspace;
}

/**
 * Get the peer dependency on react-native declared by react-native-macos
 * @param {Context} context
 * @returns {string | undefined} Peer dependency version
 */
const getReactNativePeerDependency = ({Yarn}) => {
    const rnmWorkspace = getReactNativeMacOSWorkspace({Yarn});

    const rnPeerDependency = rnmWorkspace?.pkg.peerDependencies.get('react-native');
    if (!rnPeerDependency) {
        rnmWorkspace?.error('react-native-macos must declare a peer dependency on react-native on release branches');
    }
    return rnPeerDependency;
}

/**
 * // Check if react-native-macos version is 1000.0.0, implying we are on the main branch
 * @param {Context} context
 * @returns {boolean}
 */
const isMainBranch = ({Yarn}) => {
    const rnmWorkspace = getReactNativeMacOSWorkspace({Yarn});
    return rnmWorkspace?.manifest.version === '1000.0.0';
}

// Constraints

/**
 * Enforce that all @react-native/ scoped packages are private
 * @param {Context} context
 */
function enforcePrivateReactNativeScopedPackages({Yarn}) {
    for (const dependency of Yarn.dependencies()) {
        if (dependency.ident.startsWith('@react-native/')) {
            Yarn.workspace({ident: dependency.ident})?.set('private', true);
        }
    }  
}

/**
 * Enforce that react-native-macos declares a peer dependency on react-native on release branches,
 * and that this version is consistent across all @react-native/ scoped packages.
 * Do not enforce on the main branch, where there is no published version of React Native to align to.
 * @param {Context} context
 */
function enforceReactNativeVersionConsistency({Yarn}) {
    if (!isMainBranch({Yarn})) {
        const reactNativePeerDependency = getReactNativePeerDependency({Yarn});

        // Enforce this version on all @react-native/ scoped packages
        for (const workspace of Yarn.workspaces()) {
            if (workspace.ident?.startsWith('@react-native/') && !PACKAGES_TO_IGNORE.includes(workspace.ident)) {
                workspace.set('version', reactNativePeerDependency);
            }
        }
    }
}

/**
 * Enforce that all @react-native/ scoped dependencies use the same version
 * as the react-native peer dependency declared in react-native-macos.
 * Do not enforce on the main branch, where there is no published version of React Native to align to.
 * @param {Context} context
 */
function enforceReactNativeDependencyConsistency({Yarn}) {
    for (const dependency of Yarn.dependencies()) {
        if (dependency.ident.startsWith('@react-native/')) {                
            if (!isMainBranch({Yarn})) {
                const reactNativeVersion = getReactNativePeerDependency({Yarn});

                const isRNM = dependency.workspace.ident === 'react-native-macos';
                const isRNMForkedPackage = dependency.workspace.ident?.startsWith('@react-native-macos/');

                if (isRNM || isRNMForkedPackage) {
                    // Don't use `workspace:*` for packages we publish until nx release with Yarn 4 supports it.
                    dependency.update(reactNativeVersion);
                } else {
                    dependency.update('workspace:*');
                }
            } else {
                dependency.update('workspace:*');
            }
        }
    }
}

/**
 * Enforce that all public @react-native-macos/ scoped packages' versions 
 * are consistent with react-native-macos
 * Do not enforce on the main branch, where we do not publish nightlies yet.
 * @param {Context} context
 */
function enforceReactNativeMacosVersionConsistency({Yarn}) {
    if (!isMainBranch({Yarn})) {
        const rnmWorkspace = getReactNativeMacOSWorkspace({Yarn});
        const rnmVersion = rnmWorkspace?.manifest.version;

        // Enforce this version on all non-private @react-native-macos/ scoped packages
        for (const workspace of Yarn.workspaces()) {
            const isReactNativeMacosScoped = workspace.ident && workspace.ident.startsWith('@react-native-macos/');
            const isPrivate = workspace.manifest.private;
            
            if (isReactNativeMacosScoped && !isPrivate) {
                workspace.set('version', rnmVersion);
            }
        }
    }   
}

/**
 * Enforce that all @react-native-macos/ scoped dependencies use the same version
 * as the react-native-macos
 * Do not enforce on the main branch, where there is no published version of React Native to align to.
 * @param {Context} context
 */
function enforceReactNativeMacOSDependencyConsistency({Yarn}) {
    const rnmWorkspace = getReactNativeMacOSWorkspace({Yarn});
    const rnmVersion = rnmWorkspace?.manifest.version;

    for (const dependency of Yarn.dependencies()) {
        if (dependency.ident.startsWith('@react-native-macos/')) {
            if (!isMainBranch({Yarn})) {
                dependency.update(rnmVersion);
            } else {
                dependency.update('workspace:*');
            }
        }
    }
}

module.exports = defineConfig({
  constraints: async ctx => {
    enforcePrivateReactNativeScopedPackages(ctx);
    enforceReactNativeVersionConsistency(ctx);
    enforceReactNativeDependencyConsistency(ctx);
    enforceReactNativeMacosVersionConsistency(ctx);
    enforceReactNativeMacOSDependencyConsistency(ctx);
  },
});