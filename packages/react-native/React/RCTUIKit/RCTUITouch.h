/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
typedef UITouch RCTUITouch;
#else
#import <AppKit/AppKit.h>
@interface RCTUITouch : NSEvent
@end
#endif
