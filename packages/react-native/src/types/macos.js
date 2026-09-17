/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

// [macOS] Flow consumers use the runtime source definitions. The companion
// macos.d.ts preserves the existing TypeScript signatures, including event
// wrappers and mutable arrays that differ from the internal Flow contracts.
export type {SystemEffectMacOS} from '../../Libraries/StyleSheet/PlatformColorValueTypesMacOS';
export type {
  PasteEvent,
  TextInputMacOSProps,
} from '../../Libraries/Components/TextInput/TextInput.flow';
export type {
  DragEvent,
  KeyboardEventPayload as NativeKeyEvent,
} from '../../Libraries/Types/CoreEventTypes';
export type {ViewPropsMacOS} from '../../Libraries/Components/View/ViewPropTypes';
