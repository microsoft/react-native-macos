/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {
  FantomRenderedOutput,
  RenderOutputConfig,
} from './getFantomRenderedOutput';
import type {MixedElement} from 'react';

import getFantomRenderedOutput from './getFantomRenderedOutput';
import FantomModule from './specs/NativeFantomModule';
import ReactFabric from 'react-native/Libraries/Renderer/shims/ReactFabric';

let globalSurfaceIdCounter = 1;

const nativeRuntimeScheduler = global.nativeRuntimeScheduler;
const schedulerPriorityImmediate =
  nativeRuntimeScheduler.unstable_ImmediatePriority;

class Root {
  #surfaceId: number;
  #hasRendered: boolean = false;

  constructor() {
    this.#surfaceId = globalSurfaceIdCounter;
    globalSurfaceIdCounter += 10;
  }

  render(element: MixedElement) {
    if (!this.#hasRendered) {
      FantomModule.startSurface(this.#surfaceId);
      this.#hasRendered = true;
    }

    ReactFabric.render(element, this.#surfaceId, () => {}, true);
  }

  getMountingLogs(): Array<string> {
    return FantomModule.getMountingManagerLogs(this.#surfaceId);
  }

  destroy() {
    // TODO: check for leaks.
    FantomModule.stopSurface(this.#surfaceId);
    FantomModule.flushMessageQueue();
  }

  getRenderedOutput(config: RenderOutputConfig = {}): FantomRenderedOutput {
    return getFantomRenderedOutput(this.#surfaceId, config);
  }

  // TODO: add an API to check if all surfaces were deallocated when tests are finished.
}

let flushingQueue = false;

/*
 * Runs a task on on the event loop. To be used together with root.render.
 *
 * React must run inside of event loop to ensure scheduling environment is closer to production.
 */
export function runTask(task: () => void | Promise<void>) {
  if (flushingQueue) {
    throw new Error(
      'Nested runTask calls are not allowed. If you want to schedule a task from inside another task, use scheduleTask instead.',
    );
  }

  nativeRuntimeScheduler.unstable_scheduleCallback(
    schedulerPriorityImmediate,
    task,
  );

  try {
    flushingQueue = true;
    FantomModule.flushMessageQueue();
  } finally {
    flushingQueue = false;
  }
}

// TODO: Add option to define surface props and pass it to startSurface
// Surfacep rops: concurrentRoot, surfaceWidth, surfaceHeight, layoutDirection, pointScaleFactor.
export function createRoot(): Root {
  return new Root();
}
