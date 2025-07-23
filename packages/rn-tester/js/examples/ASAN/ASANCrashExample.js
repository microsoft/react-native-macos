/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {Node} from 'react';

import React from 'react';
import {Button, NativeModules} from 'react-native';

const {ASANCrash} = NativeModules;

exports.displayName = (undefined: ?string);
exports.framework = 'React';
exports.title = 'ASAN Crash';
exports.category = 'Basic';
exports.description = 'ASAN Crash examples.';

exports.examples = [
  {
    title: 'Native Address Sanitizer crash',
    render(): Node {
      return (
        <Button
          title="Native Address Sanitizer crash"
          onPress={() => {
            ASANCrash.invokeMemoryCrash();
          }}
        />
      );
    },
  },
];
