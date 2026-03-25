/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import "RCTUIKitCompat.h"

#if TARGET_OS_OSX

@implementation NSColor (RCTAppearanceResolving)

- (NSColor *)resolvedColorWithAppearance:(NSAppearance *)appearance
{
  __block NSColor *resolved = self;
  [appearance performAsCurrentDrawingAppearance:^{
    CGColorRef cgColor = self.CGColor;
    if (cgColor) {
      NSColor *fromCG = [NSColor colorWithCGColor:cgColor];
      if (fromCG) {
        resolved = fromCG;
      }
    }
  }];
  return resolved;
}

@end

#endif // TARGET_OS_OSX
