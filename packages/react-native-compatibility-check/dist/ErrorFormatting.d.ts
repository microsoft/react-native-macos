/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import type { TypeComparisonError } from "./ComparisonResult";
import type {
  DiffSummary,
  ErrorStore,
  FormattedDiffSummary,
  FormattedErrorStore,
  NativeSpecErrorStore,
} from "./DiffResults";
export declare function formatErrorMessage(
  error: TypeComparisonError,
  indent: number
): string;
export declare function formatErrorStore(
  errorStore: ErrorStore
): FormattedErrorStore;
export declare function formatNativeSpecErrorStore(
  specError: NativeSpecErrorStore
): Array<FormattedErrorStore>;
export declare function formatDiffSet(
  summary: DiffSummary
): FormattedDiffSummary;
