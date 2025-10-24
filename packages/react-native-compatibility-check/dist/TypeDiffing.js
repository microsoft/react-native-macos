"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.compareEnumDeclarationMemberArrays = compareEnumDeclarationMemberArrays;
exports.compareEnumDeclarationWithMembers = compareEnumDeclarationWithMembers;
exports.compareEnumDeclarations = compareEnumDeclarations;
exports.compareFunctionTypes = compareFunctionTypes;
exports.compareGenericObjectTypes = compareGenericObjectTypes;
exports.compareNumberLiteralTypes = compareNumberLiteralTypes;
exports.compareObjectTypes = compareObjectTypes;
exports.comparePromiseTypes = comparePromiseTypes;
exports.compareStringLiteralTypes = compareStringLiteralTypes;
exports.compareStringLiteralUnionTypes = compareStringLiteralUnionTypes;
exports.compareTypeAnnotation = compareTypeAnnotation;
exports.compareTypes = compareTypes;
exports.compareUnionTypes = compareUnionTypes;
var _ComparisonResult = require("./ComparisonResult");
var _SortTypeAnnotations = require("./SortTypeAnnotations.js");
var _invariant = _interopRequireDefault(require("invariant"));
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
const EQUALITY_MSG = "previousType and afterType differ despite check";
let _newerTypesReg, _olderTypesReg, _newerEnumMap, _olderEnumMap;
function compareTypes(
  newerType,
  olderType,
  newerTypesReg,
  olderTypesReg,
  newerEnumMap,
  olderEnumMap
) {
  if (!olderType) {
    return {
      status: "skipped",
    };
  }
  _newerTypesReg = newerTypesReg;
  _olderTypesReg = olderTypesReg;
  _newerEnumMap = newerEnumMap;
  _olderEnumMap = olderEnumMap;
  const res = compareTypeAnnotation(newerType, olderType);
  _newerTypesReg = undefined;
  _olderTypesReg = undefined;
  _newerEnumMap = undefined;
  _olderEnumMap = undefined;
  return res;
}
function removeNullableTypeAnnotations(annotation) {
  if (annotation.type === "NullableTypeAnnotation") {
    return removeNullableTypeAnnotations(annotation.typeAnnotation);
  }
  return annotation;
}
function lookupType(name, aliases) {
  return aliases?.[name];
}
function lookupEnum(name, enums) {
  return enums?.[name];
}
function compareTypeAnnotation(
  originalNewerAnnotation,
  originalOlderAnnotation
) {
  const newerAnnotation = originalNewerAnnotation;
  const olderAnnotation = originalOlderAnnotation;
  if (newerAnnotation.type === "TypeAliasTypeAnnotation") {
    const newerAnnotationDefinition = lookupType(
      newerAnnotation.name,
      _newerTypesReg
    );
    if (newerAnnotationDefinition != null) {
      return compareTypeAnnotation(newerAnnotationDefinition, olderAnnotation);
    }
  }
  if (olderAnnotation.type === "TypeAliasTypeAnnotation") {
    const olderAnnotationDefinition = lookupType(
      olderAnnotation.name,
      _olderTypesReg
    );
    if (olderAnnotationDefinition != null) {
      return compareTypeAnnotation(newerAnnotation, olderAnnotationDefinition);
    }
  }
  (0, _invariant.default)(
    newerAnnotation.type !== "TypeAliasTypeAnnotation" &&
      olderAnnotation.type !== "TypeAliasTypeAnnotation",
    EQUALITY_MSG
  );
  if (newerAnnotation.type !== olderAnnotation.type) {
    if (
      newerAnnotation.type === "NullableTypeAnnotation" ||
      olderAnnotation.type === "NullableTypeAnnotation"
    ) {
      return compareNullableChange(newerAnnotation, olderAnnotation);
    }
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Type annotations are not the same.",
        newerAnnotation,
        olderAnnotation
      )
    );
  }
  switch (newerAnnotation.type) {
    case "AnyTypeAnnotation":
    case "MixedTypeAnnotation":
    case "DoubleTypeAnnotation":
    case "FloatTypeAnnotation":
    case "Int32TypeAnnotation":
    case "BooleanTypeAnnotation":
    case "NumberTypeAnnotation":
    case "StringTypeAnnotation":
    case "VoidTypeAnnotation":
      return {
        status: "matching",
      };
    case "ArrayTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "ArrayTypeAnnotation",
        EQUALITY_MSG
      );
      return compareTypeAnnotation(
        newerAnnotation.elementType,
        olderAnnotation.elementType
      );
    case "EnumDeclaration":
      (0, _invariant.default)(
        olderAnnotation.type === "EnumDeclaration",
        EQUALITY_MSG
      );
      return compareEnumDeclarations(newerAnnotation, olderAnnotation);
    case "EnumDeclarationWithMembers":
      (0, _invariant.default)(
        olderAnnotation.type === "EnumDeclarationWithMembers",
        EQUALITY_MSG
      );
      return compareEnumDeclarationWithMembers(
        newerAnnotation,
        olderAnnotation
      );
    case "FunctionTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "FunctionTypeAnnotation",
        EQUALITY_MSG
      );
      return compareFunctionTypes(newerAnnotation, olderAnnotation);
    case "PromiseTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "PromiseTypeAnnotation",
        EQUALITY_MSG
      );
      return comparePromiseTypes(newerAnnotation, olderAnnotation);
    case "GenericObjectTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "GenericObjectTypeAnnotation",
        EQUALITY_MSG
      );
      return compareGenericObjectTypes(newerAnnotation, olderAnnotation);
    case "NullableTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "NullableTypeAnnotation",
        EQUALITY_MSG
      );
      return compareTypeAnnotation(
        newerAnnotation.typeAnnotation,
        olderAnnotation.typeAnnotation
      );
    case "ObjectTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "ObjectTypeAnnotation",
        EQUALITY_MSG
      );
      return compareObjectTypes(
        newerAnnotation.properties,
        olderAnnotation.properties
      );
    case "NumberLiteralTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "NumberLiteralTypeAnnotation",
        EQUALITY_MSG
      );
      return compareNumberLiteralTypes(newerAnnotation, olderAnnotation);
    case "StringLiteralUnionTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "StringLiteralUnionTypeAnnotation",
        EQUALITY_MSG
      );
      return compareStringLiteralUnionTypes(newerAnnotation, olderAnnotation);
    case "StringLiteralTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "StringLiteralTypeAnnotation",
        EQUALITY_MSG
      );
      return compareStringLiteralTypes(newerAnnotation, olderAnnotation);
    case "UnionTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "UnionTypeAnnotation",
        EQUALITY_MSG
      );
      return compareUnionTypes(newerAnnotation, olderAnnotation);
    case "EventEmitterTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "EventEmitterTypeAnnotation",
        EQUALITY_MSG
      );
      return compareEventEmitterTypes(newerAnnotation, olderAnnotation);
    case "ReservedTypeAnnotation":
      (0, _invariant.default)(
        olderAnnotation.type === "ReservedTypeAnnotation",
        EQUALITY_MSG
      );
      return compareReservedTypeAnnotation(newerAnnotation, olderAnnotation);
    default:
      throw new Error(`Unsupported type annotation: ${newerAnnotation.type}`);
  }
}
function compareObjectTypeProperty(first, second) {
  if (first.name < second.name) {
    return -1;
  } else if (first.name > second.name) {
    return 1;
  }
  return 0;
}
function compareEnumMember(first, second) {
  if (first.name < second.name) {
    return -1;
  } else if (first.name > second.name) {
    return 1;
  }
  return 0;
}
function updatePropertyError(name, newType, oldType, result) {
  return (oldError) => {
    const comparisonError = (0,
    _ComparisonResult.typeAnnotationComparisonError)(
      "has conflicting type changes",
      newType,
      oldType,
      oldError
    );
    const newFault = {
      property: name,
      fault: comparisonError,
    };
    if (result.errorProperties) {
      result.errorProperties.push(newFault);
    } else {
      result.errorProperties = [newFault];
    }
  };
}
function updateEnumMemberError(name, newType, oldType, result) {
  return (oldError) => {
    const comparisonError = (0,
    _ComparisonResult.typeAnnotationComparisonError)(
      "has conflicting changes",
      newType,
      oldType,
      oldError
    );
    const newFault = {
      member: name,
      fault: comparisonError,
    };
    if (result.errorMembers) {
      result.errorMembers.push(newFault);
    } else {
      result.errorMembers = [newFault];
    }
  };
}
function updateNestedProperties(name, propertyChange, result) {
  if (result.nestedPropertyChanges) {
    result.nestedPropertyChanges.push([name, propertyChange]);
  } else {
    result.nestedPropertyChanges = [[name, propertyChange]];
  }
}
function updateMadeOptional(name, result, furtherChange) {
  if (result.madeOptional) {
    result.madeOptional.push({
      property: name,
      furtherChange,
    });
  } else {
    result.madeOptional = [
      {
        property: name,
        furtherChange,
      },
    ];
  }
}
function updateMadeStrict(name, result, furtherChange) {
  if (result.madeStrict) {
    result.madeStrict.push({
      property: name,
      furtherChange,
    });
  } else {
    result.madeStrict = [
      {
        property: name,
        furtherChange,
      },
    ];
  }
}
function checkOptionalityChanges(
  name,
  newOptionality,
  oldOptionality,
  result,
  furtherChange
) {
  if (newOptionality === oldOptionality) {
    if (furtherChange) {
      updateNestedProperties(name, furtherChange, result);
    }
    return result;
  }
  if (newOptionality) {
    updateMadeOptional(name, result, furtherChange);
  } else {
    updateMadeStrict(name, result, furtherChange);
  }
  return result;
}
function comparePropertyArrays(newerOriginal, olderOriginal) {
  const newer = newerOriginal.slice(0);
  const older = olderOriginal.slice(0);
  if (newer.length === 0 && older.length === 0) {
    return {};
  }
  if (newer.length === 0) {
    return {
      missingProperties: older,
    };
  }
  if (older.length === 0) {
    return {
      addedProperties: newer,
    };
  }
  const newerHead = newer.pop();
  const olderHead = older.pop();
  (0, _invariant.default)(
    newerHead != null && olderHead != null,
    "Array is empty"
  );
  const newerName = newerHead.name;
  const olderName = olderHead.name;
  if (newerName === olderName) {
    const comparedTypes = compareTypeAnnotation(
      newerHead.typeAnnotation,
      olderHead.typeAnnotation
    );
    const result = comparePropertyArrays(newer, older);
    switch (comparedTypes.status) {
      case "matching":
        return checkOptionalityChanges(
          newerName,
          newerHead.optional,
          olderHead.optional,
          result
        );
      case "skipped":
        throw new Error(
          "Internal error: returned 'skipped' for non-optional older type"
        );
      case "nullableChange":
        return checkOptionalityChanges(
          newerName,
          !comparedTypes.nullableLog.optionsReduced,
          comparedTypes.nullableLog.optionsReduced,
          result
        );
      case "members":
      case "properties":
      case "functionChange":
      case "positionalTypeChange":
        return checkOptionalityChanges(
          newerName,
          newerHead.optional,
          olderHead.optional,
          result,
          comparedTypes
        );
      case "error":
        updatePropertyError(
          newerName,
          newerHead.typeAnnotation,
          olderHead.typeAnnotation,
          result
        )(comparedTypes.errorLog);
        return result;
      default:
        throw new Error("Unsupported status " + comparedTypes.status);
    }
  }
  if (newerName > olderName) {
    older.push(olderHead);
    const result = comparePropertyArrays(newer, older);
    if (result.hasOwnProperty("addedProperties") && result.addedProperties) {
      result.addedProperties = result.addedProperties.concat([newerHead]);
    } else {
      result.addedProperties = [newerHead];
    }
    return result;
  }
  newer.push(newerHead);
  const result = comparePropertyArrays(newer, older);
  if (result.hasOwnProperty("missingProperties") && result.missingProperties) {
    result.missingProperties = result.missingProperties.concat([olderHead]);
  } else {
    result.missingProperties = [olderHead];
  }
  return result;
}
function compareObjectTypes(newerPropertyTypes, olderPropertyTypes) {
  if (newerPropertyTypes.length === 0 && olderPropertyTypes.length === 0) {
    return {
      status: "matching",
    };
  }
  const sortedNewerTypes = [];
  newerPropertyTypes.forEach((prop) => sortedNewerTypes.push(prop));
  if (sortedNewerTypes.length !== 0) {
    sortedNewerTypes.sort(compareObjectTypeProperty);
  }
  const sortedOlderTypes = [];
  olderPropertyTypes.forEach((prop) => sortedOlderTypes.push(prop));
  if (sortedOlderTypes.length !== 0) {
    sortedOlderTypes.sort(compareObjectTypeProperty);
  }
  if (sortedNewerTypes.length === 0) {
    return {
      status: "properties",
      propertyLog: {
        missingProperties: sortedOlderTypes,
      },
    };
  }
  if (sortedOlderTypes.length === 0) {
    return {
      status: "properties",
      propertyLog: {
        addedProperties: sortedNewerTypes,
      },
    };
  }
  const result = comparePropertyArrays(sortedNewerTypes, sortedOlderTypes);
  if ((0, _ComparisonResult.isPropertyLogEmpty)(result)) {
    return {
      status: "matching",
    };
  }
  if (result.errorProperties) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.propertyComparisonError)(
        result.errorProperties.length > 1
          ? "Object contained properties with type mismatches"
          : "Object contained a property with a type mismatch",
        result.errorProperties
      )
    );
  }
  if (
    (result.addedProperties &&
      result.addedProperties.length > 0 &&
      result.addedProperties.length === newerPropertyTypes.length) ||
    (result.missingProperties &&
      result.missingProperties.length > 0 &&
      result.missingProperties.length === olderPropertyTypes.length)
  ) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Object types do not match.",
        objectTypeAnnotation(newerPropertyTypes),
        objectTypeAnnotation(olderPropertyTypes)
      )
    );
  }
  return {
    status: "properties",
    propertyLog: result,
  };
}
function objectTypeAnnotation(properties) {
  return {
    type: "ObjectTypeAnnotation",
    properties,
    baseTypes: [],
  };
}
function compareEnumDeclarations(newerDeclaration, olderDeclaration) {
  if (newerDeclaration.memberType !== olderDeclaration.memberType) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "EnumDeclaration member types are not the same",
        newerDeclaration,
        olderDeclaration
      )
    );
  }
  const newerAnnotationDefinition = lookupEnum(
    newerDeclaration.name,
    _newerEnumMap
  );
  const olderAnnotationDefinition = lookupEnum(
    olderDeclaration.name,
    _olderEnumMap
  );
  (0, _invariant.default)(
    newerAnnotationDefinition != null && olderAnnotationDefinition != null,
    "Could not find enum definition"
  );
  return compareTypeAnnotation(
    newerAnnotationDefinition,
    olderAnnotationDefinition
  );
}
function compareEnumDeclarationMemberArrays(newer, older) {
  if (newer.length === 0 && older.length === 0) {
    return {};
  } else if (newer.length === 0) {
    return {
      missingMembers: older,
    };
  } else if (older.length === 0) {
    return {
      addedMembers: newer,
    };
  }
  const newerHead = newer.pop();
  const olderHead = older.pop();
  (0, _invariant.default)(
    newerHead != null && olderHead != null,
    "Array is empty"
  );
  const newerName = newerHead.name;
  const olderName = olderHead.name;
  if (newerName === olderName) {
    const comparedTypes = compareTypeAnnotation(
      newerHead.value,
      olderHead.value
    );
    const result = compareEnumDeclarationMemberArrays(newer, older);
    switch (comparedTypes.status) {
      case "matching":
        return result;
      case "error":
        updateEnumMemberError(
          newerName,
          newerHead.value,
          olderHead.value,
          result
        )(comparedTypes.errorLog);
        return result;
      case "skipped":
        throw new Error(
          "Internal error: returned 'skipped' for non-optional older type"
        );
      case "nullableChange":
      case "properties":
      case "functionChange":
      case "positionalTypeChange":
      case "members":
        break;
      default:
        throw new Error("Unsupported status " + comparedTypes.status);
    }
  } else if (newerName > olderName) {
    older.push(olderHead);
    const result = compareEnumDeclarationMemberArrays(newer, older);
    if (result.hasOwnProperty("addedMembers") && result.addedMembers) {
      result.addedMembers.push(newerHead);
    } else {
      result.addedMembers = [newerHead];
    }
    return result;
  } else if (newerName < olderName) {
    newer.push(newerHead);
    const result = compareEnumDeclarationMemberArrays(newer, older);
    if (result.hasOwnProperty("missingMembers") && result.missingMembers) {
      result.missingMembers.push(olderHead);
    } else {
      result.missingMembers = [olderHead];
    }
    return result;
  }
  throw new Error("Internal error: should not reach here");
}
function compareEnumDeclarationWithMembers(newerDeclaration, olderDeclaration) {
  const sortedNewerTypes = Array.from(newerDeclaration.members).sort(
    compareEnumMember
  );
  const sortedOlderTypes = Array.from(olderDeclaration.members).sort(
    compareEnumMember
  );
  const result = compareEnumDeclarationMemberArrays(
    sortedNewerTypes,
    sortedOlderTypes
  );
  if ((0, _ComparisonResult.isMemberLogEmpty)(result)) {
    return {
      status: "matching",
    };
  } else if (result.errorMembers) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Enum types do not match",
        newerDeclaration,
        olderDeclaration,
        (0, _ComparisonResult.memberComparisonError)(
          result.errorMembers.length > 1
            ? "Enum contained members with type mismatches"
            : "Enum contained a member with a type mismatch",
          result.errorMembers
        )
      )
    );
  } else if (
    (result.addedMembers &&
      result.addedMembers.length > 0 &&
      result.addedMembers.length === newerDeclaration.members.length) ||
    (result.missingMembers &&
      result.missingMembers.length > 0 &&
      result.missingMembers.length === olderDeclaration.members.length)
  ) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Enum types do not match.",
        newerDeclaration,
        olderDeclaration
      )
    );
  }
  return {
    status: "members",
    memberLog: result,
  };
}
function compareNullableChange(newerAnnotation, olderAnnotation) {
  const newVoidRemoved =
    newerAnnotation.type === "NullableTypeAnnotation"
      ? removeNullableTypeAnnotations(newerAnnotation)
      : newerAnnotation;
  const oldVoidRemoved =
    olderAnnotation.type === "NullableTypeAnnotation"
      ? removeNullableTypeAnnotations(olderAnnotation)
      : olderAnnotation;
  const optionalNew = newVoidRemoved.type !== newerAnnotation.type;
  const optionalOld = oldVoidRemoved.type !== olderAnnotation.type;
  (0, _invariant.default)(
    optionalNew !== optionalOld,
    "compareNullableChange called with both being nullable"
  );
  const optionsReduced = !optionalNew && optionalOld;
  if (
    newVoidRemoved.type === "VoidTypeAnnotation" ||
    oldVoidRemoved.type === "VoidTypeAnnotation"
  ) {
    return {
      status: "nullableChange",
      nullableLog: {
        typeRefined: true,
        optionsReduced,
        interiorLog: null,
        newType: newerAnnotation,
        oldType: olderAnnotation,
      },
    };
  }
  const interiorLog = compareTypeAnnotation(newVoidRemoved, oldVoidRemoved);
  switch (interiorLog.status) {
    case "error":
      return (0, _ComparisonResult.makeError)(
        (0, _ComparisonResult.typeAnnotationComparisonError)(
          "Type annotations are not the same.",
          newerAnnotation,
          olderAnnotation
        )
      );
    case "matching":
      return {
        status: "nullableChange",
        nullableLog: {
          typeRefined: false,
          optionsReduced,
          interiorLog,
          newType: newerAnnotation,
          oldType: olderAnnotation,
        },
      };
    default:
      return {
        status: "nullableChange",
        nullableLog: {
          typeRefined: false,
          optionsReduced,
          interiorLog,
          newType: newerAnnotation,
          oldType: olderAnnotation,
        },
      };
  }
}
function compareUnionTypes(newerType, olderType) {
  if (newerType.memberType !== olderType.memberType) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Union member type does not match",
        newerType,
        olderType
      )
    );
  }
  return {
    status: "matching",
  };
}
function comparePromiseTypes(newerType, olderType) {
  if (newerType.elementType == null || olderType.elementType == null) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Promise has differing arguments",
        newerType,
        olderType
      )
    );
  }
  (0, _invariant.default)(
    newerType.elementType != null && olderType.elementType != null,
    EQUALITY_MSG
  );
  return compareTypeAnnotation(newerType.elementType, olderType.elementType);
}
function compareGenericObjectTypes(newerType, olderType) {
  if (
    newerType.dictionaryValueType == null &&
    olderType.dictionaryValueType == null
  ) {
    return {
      status: "matching",
    };
  }
  if (
    newerType.dictionaryValueType != null &&
    olderType.dictionaryValueType != null
  ) {
    return compareTypeAnnotation(
      newerType.dictionaryValueType,
      olderType.dictionaryValueType
    );
  }
  return (0, _ComparisonResult.makeError)(
    (0, _ComparisonResult.typeAnnotationComparisonError)(
      "Generic Object types do not have matching dictionary types",
      newerType,
      olderType
    )
  );
}
function compareNumberLiteralTypes(newerType, olderType) {
  return newerType.value === olderType.value
    ? {
        status: "matching",
      }
    : (0, _ComparisonResult.makeError)(
        (0, _ComparisonResult.typeAnnotationComparisonError)(
          "Numeric literals are not equal",
          newerType,
          olderType
        )
      );
}
function compareStringLiteralTypes(newerType, olderType) {
  return newerType.value === olderType.value
    ? {
        status: "matching",
      }
    : (0, _ComparisonResult.makeError)(
        (0, _ComparisonResult.typeAnnotationComparisonError)(
          "String literals are not equal",
          newerType,
          olderType
        )
      );
}
function compareStringLiteralUnionTypes(newerType, olderType) {
  const results = compareArrayOfTypes(
    true,
    false,
    newerType.types,
    olderType.types
  );
  switch (results.status) {
    case "length-mismatch":
      throw new Error("length-mismatch returned with length changes allowed");
    case "type-mismatch":
      return (0, _ComparisonResult.makeError)(
        (0, _ComparisonResult.typeAnnotationComparisonError)(
          `Subtype of union at position ${results.newIndex} did not match`,
          newerType,
          olderType,
          results.error
        )
      );
    case "subtypable-changes":
      if (results.nestedChanges.length > 0) {
        throw new Error(
          "Unexpected inline objects/functions in string literal union"
        );
      }
      if (results.addedElements.length > 0) {
        return {
          status: "positionalTypeChange",
          changeLog: {
            typeKind: "stringUnion",
            nestedChanges: [],
            addedElements: results.addedElements,
          },
        };
      }
      if (results.removedElements.length > 0) {
        return {
          status: "positionalTypeChange",
          changeLog: {
            typeKind: "stringUnion",
            nestedChanges: [],
            removedElements: results.removedElements,
          },
        };
      }
      console.log(JSON.stringify(results));
      throw new Error("string union returned unexpected set of changes");
    case "matching":
      return {
        status: "matching",
      };
    default:
      throw new Error("Unknown status");
  }
}
function compareFunctionTypes(newerType, olderType) {
  const returnTypeResult = compareTypeAnnotation(
    newerType.returnTypeAnnotation,
    olderType.returnTypeAnnotation
  );
  if (returnTypeResult.status === "error") {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Function return types do not match",
        newerType,
        olderType,
        returnTypeResult.errorLog
      )
    );
  }
  const functionChanges = {};
  if (
    returnTypeResult.status === "properties" ||
    returnTypeResult.status === "members" ||
    returnTypeResult.status === "functionChange" ||
    returnTypeResult.status === "positionalTypeChange" ||
    returnTypeResult.status === "nullableChange"
  ) {
    functionChanges.returnType = returnTypeResult;
  }
  const argumentResults = compareArrayOfTypes(
    true,
    true,
    newerType.params.map((_) => _.typeAnnotation),
    olderType.params.map((_) => _.typeAnnotation)
  );
  switch (argumentResults.status) {
    case "length-mismatch":
      return (0, _ComparisonResult.makeError)(
        (0, _ComparisonResult.typeAnnotationComparisonError)(
          "Function types have differing length of arguments",
          newerType,
          olderType
        )
      );
    case "type-mismatch":
      return (0, _ComparisonResult.makeError)(
        (0, _ComparisonResult.typeAnnotationComparisonError)(
          `Parameter at index ${argumentResults.newIndex} did not match`,
          newerType,
          olderType,
          argumentResults.error
        )
      );
    case "subtypable-changes":
      functionChanges.parameterTypes = {
        typeKind: "parameter",
        nestedChanges: argumentResults.nestedChanges,
      };
      break;
    case "matching":
    default:
      break;
  }
  if ((0, _ComparisonResult.isFunctionLogEmpty)(functionChanges)) {
    return {
      status: "matching",
    };
  }
  return {
    status: "functionChange",
    functionChangeLog: functionChanges,
  };
}
function compareArrayOfTypes(fixedOrder, fixedLength, newerTypes, olderTypes) {
  const sameLength = newerTypes.length === olderTypes.length;
  if (fixedLength && !sameLength) {
    return {
      status: "length-mismatch",
    };
  }
  const nestedChanges = [];
  const minLength = Math.min(newerTypes.length, olderTypes.length);
  if (fixedOrder) {
    for (let i = 0; i < minLength; i++) {
      const result = compareTypeAnnotation(newerTypes[i], olderTypes[i]);
      if (result.status === "error") {
        return {
          status: "type-mismatch",
          error: result.errorLog,
          newIndex: i,
          oldIndex: i,
        };
      }
      if (
        result.status === "properties" ||
        result.status === "members" ||
        result.status === "functionChange" ||
        result.status === "positionalTypeChange" ||
        result.status === "nullableChange"
      ) {
        nestedChanges.push([i, i, result]);
      }
    }
    if (nestedChanges.length === 0 && sameLength) {
      return {
        status: "matching",
      };
    }
    const addedElements = [];
    const removedElements = [];
    if (newerTypes.length < olderTypes.length) {
      const elements = olderTypes.slice(minLength, olderTypes.length);
      for (let i = 0; i < elements.length; i++) {
        removedElements.push([i + minLength + 1, elements[i]]);
      }
    }
    if (newerTypes.length > olderTypes.length) {
      const elements = newerTypes.slice(minLength, newerTypes.length);
      for (let i = 0; i < elements.length; i++) {
        addedElements.push([i + minLength + 1, elements[i]]);
      }
    }
    return {
      status: "subtypable-changes",
      nestedChanges,
      addedElements,
      removedElements,
    };
  }
  return compareArrayTypesOutOfOrder(
    (0, _SortTypeAnnotations.sortTypeAnnotations)(newerTypes),
    0,
    (0, _SortTypeAnnotations.sortTypeAnnotations)(olderTypes),
    0,
    [],
    [],
    []
  );
}
function compareArrayTypesOutOfOrder(
  newerTypes,
  newerIndex,
  olderTypes,
  olderIndex,
  potentiallyAddedElements,
  potentiallyRemovedElements,
  nestedChanges
) {
  const newLength = newerTypes.length;
  const oldLength = olderTypes.length;
  if (newerIndex === newLength || olderIndex === oldLength) {
    const [errors, added, removed] = resolvePotentials(
      potentiallyAddedElements,
      potentiallyRemovedElements
    );
    if (errors.length !== 0) {
      return {
        status: "type-mismatch",
        error: errors[0][0],
        oldIndex: errors[0][1],
        newIndex: errors[0][2],
      };
    }
    if (
      added.length === 0 &&
      removed.length === 0 &&
      nestedChanges.length === 0 &&
      newerIndex === newLength &&
      olderIndex === oldLength
    ) {
      return {
        status: "matching",
      };
    }
    if (newerIndex === newLength && olderIndex === oldLength) {
      return {
        status: "subtypable-changes",
        nestedChanges,
        addedElements: added,
        removedElements: removed,
      };
    }
    if (newerIndex === newLength) {
      return {
        status: "subtypable-changes",
        nestedChanges,
        addedElements: added,
        removedElements: removed.concat(
          olderTypes.slice(olderIndex, oldLength)
        ),
      };
    }
    return {
      status: "subtypable-changes",
      nestedChanges,
      addedElements: added.concat(newerTypes.slice(newerIndex, newLength)),
      removedElements: removed,
    };
  }
  const newTypePosn = newerTypes[newerIndex][0];
  const newType = newerTypes[newerIndex][1];
  const oldTypePosn = olderTypes[olderIndex][0];
  const oldType = olderTypes[olderIndex][1];
  const currentResult = compareTypeAnnotation(newType, oldType);
  const sortComparison = (0,
  _SortTypeAnnotations.compareTypeAnnotationForSorting)(
    newerTypes[newerIndex],
    olderTypes[olderIndex]
  );
  switch (currentResult.status) {
    case "matching":
      return compareArrayTypesOutOfOrder(
        newerTypes,
        newerIndex + 1,
        olderTypes,
        olderIndex + 1,
        potentiallyAddedElements,
        potentiallyRemovedElements,
        nestedChanges
      );
    case "properties":
    case "functionChange":
    case "positionalTypeChange":
    case "nullableChange":
      return compareArrayTypesOutOfOrder(
        newerTypes,
        newerIndex + 1,
        olderTypes,
        olderIndex + 1,
        potentiallyAddedElements,
        potentiallyRemovedElements,
        nestedChanges.concat[[oldTypePosn, newTypePosn, currentResult]]
      );
    case "error":
      if (sortComparison === 0) {
        return {
          status: "type-mismatch",
          error: currentResult.errorLog,
          newIndex: newTypePosn,
          oldIndex: oldTypePosn,
        };
      }
      if (sortComparison < 0) {
        return compareArrayTypesOutOfOrder(
          newerTypes,
          newerIndex + 1,
          olderTypes,
          olderIndex,
          potentiallyAddedElements.concat([
            {
              olderPosition: oldTypePosn,
              newerPosition: newTypePosn,
              error: currentResult.errorLog,
              annotation: newType,
            },
          ]),
          potentiallyRemovedElements,
          nestedChanges
        );
      }
      return compareArrayTypesOutOfOrder(
        newerTypes,
        newerIndex,
        olderTypes,
        olderIndex + 1,
        potentiallyAddedElements,
        potentiallyRemovedElements.concat([
          {
            olderPosition: oldTypePosn,
            newerPosition: newTypePosn,
            error: currentResult.errorLog,
            annotation: oldType,
          },
        ]),
        nestedChanges
      );
    case "skipped":
      throw new Error(
        "Unexpected skipped status for array of type annotations"
      );
    default:
      throw new Error("Unsupported status " + currentResult.status);
  }
}
function resolvePotentials(potentiallyAdded, potentiallyRemoved) {
  const addedLength = potentiallyAdded.length;
  const removedLength = potentiallyRemoved.length;
  if (addedLength === 0 && removedLength === 0) {
    return [[], [], []];
  }
  if (addedLength === 0) {
    return [
      [],
      [],
      potentiallyRemoved.map((removed) => [
        removed.olderPosition,
        removed.annotation,
      ]),
    ];
  }
  if (removedLength === 0) {
    return [
      [],
      potentiallyAdded.map((added) => [added.newerPosition, added.annotation]),
      [],
    ];
  }
  const addedHead = potentiallyAdded[0];
  const removedHead = potentiallyRemoved[0];
  if (addedHead.olderPosition === removedHead.olderPosition) {
    return [
      [[addedHead.error, addedHead.olderPosition, addedHead.newerPosition]],
      [],
      [],
    ];
  }
  if (removedHead.newerPosition === addedHead.newerPosition) {
    return [
      [
        [
          removedHead.error,
          removedHead.olderPosition,
          removedHead.newerPosition,
        ],
      ],
      [],
      [],
    ];
  }
  const sortedOrder = (0, _SortTypeAnnotations.compareTypeAnnotationForSorting)(
    [addedHead.newerPosition, addedHead.annotation],
    [removedHead.olderPosition, removedHead.annotation]
  );
  if (sortedOrder === 0) {
    const [errors, added, removed] = resolvePotentials(
      potentiallyAdded.slice(1, addedLength),
      potentiallyRemoved.slice(1, removedLength)
    );
    return [
      errors,
      added.concat([[addedHead.newerPosition, addedHead.annotation]]),
      removed.concat([[removedHead.olderPosition, removedHead.annotation]]),
    ];
  }
  if (sortedOrder < 0) {
    const [errors, added, removed] = resolvePotentials(
      potentiallyAdded.slice(1, addedLength),
      potentiallyRemoved
    );
    return [
      errors,
      added.concat([[addedHead.newerPosition, addedHead.annotation]]),
      removed,
    ];
  }
  const [errors, added, removed] = resolvePotentials(
    potentiallyAdded,
    potentiallyRemoved.slice(1, removedLength)
  );
  return [
    errors,
    added,
    removed.concat([[removedHead.olderPosition, removedHead.annotation]]),
  ];
}
function compareEventEmitterTypes(newerAnnotation, olderAnnotation) {
  const comparison = compareTypeAnnotation(
    newerAnnotation.typeAnnotation,
    olderAnnotation.typeAnnotation
  );
  if (comparison.status === "error") {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "EventEmitter eventTypes are not equivalent",
        newerAnnotation,
        olderAnnotation,
        comparison.errorLog
      )
    );
  }
  return comparison;
}
function compareReservedTypeAnnotation(newerAnnotation, olderAnnotation) {
  if (newerAnnotation.name !== olderAnnotation.name) {
    return (0, _ComparisonResult.makeError)(
      (0, _ComparisonResult.typeAnnotationComparisonError)(
        "Types are not equivalent",
        newerAnnotation,
        olderAnnotation
      )
    );
  }
  switch (newerAnnotation.name) {
    case "RootTag":
    case "ColorPrimitive":
    case "ImageSourcePrimitive":
    case "PointPrimitive":
    case "EdgeInsetsPrimitive":
    case "ImageRequestPrimitive":
    case "DimensionPrimitive":
      return {
        status: "matching",
      };
    default:
      newerAnnotation.name;
      throw new Error("Unknown reserved type " + newerAnnotation.name);
  }
}
