/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS Adapted from react/react-native@923e7ddcaf4d (#52646).
#include <atomic>
#include <memory>
#include <thread>

#include <gtest/gtest.h>
#include <react/renderer/components/view/ViewShadowNode.h>
#include <react/renderer/core/ShadowNodeFragment.h>
#include <react/renderer/element/Element.h>
#include <react/renderer/element/testUtils.h>
#include <react/renderer/uimanager/UIManager.h>

namespace facebook::react {

class FabricUIManagerTest : public ::testing::Test {
 public:
  FabricUIManagerTest() {
    contextContainer_ = std::make_shared<ContextContainer>();
    ComponentDescriptorProviderRegistry providers{};
    auto registry = providers.createComponentDescriptorRegistry(
        {.eventDispatcher = EventDispatcher::Shared{},
         .contextContainer = contextContainer_,
         .flavor = nullptr});
    providers.add(
        concreteComponentDescriptorProvider<RootComponentDescriptor>());
    providers.add(
        concreteComponentDescriptorProvider<ViewComponentDescriptor>());
    builder_ = std::make_unique<ComponentBuilder>(registry);

    RuntimeExecutor executor =
        [](std::function<void(jsi::Runtime&)>&& /*callback*/) {};
    uiManager_ = std::make_unique<UIManager>(executor, contextContainer_);
    uiManager_->setComponentDescriptorRegistry(registry);

    std::shared_ptr<RootShadowNode> root;
    // clang-format off
    builder_->build(
        Element<RootShadowNode>()
          .tag(1)
          .surfaceId(surfaceId_)
          .reference(root)
          .props([] {
            auto props = std::make_shared<RootProps>();
            props->layoutConstraints = LayoutConstraints{
                .minimumSize = {.width = 0, .height = 0},
                .maximumSize = {.width = 500, .height = 500}};
            return props;
          })
          .children({
            Element<ViewShadowNode>()
              .tag(42)
              .surfaceId(surfaceId_)
              .props([] {
                auto props = std::make_shared<ViewShadowNodeProps>();
                props->nativeId = "initial";
                props->opacity = 1.0;
                return props;
              })
          }));
    // clang-format on

    auto tree = std::make_unique<ShadowTree>(
        surfaceId_,
        LayoutConstraints{},
        LayoutContext{},
        *uiManager_,
        *contextContainer_);
    shadowTree_ = tree.get();
    tree->commit([&root](const RootShadowNode&) { return root; }, {true});
    uiManager_->startSurface(
        std::move(tree), "test", folly::dynamic::object, DisplayMode::Visible);
  }

  void TearDown() override {
    uiManager_->stopSurface(surfaceId_);
  }

 protected:
  std::shared_ptr<const ShadowNode> currentViewNode() const {
    return shadowTree_->getCurrentRevision()
        .rootShadowNode->getChildren()
        .front();
  }

  const ViewProps& viewPropsInTree() const {
    return static_cast<const ViewProps&>(*currentViewNode()->getProps());
  }

  static const ViewProps& viewProps(const ShadowNode& node) {
    return static_cast<const ViewProps&>(*node.getProps());
  }

  SurfaceId surfaceId_{0};
  std::shared_ptr<ContextContainer> contextContainer_;
  std::unique_ptr<ComponentBuilder> builder_;
  std::unique_ptr<UIManager> uiManager_;
  ShadowTree* shadowTree_{nullptr};
};

TEST_F(FabricUIManagerTest, SetNativePropsMergesWithReactRender) {
  ASSERT_EQ(viewPropsInTree().nativeId, "initial");
  ASSERT_FLOAT_EQ(viewPropsInTree().opacity, 1.0);
  uiManager_->setNativeProps_DEPRECATED(
      currentViewNode(), RawProps(folly::dynamic::object("opacity", 0.5)));
  EXPECT_EQ(viewPropsInTree().nativeId, "initial");
  EXPECT_FLOAT_EQ(viewPropsInTree().opacity, 0.5);

  auto rendered = uiManager_->cloneNode(
      *currentViewNode(),
      nullptr,
      RawProps(folly::dynamic::object("nativeID", "from-react")));
  EXPECT_EQ(viewProps(*rendered).nativeId, "from-react");
  EXPECT_FLOAT_EQ(viewProps(*rendered).opacity, 0.5);
}

TEST_F(FabricUIManagerTest, ReactRefreshesNativeOwnedKeysIncludingNull) {
  uiManager_->setNativeProps_DEPRECATED(
      currentViewNode(), RawProps(folly::dynamic::object("opacity", 0.5)));
  auto refreshed = uiManager_->cloneNode(
      *currentViewNode(),
      nullptr,
      RawProps(folly::dynamic::object("opacity", 0.75)));
  EXPECT_FLOAT_EQ(viewProps(*refreshed).opacity, 0.75);
  EXPECT_FLOAT_EQ(viewProps(*refreshed->clone({})).opacity, 0.75);

  auto reset = uiManager_->cloneNode(
      *refreshed,
      nullptr,
      RawProps(folly::dynamic::object("opacity", nullptr)));
  EXPECT_FLOAT_EQ(viewProps(*reset).opacity, 1.0);
  EXPECT_FLOAT_EQ(viewProps(*reset->clone({})).opacity, 1.0);
}

TEST_F(FabricUIManagerTest, ReactOnlyKeysDoNotBecomeNativeOverrides) {
  uiManager_->setNativeProps_DEPRECATED(
      currentViewNode(), RawProps(folly::dynamic::object("opacity", 0.5)));
  auto rendered = uiManager_->cloneNode(
      *currentViewNode(),
      nullptr,
      RawProps(folly::dynamic::object("nativeID", "from-react")));
  auto explicitProps = std::make_shared<ViewShadowNodeProps>();
  explicitProps->nativeId = "explicit";
  explicitProps->opacity = 0.9;
  auto explicitClone = rendered->clone({.props = explicitProps});
  EXPECT_EQ(viewProps(*explicitClone).nativeId, "explicit");
  EXPECT_FLOAT_EQ(viewProps(*explicitClone).opacity, 0.9);

  auto placeholderClone = explicitClone->clone({});
  EXPECT_EQ(viewProps(*placeholderClone).nativeId, "explicit");
  EXPECT_FLOAT_EQ(viewProps(*placeholderClone).opacity, 0.5);
}

TEST_F(
    FabricUIManagerTest,
    ConcurrentReactAndPlaceholderClonesUseOwnedSnapshots) {
  uiManager_->setNativeProps_DEPRECATED(
      currentViewNode(), RawProps(folly::dynamic::object("opacity", 0.5)));
  auto node = currentViewNode();
  std::atomic<bool> start{false};
  std::atomic<int> invalidSnapshots{0};
  std::thread writer([&] {
    while (!start.load()) {
      std::this_thread::yield();
    }
    for (int i = 0; i < 1000; ++i) {
      uiManager_->cloneNode(
          *node,
          nullptr,
          RawProps(folly::dynamic::object("opacity", i % 2 ? 0.75 : 0.25)));
    }
  });
  start.store(true);
  for (int i = 0; i < 1000; ++i) {
    auto clone = node->clone({});
    auto opacity = viewProps(*clone).opacity;
    if (opacity != 0.25 && opacity != 0.5 && opacity != 0.75) {
      ++invalidSnapshots;
    }
  }
  writer.join();
  EXPECT_EQ(invalidSnapshots.load(), 0);
  EXPECT_FLOAT_EQ(viewProps(*node->clone({})).opacity, 0.75);
}

} // namespace facebook::react
// macOS]
