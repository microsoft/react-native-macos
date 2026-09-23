/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const {REACT_NATIVE_PACKAGE_DIR} = require('../../../shared/consts');
const translateSourceFile = require('../translateSourceFile');
const {promises: fs} = require('fs');
const path = require('path');

test('direct translation preserves the macOS shim used by full and watch builds', async () => {
  const file = path.join(REACT_NATIVE_PACKAGE_DIR, 'src/types/macos.js');
  const source = await fs.readFile(file, 'utf8');
  for (const input of [source, source + '\n// Watch-mode source update\n']) {
    const {result, dependencies} = await translateSourceFile(input, file);
    expect(result).toBe('export type * from "../../../src/types/macos";\n');
    expect(dependencies).toContain(
      path.join(REACT_NATIVE_PACKAGE_DIR, 'Libraries/Types/CoreEventTypes.js'),
    );
  }
});

test('the shim rule does not replace other macos.js modules', async () => {
  const {result} = await translateSourceFile(
    'export type Example = {value: string};',
    path.join(REACT_NATIVE_PACKAGE_DIR, 'src/other/macos.js'),
  );
  expect(result).toContain('value: string');
  expect(result).not.toContain('../../../src/types/macos');
});
