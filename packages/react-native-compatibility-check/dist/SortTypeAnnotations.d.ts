/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import type { CompleteTypeAnnotation } from "@react-native/codegen/src/CodegenSchema";
export declare function sortTypeAnnotations(
  annotations: ReadonlyArray<CompleteTypeAnnotation>
): Array<[number, CompleteTypeAnnotation]>;
export declare function compareTypeAnnotationForSorting(
  $$PARAM_0$$: [number, CompleteTypeAnnotation],
  $$PARAM_1$$: [number, CompleteTypeAnnotation]
): number;
