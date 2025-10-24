"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.formatDiffSet = formatDiffSet;
exports.formatErrorMessage = formatErrorMessage;
exports.formatErrorStore = formatErrorStore;
exports.formatNativeSpecErrorStore = formatNativeSpecErrorStore;
function indentedLineStart(indent) {
  return "\n" + "  ".repeat(indent);
}
function formatErrorMessage(error, indent = 0) {
  switch (error.type) {
    case "PropertyComparisonError":
      const formattedProperties = error.mismatchedProperties.map(
        (individualPropertyError) =>
          indentedLineStart(indent + 1) +
          "-- " +
          individualPropertyError.property +
          (individualPropertyError.fault
            ? ": " +
              formatErrorMessage(individualPropertyError.fault, indent + 2)
            : "")
      );
      return error.message + formattedProperties.join("");
    case "PositionalComparisonError":
      const formattedPositionalChanges = error.erroneousItems.map(
        ([index, type]) =>
          indentedLineStart(indent + 1) +
          "-- position " +
          index +
          " " +
          formatTypeAnnotation(type)
      );
      return error.message + formattedPositionalChanges.join("");
    case "TypeAnnotationComparisonError":
      const previousError = error.previousError;
      return (
        error.message +
        indentedLineStart(indent + 1) +
        "--new: " +
        formatTypeAnnotation(error.newerAnnotation) +
        indentedLineStart(indent + 1) +
        "--old: " +
        formatTypeAnnotation(error.olderAnnotation) +
        (previousError != null
          ? indentedLineStart(indent + 1) +
            "" +
            formatErrorMessage(previousError, indent + 2)
          : "")
      );
    case "TypeInformationComparisonError":
      return (
        error.message +
        indentedLineStart(indent + 1) +
        "-- new: " +
        formatTypeAnnotation(error.newerType) +
        indentedLineStart(indent + 1) +
        "-- old: " +
        formatTypeAnnotation(error.olderType)
      );
    case "MemberComparisonError":
      const formattedMembers = error.mismatchedMembers.map(
        (individualMemberError) =>
          indentedLineStart(indent + 1) +
          "-- Member " +
          individualMemberError.member +
          (individualMemberError.fault
            ? ": " + formatErrorMessage(individualMemberError.fault, indent + 2)
            : "")
      );
      return error.message + formattedMembers.join("");
    default:
      error.type;
      return "";
  }
}
function formatTypeAnnotation(annotation) {
  switch (annotation.type) {
    case "AnyTypeAnnotation":
      return "any";
    case "ArrayTypeAnnotation":
      return "Array<" + formatTypeAnnotation(annotation.elementType) + ">";
    case "BooleanTypeAnnotation":
      return "boolean";
    case "EnumDeclaration": {
      let shortHandType = "";
      switch (annotation.memberType) {
        case "StringTypeAnnotation":
          shortHandType = "string";
          break;
        case "NumberTypeAnnotation":
          shortHandType = "number";
          break;
        default:
          annotation.memberType;
          throw new Error("Unexpected enum memberType");
      }
      return `Enum<${shortHandType}>` + "";
    }
    case "EnumDeclarationWithMembers": {
      let shortHandType = "";
      switch (annotation.memberType) {
        case "StringTypeAnnotation":
          shortHandType = "string";
          break;
        case "NumberTypeAnnotation":
          shortHandType = "number";
          break;
        default:
          annotation.memberType;
          throw new Error("Unexptected enum memberType");
      }
      return (
        `Enum<${shortHandType}> {` +
        annotation.members
          .map(
            (member) => `${member.name} = ${formatTypeAnnotation(member.value)}`
          )
          .join(", ") +
        "}"
      );
    }
    case "FunctionTypeAnnotation":
      return (
        "(" +
        annotation.params
          .map(
            (param) =>
              param.name +
              (param.optional ? "?" : "") +
              ": " +
              formatTypeAnnotation(param.typeAnnotation)
          )
          .join(", ") +
        ")" +
        "=>" +
        formatTypeAnnotation(annotation.returnTypeAnnotation)
      );
    case "NullableTypeAnnotation":
      return "?" + formatTypeAnnotation(annotation.typeAnnotation);
    case "NumberTypeAnnotation":
      return "number";
    case "DoubleTypeAnnotation":
      return "double";
    case "FloatTypeAnnotation":
      return "float";
    case "Int32TypeAnnotation":
      return "int";
    case "NumberLiteralTypeAnnotation":
      return annotation.value.toString();
    case "ObjectTypeAnnotation":
      return (
        "{" +
        annotation.properties
          .map(
            (property) =>
              property.name +
              (property.optional ? "?" : "") +
              ": " +
              formatTypeAnnotation(property.typeAnnotation)
          )
          .join(", ") +
        "}"
      );
    case "StringLiteralTypeAnnotation":
      return parseInt(annotation.value, 10).toString() === annotation.value ||
        annotation.value.includes(" ")
        ? `'${annotation.value}'`
        : annotation.value;
    case "StringLiteralUnionTypeAnnotation":
      return (
        "(" +
        annotation.types
          .map((stringLit) => formatTypeAnnotation(stringLit))
          .join(" | ") +
        ")"
      );
    case "StringTypeAnnotation":
      return "string";
    case "UnionTypeAnnotation": {
      const shortHandType =
        annotation.memberType === "StringTypeAnnotation"
          ? "string"
          : annotation.memberType === "ObjectTypeAnnotation"
          ? "Object"
          : "number";
      return `Union<${shortHandType}>`;
    }
    case "PromiseTypeAnnotation":
      return "Promise<" + formatTypeAnnotation(annotation.elementType) + ">";
    case "EventEmitterTypeAnnotation":
      return (
        "EventEmitter<" + formatTypeAnnotation(annotation.typeAnnotation) + ">"
      );
    case "TypeAliasTypeAnnotation":
    case "ReservedTypeAnnotation":
      return annotation.name;
    case "VoidTypeAnnotation":
      return "void";
    case "MixedTypeAnnotation":
      return "mixed";
    case "GenericObjectTypeAnnotation":
      if (annotation.dictionaryValueType) {
        return `{[string]: ${formatTypeAnnotation(
          annotation.dictionaryValueType
        )}`;
      }
      return "Object";
    default:
      annotation.type;
      return JSON.stringify(annotation);
  }
}
function formatErrorStore(errorStore) {
  return {
    message:
      errorStore.typeName +
      ": " +
      formatErrorMessage(errorStore.errorInformation),
    errorCode: errorStore.errorCode,
  };
}
function formatNativeSpecErrorStore(specError) {
  if (specError.errorInformation) {
    return [
      {
        message:
          specError.nativeSpecName +
          ": " +
          formatErrorMessage(specError.errorInformation),
        errorCode: specError.errorCode,
      },
    ];
  }
  if (specError.changeInformation?.incompatibleChanges != null) {
    return Array.from(specError.changeInformation.incompatibleChanges).map(
      (errorStore) => formatErrorStore(errorStore)
    );
  }
  return [];
}
function formatDiffSet(summary) {
  const summaryStatus = summary.status;
  if (summaryStatus === "ok" || summaryStatus === "patchable") {
    return summary;
  }
  const hasteModules = Object.keys(summary.incompatibilityReport);
  const incompatibles = summary.incompatibilityReport;
  const formattedIncompatibilities = {};
  hasteModules.forEach((hasteModule) => {
    const incompat = incompatibles[hasteModule];
    const formattedIncompat = {
      framework: incompat.framework,
    };
    if (incompat.incompatibleSpecs) {
      formattedIncompat.incompatibleSpecs = incompat.incompatibleSpecs.reduce(
        (formattedModuleErrors, specErrorStore) =>
          formattedModuleErrors.concat(
            formatNativeSpecErrorStore(specErrorStore)
          ),
        []
      );
    }
    formattedIncompatibilities[hasteModule] = formattedIncompat;
  });
  return {
    status: summaryStatus,
    incompatibilityReport: formattedIncompatibilities,
  };
}
