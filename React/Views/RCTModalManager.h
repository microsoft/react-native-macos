<<<<<<< HEAD
/**
=======
/*
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCTModalManager : RCTEventEmitter <RCTBridgeModule>

- (void)modalDismissed:(NSNumber *)modalID;

@end
