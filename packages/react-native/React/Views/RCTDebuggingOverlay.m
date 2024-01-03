/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTDebuggingOverlay.h"

#import <React/RCTConvert.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>

@implementation RCTDebuggingOverlay

- (void)draw:(NSString *)serializedNodes
{
  NSArray *subViewsToRemove = [self subviews];
  for (RCTPlatformView *v in subViewsToRemove) { // [macOS]
    [v removeFromSuperview];
  }

  NSError *error = nil;
  id deserializedNodes = RCTJSONParse(serializedNodes, &error);

  if (error) {
    RCTLogError(@"Failed to parse serialized nodes passed to RCTDebuggingOverlay");
    return;
  }

  if (![deserializedNodes isKindOfClass:[NSArray class]]) {
    RCTLogError(@"Expected to receive nodes as an array, got %@", NSStringFromClass([deserializedNodes class]));
    return;
  }

  for (NSDictionary *node in deserializedNodes) {
    NSDictionary *nodeRectangle = node[@"rect"];
    NSNumber *nodeColor = node[@"color"];

    NSNumber *x = nodeRectangle[@"left"];
    NSNumber *y = nodeRectangle[@"top"];
    NSNumber *width = nodeRectangle[@"width"];
    NSNumber *height = nodeRectangle[@"height"];

    CGRect rect = CGRectMake(x.doubleValue, y.doubleValue, width.doubleValue, height.doubleValue);

	RCTUIView *box = [[RCTUIView alloc] initWithFrame:rect]; // [macOS]
    box.backgroundColor = [RCTUIColor clearColor]; // [macOS]

    box.layer.borderWidth = 2.0f;
    box.layer.borderColor = [RCTConvert UIColor:nodeColor].CGColor;

    [self addSubview:box];
  }
}

@end
