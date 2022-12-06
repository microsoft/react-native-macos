/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.bridge;

import static com.facebook.systrace.Systrace.TRACE_TAG_REACT_JAVA_BRIDGE;

import android.os.SystemClock;
import com.facebook.soloader.SoLoader;
import com.facebook.systrace.Systrace;

public class ReactBridge {
  private static volatile long sLoadStartTime = 0;
  private static volatile long sLoadEndTime = 0;

  private static volatile boolean sDidInit = false;

  public static boolean isInitialized() {
    return sDidInit;
  }

  public static synchronized void staticInit() {
    if (sDidInit) {
      return;
    }
    sLoadStartTime = SystemClock.uptimeMillis();
    Systrace.beginSection(
        TRACE_TAG_REACT_JAVA_BRIDGE, "ReactBridge.staticInit::load:reactnativejni");
    ReactMarker.logMarker(ReactMarkerConstants.LOAD_REACT_NATIVE_SO_FILE_START);

    // JS Engine is configurable.. And we exepct only one packaged
    // Hence ignore failure
    try {
	SoLoader.loadLibrary("hermes");
    }catch (UnsatisfiedLinkError jscE){}

    try {
	SoLoader.loadLibrary("v8jsi");
    }catch (UnsatisfiedLinkError jscE){}

    SoLoader.loadLibrary("glog");
    SoLoader.loadLibrary("glog_init");
    SoLoader.loadLibrary("fb");
    SoLoader.loadLibrary("fbjni");
    SoLoader.loadLibrary("yoga");
    SoLoader.loadLibrary("folly_json");
    SoLoader.loadLibrary("reactperfloggerjni");
    SoLoader.loadLibrary("jsinspector");
    SoLoader.loadLibrary("jsi");
    SoLoader.loadLibrary("logger");
    SoLoader.loadLibrary("reactnativejni");
    ReactMarker.logMarker(ReactMarkerConstants.LOAD_REACT_NATIVE_SO_FILE_END);
    Systrace.endSection(TRACE_TAG_REACT_JAVA_BRIDGE);
    sLoadEndTime = SystemClock.uptimeMillis();
    sDidInit = true;
  }

  public static long getLoadStartTime() {
    return sLoadStartTime;
  }

  public static long getLoadEndTime() {
    return sLoadEndTime;
  }
}
