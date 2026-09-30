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
import type {NodePath} from '@babel/traverse';
import type {
  ExportAllDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
} from '@babel/types';

function canonicalizeSource(
  source: string,
  packageNames: $ReadOnlyArray<string>,
): string {
  if (!source.startsWith('./') && !source.startsWith('../')) {
    return source;
  }
  const marker = '/node_modules/';
  const markerIndex = source.lastIndexOf(marker);
  if (markerIndex === -1) {
    return source;
  }
  const candidate = source.slice(markerIndex + marker.length);
  return packageNames.some(
    name => candidate === name || candidate.startsWith(name + '/'),
  )
    ? candidate
    : source;
}

function canonicalizeLocalPackageImports(
  packageNames: $ReadOnlyArray<string>,
): PluginObj<mixed> {
  function canonicalizeNodeSource(
    nodePath: NodePath<
      ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration,
    >,
  ) {
    if (nodePath.node.source != null) {
      nodePath.node.source.value = canonicalizeSource(
        nodePath.node.source.value,
        packageNames,
      );
    }
  }

  return {
    name: 'canonicalize-local-package-imports',
    visitor: {
      ExportAllDeclaration: canonicalizeNodeSource,
      ExportNamedDeclaration: canonicalizeNodeSource,
      ImportDeclaration: canonicalizeNodeSource,
    },
  };
}

module.exports = canonicalizeLocalPackageImports;
