/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#import <React/RCTUIKit.h>
#import <vector>

namespace facebook::react {
struct ColorComponents;
struct Color;
} // namespace facebook::react

facebook::react::ColorComponents RCTPlatformColorComponentsFromSemanticItems(std::vector<std::string> &semanticItems);
RCTUIColor *RCTPlatformColorFromSemanticItems(std::vector<std::string> &semanticItems); // [macOS]
RCTUIColor *RCTPlatformColorFromColor(const facebook::react::Color &color); // [macOS]
