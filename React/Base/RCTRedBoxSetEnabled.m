/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTRedBoxSetEnabled.h"

#if RCT_DEV
static BOOL redBoxEnabled = YES;
#else
static BOOL redBoxEnabled = NO;
#endif

void RCTRedBoxSetEnabled(BOOL enabled)
{
  redBoxEnabled = enabled;
}

BOOL RCTRedBoxGetEnabled()
{
#if DEBUG // TODO(macOS ISS#2323203)
  return redBoxEnabled;
#else
  return NO; // RCT_DEV is on for debug & release builds in the react-native-macos fork, so we can disable release build redboxing here
#endif // TODO(macOS ISS#2323203)
}
