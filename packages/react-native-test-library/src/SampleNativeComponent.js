/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {HostComponent} from 'react-native';
import type {ViewProps} from 'react-native/Libraries/Components/View/ViewPropTypes';
import type {
  BubblingEventHandler,
  Double,
  Float,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';

import * as React from 'react';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type Event = Readonly<{
  values: ReadonlyArray<Int32>,
  boolValues: ReadonlyArray<boolean>,
  floats: ReadonlyArray<Float>,
  doubles: ReadonlyArray<Double>,
  yesNos: ReadonlyArray<'yep' | 'nope'>,
  strings: ReadonlyArray<string>,
  latLons: ReadonlyArray<{lat: Double, lon: Double}>,
  multiArrays: ReadonlyArray<ReadonlyArray<Int32>>,
}>;

type NativeProps = Readonly<{
  ...ViewProps,
  opacity?: Float,
  values: ReadonlyArray<Int32>,

  // Events
  onIntArrayChanged?: ?BubblingEventHandler<Event>,
}>;

export type NativeComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  readonly changeBackgroundColor: (
    viewRef: React.ElementRef<NativeComponentType>,
    color: string,
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['changeBackgroundColor'],
});

export default codegenNativeComponent<NativeProps>(
  'SampleNativeComponent',
) as NativeComponentType;
