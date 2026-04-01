/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/scrollview/ScrollViewEventEmitter.h>
#include <react/renderer/components/scrollview/ScrollViewProps.h>
#include <react/renderer/components/scrollview/ScrollViewState.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/ShadowNodeFamily.h>

namespace facebook::react {

extern const char ScrollViewComponentName[];

/*
 * `ShadowNode` for <ScrollView> component.
 */
class ScrollViewShadowNode final : public ConcreteViewShadowNode<
                                       ScrollViewComponentName,
                                       ScrollViewProps,
                                       ScrollViewEventEmitter,
                                       ScrollViewState> {
 public:
  ScrollViewShadowNode(
      const ShadowNodeFragment& fragment,
      const ShadowNodeFamily::Shared& family,
      ShadowNodeTraits traits);
  ScrollViewShadowNode(
      const ShadowNode& sourceShadowNode,
      const ShadowNodeFragment& fragment);

  static ScrollViewState initialStateData(
      const Props::Shared& props,
      const ShadowNodeFamily::Shared& family,
      const ComponentDescriptor& componentDescriptor);

  // [macOS] Set the system scrollbar width (e.g. legacy scroller width on
  // macOS). Called from native code at startup and when the system "Show scroll
  // bars" preference changes. The value is read synchronously during Yoga
  // layout, so the first layout pass is immediately correct — no state
  // round-trip required. Thread-safe (uses atomic store/load).
  static void setSystemScrollbarWidth(Float width);
  static Float getSystemScrollbarWidth();

#pragma mark - LayoutableShadowNode

  void layout(LayoutContext layoutContext) override;
  Point getContentOriginOffset(bool includeTransform) const override;

 private:
  void updateStateIfNeeded();
  void updateScrollContentOffsetIfNeeded();
  void applyScrollbarPadding();
};

} // namespace facebook::react
