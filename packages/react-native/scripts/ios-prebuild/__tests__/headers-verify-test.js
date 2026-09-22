/**
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license in the root LICENSE file.
 * @format
 * @noflow
 */

const inventory = require('../headers-inventory');
const spec = require('../headers-spec');
const {main} = require('../headers-verify');
const fs = require('fs');

afterEach(() => jest.restoreAllMocks());

test.each([[], ['--skip-compile'], ['--update-baseline']].map(argv => [argv]))(
  'rejects physical-source collisions before plan or baseline writes: %p',
  argv => {
    jest.spyOn(inventory, 'computeInventory').mockReturnValue({
      headers: [],
      collisions: [
        {naturalPath: 'ns/A.h', sources: ['first/A.h', 'extra/A.h']},
      ],
    });
    const plan = jest.spyOn(spec, 'planFromInventory');
    const write = jest.spyOn(fs, 'writeFileSync');
    expect(() => main(argv)).toThrow(/natural-path collisions \(R8\)/);
    expect(plan).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  },
);

test('retains the destination collision gate after inventory succeeds', () => {
  jest
    .spyOn(inventory, 'computeInventory')
    .mockReturnValue({headers: [], collisions: []});
  jest
    .spyOn(spec, 'planFromInventory')
    .mockReturnValue({collisions: ['destination conflict']});
  expect(() => main([])).toThrow(/R8 collisions:\n {2}destination conflict/);
});
