/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import type {
  CompleteTypeAnnotation,
  NamedShape,
  NativeModuleEnumMember,
} from "@react-native/codegen/src/CodegenSchema";
type TypeAnnotationComparisonError = {
  type: "TypeAnnotationComparisonError";
  message: string;
  newerAnnotation: CompleteTypeAnnotation;
  olderAnnotation: CompleteTypeAnnotation;
  previousError?: TypeComparisonError;
};
type TypeInformationComparisonError = {
  type: "TypeInformationComparisonError";
  message: string;
  newerType: CompleteTypeAnnotation;
  olderType: CompleteTypeAnnotation;
  previousError?: TypeComparisonError;
};
type PropertyComparisonError = {
  type: "PropertyComparisonError";
  message: string;
  mismatchedProperties: Array<{
    property: string;
    fault?: TypeComparisonError;
  }>;
  previousError?: TypeComparisonError;
};
type PositionalComparisonError = {
  type: "PositionalComparisonError";
  message: string;
  erroneousItems: Array<[number, CompleteTypeAnnotation]>;
  previousError?: TypeComparisonError;
};
type MemberComparisonError = {
  type: "MemberComparisonError";
  message: string;
  mismatchedMembers: Array<{ member: string; fault?: TypeComparisonError }>;
  previousError?: TypeComparisonError;
};
export type TypeComparisonError =
  | TypeAnnotationComparisonError
  | TypeInformationComparisonError
  | PropertyComparisonError
  | PositionalComparisonError
  | MemberComparisonError;
export type PositionalComparisonResult = {
  typeKind: "stringUnion" | "union" | "intersection" | "parameter" | "tuple";
  nestedChanges: Array<[number, number, ComparisonResult]>;
  addedElements?: Array<[number, CompleteTypeAnnotation]>;
  removedElements?: Array<[number, CompleteTypeAnnotation]>;
};
export type FunctionComparisonResult = {
  returnType?: ComparisonResult;
  parameterTypes?: PositionalComparisonResult;
};
export type PropertiesComparisonResult = {
  addedProperties?: ReadonlyArray<NamedShape<CompleteTypeAnnotation>>;
  missingProperties?: ReadonlyArray<NamedShape<CompleteTypeAnnotation>>;
  errorProperties?: Array<{ property: string; fault?: TypeComparisonError }>;
  madeStrict?: Array<{ property: string; furtherChanges?: ComparisonResult }>;
  madeOptional?: Array<{ property: string; furtherChanges?: ComparisonResult }>;
  nestedPropertyChanges?: Array<[string, ComparisonResult]>;
};
export type MembersComparisonResult = {
  addedMembers?: Array<NativeModuleEnumMember>;
  missingMembers?: Array<NativeModuleEnumMember>;
  errorMembers?: Array<{ member: string; fault?: TypeComparisonError }>;
};
export type NullableComparisonResult = {
  typeRefined: boolean;
  optionsReduced: boolean;
  interiorLog: null | undefined | ComparisonResult;
  newType: null | undefined | CompleteTypeAnnotation;
  oldType: null | undefined | CompleteTypeAnnotation;
};
export type ComparisonResult =
  | { status: "matching" }
  | { status: "skipped" }
  | { status: "nullableChange"; nullableLog: NullableComparisonResult }
  | { status: "properties"; propertyLog: PropertiesComparisonResult }
  | { status: "members"; memberLog: MembersComparisonResult }
  | { status: "functionChange"; functionChangeLog: FunctionComparisonResult }
  | { status: "positionalTypeChange"; changeLog: PositionalComparisonResult }
  | { status: "error"; errorLog: TypeComparisonError };
export declare function isPropertyLogEmpty(
  result: PropertiesComparisonResult
): boolean;
export declare function isMemberLogEmpty(
  result: MembersComparisonResult
): boolean;
export declare function isFunctionLogEmpty(
  result: FunctionComparisonResult
): boolean;
export declare function makeError(error: TypeComparisonError): ComparisonResult;
export declare function typeInformationComparisonError(
  message: string,
  newerType: CompleteTypeAnnotation,
  olderType: CompleteTypeAnnotation,
  previousError?: TypeComparisonError
): TypeComparisonError;
export declare function typeAnnotationComparisonError(
  message: string,
  newerAnnotation: CompleteTypeAnnotation,
  olderAnnotation: CompleteTypeAnnotation,
  previousError?: TypeComparisonError
): TypeComparisonError;
export declare function propertyComparisonError(
  message: string,
  mismatchedProperties: Array<{
    property: string;
    fault?: TypeComparisonError;
  }>,
  previousError?: TypeComparisonError
): TypeComparisonError;
export declare function memberComparisonError(
  message: string,
  mismatchedMembers: Array<{ member: string; fault?: TypeComparisonError }>,
  previousError?: TypeComparisonError
): TypeComparisonError;
export declare function positionalComparisonError(
  message: string,
  erroneousItems: Array<[number, CompleteTypeAnnotation]>,
  previousError?: TypeComparisonError
): TypeComparisonError;
