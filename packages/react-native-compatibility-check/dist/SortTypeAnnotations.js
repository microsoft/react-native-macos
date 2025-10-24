"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.compareTypeAnnotationForSorting = compareTypeAnnotationForSorting;
exports.sortTypeAnnotations = sortTypeAnnotations;
var _invariant = _interopRequireDefault(require("invariant"));
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
function sortTypeAnnotations(annotations) {
  const sortableArray = annotations.map((a, i) => [i, a]);
  return sortableArray.sort(compareTypeAnnotationForSorting);
}
const EQUALITY_MSG = "typeA and typeB differ despite check";
function compareTypeAnnotationForSorting(
  [originalPositionA, typeA],
  [originalPositionB, typeB]
) {
  if (typeA.type !== typeB.type) {
    if (typeA.type === "NullableTypeAnnotation") {
      return compareTypeAnnotationForSorting(
        [originalPositionA, typeA.typeAnnotation],
        [originalPositionB, typeB]
      );
    }
    if (typeB.type === "NullableTypeAnnotation") {
      return compareTypeAnnotationForSorting(
        [originalPositionA, typeA],
        [originalPositionB, typeB.typeAnnotation]
      );
    }
    return (
      typeAnnotationArbitraryOrder(typeA) - typeAnnotationArbitraryOrder(typeB)
    );
  }
  switch (typeA.type) {
    case "AnyTypeAnnotation":
      return 0;
    case "ArrayTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "ArrayTypeAnnotation",
        EQUALITY_MSG
      );
      return compareTypeAnnotationForSorting(
        [originalPositionA, typeA.elementType],
        [originalPositionB, typeB.elementType]
      );
    case "BooleanTypeAnnotation":
      return originalPositionA - originalPositionB;
    case "EnumDeclaration":
      (0, _invariant.default)(typeB.type === "EnumDeclaration", EQUALITY_MSG);
      return typeA.memberType.localeCompare(typeB.memberType);
    case "EnumDeclarationWithMembers":
      (0, _invariant.default)(
        typeB.type === "EnumDeclarationWithMembers",
        EQUALITY_MSG
      );
      return compareNameAnnotationArraysForSorting(
        [originalPositionA, typeA.members.map((m) => [m.name, m.value])],
        [originalPositionB, typeB.members.map((m) => [m.name, m.value])]
      );
    case "FunctionTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "FunctionTypeAnnotation",
        EQUALITY_MSG
      );
      const parmComparison = compareAnnotationArraysForSorting(
        [originalPositionA, typeA.params.map((p) => p.typeAnnotation)],
        [originalPositionB, typeB.params.map((p) => p.typeAnnotation)]
      );
      if (parmComparison === 0) {
        return compareTypeAnnotationForSorting(
          [originalPositionA, typeA.returnTypeAnnotation],
          [originalPositionB, typeB.returnTypeAnnotation]
        );
      }
      return parmComparison;
    case "EventEmitterTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "EventEmitterTypeAnnotation",
        EQUALITY_MSG
      );
      return compareTypeAnnotationForSorting(
        [originalPositionA, typeA.typeAnnotation],
        [originalPositionB, typeB.typeAnnotation]
      );
    case "GenericObjectTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "GenericObjectTypeAnnotation",
        EQUALITY_MSG
      );
      if (
        typeA.dictionaryValueType == null &&
        typeB.dictionaryValueType == null
      ) {
        return 0;
      } else if (
        typeA.dictionaryValueType != null &&
        typeB.dictionaryValueType != null
      ) {
        return compareTypeAnnotationForSorting(
          [originalPositionA, typeA.dictionaryValueType],
          [originalPositionB, typeB.dictionaryValueType]
        );
      } else {
        return typeA.dictionaryValueType == null ? -1 : 1;
      }
    case "NullableTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "NullableTypeAnnotation",
        EQUALITY_MSG
      );
      return compareTypeAnnotationForSorting(
        [originalPositionA, typeA.typeAnnotation],
        [originalPositionB, typeB.typeAnnotation]
      );
    case "NumberTypeAnnotation":
    case "Int32TypeAnnotation":
    case "FloatTypeAnnotation":
    case "DoubleTypeAnnotation":
      return 0;
    case "NumberLiteralTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "NumberLiteralTypeAnnotation",
        EQUALITY_MSG
      );
      return typeA.value - typeB.value;
    case "ObjectTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "ObjectTypeAnnotation",
        EQUALITY_MSG
      );
      return compareNameAnnotationArraysForSorting(
        [
          originalPositionA,
          typeA.properties.map((p) => [p.name, p.typeAnnotation]),
        ],
        [
          originalPositionB,
          typeB.properties.map((p) => [p.name, p.typeAnnotation]),
        ]
      );
    case "StringTypeAnnotation":
      return originalPositionA - originalPositionB;
    case "StringLiteralTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "StringLiteralTypeAnnotation",
        EQUALITY_MSG
      );
      return typeA.value.localeCompare(typeB.value);
    case "StringLiteralUnionTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "StringLiteralUnionTypeAnnotation",
        EQUALITY_MSG
      );
      return compareAnnotationArraysForSorting(
        [originalPositionA, typeA.types],
        [originalPositionB, typeB.types]
      );
    case "UnionTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "UnionTypeAnnotation",
        EQUALITY_MSG
      );
      return 0;
    case "VoidTypeAnnotation":
      return 0;
    case "ReservedTypeAnnotation":
      return 0;
    case "PromiseTypeAnnotation":
      (0, _invariant.default)(
        typeB.type === "PromiseTypeAnnotation",
        EQUALITY_MSG
      );
      return compareTypeAnnotationForSorting(
        [originalPositionA, typeA.elementType],
        [originalPositionB, typeB.elementType]
      );
    case "TypeAliasTypeAnnotation":
      return 0;
    case "MixedTypeAnnotation":
      return 0;
    default:
      typeA.type;
      return -1;
  }
}
function nameComparison([nameA], [nameB]) {
  if (nameA === nameB) {
    return 0;
  } else if (nameA < nameB) {
    return -1;
  }
  return 1;
}
function compareNameAnnotationArraysForSorting(
  [originalPositionA, arrayA],
  [originalPositionB, arrayB]
) {
  if (arrayA.length - arrayB.length !== 0) {
    return arrayA.length - arrayB.length;
  }
  const nameSortedA = arrayA.sort(nameComparison);
  const nameSortedB = arrayB.sort(nameComparison);
  for (let i = 0; i < nameSortedA.length; i++) {
    if (nameSortedA[i][0] === nameSortedB[i][0]) {
      const compared = compareTypeAnnotationForSorting(
        [originalPositionA, nameSortedA[i][1]],
        [originalPositionB, nameSortedB[i][1]]
      );
      if (compared !== 0) {
        return compared;
      }
      continue;
    }
    if (nameSortedA[i][0] < nameSortedB[i][0]) {
      return -1;
    }
    return 1;
  }
  return 0;
}
function compareAnnotationArraysForSorting(
  [originalPositionA, arrayA],
  [originalPositionB, arrayB]
) {
  if (arrayA.length - arrayB.length !== 0) {
    return arrayA.length - arrayB.length;
  }
  for (let i = 0; i < arrayA.length; i++) {
    const compared = compareTypeAnnotationForSorting(
      [originalPositionA, arrayA[i]],
      [originalPositionB, arrayB[i]]
    );
    if (compared !== 0) {
      return compared;
    }
    continue;
  }
  return 0;
}
function typeAnnotationArbitraryOrder(annotation) {
  switch (annotation.type) {
    case "AnyTypeAnnotation":
      return 0;
    case "ArrayTypeAnnotation":
      return 1;
    case "BooleanTypeAnnotation":
      return 2;
    case "FunctionTypeAnnotation":
      return 3;
    case "EventEmitterTypeAnnotation":
      return 4;
    case "PromiseTypeAnnotation":
      return 5;
    case "GenericObjectTypeAnnotation":
      return 6;
    case "NullableTypeAnnotation":
      return 9;
    case "NumberTypeAnnotation":
      return 10;
    case "Int32TypeAnnotation":
      return 11;
    case "DoubleTypeAnnotation":
      return 12;
    case "FloatTypeAnnotation":
      return 13;
    case "NumberLiteralTypeAnnotation":
      return 14;
    case "ObjectTypeAnnotation":
      return 15;
    case "StringLiteralUnionTypeAnnotation":
      return 17;
    case "StringTypeAnnotation":
      return 18;
    case "StringLiteralTypeAnnotation":
      return 19;
    case "VoidTypeAnnotation":
      return 20;
    case "EnumDeclaration":
      return 21;
    case "EnumDeclarationWithMembers":
      return 22;
    case "GenericObjectTypeAnnotation":
      return 25;
    case "TypeAliasTypeAnnotation":
      return 26;
    case "MixedTypeAnnotation":
      return 27;
    case "ReservedTypeAnnotation":
      return 28;
    case "UnionTypeAnnotation":
      return 30;
    default:
      annotation.type;
      return -1;
  }
}
