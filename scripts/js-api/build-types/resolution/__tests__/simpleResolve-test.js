/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const {PACKAGES_DIR} = require('../../../../shared/consts');
const {promises: fs} = require('fs');
const path = require('path');

describe('simpleResolve workspace dependencies', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test.each([
    [true, undefined, 'index.js'],
    [true, 'src/index.js', 'src/index.js'],
    [false, undefined, 'index.js'],
  ])(
    'resolves a workspace with private=%s and main=%s',
    async (isPrivate, main, entryPoint) => {
      const packagePath = path.join(PACKAGES_DIR, 'type-dependency');
      jest
        .spyOn(require('tinyglobby'), 'globSync')
        .mockReturnValue([path.join(packagePath, 'package.json')]);
      jest.spyOn(fs, 'readFile').mockResolvedValue(
        JSON.stringify({
          name: '@react-native-macos/type-dependency',
          private: isPrivate,
          main,
        }),
      );
      // Load the real package filter with an empty resolver cache each time.
      const simpleResolve = require('../simpleResolve');
      const reportUnresolvedDependency = jest.fn();

      await expect(
        simpleResolve(
          '@react-native-macos/type-dependency',
          path.join(PACKAGES_DIR, 'react-native/index.js.flow'),
          {reportUnresolvedDependency},
        ),
      ).resolves.toBe(path.join(packagePath, entryPoint));
      expect(reportUnresolvedDependency).not.toHaveBeenCalled();

      await expect(
        simpleResolve(
          'external-package',
          path.join(PACKAGES_DIR, 'react-native/index.js.flow'),
          {reportUnresolvedDependency},
        ),
      ).resolves.toBeNull();
      expect(reportUnresolvedDependency).toHaveBeenCalledWith(
        'external-package',
      );
    },
  );
});
