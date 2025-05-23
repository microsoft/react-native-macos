/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTPullToRefreshViewComponentView.h"

#import <react/renderer/components/rncore/ComponentDescriptors.h>
#import <react/renderer/components/rncore/EventEmitters.h>
#import <react/renderer/components/rncore/Props.h>
#import <react/renderer/components/rncore/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTRefreshableProtocol.h>
#import <React/RCTScrollViewComponentView.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface RCTPullToRefreshViewComponentView () <RCTPullToRefreshViewViewProtocol, RCTRefreshableProtocol>
@end

@implementation RCTPullToRefreshViewComponentView {
#if !TARGET_OS_OSX // [macOS]
  UIRefreshControl *_refreshControl;
#endif // [macOS]
  RCTScrollViewComponentView *__weak _scrollViewComponentView;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    // This view is not designed to be visible, it only serves UIViewController-like purpose managing
    // attaching and detaching of a pull-to-refresh view to a scroll view.
    // The pull-to-refresh view is not a subview of this view.
    self.hidden = YES;

    _props = PullToRefreshViewShadowNode::defaultSharedProps();
    [self _initializeUIRefreshControl];
  }

  return self;
}

- (void)_initializeUIRefreshControl
{
#if !TARGET_OS_OSX // [macOS]
  _refreshControl = [UIRefreshControl new];
  [_refreshControl addTarget:self
                      action:@selector(handleUIControlEventValueChanged)
            forControlEvents:UIControlEventValueChanged];

  const auto &concreteProps = static_cast<const PullToRefreshViewProps &>(*_props);

  _refreshControl.tintColor = RCTUIColorFromSharedColor(concreteProps.tintColor);
  [self _updateProgressViewOffset:concreteProps.progressViewOffset];
#endif // [macOS]
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<PullToRefreshViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _scrollViewComponentView = nil;
  [self _initializeUIRefreshControl];
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldConcreteProps = static_cast<const PullToRefreshViewProps &>(*_props);
  const auto &newConcreteProps = static_cast<const PullToRefreshViewProps &>(*props);

  if (newConcreteProps.refreshing != oldConcreteProps.refreshing) {
#if !TARGET_OS_OSX // [macOS]
    if (newConcreteProps.refreshing) {
      [_refreshControl beginRefreshing];
    } else {
      [_refreshControl endRefreshing];
    }
#endif // [macOS]
  }

  if (newConcreteProps.tintColor != oldConcreteProps.tintColor) {
#if !TARGET_OS_OSX // [macOS]
    _refreshControl.tintColor = RCTUIColorFromSharedColor(newConcreteProps.tintColor);
#endif // [macOS]
  }

  if (newConcreteProps.progressViewOffset != oldConcreteProps.progressViewOffset) {
    [self _updateProgressViewOffset:newConcreteProps.progressViewOffset];
  }

  BOOL needsUpdateTitle = NO;

  if (newConcreteProps.title != oldConcreteProps.title) {
    needsUpdateTitle = YES;
  }

  if (newConcreteProps.titleColor != oldConcreteProps.titleColor) {
    needsUpdateTitle = YES;
  }

  [super updateProps:props oldProps:oldProps];

  if (needsUpdateTitle) {
    [self _updateTitle];
  }
}

#pragma mark -

- (void)handleUIControlEventValueChanged
{
  static_cast<const PullToRefreshViewEventEmitter &>(*_eventEmitter).onRefresh({});
}

- (void)_updateProgressViewOffset:(Float)progressViewOffset
{
#if !TARGET_OS_OSX // [macOS]
  _refreshControl.bounds = CGRectMake(
      _refreshControl.bounds.origin.x,
      -progressViewOffset,
      _refreshControl.bounds.size.width,
      _refreshControl.bounds.size.height);
#endif // [macOS]
}

- (void)_updateTitle
{
  const auto &concreteProps = static_cast<const PullToRefreshViewProps &>(*_props);

  if (concreteProps.title.empty()) {
#if !TARGET_OS_OSX // [macOS]
    _refreshControl.attributedTitle = nil;
#endif // [macOS]
    return;
  }

  NSMutableDictionary *attributes = [NSMutableDictionary dictionary];
  if (concreteProps.titleColor) {
    attributes[NSForegroundColorAttributeName] = RCTUIColorFromSharedColor(concreteProps.titleColor);
  }

#if !TARGET_OS_OSX // [macOS]
  _refreshControl.attributedTitle =
      [[NSAttributedString alloc] initWithString:RCTNSStringFromString(concreteProps.title) attributes:attributes];
#endif // [macOS]
}

#pragma mark - Attaching & Detaching

#if !TARGET_OS_OSX // [macOS]
- (void)didMoveToSuperview
{
  [super didMoveToSuperview];
#else // macOS]
- (void)viewDidMoveToSuperview
{
  [super viewDidMoveToSuperview];
#endif // macOS]
  if (self.superview) {
    [self _attach];
  } else {
    [self _detach];
  }
}

- (void)_attach
{
  if (_scrollViewComponentView) {
    [self _detach];
  }

  _scrollViewComponentView = [RCTScrollViewComponentView findScrollViewComponentViewForView:self];
  if (!_scrollViewComponentView) {
    return;
  }

#if !TARGET_OS_OSX // [macOS]
  if (@available(macCatalyst 13.1, *)) {
    _scrollViewComponentView.scrollView.refreshControl = _refreshControl;
  }
#endif // [macOS]
}

- (void)_detach
{
  if (!_scrollViewComponentView) {
    return;
  }

  // iOS requires to end refreshing before unmounting.
#if !TARGET_OS_OSX // [macOS]
  [_refreshControl endRefreshing];

  if (@available(macCatalyst 13.1, *)) {
    _scrollViewComponentView.scrollView.refreshControl = nil;
  }
#endif // [macOS]
  _scrollViewComponentView = nil;
}

#pragma mark - Native commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTPullToRefreshViewHandleCommand(self, commandName, args);
}

- (void)setNativeRefreshing:(BOOL)refreshing
{
#if !TARGET_OS_OSX // [macOS]
  if (refreshing) {
    [_refreshControl beginRefreshing];
  } else {
    [_refreshControl endRefreshing];
  }
#endif // [macOS]
}

#pragma mark - RCTRefreshableProtocol

- (void)setRefreshing:(BOOL)refreshing
{
  [self setNativeRefreshing:refreshing];
}

#pragma mark -

- (NSString *)componentViewName_DO_NOT_USE_THIS_IS_BROKEN
{
  return @"RefreshControl";
}

@end

Class<RCTComponentViewProtocol> RCTPullToRefreshViewCls(void)
{
  return RCTPullToRefreshViewComponentView.class;
}
