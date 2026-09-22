/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const applyBabelTransformsSeq = require('../../../utils/applyBabelTransformsSeq');
const organizeDeclarations = require('../organizeDeclarations');
const versionExportedApis = require('../versionExportedApis');
const {parse} = require('@babel/parser');

async function exportsAfterPipeline(code: string) {
  const result = await applyBabelTransformsSeq(code, [
    organizeDeclarations,
    versionExportedApis(true),
  ]);
  const ast = parse(result, {sourceType: 'module', plugins: ['typescript']});
  return ast.program.body
    .filter(node => node.type === 'ExportNamedDeclaration')
    .flatMap(node => node.specifiers)
    .map(specifier => ({
      local: specifier.local.name,
      public: specifier.exported.name,
      comment: specifier.trailingComments?.[0]?.value,
    }));
}

describe('organizeDeclarations and versionExportedApis pipeline', () => {
  test.each([
    ['type', 'type Local<T extends Base = Base> = {value: T};'],
    [
      'runtime function',
      'declare function Local<T extends Base = Base>(value: T): T;',
    ],
    [
      'runtime value and type',
      'declare const Local: <T extends Base = Base>(value: T) => T; type Local = typeof Local;',
    ],
  ])(
    'hashes an aliased %s from its local generic declaration',
    async (_, declaration) => {
      const source = `
      type Base = {id: string};
      ${declaration}
      export {Local as Public};
    `;
      const [original] = await exportsAfterPipeline(source);
      expect(original.local).toBe('Local');
      expect(original.public).toBe('Public');
      expect(original.comment).toMatch(/^ [a-f0-9]{8}, Deps: \[Base\]/);

      const [changed] = await exportsAfterPipeline(
        source.replace('id: string', 'id: number'),
      );
      expect(changed.comment).not.toBe(original.comment);
      expect(changed.public).toBe('Public');

      const [unaliased] = await exportsAfterPipeline(
        source.replace('Local as Public', 'Local'),
      );
      expect(unaliased.comment).toBe(original.comment);
    },
  );

  test('does not hash an unrelated declaration with the public alias name', async () => {
    const source = `
      type Base = {id: string};
      type Public = boolean;
      type Local<T extends Base = Base> = {value: T};
      export {Local as Public, Local as SecondPublic};
    `;
    const original = await exportsAfterPipeline(source);
    expect(original.map(item => item.public)).toEqual([
      'Public',
      'SecondPublic',
    ]);
    expect(original[0].comment).toMatch(/^ [a-f0-9]{8}, Deps: \[Base\]/);
    expect(original[1].comment).toBe(original[0].comment);
    expect(
      await exportsAfterPipeline(
        source.replace('Public = boolean', 'Public = number'),
      ),
    ).toEqual(original);
  });
});
