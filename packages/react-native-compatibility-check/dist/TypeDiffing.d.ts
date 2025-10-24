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
  ComparisonResult,
  MembersComparisonResult,
} from "./ComparisonResult";
import type {
  CompleteTypeAnnotation,
  NamedShape,
  NativeModuleAliasMap,
  NativeModuleEnumDeclaration,
  NativeModuleEnumDeclarationWithMembers,
  NativeModuleEnumMap,
  NativeModuleEnumMember,
  NativeModuleFunctionTypeAnnotation,
  NativeModuleGenericObjectTypeAnnotation,
  NativeModulePromiseTypeAnnotation,
  NativeModuleUnionTypeAnnotation,
  NumberLiteralTypeAnnotation,
  StringLiteralTypeAnnotation,
  StringLiteralUnionTypeAnnotation,
} from "@react-native/codegen/src/CodegenSchema";
export declare function compareTypes(
  newerType: CompleteTypeAnnotation,
  olderType: null | undefined | CompleteTypeAnnotation,
  newerTypesReg: null | undefined | NativeModuleAliasMap,
  olderTypesReg: null | undefined | NativeModuleAliasMap,
  newerEnumMap: null | undefined | NativeModuleEnumMap,
  olderEnumMap: null | undefined | NativeModuleEnumMap
): ComparisonResult;
export declare function compareTypeAnnotation(
  originalNewerAnnotation: CompleteTypeAnnotation,
  originalOlderAnnotation: CompleteTypeAnnotation
): ComparisonResult;
export declare function compareObjectTypes<T extends CompleteTypeAnnotation>(
  newerPropertyTypes: ReadonlyArray<NamedShape<T>>,
  olderPropertyTypes: ReadonlyArray<NamedShape<T>>
): ComparisonResult;
export declare function compareEnumDeclarations(
  newerDeclaration: NativeModuleEnumDeclaration,
  olderDeclaration: NativeModuleEnumDeclaration
): ComparisonResult;
export declare function compareEnumDeclarationMemberArrays(
  newer: Array<NativeModuleEnumMember>,
  older: Array<NativeModuleEnumMember>
): MembersComparisonResult;
export declare function compareEnumDeclarationWithMembers(
  newerDeclaration: NativeModuleEnumDeclarationWithMembers,
  olderDeclaration: NativeModuleEnumDeclarationWithMembers
): ComparisonResult;
export declare function compareUnionTypes(
  newerType: NativeModuleUnionTypeAnnotation,
  olderType: NativeModuleUnionTypeAnnotation
): ComparisonResult;
export declare function comparePromiseTypes(
  newerType: NativeModulePromiseTypeAnnotation,
  olderType: NativeModulePromiseTypeAnnotation
): ComparisonResult;
export declare function compareGenericObjectTypes(
  newerType: NativeModuleGenericObjectTypeAnnotation,
  olderType: NativeModuleGenericObjectTypeAnnotation
): ComparisonResult;
export declare function compareNumberLiteralTypes(
  newerType: NumberLiteralTypeAnnotation,
  olderType: NumberLiteralTypeAnnotation
): ComparisonResult;
export declare function compareStringLiteralTypes(
  newerType: StringLiteralTypeAnnotation,
  olderType: StringLiteralTypeAnnotation
): ComparisonResult;
export declare function compareStringLiteralUnionTypes(
  newerType: StringLiteralUnionTypeAnnotation,
  olderType: StringLiteralUnionTypeAnnotation
): ComparisonResult;
export declare function compareFunctionTypes(
  newerType: NativeModuleFunctionTypeAnnotation,
  olderType: NativeModuleFunctionTypeAnnotation
): ComparisonResult;
