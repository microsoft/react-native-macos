/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @noflow
 */

const {execFileSync} = require('child_process');
const path = require('path');

test('Node resolves extensionless script exports, including the fork codegen directory', () => {
  // Test native Node package conditions rather than the Jest resolver's map.
  execFileSync(process.execPath, [
    '-e',
    `
    const assert = require('assert/strict');
    const req = require('module').createRequire(${JSON.stringify(path.resolve(__dirname, '../../package.json'))});
    for (const [name, suffix] of [
      ['setup-apple-spm', '/setup-apple-spm.js'],
      ['codegen/generate-artifacts-executor', '/codegen/generate-artifacts-executor/index.js'],
      ['react-native-xcode.sh', '/react-native-xcode.sh'],
      ['react_native_pods.rb', '/react_native_pods.rb'],
    ]) {
      assert(req.resolve('react-native-macos/scripts/' + name).endsWith(suffix));
    }
    assert.throws(() => req.resolve('react-native-macos/scripts/setup-apple-spm.js'));
  `,
  ]);
});
