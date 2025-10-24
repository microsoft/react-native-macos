/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import type { ComparisonResult } from "./ComparisonResult";
import type {
  DiffSet,
  DiffSummary,
  ErrorStore,
  ObjectTypeChangeStore,
  SchemaDiff,
} from "./DiffResults";
import type {
  CompleteTypeAnnotation,
  SchemaType,
} from "@react-native/codegen/src/CodegenSchema";
type BoundaryDirection = "toNative" | "fromNative" | "both";
export declare const removedPropertiesMessage: "Object removed required properties expected by native";
export declare const addedPropertiesMessage: "Object added required properties, which native will not provide";
export declare const stricterPropertiesMessage: "Property made strict, but native may not provide it";
export declare const tooOptionalPropertiesMessage: "Property made optional, but native requires it";
export declare const removedUnionMessage: "Union removed items, but native may still provide them";
export declare const addedUnionMessage: "Union added items, but native will not expect/support them";
export declare const removedEnumMessage: "Enum removed items, but native may still provide them";
export declare const addedEnumMessage: "Enum added items, but native will not expect/support them";
export declare const removedIntersectionMessage: "Intersection removed items, but native may still require properties contained in them";
export declare const addedIntersectionMessage: "Intersection added items, but native may not provide all required attributes";
export declare const toNativeVoidChangeMessage: "Native may not be able to safely handle presence of type";
export declare const typeNullableChangeMessage: "Type made nullable, but native requires it";
export declare const fromNativeVoidChangeMessage: "Type set to void but native may still provide a value";
export declare const typeNonNullableChangeMessage: "Type made non-nullable, but native might provide null still";
export declare function assessComparisonResult(
  newTypes: Set<{ typeName: string; typeInformation: CompleteTypeAnnotation }>,
  deprecatedTypes: Set<{
    typeName: string;
    typeInformation: CompleteTypeAnnotation;
  }>,
  incompatibleChanges: Set<ErrorStore>,
  objectTypeChanges: Set<ObjectTypeChangeStore>
): (
  typeName: string,
  newType: CompleteTypeAnnotation,
  oldType: null | undefined | CompleteTypeAnnotation,
  difference: ComparisonResult,
  oldDirection: BoundaryDirection
) => void;
export declare function hasUpdatesTypes(diff: DiffSet): boolean;
export declare function hasCodegenUpdatesTypes(diff: DiffSet): boolean;
export declare function buildSchemaDiff(
  newerSchemaSet: SchemaType,
  olderSchemaSet: SchemaType
): Set<SchemaDiff>;
export declare function summarizeDiffSet(diffs: Set<SchemaDiff>): DiffSummary;
