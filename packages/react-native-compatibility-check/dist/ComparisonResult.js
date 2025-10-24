"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.isFunctionLogEmpty = isFunctionLogEmpty;
exports.isMemberLogEmpty = isMemberLogEmpty;
exports.isPropertyLogEmpty = isPropertyLogEmpty;
exports.makeError = makeError;
exports.memberComparisonError = memberComparisonError;
exports.positionalComparisonError = positionalComparisonError;
exports.propertyComparisonError = propertyComparisonError;
exports.typeAnnotationComparisonError = typeAnnotationComparisonError;
exports.typeInformationComparisonError = typeInformationComparisonError;
function isPropertyLogEmpty(result) {
  return !(
    result.addedProperties ||
    result.missingProperties ||
    result.nestedPropertyChanges ||
    result.madeStrict ||
    result.madeOptional ||
    result.errorProperties
  );
}
function isMemberLogEmpty(result) {
  return !(result.addedMembers || result.missingMembers || result.errorMembers);
}
function isFunctionLogEmpty(result) {
  return !(result.returnType || result.parameterTypes);
}
function makeError(error) {
  return {
    status: "error",
    errorLog: error,
  };
}
function typeInformationComparisonError(
  message,
  newerType,
  olderType,
  previousError
) {
  return {
    type: "TypeInformationComparisonError",
    message,
    newerType,
    olderType,
    previousError,
  };
}
function typeAnnotationComparisonError(
  message,
  newerAnnotation,
  olderAnnotation,
  previousError
) {
  return {
    type: "TypeAnnotationComparisonError",
    message,
    newerAnnotation,
    olderAnnotation,
    previousError,
  };
}
function propertyComparisonError(message, mismatchedProperties, previousError) {
  return {
    type: "PropertyComparisonError",
    message,
    mismatchedProperties,
    previousError,
  };
}
function memberComparisonError(message, mismatchedMembers, previousError) {
  return {
    type: "MemberComparisonError",
    message,
    mismatchedMembers,
    previousError,
  };
}
function positionalComparisonError(message, erroneousItems, previousError) {
  return {
    type: "PositionalComparisonError",
    message,
    erroneousItems,
    previousError,
  };
}
