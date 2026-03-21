/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUISwitch.h>

@implementation RCTUISwitch

- (BOOL)isOn
{
	return self.state == NSControlStateValueOn;
}

- (void)setOn:(BOOL)on
{
	[self setOn:on animated:NO];
}

- (void)setOn:(BOOL)on animated:(BOOL)animated {
	self.state = on ? NSControlStateValueOn : NSControlStateValueOff;
}

@end

#endif
