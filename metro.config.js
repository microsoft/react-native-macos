/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

const getPolyfills = require('./rn-get-polyfills');

/**
 * This cli config is needed for development purposes, e.g. for running
 * integration tests during local development or on CI services.
 */
const config = {
  serializer: {
    getPolyfills,
  },
  resolver: {
    platforms: ['ios', 'macos', 'android'],
    extraNodeModules: {
      'react-native': __dirname,
    },
  },
  transformer: {},
};

module.exports = config;
