/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]
#import <AppKit/AppKit.h>
#import <XCTest/XCTest.h>

#if RCT_NEW_ARCH_ENABLED

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/runtimescheduler/RuntimeScheduler.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManager.h>

using namespace facebook::react;

@interface RCTNativePropsResizeDelegate : NSObject <NSWindowDelegate>
@property (nonatomic, copy) void (^resize)(NSSize);
@end

@implementation RCTNativePropsResizeDelegate
- (void)windowDidResize:(NSNotification *)notification
{
  NSWindow *window = notification.object;
  self.resize(window.contentView.bounds.size);
}
@end

@interface RCTFabricNativePropsTests : XCTestCase
@end

@implementation RCTFabricNativePropsTests

- (void)testWindowResizeWhileUpdatingNativeProps
{
  void (^run)(void) = ^{
    [NSApplication sharedApplication];
    auto context = std::make_shared<ContextContainer>();
    // The empty surface needs no JavaScript VM, input driver, or mounted views.
    RuntimeExecutor executor = [](std::function<void(facebook::jsi::Runtime &)> &&) {};
    auto runtimeScheduler = std::make_shared<RuntimeScheduler>(executor);
    context->insert(RuntimeSchedulerKey, std::weak_ptr<RuntimeScheduler>(runtimeScheduler));
    auto providers = std::make_shared<ComponentDescriptorProviderRegistry>();
    providers->add(concreteComponentDescriptorProvider<RootComponentDescriptor>());
    providers->add(concreteComponentDescriptorProvider<ViewComponentDescriptor>());
    SchedulerToolbox toolbox{
        .contextContainer = context,
        .componentRegistryFactory =
            [providers](
                const EventDispatcher::Weak &dispatcher, const std::shared_ptr<const ContextContainer> &container) {
              return providers->createComponentDescriptorRegistry({dispatcher, container, nullptr});
            },
        .runtimeExecutor = executor,
        .eventBeatFactory =
            [runtimeScheduler](std::shared_ptr<EventBeat::OwnerBox> owner) {
              return std::make_unique<EventBeat>(std::move(owner), *runtimeScheduler);
            }};
    Scheduler scheduler(toolbox, nullptr, nullptr);
    SurfaceHandler surface("", 11);
    scheduler.registerSurface(surface);
    surface.constraintLayout(
        {.minimumSize = {600, 400}, .maximumSize = {600, 400}, .layoutDirection = LayoutDirection::LeftToRight}, {});
    surface.start();
    auto uiManager = scheduler.getUIManager();
    auto node = uiManager->createNode(
        42,
        "View",
        11,
        RawProps(folly::dynamic::object("opacity", 0.5)("flex", 1)("nativeID", "resize-target")),
        nullptr);
    auto children = std::make_shared<std::vector<std::shared_ptr<const ShadowNode>>>();
    children->push_back(node);
    uiManager->completeSurface(11, children, {true});
    uiManager->setNativeProps_DEPRECATED(node, RawProps(folly::dynamic::object("opacity", 0.5)));

    constexpr size_t resizeCount = 120;
    constexpr size_t updatesPerResize = 32;
    std::mutex gate;
    std::condition_variable changed;
    size_t requested = 0;
    size_t completed = 0;
    bool stop = false;
    std::atomic<bool> timedOut{false};
    std::atomic<size_t> writes{0};
    std::atomic<size_t> invalidSnapshots{0};
    auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(20);

    std::thread writer([&] {
      for (size_t phase = 1; phase <= resizeCount; ++phase) {
        {
          std::unique_lock lock(gate);
          if (!changed.wait_until(lock, deadline, [&] { return stop || requested >= phase; })) {
            timedOut.store(true);
            return;
          }
          if (stop) {
            return;
          }
        }
        for (size_t update = 0; update < updatesPerResize; ++update) {
          uiManager->setNativeProps_DEPRECATED(
              node, RawProps(folly::dynamic::object("opacity", update % 2 ? 0.75 : 0.25)));
          ++writes;
        }
        {
          std::lock_guard lock(gate);
          completed = phase;
        }
        changed.notify_one();
      }
    });

    NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 600, 400)
                                                   styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskResizable
                                                     backing:NSBackingStoreBuffered
                                                       defer:NO];
    window.releasedWhenClosed = NO;
    RCTNativePropsResizeDelegate *delegate = [RCTNativePropsResizeDelegate new];
    size_t callbacks = 0;
    size_t clones = 0;
    auto resize = [&](NSSize size) {
      ++callbacks;
      {
        std::lock_guard lock(gate);
        requested = callbacks;
      }
      changed.notify_one();
      surface.constraintLayout(
          {.minimumSize = {size.width, size.height},
           .maximumSize = {size.width, size.height},
           .layoutDirection = LayoutDirection::LeftToRight},
          {});
      for (size_t i = 0; i < updatesPerResize; ++i) {
        auto clone = node->clone({});
        auto opacity = static_cast<const ViewProps &>(*clone->getProps()).opacity;
        if (opacity != 0.25 && opacity != 0.5 && opacity != 0.75) {
          ++invalidSnapshots;
        }
        ++clones;
      }
    };
    delegate.resize = ^(NSSize size) {
      resize(size);
    };
    window.delegate = delegate;
    for (size_t i = 0; i < resizeCount; ++i) {
      [window setContentSize:i % 2 ? NSMakeSize(1000, 740) : NSMakeSize(800, 600)];
      std::unique_lock lock(gate);
      if (!changed.wait_until(lock, deadline, [&] { return completed >= i + 1; })) {
        timedOut.store(true);
        break;
      }
    }
    {
      std::lock_guard lock(gate);
      stop = true;
    }
    changed.notify_one();
    writer.join();
    window.delegate = nil;
    delegate.resize = nil;
    [window close];

    XCTAssertFalse(timedOut.load());
    XCTAssertEqual(callbacks, resizeCount);
    XCTAssertEqual(completed, resizeCount);
    XCTAssertEqual(writes.load(), resizeCount * updatesPerResize);
    XCTAssertEqual(clones, resizeCount * updatesPerResize);
    XCTAssertEqual(invalidSnapshots.load(), 0u);
    XCTAssertEqual(surface.getLayoutConstraints().maximumSize.width, 1000);
    auto finalClone = node->clone({});
    XCTAssertEqualWithAccuracy(static_cast<const ViewProps &>(*finalClone->getProps()).opacity, 0.75, 0.0001);
    surface.stop();
    scheduler.unregisterSurface(surface);
  };
  if ([NSThread isMainThread]) {
    run();
  } else {
    dispatch_sync(dispatch_get_main_queue(), run);
  }
}

@end

#endif
