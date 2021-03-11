/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

module.exports = {
<<<<<<< HEAD
    'transform': {
      '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': '<rootDir>/jest/assetFileTransformer.js',
      '.*': './jest/preprocessor.js',
    },
    'setupFiles': [
      './jest/setup.js',
    ],
    'timers': 'fake',
    'testRegex': '/__tests__/.*-test\\.js$',
    'testPathIgnorePatterns': [
      '/node_modules/',
      '<rootDir>/template',
      'Libraries/Renderer',
      'RNTester/e2e',
    ],
    'haste': {
      'defaultPlatform': 'ios',
      'platforms': [
        'ios',
        'android',
        'macos',
      ],
    },
    'unmockedModulePathPatterns': [
      'node_modules/react/',
      'Libraries/Renderer',
      'promise',
      'source-map',
      'fastpath',
      'denodeify',
      'fbjs',
    ],
    'testEnvironment': 'node',
    'moduleNameMapper': {
      'react-native-codegen/(.*)': '<rootDir>/packages/react-native-codegen/$1',
      'eslint/lib/rules/(.*)': '<rootDir>/node_modules/eslint/lib/rules/$1',
      'react-native(.*)': '<rootDir>$1',
    },
    'collectCoverageFrom': [
      'Libraries/**/*.js',
    ],
    'coveragePathIgnorePatterns': [
      '/__tests__/',
      '/vendor/',
      '<rootDir>/Libraries/react-native/',
    ],
=======
  transform: {
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      '<rootDir>/jest/assetFileTransformer.js',
    '.*': './jest/preprocessor.js',
  },
  setupFiles: ['./jest/setup.js'],
  timers: 'fake',
  testRegex: '/__tests__/.*-test\\.js$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/template',
    'Libraries/Renderer',
    'packages/rn-tester/e2e',
  ],
  transformIgnorePatterns: ['node_modules/(?!@react-native/)'],
  haste: {
    defaultPlatform: 'ios',
    platforms: ['ios', 'android'],
  },
  unmockedModulePathPatterns: [
    'node_modules/react/',
    'Libraries/Renderer',
    'promise',
    'source-map',
    'fastpath',
    'denodeify',
  ],
  testEnvironment: 'node',
  collectCoverageFrom: ['Libraries/**/*.js'],
  coveragePathIgnorePatterns: [
    '/__tests__/',
    '/vendor/',
    '<rootDir>/Libraries/react-native/',
  ],
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
};
