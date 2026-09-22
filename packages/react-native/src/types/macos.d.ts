/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// [macOS] Preserve the public TypeScript contracts during Strict API adoption.
// Match the manual declarations without importing the legacy component graph.
/// <reference path="./globals.d.ts" />
import type {
  DragEvent,
  HandledKeyEvent,
  KeyDownEvent,
  KeyUpEvent,
  MouseEvent,
  NativeSyntheticEvent,
} from '../../Libraries/Types/CoreEventTypes';

export type {
  DragEvent,
  NativeKeyEvent,
} from '../../Libraries/Types/CoreEventTypes';

export type SystemEffectMacOS =
  | 'none'
  | 'pressed'
  | 'deepPressed'
  | 'disabled'
  | 'rollover';

export type PasteEvent = NativeSyntheticEvent<{
  dataTransfer: {
    files: {
      height: number;
      size: number;
      type: string;
      uri: string;
      width: number;
    }[];
    items: {kind: string; type: string}[];
    types: string[];
  };
}>;

type SettingChangeEvent = NativeSyntheticEvent<{
  autoCorrectEnabled: boolean;
  spellCheckEnabled: boolean;
  grammarCheckEnabled: boolean;
}>;

type SubmitKeyEvent = {
  key: string;
  altKey?: boolean | undefined;
  ctrlKey?: boolean | undefined;
  metaKey?: boolean | undefined;
  shiftKey?: boolean | undefined;
  functionKey?: boolean | undefined;
};

type PasteType = 'fileUrl' | 'image' | 'string';

export interface TextInputMacOSProps {
  clearTextOnSubmit?: boolean | undefined;
  grammarCheck?: boolean | undefined;
  hideVerticalScrollIndicator?: boolean | undefined;
  onPaste?: ((event: PasteEvent) => void) | undefined;
  onAutoCorrectChange?: ((event: SettingChangeEvent) => void) | undefined;
  onSpellCheckChange?: ((event: SettingChangeEvent) => void) | undefined;
  onGrammarCheckChange?: ((event: SettingChangeEvent) => void) | undefined;
  pastedTypes?: PasteType | PasteType[] | undefined;
  submitKeyEvents?: SubmitKeyEvent[] | undefined;
  tooltip?: string | undefined;
}

export interface ViewPropsMacOS {
  acceptsFirstMouse?: boolean | undefined;
  allowsVibrancy?: boolean | undefined;
  mouseDownCanMoveWindow?: boolean | undefined;
  enableFocusRing?: boolean | undefined;
  onMouseEnter?: ((event: MouseEvent) => void) | undefined;
  onMouseLeave?: ((event: MouseEvent) => void) | undefined;
  onDoubleClick?: ((event: MouseEvent) => void) | undefined;
  // Match ViewPropTypes.d.ts, which uses the global PointerEvent here.
  onAuxClick?: ((event: PointerEvent) => void) | undefined;
  onAuxClickCapture?: ((event: PointerEvent) => void) | undefined;
  onDragEnter?: ((event: DragEvent) => void) | undefined;
  onDragLeave?: ((event: DragEvent) => void) | undefined;
  onDrop?: ((event: DragEvent) => void) | undefined;
  onKeyDown?: ((event: KeyDownEvent) => void) | undefined;
  onKeyUp?: ((event: KeyUpEvent) => void) | undefined;
  keyDownEvents?: HandledKeyEvent[] | undefined;
  keyUpEvents?: HandledKeyEvent[] | undefined;
  validKeysDown?: readonly (string | HandledKeyEvent)[] | undefined;
  validKeysUp?: readonly (string | HandledKeyEvent)[] | undefined;
  passthroughAllKeyEvents?: boolean | undefined;
  draggedTypes?: PasteType | PasteType[] | undefined;
}
