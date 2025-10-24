/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 * @oncall react_native
 */

import type {
  CompleteTypeAnnotation,
  ComponentArrayTypeAnnotation,
  PropTypeAnnotation,
} from "@react-native/codegen/src/CodegenSchema";
declare function convertPropToBasicTypes(
  inputType: PropTypeAnnotation | ComponentArrayTypeAnnotation["elementType"]
): CompleteTypeAnnotation;
export default convertPropToBasicTypes;
