/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

'use strict';

import type {NativeOrDynamicColorType} from 'normalizeColor';
const processColor = require('processColor');

function processColorObject(
  color?: ?NativeOrDynamicColorType,
): ?NativeOrDynamicColorType {
  if ('dynamic' in color && color.dynamic !== undefined) {
    const dynamic = color.dynamic;
    const dynamicColor = {
      dynamic: {
        light: processColor(dynamic.light),
        dark: processColor(dynamic.dark),
      },
    };
    return dynamicColor;
  }
  return color;
}

module.exports = processColorObject;
