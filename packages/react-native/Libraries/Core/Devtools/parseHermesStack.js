/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

type HermesStackLocationNative = $ReadOnly<{
  type: 'NATIVE',
}>;

type HermesStackLocationSource = $ReadOnly<{
  type: 'SOURCE',
  sourceUrl: string,
  line1Based: number,
  column1Based: number,
}>;

type HermesStackLocationInternalBytecode = $ReadOnly<{
  type: 'INTERNAL_BYTECODE',
  sourceUrl: string,
  line1Based: number,
  virtualOffset0Based: number,
}>;

type HermesStackLocationBytecode = $ReadOnly<{
  type: 'BYTECODE',
  sourceUrl: string,
  line1Based: number,
  virtualOffset0Based: number,
}>;

type HermesStackLocation =
  | HermesStackLocationNative
  | HermesStackLocationSource
  | HermesStackLocationInternalBytecode
  | HermesStackLocationBytecode;

type HermesStackEntryFrame = $ReadOnly<{
  type: 'FRAME',
  location: HermesStackLocation,
  functionName: string,
}>;

type HermesStackEntrySkipped = $ReadOnly<{
  type: 'SKIPPED',
  count: number,
}>;

type HermesStackEntry = HermesStackEntryFrame | HermesStackEntrySkipped;

export type HermesParsedStack = $ReadOnly<{
  message: string,
  entries: $ReadOnlyArray<HermesStackEntry>,
}>;

// Capturing groups:
// 1. count of skipped frames
const RE_SKIPPED = /^ {4}... skipping (\d+) frames$/;
const RE_COMPONENT_NO_STACK = /^ {4}at .*$/;

function isInternalBytecodeSourceUrl(sourceUrl: string): boolean {
  // See https://github.com/facebook/hermes/blob/3332fa020cae0bab751f648db7c94e1d687eeec7/lib/VM/Runtime.cpp#L1100
  return sourceUrl === 'InternalBytecode.js';
}

function parseLine(line: string): ?HermesStackEntry {
  const framePrefix = '    at ';
  if (line.startsWith(framePrefix) && line.endsWith(')')) {
    const frame = line.slice(framePrefix.length, -1);
    const locationStart = frame.lastIndexOf(' (');
    if (locationStart <= 0) {
      return undefined;
    }

    const functionName = frame.slice(0, locationStart);
    let location = frame.slice(locationStart + 2);
    if (location === 'native') {
      return {
        type: 'FRAME',
        functionName,
        location: {type: 'NATIVE'},
      };
    }

    let isBytecode = false;
    const addressPrefix = 'address at ';
    if (location.startsWith(addressPrefix)) {
      isBytecode = true;
      location = location.slice(addressPrefix.length);
    }

    const columnSeparator = location.lastIndexOf(':');
    const lineSeparator = location.lastIndexOf(':', columnSeparator - 1);
    if (lineSeparator < 0 || columnSeparator < 0) {
      return undefined;
    }

    const sourceUrl = location.slice(0, lineSeparator);
    const lineNumber = location.slice(lineSeparator + 1, columnSeparator);
    const columnNumber = location.slice(columnSeparator + 1);
    if (!/^\d+$/.test(lineNumber) || !/^\d+$/.test(columnNumber)) {
      return undefined;
    }

    const line1Based = Number.parseInt(lineNumber, 10);
    const columnOrOffset = Number.parseInt(columnNumber, 10);
    return {
      type: 'FRAME',
      functionName,
      location: isBytecode
        ? isInternalBytecodeSourceUrl(sourceUrl)
          ? {
              type: 'INTERNAL_BYTECODE',
              sourceUrl,
              line1Based,
              virtualOffset0Based: columnOrOffset,
            }
          : {
              type: 'BYTECODE',
              sourceUrl,
              line1Based,
              virtualOffset0Based: columnOrOffset,
            }
        : {
            type: 'SOURCE',
            sourceUrl,
            line1Based,
            column1Based: columnOrOffset,
          },
    };
  }
  const asSkipped = line.match(RE_SKIPPED);
  if (asSkipped) {
    return {
      type: 'SKIPPED',
      count: Number.parseInt(asSkipped[1], 10),
    };
  }
}

export default function parseHermesStack(stack: string): HermesParsedStack {
  const lines = stack.split(/\n/);
  let entries: Array<HermesStackEntryFrame | HermesStackEntrySkipped> = [];
  let lastMessageLine = -1;
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    const entry = parseLine(line);
    if (entry) {
      entries.push(entry);
      continue;
    }
    if (RE_COMPONENT_NO_STACK.test(line)) {
      // Skip component stacks without source location.
      // TODO: This will not be displayed, not sure how to handle it.
      continue;
    }
    // No match - we're still in the message
    lastMessageLine = i;
    entries = [];
  }
  const message = lines.slice(0, lastMessageLine + 1).join('\n');
  return {message, entries};
}
