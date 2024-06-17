/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/graphics/Geometry.h>

namespace facebook::react {

/*
 * Describes a mouse enter/leave event.
 */
struct MouseEvent {
  /**
   * Pointer horizontal location in target view.
   */
  Float clientX{0};
  
  /**
   * Pointer vertical location in target view.
   */
  Float clientY{0};

  /**
   * Pointer horizontal location in window.
   */
  Float screenX{0};
  
  /**
   * Pointer vertical location in window.
   */
  Float screenY{0};

  /*
   * A flag indicating if the alt key is pressed.
   */
  bool altKey{false};

  /*
   * A flag indicating if the control key is pressed.
   */
  bool ctrlKey{false};

  /*
   * A flag indicating if the shift key is pressed.
   */
  bool shiftKey{false};

  /*
   * A flag indicating if the meta key is pressed.
   */
  bool metaKey{false};
};

struct DataTransferItem {
  std::string name{};
  std::string kind{};
  std::string type{};
  std::string uri{};
  std::optional<int> size{};
  std::optional<int> width{};
  std::optional<int> height{};
};

struct DragEvent : MouseEvent {
  std::vector<DataTransferItem> dataTransferItems;
};

} // namespace facebook::react
