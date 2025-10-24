"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.addedUnionMessage =
  exports.addedPropertiesMessage =
  exports.addedIntersectionMessage =
  exports.addedEnumMessage =
    void 0;
exports.assessComparisonResult = assessComparisonResult;
exports.buildSchemaDiff = buildSchemaDiff;
exports.fromNativeVoidChangeMessage = void 0;
exports.hasCodegenUpdatesTypes = hasCodegenUpdatesTypes;
exports.hasUpdatesTypes = hasUpdatesTypes;
exports.stricterPropertiesMessage =
  exports.removedUnionMessage =
  exports.removedPropertiesMessage =
  exports.removedIntersectionMessage =
  exports.removedEnumMessage =
    void 0;
exports.summarizeDiffSet = summarizeDiffSet;
exports.typeNullableChangeMessage =
  exports.typeNonNullableChangeMessage =
  exports.tooOptionalPropertiesMessage =
  exports.toNativeVoidChangeMessage =
    void 0;
var _ComparisonResult = require("./ComparisonResult.js");
var _convertPropToBasicTypes = _interopRequireDefault(
  require("./convertPropToBasicTypes")
);
var codegenTypeDiffing = _interopRequireWildcard(require("./TypeDiffing"));
function _getRequireWildcardCache(e) {
  if ("function" != typeof WeakMap) return null;
  var r = new WeakMap(),
    t = new WeakMap();
  return (_getRequireWildcardCache = function (e) {
    return e ? t : r;
  })(e);
}
function _interopRequireWildcard(e, r) {
  if (!r && e && e.__esModule) return e;
  if (null === e || ("object" != typeof e && "function" != typeof e))
    return { default: e };
  var t = _getRequireWildcardCache(r);
  if (t && t.has(e)) return t.get(e);
  var n = { __proto__: null },
    a = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var u in e)
    if ("default" !== u && {}.hasOwnProperty.call(e, u)) {
      var i = a ? Object.getOwnPropertyDescriptor(e, u) : null;
      i && (i.get || i.set) ? Object.defineProperty(n, u, i) : (n[u] = e[u]);
    }
  return (n.default = e), t && t.set(e, n), n;
}
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
function nestedPropertiesCheck(typeName, result, check, inverseCheck) {
  const nestedMap =
    (mid, end) =>
    ([propertyName, comparisonResult]) =>
      nestedPropertiesCheck(
        typeName + mid + propertyName + end,
        comparisonResult,
        check,
        inverseCheck
      );
  switch (result.status) {
    case "error":
    case "matching":
    case "skipped":
      throw new Error(
        "Internal error: nested property change " + result.status
      );
    case "properties":
      let finalResult = check(result.propertyLog, null, null, null, typeName);
      if (result.propertyLog.nestedPropertyChanges) {
        finalResult = combine(
          finalResult,
          result.propertyLog.nestedPropertyChanges.map(nestedMap(".", ""))
        );
      }
      if (result.propertyLog.madeOptional) {
        const furtherNestedProps = result.propertyLog.madeOptional.filter(
          (optionalProp) => optionalProp.furtherChanges
        );
        if (furtherNestedProps && furtherNestedProps.length > 0) {
          const localNestedMap = nestedMap(".", "");
          const mappedProps = furtherNestedProps.map((optionalProp) => {
            if (optionalProp.furtherChanges) {
              return localNestedMap([
                optionalProp.property,
                optionalProp.furtherChanges,
              ]);
            }
            throw new Error("Internal error, filter failed");
          });
          finalResult = combine(finalResult, mappedProps);
        }
      }
      return finalResult;
    case "members":
      return check(null, null, null, result.memberLog, typeName);
    case "functionChange":
      let returnTypeResult = [];
      if (result.functionChangeLog.returnType) {
        returnTypeResult = nestedPropertiesCheck(
          typeName,
          result.functionChangeLog.returnType,
          check,
          inverseCheck
        );
      }
      if (result.functionChangeLog.parameterTypes) {
        return combine(
          returnTypeResult,
          result.functionChangeLog.parameterTypes.nestedChanges.map(
            ([_oldParameterNumber, newParameterNumber, comparisonResult]) =>
              nestedPropertiesCheck(
                typeName + " parameter " + newParameterNumber,
                comparisonResult,
                inverseCheck,
                check
              )
          )
        );
      }
      return returnTypeResult;
    case "positionalTypeChange":
      const changeLog = result.changeLog;
      const currentPositionalCheck = check(
        null,
        changeLog,
        null,
        null,
        typeName
      );
      return combine(
        currentPositionalCheck,
        changeLog.nestedChanges.map(([_oldIndex, newIndex, nestedChange]) =>
          nestedMap(
            " element ",
            " of " + changeLog.typeKind
          )([newIndex.toString(), nestedChange])
        )
      );
    case "nullableChange":
      const currentCheck = check(
        null,
        null,
        result.nullableLog,
        null,
        typeName
      );
      if (result.nullableLog.interiorLog) {
        const interiorLog = result.nullableLog.interiorLog;
        switch (interiorLog.status) {
          case "matching":
            return currentCheck;
          case "properties":
          case "functionChange":
          case "positionalTypeChange":
          case "nullableChange":
            return combine(currentCheck, [
              nestedPropertiesCheck(typeName, interiorLog, check, inverseCheck),
            ]);
          default:
            throw new Error(
              "Internal error: nested with error or skipped status"
            );
        }
      }
      return currentCheck;
    default:
      result.status;
      return [];
  }
}
function checkOptionalityAndSetError(typeName, properties, msg, errorCode) {
  const requiredProperties = properties.filter(
    (objectTypeProperty) => !objectTypeProperty.optional
  );
  if (requiredProperties.length > 0) {
    return [
      {
        typeName,
        errorCode,
        errorInformation: (0, _ComparisonResult.propertyComparisonError)(
          msg,
          requiredProperties.map((property) => ({
            property: property.name,
          }))
        ),
      },
    ];
  }
  return [];
}
const removedPropertiesMessage = (exports.removedPropertiesMessage =
  "Object removed required properties expected by native");
function checkForUnsafeRemovedProperties(
  propertyChange,
  _postionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (propertyChange && propertyChange.missingProperties) {
    return checkOptionalityAndSetError(
      typeName,
      propertyChange.missingProperties,
      removedPropertiesMessage,
      "removedProps"
    );
  }
  return [];
}
const addedPropertiesMessage = (exports.addedPropertiesMessage =
  "Object added required properties, which native will not provide");
function checkForUnsafeAddedProperties(
  propertyChange,
  _positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (propertyChange && propertyChange.addedProperties) {
    return checkOptionalityAndSetError(
      typeName,
      propertyChange.addedProperties,
      addedPropertiesMessage,
      "addedProps"
    );
  }
  return [];
}
const stricterPropertiesMessage = (exports.stricterPropertiesMessage =
  "Property made strict, but native may not provide it");
function checkForUnSafeMadeStrictProperties(
  propertyChange,
  _positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (
    propertyChange &&
    propertyChange.madeStrict &&
    propertyChange.madeStrict.length > 0
  ) {
    const err = (0, _ComparisonResult.propertyComparisonError)(
      stricterPropertiesMessage,
      propertyChange.madeStrict.map((property) => ({
        property: property.property,
      }))
    );
    return [
      {
        typeName,
        errorCode: "requiredProps",
        errorInformation: err,
      },
    ];
  }
  return [];
}
const tooOptionalPropertiesMessage = (exports.tooOptionalPropertiesMessage =
  "Property made optional, but native requires it");
function checkForUnSafeMadeOptionalProperties(
  propertyChange,
  _positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (
    propertyChange &&
    propertyChange.madeOptional &&
    propertyChange.madeOptional.length > 0
  ) {
    const err = (0, _ComparisonResult.propertyComparisonError)(
      tooOptionalPropertiesMessage,
      propertyChange.madeOptional.map((property) => ({
        property: property.property,
      }))
    );
    return [
      {
        typeName,
        errorCode: "optionalProps",
        errorInformation: err,
      },
    ];
  }
  return [];
}
const removedUnionMessage = (exports.removedUnionMessage =
  "Union removed items, but native may still provide them");
function checkForUnsafeRemovedUnionItems(
  _propertyChange,
  positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (
    positionalChange &&
    (positionalChange.typeKind === "union" ||
      positionalChange.typeKind === "stringUnion") &&
    positionalChange.removedElements &&
    positionalChange.removedElements.length > 0
  ) {
    return [
      {
        typeName,
        errorCode: "removedUnionCases",
        errorInformation: (0, _ComparisonResult.positionalComparisonError)(
          removedUnionMessage,
          positionalChange.removedElements
        ),
      },
    ];
  }
  return [];
}
const addedUnionMessage = (exports.addedUnionMessage =
  "Union added items, but native will not expect/support them");
function checkForUnsafeAddedUnionItems(
  _propertyChange,
  positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (
    positionalChange &&
    (positionalChange.typeKind === "union" ||
      positionalChange.typeKind === "stringUnion") &&
    positionalChange.addedElements &&
    positionalChange.addedElements.length > 0
  ) {
    return [
      {
        typeName,
        errorCode: "addedUnionCases",
        errorInformation: (0, _ComparisonResult.positionalComparisonError)(
          addedUnionMessage,
          positionalChange.addedElements
        ),
      },
    ];
  }
  return [];
}
const removedEnumMessage = (exports.removedEnumMessage =
  "Enum removed items, but native may still provide them");
function checkForUnsafeRemovedEnumItems(
  _propertyChange,
  _positionalChange,
  _nullableChange,
  memberChange,
  typeName
) {
  if (memberChange?.missingMembers && memberChange?.missingMembers.length > 0) {
    return [
      {
        typeName,
        errorCode: "removedEnumCases",
        errorInformation: (0, _ComparisonResult.memberComparisonError)(
          removedEnumMessage,
          memberChange.missingMembers.map((member) => ({
            member: member.name,
          }))
        ),
      },
    ];
  }
  return [];
}
const addedEnumMessage = (exports.addedEnumMessage =
  "Enum added items, but native will not expect/support them");
function checkForUnsafeAddedEnumItems(
  _propertyChange,
  _positionalChange,
  _nullableChange,
  memberChange,
  typeName
) {
  if (memberChange?.addedMembers && memberChange?.addedMembers.length > 0) {
    return [
      {
        typeName,
        errorCode: "addedEnumCases",
        errorInformation: (0, _ComparisonResult.memberComparisonError)(
          addedEnumMessage,
          memberChange.addedMembers.map((member) => ({
            member: member.name,
          }))
        ),
      },
    ];
  }
  return [];
}
const removedIntersectionMessage = (exports.removedIntersectionMessage =
  "Intersection removed items, but native may still require properties contained in them");
function checkForUnsafeRemovedIntersectionItems(
  _propertyChange,
  positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (
    positionalChange &&
    positionalChange.typeKind === "intersection" &&
    positionalChange.removedElements &&
    positionalChange.removedElements.length > 0
  ) {
    return [
      {
        typeName,
        errorCode: "removedIntersectCases",
        errorInformation: (0, _ComparisonResult.positionalComparisonError)(
          removedIntersectionMessage,
          positionalChange.removedElements
        ),
      },
    ];
  }
  return [];
}
const addedIntersectionMessage = (exports.addedIntersectionMessage =
  "Intersection added items, but native may not provide all required attributes");
function checkForUnsafeAddedIntersectionItems(
  _propertyChange,
  positionalChange,
  _nullableChange,
  _memberChange,
  typeName
) {
  if (
    positionalChange &&
    positionalChange.typeKind === "intersection" &&
    positionalChange.addedElements &&
    positionalChange.addedElements.length > 0
  ) {
    return [
      {
        typeName,
        errorCode: "addedIntersectCases",
        errorInformation: (0, _ComparisonResult.positionalComparisonError)(
          addedIntersectionMessage,
          positionalChange.addedElements
        ),
      },
    ];
  }
  return [];
}
const toNativeVoidChangeMessage = (exports.toNativeVoidChangeMessage =
  "Native may not be able to safely handle presence of type");
const typeNullableChangeMessage = (exports.typeNullableChangeMessage =
  "Type made nullable, but native requires it");
function checkForUnsafeNullableToNativeChange(
  _propertyChange,
  _positionalChange,
  nullableChange,
  _memberChange,
  typeName
) {
  if (
    nullableChange &&
    !nullableChange.optionsReduced &&
    nullableChange.newType &&
    nullableChange.oldType
  ) {
    return [
      {
        typeName,
        errorCode: "nullableOfNonNull",
        errorInformation: (0, _ComparisonResult.typeAnnotationComparisonError)(
          nullableChange.typeRefined
            ? toNativeVoidChangeMessage
            : typeNullableChangeMessage,
          nullableChange.newType,
          nullableChange.oldType
        ),
      },
    ];
  }
  return [];
}
const fromNativeVoidChangeMessage = (exports.fromNativeVoidChangeMessage =
  "Type set to void but native may still provide a value");
const typeNonNullableChangeMessage = (exports.typeNonNullableChangeMessage =
  "Type made non-nullable, but native might provide null still");
function checkForUnsafeNullableFromNativeChange(
  _propertyChange,
  _positionalChange,
  nullableChange,
  _memberChange,
  typeName
) {
  if (
    nullableChange &&
    nullableChange.optionsReduced &&
    nullableChange.newType &&
    nullableChange.oldType
  ) {
    return [
      {
        typeName,
        errorCode: "nonNullableOfNull",
        errorInformation: (0, _ComparisonResult.typeAnnotationComparisonError)(
          nullableChange.typeRefined
            ? fromNativeVoidChangeMessage
            : typeNonNullableChangeMessage,
          nullableChange.newType,
          nullableChange.oldType
        ),
      },
    ];
  }
  return [];
}
function chainPropertiesChecks(checks) {
  return (
    propertyChange,
    positionalChange,
    nullableChange,
    memberChange,
    typeName
  ) =>
    checks.reduce(
      (errorStore, checker) =>
        errorStore.concat(
          checker(
            propertyChange,
            positionalChange,
            nullableChange,
            memberChange,
            typeName
          )
        ),
      []
    );
}
function combine(singleton, arrayOf) {
  if (arrayOf.length > 0) {
    return arrayOf.reduce(
      (finalErrorArray, current) => finalErrorArray.concat(current),
      singleton
    );
  }
  return singleton;
}
function compareFunctionTypesInContext(
  typeName,
  functionLog,
  check,
  inversecheck,
  result
) {
  if (functionLog.returnType) {
    result = combine(result, [
      nestedPropertiesCheck(
        typeName,
        functionLog.returnType,
        check,
        inversecheck
      ),
    ]);
  }
  if (
    functionLog.parameterTypes &&
    functionLog.parameterTypes.nestedChanges.length > 0
  ) {
    result = combine(
      result,
      functionLog.parameterTypes.nestedChanges.map(
        ([_oldPropertyNum, newPropertyNum, comparisonResult]) =>
          nestedPropertiesCheck(
            typeName + " parameter " + newPropertyNum,
            comparisonResult,
            inversecheck,
            check
          )
      )
    );
  }
  return result;
}
const checksForTypesFlowingToNative = chainPropertiesChecks([
  checkForUnsafeRemovedProperties,
  checkForUnSafeMadeOptionalProperties,
  checkForUnsafeAddedUnionItems,
  checkForUnsafeAddedEnumItems,
  checkForUnsafeRemovedIntersectionItems,
  checkForUnsafeNullableToNativeChange,
]);
const checksForTypesFlowingFromNative = chainPropertiesChecks([
  checkForUnsafeAddedProperties,
  checkForUnSafeMadeStrictProperties,
  checkForUnsafeRemovedUnionItems,
  checkForUnsafeRemovedEnumItems,
  checkForUnsafeAddedIntersectionItems,
  checkForUnsafeNullableFromNativeChange,
]);
function assessComparisonResult(
  newTypes,
  deprecatedTypes,
  incompatibleChanges,
  objectTypeChanges
) {
  return (typeName, newType, oldType, difference, oldDirection) => {
    switch (difference.status) {
      case "matching":
        break;
      case "skipped":
        newTypes.add({
          typeName,
          typeInformation: newType,
        });
        break;
      case "members":
        {
          const memberChange = difference.memberLog;
          const toNativeErrorResult = checksForTypesFlowingToNative(
            null,
            null,
            null,
            memberChange,
            typeName
          );
          const fromNativeErrorResult = checksForTypesFlowingFromNative(
            null,
            null,
            null,
            memberChange,
            typeName
          );
          switch (oldDirection) {
            case "toNative":
              toNativeErrorResult.forEach((error) =>
                incompatibleChanges.add(error)
              );
              break;
            case "fromNative":
              fromNativeErrorResult.forEach((error) =>
                incompatibleChanges.add(error)
              );
              break;
            case "both":
              toNativeErrorResult.forEach((error) =>
                incompatibleChanges.add(error)
              );
              fromNativeErrorResult.forEach((error) =>
                incompatibleChanges.add(error)
              );
              break;
          }
        }
        break;
      case "properties":
        const propertyChange = difference.propertyLog;
        const unsafeForToNative = nestedPropertiesCheck(
          typeName,
          difference,
          checksForTypesFlowingToNative,
          checksForTypesFlowingFromNative
        );
        const unsafeForFromNative = nestedPropertiesCheck(
          typeName,
          difference,
          checksForTypesFlowingFromNative,
          checksForTypesFlowingToNative
        );
        switch (oldDirection) {
          case "toNative":
            unsafeForToNative.forEach((error) =>
              incompatibleChanges.add(error)
            );
            break;
          case "fromNative":
            unsafeForFromNative.forEach((error) =>
              incompatibleChanges.add(error)
            );
            break;
          case "both":
            unsafeForToNative.forEach((error) =>
              incompatibleChanges.add(error)
            );
            unsafeForFromNative.forEach((error) =>
              incompatibleChanges.add(error)
            );
            break;
        }
        if (!oldType) {
          throw new Error("Internal error: properties change with no old type");
        }
        objectTypeChanges.add({
          typeName,
          newType,
          oldType,
          propertyChange,
        });
        break;
      case "error":
        incompatibleChanges.add({
          typeName,
          errorCode: "incompatibleTypes",
          errorInformation: difference.errorLog,
        });
        break;
      case "functionChange":
        const functionLog = difference.functionChangeLog;
        let propertyErrors = [];
        switch (oldDirection) {
          case "toNative":
            propertyErrors = compareFunctionTypesInContext(
              typeName,
              functionLog,
              checksForTypesFlowingToNative,
              checksForTypesFlowingFromNative,
              propertyErrors
            );
            break;
          case "fromNative":
            propertyErrors = compareFunctionTypesInContext(
              typeName,
              functionLog,
              checksForTypesFlowingFromNative,
              checksForTypesFlowingToNative,
              propertyErrors
            );
            break;
          case "both":
            propertyErrors = compareFunctionTypesInContext(
              typeName,
              functionLog,
              checksForTypesFlowingToNative,
              checksForTypesFlowingFromNative,
              propertyErrors
            );
            propertyErrors = compareFunctionTypesInContext(
              typeName,
              functionLog,
              checksForTypesFlowingFromNative,
              checksForTypesFlowingToNative,
              propertyErrors
            );
            break;
          default:
            throw new Error(
              "Unsupported native boundary direction " + oldDirection
            );
        }
        propertyErrors.forEach((error) => incompatibleChanges.add(error));
        break;
      case "positionalTypeChange":
        const changeLog = difference.changeLog;
        if (
          changeLog.nestedChanges.length > 0 ||
          changeLog.addedElements ||
          changeLog.removedElements
        ) {
          const changes = changeLog.nestedChanges;
          const toNativeBase = checksForTypesFlowingToNative(
            null,
            changeLog,
            null,
            null,
            typeName
          );
          const toNativeResult = combine(
            toNativeBase,
            changes.map(([_oldIndex, newIndex, comparisonResult]) =>
              nestedPropertiesCheck(
                `${typeName} element ${newIndex} of ${changeLog.typeKind}`,
                comparisonResult,
                checksForTypesFlowingToNative,
                checksForTypesFlowingFromNative
              )
            )
          );
          const fromNativeBase = checksForTypesFlowingFromNative(
            null,
            changeLog,
            null,
            null,
            typeName
          );
          const fromNativeResult = combine(
            fromNativeBase,
            changes.map(([_oldIndex, newIndex, comparisonResult]) =>
              nestedPropertiesCheck(
                `${typeName} element ${newIndex} of ${changeLog.typeKind}`,
                comparisonResult,
                checksForTypesFlowingFromNative,
                checksForTypesFlowingToNative
              )
            )
          );
          switch (oldDirection) {
            case "toNative":
              toNativeResult.forEach((error) => incompatibleChanges.add(error));
              break;
            case "fromNative":
              fromNativeResult.forEach((error) =>
                incompatibleChanges.add(error)
              );
              break;
            case "both":
              toNativeResult.forEach((error) => incompatibleChanges.add(error));
              fromNativeResult.forEach((error) =>
                incompatibleChanges.add(error)
              );
              break;
          }
        }
        break;
      case "nullableChange":
        if (!oldType) {
          throw new Error(
            "Internal error: old type null or undefined, after nullableChange"
          );
        }
        switch (oldDirection) {
          case "toNative":
            checkForUnsafeNullableToNativeChange(
              null,
              null,
              difference.nullableLog,
              null,
              typeName
            ).forEach((error) => incompatibleChanges.add(error));
            break;
          case "fromNative":
            checkForUnsafeNullableFromNativeChange(
              null,
              null,
              difference.nullableLog,
              null,
              typeName
            ).forEach((error) => incompatibleChanges.add(error));
            break;
          case "both":
            const err = (0, _ComparisonResult.typeInformationComparisonError)(
              "Type may not change nullability, due to flowing to and from native",
              newType,
              oldType
            );
            incompatibleChanges.add({
              typeName,
              errorCode: "incompatibleTypes",
              errorInformation: err,
            });
            break;
          default:
            throw new Error("Unknown direction : " + oldDirection);
        }
        if (difference.interiorLog) {
          const log = difference.interiorLog;
          assessComparisonResult(
            newTypes,
            deprecatedTypes,
            incompatibleChanges,
            objectTypeChanges
          )(typeName, newType, oldType, log, oldDirection);
        }
        break;
      default:
        difference.status;
        throw new Error("Unsupported status: " + difference.status);
    }
  };
}
function buildNativeModulesDiff(newerNativeModule, olderNativeModule) {
  const moduleErrors = new Set();
  const nativeModuleName = newerNativeModule.moduleName;
  if (olderNativeModule.moduleName !== newerNativeModule.moduleName) {
    moduleErrors.add({
      nativeSpecName: olderNativeModule.moduleName,
      omitted: true,
      errorCode: "removedModule",
    });
  }
  const newTypes = new Set();
  const deprecatedTypes = new Set();
  const incompatibleChanges = new Set();
  const objectTypeChanges = new Set();
  const localAssessComparison = assessComparisonResult(
    newTypes,
    deprecatedTypes,
    incompatibleChanges,
    objectTypeChanges
  );
  const newType = {
    type: "ObjectTypeAnnotation",
    properties: [
      ...newerNativeModule.spec.methods,
      ...newerNativeModule.spec.eventEmitters,
    ],
  };
  const oldType = {
    type: "ObjectTypeAnnotation",
    properties: [
      ...olderNativeModule.spec.methods,
      ...olderNativeModule.spec.eventEmitters,
    ],
  };
  const difference = codegenTypeDiffing.compareTypes(
    newType,
    olderNativeModule.moduleName === newerNativeModule.moduleName
      ? oldType
      : null,
    newerNativeModule.aliasMap,
    olderNativeModule.aliasMap,
    newerNativeModule.enumMap,
    olderNativeModule.enumMap
  );
  localAssessComparison(
    nativeModuleName,
    newType,
    oldType,
    difference,
    "fromNative"
  );
  const typeUpdate = {
    newTypes,
    deprecatedTypes,
    incompatibleChanges,
    objectTypeChanges,
  };
  if (hasCodegenUpdatesTypes(typeUpdate)) {
    moduleErrors.add({
      nativeSpecName: nativeModuleName,
      omitted: false,
      errorCode: "incompatibleTypes",
      changeInformation: typeUpdate,
    });
  }
  return moduleErrors;
}
function buildNativeComponentsDiff(newerNativeSchema, olderNativeSchema) {
  const componentErrors = new Set();
  Object.entries(newerNativeSchema.components).forEach(
    ([newerComponentName, newerComponent]) => {
      const olderComponent = olderNativeSchema.components[newerComponentName];
      const newTypes = new Set();
      const deprecatedTypes = new Set();
      const incompatibleChanges = new Set();
      const objectTypeChanges = new Set();
      const localAssessComparison = assessComparisonResult(
        newTypes,
        deprecatedTypes,
        incompatibleChanges,
        objectTypeChanges
      );
      newerComponent.commands.forEach((command) => {
        const oldCommand = olderComponent.commands?.find(
          (olderCommand) => olderCommand.name === command.name
        );
        const newCommands = {
          type: "ObjectTypeAnnotation",
          properties: [command],
        };
        const oldCommands =
          oldCommand != null
            ? {
                type: "ObjectTypeAnnotation",
                properties: [oldCommand],
              }
            : null;
        const difference = codegenTypeDiffing.compareTypes(
          newCommands,
          oldCommands,
          {},
          {},
          {},
          {}
        );
        localAssessComparison(
          newerComponentName,
          newCommands,
          oldCommands,
          difference,
          "fromNative"
        );
      });
      olderComponent.commands?.forEach((command) => {
        const newCommand = newerComponent.commands.find(
          (newerCommand) => newerCommand.name === command.name
        );
        if (newCommand == null) {
          deprecatedTypes.add({
            typeName: command.name,
            typeInformation: {
              type: "ObjectTypeAnnotation",
              properties: [command],
            },
          });
        }
      });
      const newConvertedProps = {
        type: "ObjectTypeAnnotation",
        properties: newerComponent.props.map((prop) => ({
          name: prop.name,
          optional: prop.optional,
          typeAnnotation: (0, _convertPropToBasicTypes.default)(
            prop.typeAnnotation
          ),
        })),
      };
      const oldConvertedProps = {
        type: "ObjectTypeAnnotation",
        properties: olderComponent.props.map((prop) => ({
          name: prop.name,
          optional: prop.optional,
          typeAnnotation: (0, _convertPropToBasicTypes.default)(
            prop.typeAnnotation
          ),
        })),
      };
      const propDifference = codegenTypeDiffing.compareTypes(
        newConvertedProps,
        oldConvertedProps,
        {},
        {},
        {},
        {}
      );
      localAssessComparison(
        newerComponentName,
        newConvertedProps,
        oldConvertedProps,
        propDifference,
        "toNative"
      );
      const typeUpdate = {
        newTypes,
        deprecatedTypes,
        incompatibleChanges,
        objectTypeChanges,
      };
      if (hasCodegenUpdatesTypes(typeUpdate)) {
        componentErrors.add({
          nativeSpecName: newerComponentName,
          omitted: false,
          errorCode: "incompatibleTypes",
          changeInformation: typeUpdate,
        });
      }
    }
  );
  Object.keys(olderNativeSchema.components).forEach((olderComponentName) => {
    const newerComponent = newerNativeSchema.components[olderComponentName];
    if (newerComponent == null) {
      componentErrors.add({
        nativeSpecName: olderComponentName,
        omitted: true,
        errorCode: "removedComponent",
      });
    }
  });
  return componentErrors;
}
function hasUpdatesTypes(diff) {
  return (
    diff.newTypes.size > 0 ||
    diff.deprecatedTypes.size > 0 ||
    diff.objectTypeChanges.size > 0 ||
    diff.incompatibleChanges.size > 0
  );
}
function hasCodegenUpdatesTypes(diff) {
  return (
    diff.newTypes.size > 0 ||
    diff.deprecatedTypes.size > 0 ||
    diff.objectTypeChanges.size > 0 ||
    diff.incompatibleChanges.size > 0
  );
}
function buildSchemaDiff(newerSchemaSet, olderSchemaSet) {
  const diff = new Set();
  const newerSchema = newerSchemaSet.modules;
  const olderSchema = olderSchemaSet.modules;
  Object.keys(newerSchema).forEach((hasteModuleName) => {
    const schemaEntry = newerSchema[hasteModuleName];
    const olderSchemaEntry = olderSchema[hasteModuleName];
    const framework = "ReactNative";
    if (schemaEntry.type === "Component") {
      if (olderSchemaEntry?.type === "Component") {
        const incompatibleComponents = buildNativeComponentsDiff(
          schemaEntry,
          olderSchemaEntry
        );
        const hasIncompatibleComponents = incompatibleComponents?.size > 0;
        if (hasIncompatibleComponents) {
          diff.add({
            name: hasteModuleName,
            framework: framework,
            status: {
              incompatibleSpecs: incompatibleComponents,
            },
          });
        }
      }
    }
    if (schemaEntry.type === "NativeModule") {
      if (olderSchemaEntry?.type === "NativeModule") {
        const incompatibleModules = buildNativeModulesDiff(
          schemaEntry,
          olderSchemaEntry
        );
        const hasIncompatibleModules =
          incompatibleModules != null && incompatibleModules.size;
        if (hasIncompatibleModules) {
          diff.add({
            name: hasteModuleName,
            framework: framework,
            status: {
              incompatibleSpecs: incompatibleModules,
            },
          });
        }
      }
    }
    if (olderSchemaEntry == null) {
      diff.add({
        name: hasteModuleName,
        framework: framework,
        status: "new",
      });
    }
  });
  Object.keys(olderSchema).forEach((hasteModuleName) => {
    const newSchemaEntry = newerSchema[hasteModuleName];
    const oldSchemaEntry = olderSchema[hasteModuleName];
    if (oldSchemaEntry != null && newSchemaEntry == null) {
      diff.add({
        name: hasteModuleName,
        framework: "ReactNative",
        status: "deprecated",
      });
    }
  });
  return diff;
}
function summarizeSchemaDiff(diff) {
  switch (diff.status) {
    case "new":
      return {
        status: "patchable",
        incompatibilityReport: {},
      };
    case "deprecated":
      return {
        status: "ok",
        incompatibilityReport: {},
      };
    default:
      const differs = diff.status;
      if (!differs.incompatibleSpecs) {
        return {
          status: "patchable",
          incompatibilityReport: {},
        };
      } else {
        const incompatibleObject = {};
        if (differs.incompatibleSpecs) {
          const withErrors = Array.from(differs.incompatibleSpecs).filter(
            (specError) =>
              specError.errorInformation ||
              (specError.changeInformation &&
                specError.changeInformation.incompatibleChanges.size > 0)
          );
          if (withErrors.length > 0) {
            if (incompatibleObject[diff.name]) {
              incompatibleObject[diff.name].incompatibleSpecs = withErrors;
            } else {
              incompatibleObject[diff.name] = {
                framework: diff.framework,
                incompatibleSpecs: withErrors,
              };
            }
          }
        }
        const incompatibleUnchanged =
          Object.keys(incompatibleObject).length === 0;
        return {
          status: incompatibleUnchanged ? "ok" : "incompatible",
          incompatibilityReport: incompatibleObject,
        };
      }
  }
}
function combineSummaries(finalSummary, setSummary) {
  switch (setSummary.status) {
    case "ok":
      return finalSummary;
    case "patchable":
      if (finalSummary.status === "ok") {
        return setSummary;
      } else {
        return finalSummary;
      }
    default:
      switch (finalSummary.status) {
        case "ok":
        case "patchable":
          return setSummary;
        default:
          Object.keys(setSummary.incompatibilityReport).forEach(
            (differingSchemaName) =>
              (finalSummary.incompatibilityReport[differingSchemaName] =
                setSummary.incompatibilityReport[differingSchemaName])
          );
          return finalSummary;
      }
  }
}
function summarizeDiffSet(diffs) {
  if (diffs.size === 0) {
    return {
      status: "ok",
      incompatibilityReport: {},
    };
  }
  const summary = [];
  diffs.forEach((schemaDiff) => summary.push(summarizeSchemaDiff(schemaDiff)));
  return summary.reduce(combineSummaries, summary[0]);
}
