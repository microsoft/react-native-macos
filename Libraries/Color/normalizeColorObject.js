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

export type NativeOrDynamicColorType = {};

function normalizeColorObject(
  color: ?NativeOrDynamicColorType,
): ?(number | NativeOrDynamicColorType) {
  return null;
}

module.exports = normalizeColorObject;
