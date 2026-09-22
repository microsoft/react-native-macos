/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Use the actual package export conditions, without the react-native test alias.
import {Animated} from 'react-native-macos';
import type {
  SystemEffectMacOS,
  TextInputMacOSProps,
  ViewPropsMacOS,
  NativeKeyEvent,
  DragEvent,
  PasteEvent,
} from 'react-native-macos';
import type {SystemEffectMacOS as ManualSystemEffectMacOS} from '../Libraries/StyleSheet/PlatformColorValueTypesMacOS';
import type {
  TextInputMacOSProps as ManualTextInputMacOSProps,
  PasteEvent as ManualPasteEvent,
} from '../Libraries/Components/TextInput/TextInput';
import type {ViewPropsMacOS as ManualViewPropsMacOS} from '../Libraries/Components/View/ViewPropTypes';
import type {
  NativeKeyEvent as ManualNativeKeyEvent,
  DragEvent as ManualDragEvent,
} from '../Libraries/Types/CoreEventTypes';

type Assert<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;
type AnimatedEventIsNotAny = Assert<
  IsAny<ReturnType<typeof Animated.event>> extends false ? true : false
>;
const animatedValue = new Animated.Value(0);
const animatedHandler: (...args: any[]) => void = Animated.event(
  [{nativeEvent: {value: animatedValue}}],
  {useNativeDriver: false},
);
animatedValue.addListener(state => {
  const value: number = state.value;
  // @ts-expect-error The callback payload is typed rather than any.
  const invalidValue: string = state.value;
  // @ts-expect-error The callback exposes only its numeric value.
  state.missing;
});
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type SystemEffectsMatch = Assert<
  Equal<SystemEffectMacOS, ManualSystemEffectMacOS>
>;
type KeyFieldsMatch = Assert<
  Equal<keyof NativeKeyEvent, keyof ManualNativeKeyEvent>
>;
type OptionalKeyFieldsMatch = Assert<
  Equal<OptionalKeys<NativeKeyEvent>, OptionalKeys<ManualNativeKeyEvent>>
>;
type TextInputFieldsMatch = Assert<
  Equal<keyof TextInputMacOSProps, keyof ManualTextInputMacOSProps>
>;
type ViewFieldsMatch = Assert<
  Equal<keyof ViewPropsMacOS, keyof ManualViewPropsMacOS>
>;
type OptionalTextInputFieldsMatch = Assert<
  Equal<OptionalKeys<TextInputMacOSProps>, keyof TextInputMacOSProps>
>;
type OptionalViewFieldsMatch = Assert<
  Equal<OptionalKeys<ViewPropsMacOS>, keyof ViewPropsMacOS>
>;

// Check both assignment directions, including callback parameters and arrays.
declare let key: NativeKeyEvent;
declare let manualKey: ManualNativeKeyEvent;
key = manualKey;
manualKey = key;
declare let input: TextInputMacOSProps;
declare let manualInput: ManualTextInputMacOSProps;
input = manualInput;
manualInput = input;
declare let view: ViewPropsMacOS;
declare let manualView: ManualViewPropsMacOS;
view = manualView;
manualView = view;
declare let drag: DragEvent;
declare let manualDrag: ManualDragEvent;
drag = manualDrag;
manualDrag = drag;
declare let paste: PasteEvent;
declare let manualPaste: ManualPasteEvent;
paste = manualPaste;
manualPaste = paste;

const minimalKey: NativeKeyEvent = {
  key: 'Enter',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};
const optionalKeyFields: NativeKeyEvent = {
  ...minimalKey,
  code: undefined,
  repeat: undefined,
  isComposing: undefined,
  capsLockKey: undefined,
  numericPadKey: undefined,
  helpKey: undefined,
  functionKey: undefined,
};
// @ts-expect-error The modifier booleans remain required.
const missingModifiers: NativeKeyEvent = {key: 'Enter'};
// @ts-expect-error Unknown system effects are not part of the public API.
const invalidEffect: SystemEffectMacOS = 'highlighted';

const pastePayload: PasteEvent['nativeEvent'] = {
  dataTransfer: {
    files: [
      {
        height: 10,
        width: 20,
        size: 30,
        type: 'image/png',
        uri: 'file:///image.png',
      },
    ],
    items: [{kind: 'file', type: 'image/png'}],
    types: ['image/png'],
  },
};
// The legacy paste arrays are mutable and do not require a file name.
pastePayload.dataTransfer.files.push(pastePayload.dataTransfer.files[0]);
// @ts-expect-error Paste image dimensions remain required.
pastePayload.dataTransfer.files.push({
  size: 30,
  type: 'image/png',
  uri: 'file:///image.png',
});

const transfer: NonNullable<DragEvent['nativeEvent']['dataTransfer']> = {
  files: [{name: 'file', type: null, uri: 'file:///file', size: undefined}],
  items: [{kind: 'file', type: undefined}],
  types: [null, undefined, 'image/png'],
};
// @ts-expect-error Drag files remain read-only as an array.
transfer.files.push({name: 'file', type: null, uri: 'file:///file'});
const optionalTransfer: Pick<DragEvent['nativeEvent'], 'dataTransfer'> = {};
const undefinedTransfer: Pick<DragEvent['nativeEvent'], 'dataTransfer'> = {
  dataTransfer: undefined,
};
// @ts-expect-error Drag payloads retain the full native mouse contract.
const incompleteDrag: DragEvent['nativeEvent'] = {
  clientX: 0,
  clientY: 0,
  pageX: 0,
  pageY: 0,
};

const emptyInput: TextInputMacOSProps = {};
const emptyView: ViewPropsMacOS = {};
const explicitUndefinedInput: TextInputMacOSProps = {
  onPaste: undefined,
  tooltip: undefined,
};
const explicitUndefinedView: ViewPropsMacOS = {
  onDrop: undefined,
  keyDownEvents: undefined,
};
// The legacy arrays remain mutable.
input.submitKeyEvents?.push({key: 'Enter'});
view.keyDownEvents?.push({key: 'Enter'});
