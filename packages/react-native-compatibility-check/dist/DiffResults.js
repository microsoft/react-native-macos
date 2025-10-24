"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.nativeSpecErrorExporter = nativeSpecErrorExporter;
exports.schemaDiffExporter = schemaDiffExporter;
function diffSetExporter(diffSet) {
  return {
    newTypes: Array.from(diffSet.newTypes),
    deprecatedTypes: Array.from(diffSet.deprecatedTypes),
    objectTypeChanges: Array.from(diffSet.objectTypeChanges),
    incompatibleChanges: Array.from(diffSet.incompatibleChanges),
  };
}
function nativeSpecErrorExporter(nativeSpecError) {
  if (nativeSpecError.changeInformation) {
    return {
      nativeSpecName: nativeSpecError.nativeSpecName,
      omitted: nativeSpecError.omitted,
      errorCode: nativeSpecError.errorCode,
      errorInformation: nativeSpecError.errorInformation,
      changeInformation: diffSetExporter(nativeSpecError.changeInformation),
    };
  }
  return {
    nativeSpecName: nativeSpecError.nativeSpecName,
    omitted: nativeSpecError.omitted,
    errorCode: nativeSpecError.errorCode,
    errorInformation: nativeSpecError.errorInformation,
  };
}
function schemaDiffCategoryExporter(status) {
  switch (status) {
    case "new":
    case "deprecated":
      return status;
    default:
      return {
        incompatibleSpecs: status.incompatibleSpecs
          ? Array.from(status.incompatibleSpecs).map(nativeSpecErrorExporter)
          : undefined,
      };
  }
}
function schemaDiffExporter(schemaDiff) {
  return {
    name: schemaDiff.name,
    framework: schemaDiff.framework,
    status: schemaDiffCategoryExporter(schemaDiff.status),
  };
}
