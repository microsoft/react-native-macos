/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const canonicalizeLocalPackageImports = require('../canonicalizeLocalPackageImports');
const babel = require('@babel/core');

async function transform(code: string): Promise<string> {
  const result = await babel.transformAsync(code, {
    plugins: [
      '@babel/plugin-syntax-typescript',
      canonicalizeLocalPackageImports([
        'react-native-macos',
        '@react-native-macos/virtualized-lists',
      ]),
    ],
  });
  return result.code;
}

describe('canonicalizeLocalPackageImports', () => {
  test('normalizes nested node_modules imports and exports', async () => {
    const result = await transform(`
      import type {Foo} from "../../../jest-preset/node_modules/react-native-macos/node_modules/@react-native-macos/virtualized-lists";
      export {Bar} from "../../node_modules/react-native-macos/src/bar";
      export * from "../../../react-native/node_modules/@react-native-macos/virtualized-lists";
    `);

    expect(result).toBe(
      [
        'import type { Foo } from "@react-native-macos/virtualized-lists";',
        'export { Bar } from "react-native-macos/src/bar";',
        'export * from "@react-native-macos/virtualized-lists";',
      ].join('\n'),
    );
  });

  test.each([
    '../../node_modules/react-native-macos-extra',
    '../../node_modules/react-native-macos.extra',
    '../../node_modules/@react-native-macos/virtualized-lists-extra',
    '../../node_modules/react-native-macos/node_modules/unrelated',
    'https://host/node_modules/react-native-macos',
    '/absolute/node_modules/react-native-macos',
    'some-package/node_modules/react-native-macos',
    '../ordinary/react-native-macos',
    'react-native-macos',
  ])('preserves non-local or non-matching source %s', async source => {
    expect(await transform(`export * from "${source}";`)).toBe(
      `export * from "${source}";`,
    );
  });

  test('preserves ordinary strings and exports without sources', async () => {
    expect(
      await transform(
        'const value = "../node_modules/react-native-macos"; export {value};',
      ),
    ).toBe(
      'const value = "../node_modules/react-native-macos";\nexport { value };',
    );
  });

  test('is independent of checkout prefixes and idempotent', async () => {
    const first = await transform(
      'export * from "../../one/node_modules/react-native-macos/src/api";',
    );
    const second = await transform(
      'export * from "../../../two/node_modules/react-native-macos/src/api";',
    );
    expect(first).toBe(second);
    expect(await transform(first)).toBe(first);
  });
});
