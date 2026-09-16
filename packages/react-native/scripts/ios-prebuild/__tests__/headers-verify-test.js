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

const inventory = require('../headers-inventory');
const spec = require('../headers-spec');
const {main} = require('../headers-verify');
const fs = require('fs');

describe('headers-verify collision gates', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(
    [[], ['--skip-compile'], ['--update-baseline']].map(argv => [argv]),
  )(
    'rejects natural-path collisions before planning or baseline writes: %p',
    argv => {
      jest.spyOn(inventory, 'computeInventory').mockReturnValue({
        headers: [],
        collisions: [
          {naturalPath: 'ns/A.h', sources: ['first/A.h', 'extra/A.h']},
        ],
      });
      const plan = jest.spyOn(spec, 'planFromInventory');
      const write = jest.spyOn(fs, 'writeFileSync');
      expect(() => main(argv)).toThrow(
        /natural-path collisions \(R8\):\n {2}ns\/A.h <- first\/A.h, extra\/A.h/,
      );
      expect(plan).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    },
  );

  test('still rejects destination collisions after a clean inventory', () => {
    jest
      .spyOn(inventory, 'computeInventory')
      .mockReturnValue({headers: [], collisions: []});
    jest
      .spyOn(spec, 'planFromInventory')
      .mockReturnValue({collisions: ['destination conflict']});
    expect(() => main([])).toThrow(/R8 collisions:\n {2}destination conflict/);
  });
});
