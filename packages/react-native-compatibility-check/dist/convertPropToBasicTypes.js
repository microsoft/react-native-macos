"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.default = convertPropToBasicTypes;
function convertPropToBasicTypes(inputType) {
  let resultingType;
  switch (inputType.type) {
    case "BooleanTypeAnnotation":
      resultingType = {
        type: "BooleanTypeAnnotation",
      };
      break;
    case "StringTypeAnnotation":
      resultingType = {
        type: "StringTypeAnnotation",
      };
      break;
    case "DoubleTypeAnnotation":
      resultingType = {
        type: "DoubleTypeAnnotation",
      };
      break;
    case "FloatTypeAnnotation":
      resultingType = {
        type: "FloatTypeAnnotation",
      };
      break;
    case "Int32TypeAnnotation":
      resultingType = {
        type: "Int32TypeAnnotation",
      };
      break;
    case "StringEnumTypeAnnotation":
      resultingType = {
        type: "StringLiteralUnionTypeAnnotation",
        types: inputType.options.map((option) => {
          return {
            type: "StringLiteralTypeAnnotation",
            value: option,
          };
        }),
      };
      break;
    case "Int32EnumTypeAnnotation":
      resultingType = {
        type: "AnyTypeAnnotation",
      };
      break;
    case "ReservedPropTypeAnnotation":
      resultingType = {
        type: "ReservedTypeAnnotation",
        name: inputType.name,
      };
      break;
    case "MixedTypeAnnotation":
      resultingType = inputType;
      break;
    case "ObjectTypeAnnotation":
      resultingType = {
        type: "ObjectTypeAnnotation",
        ...(inputType.baseTypes != null
          ? {
              baseTypes: inputType.baseTypes,
            }
          : {}),
        properties: inputType.properties.map((property) => ({
          name: property.name,
          optional: property.optional,
          typeAnnotation: convertPropToBasicTypes(property.typeAnnotation),
        })),
      };
      break;
    case "ArrayTypeAnnotation":
      resultingType = {
        type: "ArrayTypeAnnotation",
        elementType: convertPropToBasicTypes(inputType.elementType),
      };
      break;
    default:
      inputType.type;
      throw new Error("Unexpected type " + inputType.type);
  }
  return resultingType;
}
