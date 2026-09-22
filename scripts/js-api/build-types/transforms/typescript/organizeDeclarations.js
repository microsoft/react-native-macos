/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {PluginObj} from '@babel/core';

import * as t from '@babel/types';

/**
 * A visitor that organizes top level type declarations into our desired API
 * snapshot format.
 *
 * - Sorts declarations alphabetically.
 * - Moves all exports into a single block at the end of the file.
 */
const visitor: PluginObj<unknown> = {
  visitor: {
    Program(path) {
      const exportedIdentifiers: Map<string, string> = new Map();

      // Collect exported identifiers
      path.get('body').forEach(nodePath => {
        if (nodePath.isExportNamedDeclaration()) {
          if (nodePath.node.declaration) {
            const declaration = nodePath.node.declaration;
            if (
              t.isTSInterfaceDeclaration(declaration) ||
              t.isTSTypeAliasDeclaration(declaration) ||
              t.isFunctionDeclaration(declaration) ||
              t.isClassDeclaration(declaration) ||
              t.isVariableDeclaration(declaration) ||
              t.isTSDeclareFunction(declaration) ||
              t.isTSModuleDeclaration(declaration) ||
              t.isTSEnumDeclaration(declaration)
            ) {
              if (declaration.id && declaration.id.name != null) {
                exportedIdentifiers.set(
                  declaration.id.name,
                  declaration.id.name,
                );
              } else if (
                t.isVariableDeclaration(declaration) &&
                declaration.declarations.length > 0
              ) {
                declaration.declarations.forEach(declarator => {
                  if (t.isIdentifier(declarator.id)) {
                    exportedIdentifiers.set(
                      declarator.id.name,
                      declarator.id.name,
                    );
                  }
                });
              }
              nodePath.replaceWith(declaration); // Remove export
            } else {
              throw new Error(
                `Unexpected declaration type for top-level export: ${declaration.type}`,
              );
            }
          } else if (nodePath.node.specifiers) {
            nodePath.node.specifiers.forEach(specifier => {
              if (specifier.type === 'ExportSpecifier') {
                // Preserve public names when API Extractor disambiguates a
                // declaration from a global or another imported type. // [macOS]
                const exported = specifier.exported;
                exportedIdentifiers.set(
                  t.isIdentifier(exported) ? exported.name : exported.value,
                  specifier.local.name,
                );
              }
            });
            nodePath.remove(); // Remove export statement
          }
        }
      });

      // Sort declarations alphabetically
      path.node.body.sort((a, b) => {
        const aName = a.id?.name || '';
        const bName = b.id?.name || '';
        return aName.localeCompare(bName);
      });

      // Move all exports into single `export {}` block
      if (exportedIdentifiers.size > 0) {
        const sortedIdentifiers = Array.from(exportedIdentifiers.keys()).sort();
        const exportStatement = t.exportNamedDeclaration(
          // $FlowFixMe[incompatible-type]
          null,
          sortedIdentifiers.map(name =>
            t.exportSpecifier(
              t.identifier(exportedIdentifiers.get(name) ?? name),
              t.identifier(name),
            ),
          ),
        );
        path.pushContainer('body', exportStatement);
      }
    },
  },
};

module.exports = visitor;
