/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

const {expandDirectoriesIntoFiles} = require('../combine-js-to-schema.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('expandDirectoriesIntoFiles', () => {
  it('does not traverse dependency symlinks or generated native specs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-inputs-'));
    const dependency = fs.mkdtempSync(
      path.join(os.tmpdir(), 'codegen-dependency-'),
    );

    try {
      const localSpec = path.join(root, 'NativeLocal.js');
      fs.writeFileSync(localSpec, '');

      fs.mkdirSync(path.join(root, 'build'));
      fs.writeFileSync(path.join(root, 'build', 'NativeGenerated.js'), '');

      fs.mkdirSync(path.join(root, 'Pods'));
      fs.writeFileSync(path.join(root, 'Pods', 'NativePod.js'), '');

      fs.writeFileSync(path.join(dependency, 'NativeDependency.js'), '');
      fs.mkdirSync(path.join(root, 'node_modules'));
      fs.symlinkSync(
        dependency,
        path.join(root, 'node_modules', 'dependency'),
        'dir',
      );

      expect(expandDirectoriesIntoFiles([root], null, null)).toEqual([
        localSpec,
      ]);
    } finally {
      fs.rmSync(root, {recursive: true, force: true});
      fs.rmSync(dependency, {recursive: true, force: true});
    }
  });
});
