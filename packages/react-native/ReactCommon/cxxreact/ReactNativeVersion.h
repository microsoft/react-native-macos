/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated by scripts/releases/set-version.js
 */

#pragma once

#include <cstdint>
#include <string_view>

namespace facebook::react {

constexpr struct {
  int32_t Major = 0;
  int32_t Minor = 77;
  int32_t Patch = 0;
  std::string_view Prerelease = "";
} ReactNativeVersion;

} // namespace facebook::react
