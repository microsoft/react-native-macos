// @ts-check

/** @type {import('@yarnpkg/types')} */
const {defineConfig} = require('@yarnpkg/types');

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Context} Context
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 */

const IGNORE_CONSISTENT_DEPENDENCIES_FOR = new Set([
  `.`,
  `packages/docusaurus`,
]);

/**
 * This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
 * We allow Docusaurus to have different dependencies for now; will be addressed later (when we remove Gatsby)
 * @param {Context} context
 */
function enforceConsistentDependenciesAcrossTheProject({Yarn}) {
  for (const dependency of Yarn.dependencies()) {
    if (IGNORE_CONSISTENT_DEPENDENCIES_FOR.has(dependency.workspace.cwd))
      continue;

    if (dependency.type === `peerDependencies`)
      continue;

    for (const otherDependency of Yarn.dependencies({ident: dependency.ident})) {
      if (IGNORE_CONSISTENT_DEPENDENCIES_FOR.has(otherDependency.workspace.cwd))
        continue;

      if (otherDependency.type === `peerDependencies`)
        continue;

      if ((dependency.type === `devDependencies` || otherDependency.type === `devDependencies`) && Yarn.workspace({ident: otherDependency.ident}))
        continue;

      dependency.update(otherDependency.range);
    }
  }
}

/**
 * This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
 * We allow Docusaurus to have different dependencies for now; will be addressed later (when we remove Gatsby)
 * @param {Context} context
 */
function enforceWorkspaceDependenciesWhenPossible({Yarn}) {
  for (const dependency of Yarn.dependencies()) {
    if (!Yarn.workspace({ident: dependency.ident}))
      continue;

    dependency.update(`workspace:*`);
  }
}

/**
 * @param {Context} context
 * @param {string} ident
 * @param {string} explanation
 */
function forbidDependency({Yarn}, ident, explanation) {
  for (const dependency of Yarn.dependencies({ident})) {
    dependency.error(explanation);
  }
}

/**
 * @param {Context} context
 * @param {Record<string, ((workspace: Workspace) => any) | string>} fields
 */
function enforceFieldsOnAllWorkspaces({Yarn}, fields) {
  for (const workspace of Yarn.workspaces()) {
    for (const [field, value] of Object.entries(fields)) {
      workspace.set(field, typeof value === `function` ? value(workspace) : value);
    }
  }
}

/**
 * @param {Context} context
 * @param {string} ident
 * @param {string} otherIdent
 * @param {boolean} mustExist
 */
function enforceDependencyRelationship({Yarn}, ident, otherIdent, mustExist) {
  for (const dependency of Yarn.dependencies({ident})) {
    if (dependency.type === `peerDependencies`)
      continue;

    const hasOtherDependency = Yarn.dependency({
      workspace: dependency.workspace,
      ident: otherIdent,
    });

    if (mustExist) {
      if (hasOtherDependency)
        continue;

      dependency.error(`The presence of ${ident} in ${dependency.type} mandates the presence of ${otherIdent}`);
    } else {
      if (!hasOtherDependency)
        continue;

      dependency.error(`The presence of ${ident} in ${dependency.type} forbids the presence of ${otherIdent}`);
    }
  }
}


/**
 * Validate that all peer dependencies are provided. If one isn't, the
 * constraint will try to fix it by looking at what's used in the other
 * workspaces of the project. If it doesn't find any way to satisfy the
 * dependency, it will generate an error.
 *
 * @param {Context} context
 */
function enforcePeerDependencyPresence({Yarn}) {
  for (const workspace of Yarn.workspaces()) {
    // The Gatsby website is pretty much deprecated anyway
    if (workspace.cwd === `packages/gatsby`)
      continue;

    for (const dependency of Yarn.dependencies({workspace})) {
      if (dependency.type === `peerDependencies`)
        continue;

      if (!dependency.resolution)
        continue;

      for (const peerName of dependency.resolution.peerDependencies.keys()) {
        // Webpack plugins have peer dependencies but don't often need it; weird
        if (peerName === `webpack`)
          continue;

        if (dependency.resolution.dependencies.has(peerName))
          continue;

        const otherDeps = Yarn.dependencies({ident: peerName})
          .filter(otherDep => otherDep.type !== `peerDependencies`);

        if (otherDeps.length === 0)
          workspace.error(`Missing dependency on ${peerName} (required by ${dependency.ident})`);

        // If the workspace has itself a peer dependency of the same name, then
        // we assume that it'll be fulfilled by its ancestors in the dependency
        // tree, so we only need to add the dependency to devDependencies.
        const autofixTarget = Yarn.dependency({workspace, ident: peerName, type: `peerDependencies`})
          ? `devDependencies`
          : `dependencies`;

        for (const otherDep of otherDeps) {
          workspace.set([autofixTarget, peerName], otherDep.range);
        }
      }
    }
  }
}

/**
 * Enforce that react-native-macos declares a peer dependency on react-native on release branches,
 * except on the main branch, where there is no published version of React Native to align to.
 * @param {Context} context
 */
function expectReactNativePeerDependency({Yarn}) {
    const rnmWorkspace = Yarn.workspace({ident: 'react-native-macos'});
    if (!rnmWorkspace) {
        // Report error on root workspace since react-native-macos doesn't exist
        Yarn.workspace().error('react-native-macos workspace must exist in the monorepo');
        return;
    }

    // Check if react-native-macos version is 1000.0.0 - implying we are on the main branch
    const isMainBranch = rnmWorkspace.manifest.version === '1000.0.0';
    if (!isMainBranch) {
        const rnPeerDependency = rnmWorkspace.pkg.peerDependencies.get('react-native');
        if (!rnPeerDependency) {
            rnmWorkspace.error('react-native-macos must declare a peer dependency on react-native on release branches');
        }
    }
}

/**
 * Enforce that all @react-native/ scoped packages use the same version
 * as the react-native peer dependency declared in react-native-macos.
 * On the main branch, enforce that we use workspace:* for @react-native/ packages.
 * @param {Context} context
 */
function enforceReactNativeVersionConsistency({Yarn}) {
    const rnmWorkspace = Yarn.workspace({ident: 'react-native-macos'});
    if (!rnmWorkspace) {
        // Report error on root workspace since react-native-macos doesn't exist
        Yarn.workspace().error('react-native-macos workspace must exist in the monorepo');
        return;
    }

    // Check if react-native-macos version is 1000.0.0 - implying we are on the main branch
    const isMainBranch = rnmWorkspace.manifest.version === '1000.0.0';
    
    let targetVersion;
    if (isMainBranch) {
        // On main branch, use workspace:* for @react-native/ packages
        targetVersion = 'workspace:*';
    } else {
        const rnPeerDependency = rnmWorkspace.pkg.peerDependencies.get('react-native');
        if (!rnPeerDependency) {
            rnmWorkspace.error('react-native-macos must declare a peer dependency on react-native on release branches');
            return;
        }
        targetVersion = rnPeerDependency;
    }    // Enforce this version on all @react-native/ scoped packages across all workspaces
    for (const dependency of Yarn.dependencies()) {
        if (dependency.ident.startsWith('@react-native/')) {
            // Check if the target package is private (not published)
            const targetWorkspace = Yarn.workspace({ident: dependency.ident});
            const isPrivatePackage = targetWorkspace && targetWorkspace.manifest.private;
            
            if (isPrivatePackage) {
                // Private packages should always use workspace:* since they're not published
                dependency.update('workspace:*');
            } else {
                dependency.update(targetVersion);
            }
        }
    }
}

/**
 * Enforce that all @react-native-macos/ scoped packages use the same version
 * as react-native-macos, but only for non-private packages.
 * @param {Context} context
 */
function enforceReactNativeMacosVersionConsistency({Yarn}) {
    const rnmWorkspace = Yarn.workspace({ident: 'react-native-macos'});
    if (!rnmWorkspace) {
        // Report error on root workspace since react-native-macos doesn't exist
        Yarn.workspace().error('react-native-macos workspace must exist in the monorepo');
        return;
    }

    const targetVersion = rnmWorkspace.manifest.version;
    if (!targetVersion) {
        rnmWorkspace.error('react-native-macos must have a version');
        return;
    }

    // Enforce this version on all non-private @react-native-macos/ scoped packages
    for (const workspace of Yarn.workspaces()) {
        const isReactNativeMacosScoped = workspace.ident && workspace.ident.startsWith('@react-native-macos/');
        const isPrivate = workspace.manifest.private;
        
        if (isReactNativeMacosScoped && !isPrivate) {
            workspace.set('version', targetVersion);
        }
    }
}

module.exports = defineConfig({
  constraints: async ctx => {
    // Constraints copied from the Yarn monorepo
    enforceConsistentDependenciesAcrossTheProject(ctx);
    enforceWorkspaceDependenciesWhenPossible(ctx);
    enforcePeerDependencyPresence(ctx);
    // enforceFieldsOnAllWorkspaces(ctx, {
    //   license: `MIT`,
    //   // When changing the engines.node value check https://node.green/ for
    //   // which ECMAScript version is fully supported and update the following files as needed:
    //   // - tsconfig.json
    //   // - packages/eslint-config/index.js
    //   // - packages/yarnpkg-builder/sources/commands/new/plugin.ts
    //   [`engines.node`]: `>=18.12.0`,
    //   [`repository.type`]: `git`,
    //   [`repository.url`]: `git+https://github.com/yarnpkg/berry.git`,
    //   [`repository.directory`]: workspace => workspace.cwd,
    // });

    // React Native macOS specific constraints
    expectReactNativePeerDependency(ctx);
    enforceReactNativeVersionConsistency(ctx);
    enforceReactNativeMacosVersionConsistency(ctx);
  },
});
