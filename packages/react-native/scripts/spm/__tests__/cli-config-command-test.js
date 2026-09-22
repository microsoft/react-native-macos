/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @noflow
 */

jest.mock('../../setup-apple-spm', () => ({main: jest.fn()}));

test('the React Native CLI forwards the documented configCommand without splitting its argv', async () => {
  const {commands} = require('../../../react-native.config');
  const {main} = require('../../setup-apple-spm');
  const command = commands.find(candidate => candidate.name === 'spm [action]');
  expect(command.options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({name: '--configCommand <json>'}),
    ]),
  );
  const argv = JSON.stringify([
    'node',
    '/path with spaces/config.js',
    '--json',
  ]);
  await command.func(['update'], {}, {configCommand: argv});
  expect(main).toHaveBeenCalledWith(['update', '--config-command', argv]);
});
