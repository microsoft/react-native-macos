/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
// [TODO(macOS ISS#2323203)
'use strict';

import type {ColorValue} from './StyleSheetTypes';
import type {ProcessedColorValue} from './processColor';

export opaque type NativeColorValue = {
  semantic?: Array<string>,
  dynamic?: {
    light: ?(ColorValue | ProcessedColorValue),
    dark: ?(ColorValue | ProcessedColorValue),
  },
  colorWithSystemEffect?: {
    baseColor: ?(ColorValue | ProcessedColorValue),
    systemEffect: NativeMacOSEffectPrivate,
  }
};

export const PlatformColor = (...names: Array<string>): ColorValue => {
  return {semantic: names};
};

// [TODO(macOS blah)
export type NativeMacOSEffectPrivate =
  | 'none'
  | 'pressed'
  | 'deepPressed'
  | 'disabled'
  | 'rollover';

export const ColorWithMacOSEffectPrivate = (
  color: ColorValue,
  effect: NativeMacOSEffectPrivate,
): ColorValue => {
  const processColor = require('./processColor');
  const baseColor = processColor(color);
  const colorObject: NativeColorValue = {
    colorWithSystemEffect: {
      baseColor: baseColor,
      systemEffect: effect,
    },
  };
  console.log(colorObject);
  return colorObject;
};
// ]TODO(macOS blah)

export type DynamicColorMacOSTuplePrivate = {
  light: ColorValue,
  dark: ColorValue,
};

export const DynamicColorMacOSPrivate = (
  tuple: DynamicColorMacOSTuplePrivate,
): ColorValue => {
  return {dynamic: {light: tuple.light, dark: tuple.dark}};
};

export const normalizeColorObject = (
  color: NativeColorValue,
): ?ProcessedColorValue => {
  if ('semantic' in color) {
    // a macOS semantic color
    return color;
  } else if ('dynamic' in color && color.dynamic !== undefined) {
    const normalizeColor = require('./normalizeColor');

    // a dynamic, appearance aware color
    const dynamic = color.dynamic;
    const dynamicColor: NativeColorValue = {
      dynamic: {
        light: normalizeColor(dynamic.light),
        dark: normalizeColor(dynamic.dark),
      },
    };
    return dynamicColor;
  } else if (
    'colorWithSystemEffect' in color &&
    color.colorWithSystemEffect != null
  ) {
    const processColor = require('./processColor');
    const colorWithSystemEffect = color.colorWithSystemEffect;
    const colorObject: NativeColorValue = {
      colorWithSystemEffect: {
        baseColor: processColor(colorWithSystemEffect.baseColor),
        systemEffect: colorWithSystemEffect.systemEffect,
      },
    };
    return colorObject;
  }
  return null;
};

export const processColorObject = (
  color: NativeColorValue,
): ?NativeColorValue => {
  if ('dynamic' in color && color.dynamic != null) {
    const processColor = require('./processColor');
    const dynamic = color.dynamic;
    const dynamicColor: NativeColorValue = {
      dynamic: {
        light: processColor(dynamic.light),
        dark: processColor(dynamic.dark),
      },
    };
    return dynamicColor;
  } else if (
    'colorWithSystemEffect' in color &&
    color.colorWithSystemEffect != null
  ) {
    const processColor = require('./processColor');
    const colorWithSystemEffect = color.colorWithSystemEffect;
    const colorObject: NativeColorValue = {
      colorWithSystemEffect: {
        baseColor: processColor(colorWithSystemEffect.baseColor),
        systemEffect: colorWithSystemEffect.systemEffect,
      },
    };
    return colorObject;
  }
  return color;
};
// ]TODO(macOS ISS#2323203)
