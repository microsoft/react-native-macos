/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX // [macOS
#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTAppearanceProxy : NSObject

+ (instancetype)sharedInstance;

/*
 * Property to access the current appearance.
 * Thread safe.
 */
@property (nonatomic, readonly) NSAppearance *currentAppearance;

- (void)startObservingAppearance;

@end

NS_ASSUME_NONNULL_END
#endif // macOS]
