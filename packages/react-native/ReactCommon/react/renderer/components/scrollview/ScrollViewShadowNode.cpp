/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "ScrollViewShadowNode.h"

#include <atomic>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/view/YogaStylableProps.h>
#include <react/renderer/core/LayoutMetrics.h>
#include <react/renderer/graphics/Float.h>

namespace facebook::react {

const char ScrollViewComponentName[] = "ScrollView";

// [macOS] Cached system scrollbar width, set from native code at startup and
// when the system "Show scroll bars" preference changes. Read synchronously
// during Yoga layout so the first pass is immediately correct.
static std::atomic<float> systemScrollbarWidth_{0.0f};

void ScrollViewShadowNode::setSystemScrollbarWidth(Float width) {
  systemScrollbarWidth_.store(
      static_cast<float>(width), std::memory_order_relaxed);
}

Float ScrollViewShadowNode::getSystemScrollbarWidth() {
  return static_cast<Float>(
      systemScrollbarWidth_.load(std::memory_order_relaxed));
}

ScrollViewShadowNode::ScrollViewShadowNode(
    const ShadowNodeFragment& fragment,
    const ShadowNodeFamily::Shared& family,
    ShadowNodeTraits traits)
    : ConcreteViewShadowNode(fragment, family, traits) {
  applyScrollbarPadding();
}

ScrollViewShadowNode::ScrollViewShadowNode(
    const ShadowNode& sourceShadowNode,
    const ShadowNodeFragment& fragment)
    : ConcreteViewShadowNode(sourceShadowNode, fragment) {
  applyScrollbarPadding();
}

void ScrollViewShadowNode::applyScrollbarPadding() {
  // [macOS] On macOS, legacy (always-visible) scrollbars sit inside the
  // NSScrollView frame and reduce the NSClipView's visible area. Without
  // adjustment, Yoga lays out children against the full ScrollView width,
  // causing content to overflow the visible area.
  //
  // Read the scrollbar width directly from the cached system value (set by
  // native code via setSystemScrollbarWidth). This is synchronous — no state
  // round-trip — so the first layout pass is immediately correct.
  //
  // IMPORTANT: We read the base padding from props (not the current Yoga
  // style) to avoid double-counting. When a shadow node is cloned, the Yoga
  // style is copied from the source node which may already include scrollbar
  // padding from a previous applyScrollbarPadding() call.
  Float scrollbarWidth = getSystemScrollbarWidth();

  const auto& props = static_cast<const YogaStylableProps&>(*props_);
  const auto& propsStyle = props.yogaStyle;

  auto style = yogaNode_.style();
  bool changed = false;

  // Compute target right padding: base from props + scrollbar width
  {
    auto basePadding = propsStyle.padding(yoga::Edge::Right);
    Float baseValue = 0;
    if (basePadding.isDefined() && basePadding.isPoints()) {
      baseValue = basePadding.value().unwrap();
    }
    Float targetValue = baseValue + scrollbarWidth;
    auto targetPadding = yoga::StyleLength::points(targetValue);
    if (targetPadding != style.padding(yoga::Edge::Right)) {
      style.setPadding(yoga::Edge::Right, targetPadding);
      changed = true;
    }
  }

  if (changed) {
    yogaNode_.setStyle(style);
    yogaNode_.setDirty(true);
  }
}

void ScrollViewShadowNode::updateStateIfNeeded() {
  ensureUnsealed();

  auto contentBoundingRect = Rect{};
  for (const auto& childNode : getLayoutableChildNodes()) {
    contentBoundingRect.unionInPlace(childNode->getLayoutMetrics().frame);
  }

  auto state = getStateData();

  if (state.contentBoundingRect != contentBoundingRect) {
    state.contentBoundingRect = contentBoundingRect;
    setStateData(std::move(state));
  }
}

void ScrollViewShadowNode::updateScrollContentOffsetIfNeeded() {
#ifndef ANDROID
  if (getLayoutMetrics().layoutDirection == LayoutDirection::RightToLeft) {
    // Yoga places `contentView` on the right side of `scrollView` when RTL
    // layout is enforced. To correct for this, in RTL setting, correct the
    // frame's origin. React Native Classic does this as well in
    // `RCTScrollContentShadowView.m`.
    for (auto layoutableNode : getLayoutableChildNodes()) {
      auto layoutMetrics = layoutableNode->getLayoutMetrics();
      if (layoutMetrics.frame.origin.x != 0) {
        layoutMetrics.frame.origin.x = 0;
        layoutableNode->setLayoutMetrics(layoutMetrics);
      }
    }
  }
#endif
}

ScrollViewState ScrollViewShadowNode::initialStateData(
    const Props::Shared& props,
    const ShadowNodeFamily::Shared& /*family*/,
    const ComponentDescriptor& /*componentDescriptor*/) {
  return {static_cast<const ScrollViewProps&>(*props).contentOffset, {}, 0};
}

#pragma mark - LayoutableShadowNode

void ScrollViewShadowNode::layout(LayoutContext layoutContext) {
  ConcreteViewShadowNode::layout(layoutContext);
  updateScrollContentOffsetIfNeeded();
  updateStateIfNeeded();
}

Point ScrollViewShadowNode::getContentOriginOffset(
    bool includeTransform) const {
  auto stateData = getStateData();
  auto contentOffset = stateData.contentOffset;
  auto transform = includeTransform ? getTransform() : Transform::Identity();
  auto result =
      transform * Vector{-contentOffset.x, -contentOffset.y, 0.0f, 1.0f};

  return {
      result.x, result.y + static_cast<float>(stateData.scrollAwayPaddingTop)};
}
} // namespace facebook::react
