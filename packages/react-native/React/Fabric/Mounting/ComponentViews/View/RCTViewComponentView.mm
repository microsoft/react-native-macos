/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewComponentView.h"

#import <CoreGraphics/CoreGraphics.h>
#import <QuartzCore/QuartzCore.h>
#import <objc/runtime.h>
#import <ranges>

#import <React/RCTAssert.h>
#import <React/RCTBorderDrawing.h>
#import <React/RCTBoxShadow.h>
#import <React/RCTConversions.h>
#import <React/RCTLinearGradient.h>
#import <React/RCTCursor.h> // [macOS]
#import <React/RCTLocalizedString.h>
#if TARGET_OS_OSX // [macOS
#import <React/RCTView.h> // [macOS]
#import <React/RCTViewKeyboardEvent.h> // [macOS]
#endif // macOS]
#import <react/featureflags/ReactNativeFeatureFlags.h>
#import <react/renderer/components/view/ViewComponentDescriptor.h>
#import <react/renderer/components/view/ViewEventEmitter.h>
#import <react/renderer/components/view/ViewProps.h>
#import <react/renderer/components/view/accessibilityPropsConversions.h>
#import <react/renderer/graphics/BlendMode.h>

#ifdef RCT_DYNAMIC_FRAMEWORKS
#import <React/RCTComponentViewFactory.h>
#endif

using namespace facebook::react;

const CGFloat BACKGROUND_COLOR_ZPOSITION = -1024.0f;

@implementation RCTViewComponentView {
  RCTUIColor *_backgroundColor; // [macOS]
  CALayer *_backgroundColorLayer;
  __weak CALayer *_borderLayer;
  CALayer *_boxShadowLayer;
  CALayer *_filterLayer;
  NSMutableArray<CALayer *> *_backgroundImageLayers;
  BOOL _needsInvalidateLayer;
  BOOL _isJSResponder;
  BOOL _removeClippedSubviews;
  BOOL _hasMouseOver; // [macOS]
  BOOL _hasClipViewBoundsObserver; // [macOS]
  NSTrackingArea *_trackingArea; // [macOS]
  NSMutableArray<RCTUIView *> *_reactSubviews; // [macOS]
  NSSet<NSString *> *_Nullable _propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN;
  RCTPlatformView *_containerView; // [macOS]
  BOOL _useCustomContainerView;
}

#ifdef RCT_DYNAMIC_FRAMEWORKS
+ (void)load
{
  [RCTComponentViewFactory.currentComponentViewFactory registerComponentViewClass:self];
}
#endif

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = ViewShadowNode::defaultSharedProps();
    _reactSubviews = [NSMutableArray new];
#if !TARGET_OS_OSX // [macOS]
    self.multipleTouchEnabled = YES;
#else
    // React views have their bounds clipping disabled by default
    self.clipsToBounds = NO;
#endif // [macOS]
    _useCustomContainerView = NO;
  }
  return self;
}

- (facebook::react::Props::Shared)props
{
  return _props;
}

#if !TARGET_OS_OSX // [macOS]
- (void)setContentView:(RCTUIView *)contentView // [macOS]
#else // [macOS
- (void)setContentView:(RCTPlatformView *)contentView // [macOS]
#endif // macOS]
{
  if (_contentView) {
    [_contentView removeFromSuperview];
  }

  _contentView = contentView;

  if (_contentView) {
    [self.currentContainerView addSubview:_contentView];
    _contentView.frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());
#if TARGET_OS_OSX // [macOS
    _contentView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
#endif // macOS]
    [self addSubview:_contentView];
  }
}

- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event
{
  if (UIEdgeInsetsEqualToEdgeInsets(self.hitTestEdgeInsets, UIEdgeInsetsZero)) {
    return [super pointInside:point withEvent:event];
  }
  CGRect hitFrame = UIEdgeInsetsInsetRect(self.bounds, self.hitTestEdgeInsets);
  return CGRectContainsPoint(hitFrame, point);
}

- (RCTUIColor *)backgroundColor // [macOS]
{
  return _backgroundColor;
}

- (void)setBackgroundColor:(RCTUIColor *)backgroundColor // [macOS]
{
  _backgroundColor = backgroundColor;
}

#if TARGET_OS_OSX // [macOS
- (void)resetCursorRects
{
  [self discardCursorRects];
  if (_props->cursor != Cursor::Auto)
  {
    NSCursor *cursor = NSCursorFromRCTCursor(RCTCursorFromCursor(_props->cursor));
    [self addCursorRect:self.bounds cursor:cursor];
  }
}
#endif // macOS]

#if !TARGET_OS_OSX
- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];

  if ([self.traitCollection hasDifferentColorAppearanceComparedToTraitCollection:previousTraitCollection]) {
    [self invalidateLayer];
  }
}
#else // [macOS SAAD
- (void)viewDidChangeEffectiveAppearance
{
  [super viewDidChangeEffectiveAppearance];

  [self invalidateLayer];
}
#endif // macOS]

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  RCTAssert(
      self == [RCTViewComponentView class],
      @"`+[RCTComponentViewProtocol componentDescriptorProvider]` must be implemented for all subclasses (and `%@` particularly).",
      NSStringFromClass([self class]));
  return concreteComponentDescriptorProvider<ViewComponentDescriptor>();
}

- (void)mountChildComponentView:(RCTUIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index // [macOS]
{
  RCTAssert(
      childComponentView.superview == nil,
      @"Attempt to mount already mounted component view. (parent: %@, child: %@, index: %@, existing parent: %@)",
      self,
      childComponentView,
      @(index),
      @([childComponentView.superview tag]));

  if (_removeClippedSubviews) {
    [_reactSubviews insertObject:childComponentView atIndex:index];
  } else {
    [self.currentContainerView insertSubview:childComponentView atIndex:index];
  }
}

- (void)unmountChildComponentView:(RCTUIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index // [macOS]
{
  if (_removeClippedSubviews) {
    [_reactSubviews removeObjectAtIndex:index];
  } else {
    RCTAssert(
        childComponentView.superview == self.currentContainerView,
        @"Attempt to unmount a view which is mounted inside different view. (parent: %@, child: %@, index: %@)",
        self,
        childComponentView,
        @(index));
    RCTAssert(
        (self.currentContainerView.subviews.count > index) &&
            [self.currentContainerView.subviews objectAtIndex:index] == childComponentView,
        @"Attempt to unmount a view which has a different index. (parent: %@, child: %@, index: %@, actual index: %@, tag at index: %@)",
        self,
        childComponentView,
        @(index),
        @([self.currentContainerView.subviews indexOfObject:childComponentView]),
        @([[self.currentContainerView.subviews objectAtIndex:index] tag]));
  }

  [childComponentView removeFromSuperview];
}

- (void)updateClippedSubviewsWithClipRect:(CGRect)clipRect relativeToView:(RCTUIView *)clipView // [macOS]
{
  if (!_removeClippedSubviews) {
    // Use default behavior if unmounting is disabled
    return [super updateClippedSubviewsWithClipRect:clipRect relativeToView:clipView];
  }

  if (_reactSubviews.count == 0) {
    // Do nothing if we have no subviews
    return;
  }

  if (CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
    // Do nothing if layout hasn't happened yet
    return;
  }

  // Convert clipping rect to local coordinates
  clipRect = [clipView convertRect:clipRect toView:self];

  // Mount / unmount views
  for (RCTUIView *view in _reactSubviews) { // [macOS]
    if (CGRectIntersectsRect(clipRect, view.frame)) {
      // View is at least partially visible, so remount it if unmounted
      [self.currentContainerView addSubview:view];
      // View is visible, update clipped subviews
      [view updateClippedSubviewsWithClipRect:clipRect relativeToView:self];
    } else if (view.superview) {
      // View is completely outside the clipRect, so unmount it
      [view removeFromSuperview];
    }
  }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  RCTAssert(props, @"`props` must not be `null`.");

#ifndef NS_BLOCK_ASSERTIONS
  auto propsRawPtr = _props.get();
  RCTAssert(
      propsRawPtr &&
          ([self class] == [RCTViewComponentView class] ||
           typeid(*propsRawPtr).hash_code() != typeid(const ViewProps).hash_code()),
      @"`RCTViewComponentView` subclasses (and `%@` particularly) must setup `_props`"
       " instance variable with a default value in the constructor.",
      NSStringFromClass([self class]));
#endif

  const auto &oldViewProps = static_cast<const ViewProps &>(*_props);
  const auto &newViewProps = static_cast<const ViewProps &>(*props);

  BOOL needsInvalidateLayer = NO;

  // `opacity`
  if (oldViewProps.opacity != newViewProps.opacity &&
      ![_propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN containsObject:@"opacity"]) {
    self.layer.opacity = (float)newViewProps.opacity;
    needsInvalidateLayer = YES;
  }

  if (oldViewProps.removeClippedSubviews != newViewProps.removeClippedSubviews) {
    _removeClippedSubviews = newViewProps.removeClippedSubviews;
    if (_removeClippedSubviews && self.currentContainerView.subviews.count > 0) {
      _reactSubviews = [NSMutableArray arrayWithArray:self.currentContainerView.subviews];
    }
  }

  // `backgroundColor`
  if (oldViewProps.backgroundColor != newViewProps.backgroundColor) {
    self.backgroundColor = RCTUIColorFromSharedColor(newViewProps.backgroundColor); // [macOS]
    needsInvalidateLayer = YES;
  }

  // `shadowColor`
  if (oldViewProps.shadowColor != newViewProps.shadowColor) {
    RCTUIColor *shadowColor = RCTUIColorFromSharedColor(newViewProps.shadowColor);
    self.layer.shadowColor = shadowColor.CGColor;
    needsInvalidateLayer = YES;
  }

  // `shadowOffset`
  if (oldViewProps.shadowOffset != newViewProps.shadowOffset) {
    self.layer.shadowOffset = RCTCGSizeFromSize(newViewProps.shadowOffset);
    needsInvalidateLayer = YES;
  }

  // `shadowOpacity`
  if (oldViewProps.shadowOpacity != newViewProps.shadowOpacity) {
    self.layer.shadowOpacity = (float)newViewProps.shadowOpacity;
    needsInvalidateLayer = YES;
  }

  // `shadowRadius`
  if (oldViewProps.shadowRadius != newViewProps.shadowRadius) {
    self.layer.shadowRadius = (CGFloat)newViewProps.shadowRadius;
    needsInvalidateLayer = YES;
  }

  // `backfaceVisibility`
  if (oldViewProps.backfaceVisibility != newViewProps.backfaceVisibility) {
    self.layer.doubleSided = newViewProps.backfaceVisibility == BackfaceVisibility::Visible;
  }

  // `cursor`
  if (oldViewProps.cursor != newViewProps.cursor) {
    needsInvalidateLayer = YES;
  }

  // `cursor`
  if (oldViewProps.cursor != newViewProps.cursor) {
    needsInvalidateLayer = YES;
  }

  // `shouldRasterize`
  if (oldViewProps.shouldRasterize != newViewProps.shouldRasterize) {
    self.layer.shouldRasterize = newViewProps.shouldRasterize;
#if !TARGET_OS_OSX // [macOS]
    self.layer.rasterizationScale = newViewProps.shouldRasterize ? self.traitCollection.displayScale : 1.0;
#else // [macOS
    self.layer.rasterizationScale = 1.0;
#endif // macOS]
  }

  // `pointerEvents`
  if (oldViewProps.pointerEvents != newViewProps.pointerEvents) {
    self.userInteractionEnabled = newViewProps.pointerEvents != PointerEventsMode::None;
  }

  // `transform`
  if ((oldViewProps.transform != newViewProps.transform ||
       oldViewProps.transformOrigin != newViewProps.transformOrigin) &&
      ![_propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN containsObject:@"transform"]) {
    auto newTransform = newViewProps.resolveTransform(_layoutMetrics);
    CATransform3D caTransform = RCTCATransform3DFromTransformMatrix(newTransform);
#if TARGET_OS_OSX // [macOS
    CGPoint anchorPoint = self.layer.anchorPoint;
    if (CGPointEqualToPoint(anchorPoint, CGPointZero) && !CATransform3DEqualToTransform(caTransform, CATransform3DIdentity)) {
      // https://developer.apple.com/documentation/quartzcore/calayer/1410817-anchorpoint
      // This compensates for the fact that layer.anchorPoint is {0, 0} instead of {0.5, 0.5} on macOS for some reason.
      CATransform3D originAdjust = CATransform3DTranslate(CATransform3DIdentity, self.frame.size.width / 2, self.frame.size.height / 2, 0);
      caTransform = CATransform3DConcat(CATransform3DConcat(CATransform3DInvert(originAdjust), caTransform), originAdjust);
    }
#endif // macOS]

    self.layer.transform = caTransform;
    // Enable edge antialiasing in rotation, skew, or perspective transforms
    self.layer.allowsEdgeAntialiasing = caTransform.m12 != 0.0f || caTransform.m21 != 0.0f || caTransform.m34 != 0.0f;
  }

  // `hitSlop`
  if (oldViewProps.hitSlop != newViewProps.hitSlop) {
    self.hitTestEdgeInsets = {
        -newViewProps.hitSlop.top,
        -newViewProps.hitSlop.left,
        -newViewProps.hitSlop.bottom,
        -newViewProps.hitSlop.right};
  }

  // `overflow`
  if (oldViewProps.getClipsContentToBounds() != newViewProps.getClipsContentToBounds()) {
    self.currentContainerView.clipsToBounds = newViewProps.getClipsContentToBounds();
    needsInvalidateLayer = YES;
  }

  // `border`
  if (oldViewProps.borderStyles != newViewProps.borderStyles || oldViewProps.borderRadii != newViewProps.borderRadii ||
      oldViewProps.borderColors != newViewProps.borderColors) {
    needsInvalidateLayer = YES;
  }

  // `nativeId`
  if (oldViewProps.nativeId != newViewProps.nativeId) {
    self.nativeId = RCTNSStringFromStringNilIfEmpty(newViewProps.nativeId);
  }

#if !TARGET_OS_OSX // [macOS]
  // `accessible`
  if (oldViewProps.accessible != newViewProps.accessible) {
    self.accessibilityElement.isAccessibilityElement = newViewProps.accessible;
  }

  // `accessibilityLabel`
  if (oldViewProps.accessibilityLabel != newViewProps.accessibilityLabel) {
    self.accessibilityElement.accessibilityLabel = RCTNSStringFromStringNilIfEmpty(newViewProps.accessibilityLabel);
  }

  // `accessibilityLanguage`
  if (oldViewProps.accessibilityLanguage != newViewProps.accessibilityLanguage) {
    self.accessibilityElement.accessibilityLanguage =
        RCTNSStringFromStringNilIfEmpty(newViewProps.accessibilityLanguage);
  }

  // `accessibilityHint`
  if (oldViewProps.accessibilityHint != newViewProps.accessibilityHint) {
    self.accessibilityElement.accessibilityHint = RCTNSStringFromStringNilIfEmpty(newViewProps.accessibilityHint);
  }

  // `accessibilityViewIsModal`
  if (oldViewProps.accessibilityViewIsModal != newViewProps.accessibilityViewIsModal) {
    self.accessibilityElement.accessibilityViewIsModal = newViewProps.accessibilityViewIsModal;
  }

  // `accessibilityElementsHidden`
  if (oldViewProps.accessibilityElementsHidden != newViewProps.accessibilityElementsHidden) {
    self.accessibilityElement.accessibilityElementsHidden = newViewProps.accessibilityElementsHidden;
  }

  // `accessibilityShowsLargeContentViewer`
  if (oldViewProps.accessibilityShowsLargeContentViewer != newViewProps.accessibilityShowsLargeContentViewer) {
    if (@available(iOS 13.0, *)) {
      if (newViewProps.accessibilityShowsLargeContentViewer) {
        self.showsLargeContentViewer = YES;
        UILargeContentViewerInteraction *interaction = [[UILargeContentViewerInteraction alloc] init];
        [self addInteraction:interaction];
      } else {
        self.showsLargeContentViewer = NO;
      }
    }
  }

  // `accessibilityLargeContentTitle`
  if (oldViewProps.accessibilityLargeContentTitle != newViewProps.accessibilityLargeContentTitle) {
    if (@available(iOS 13.0, *)) {
      self.largeContentTitle = RCTNSStringFromStringNilIfEmpty(newViewProps.accessibilityLargeContentTitle);
    }
  }

  // `accessibilityTraits`
  if (oldViewProps.accessibilityTraits != newViewProps.accessibilityTraits) {
    self.accessibilityElement.accessibilityTraits =
        RCTUIAccessibilityTraitsFromAccessibilityTraits(newViewProps.accessibilityTraits);
  }

  // `accessibilityState`
  if (oldViewProps.accessibilityState != newViewProps.accessibilityState) {
    self.accessibilityTraits &= ~(UIAccessibilityTraitNotEnabled | UIAccessibilityTraitSelected);
    const auto accessibilityState = newViewProps.accessibilityState.value_or(AccessibilityState{});
    if (accessibilityState.selected) {
      self.accessibilityTraits |= UIAccessibilityTraitSelected;
    }
    if (accessibilityState.disabled) {
      self.accessibilityTraits |= UIAccessibilityTraitNotEnabled;
    }
  }

  // `accessibilityIgnoresInvertColors`
  if (oldViewProps.accessibilityIgnoresInvertColors != newViewProps.accessibilityIgnoresInvertColors) {
    self.accessibilityIgnoresInvertColors = newViewProps.accessibilityIgnoresInvertColors;
  }

  // `accessibilityValue`
  if (oldViewProps.accessibilityValue != newViewProps.accessibilityValue) {
    if (newViewProps.accessibilityValue.text.has_value()) {
      self.accessibilityElement.accessibilityValue =
          RCTNSStringFromStringNilIfEmpty(newViewProps.accessibilityValue.text.value());
    } else if (
        newViewProps.accessibilityValue.now.has_value() && newViewProps.accessibilityValue.min.has_value() &&
        newViewProps.accessibilityValue.max.has_value()) {
      CGFloat val = (CGFloat)(newViewProps.accessibilityValue.now.value()) /
          (newViewProps.accessibilityValue.max.value() - newViewProps.accessibilityValue.min.value());
      self.accessibilityElement.accessibilityValue =
          [NSNumberFormatter localizedStringFromNumber:@(val) numberStyle:NSNumberFormatterPercentStyle];
      ;
    } else {
      self.accessibilityElement.accessibilityValue = nil;
    }
  }
#endif // [macOS]

  // `testId`
  if (oldViewProps.testId != newViewProps.testId) {
    SEL setAccessibilityIdentifierSelector = @selector(setAccessibilityIdentifier:);
    NSString *identifier = RCTNSStringFromString(newViewProps.testId);
    if ([self.accessibilityElement respondsToSelector:setAccessibilityIdentifierSelector]) {
      RCTPlatformView *accessibilityView = (RCTPlatformView *)self.accessibilityElement; // [macOS]
      accessibilityView.accessibilityIdentifier = identifier;
    } else {
      self.accessibilityIdentifier = identifier;
    }
  }

  // `filter`
  if (oldViewProps.filter != newViewProps.filter) {
    needsInvalidateLayer = YES;
  }

  // `mixBlendMode`
  if (oldViewProps.mixBlendMode != newViewProps.mixBlendMode) {
    switch (newViewProps.mixBlendMode) {
      case BlendMode::Multiply:
        self.layer.compositingFilter = @"multiplyBlendMode";
        break;
      case BlendMode::Screen:
        self.layer.compositingFilter = @"screenBlendMode";
        break;
      case BlendMode::Overlay:
        self.layer.compositingFilter = @"overlayBlendMode";
        break;
      case BlendMode::Darken:
        self.layer.compositingFilter = @"darkenBlendMode";
        break;
      case BlendMode::Lighten:
        self.layer.compositingFilter = @"lightenBlendMode";
        break;
      case BlendMode::ColorDodge:
        self.layer.compositingFilter = @"colorDodgeBlendMode";
        break;
      case BlendMode::ColorBurn:
        self.layer.compositingFilter = @"colorBurnBlendMode";
        break;
      case BlendMode::HardLight:
        self.layer.compositingFilter = @"hardLightBlendMode";
        break;
      case BlendMode::SoftLight:
        self.layer.compositingFilter = @"softLightBlendMode";
        break;
      case BlendMode::Difference:
        self.layer.compositingFilter = @"differenceBlendMode";
        break;
      case BlendMode::Exclusion:
        self.layer.compositingFilter = @"exclusionBlendMode";
        break;
      case BlendMode::Hue:
        self.layer.compositingFilter = @"hueBlendMode";
        break;
      case BlendMode::Saturation:
        self.layer.compositingFilter = @"saturationBlendMode";
        break;
      case BlendMode::Color:
        self.layer.compositingFilter = @"colorBlendMode";
        break;
      case BlendMode::Luminosity:
        self.layer.compositingFilter = @"luminosityBlendMode";
        break;
      case BlendMode::Normal:
        self.layer.compositingFilter = nil;
        break;
    }
  }

  // `linearGradient`
  if (oldViewProps.backgroundImage != newViewProps.backgroundImage) {
    needsInvalidateLayer = YES;
  }

  // `boxShadow`
  if (oldViewProps.boxShadow != newViewProps.boxShadow) {
    needsInvalidateLayer = YES;
  }

#if TARGET_OS_OSX // [macOS
  // `focusable`
  if (oldViewProps.focusable != newViewProps.focusable) {
    self.focusable = (bool)newViewProps.focusable;
  }

  // `enableFocusRing`
  if (oldViewProps.enableFocusRing != newViewProps.enableFocusRing) {
    self.enableFocusRing = (bool)newViewProps.enableFocusRing;
  }

  // `draggedTypes`
  if (oldViewProps.draggedTypes != newViewProps.draggedTypes) {
    if (!oldViewProps.draggedTypes.empty()) {
      [self unregisterDraggedTypes];
    }

    if (!newViewProps.draggedTypes.empty()) {
      NSMutableArray<NSPasteboardType> *pasteboardTypes = [NSMutableArray new];
      for (const auto &draggedType : newViewProps.draggedTypes) {
        if (draggedType == "fileUrl") {
          [pasteboardTypes addObject:NSFilenamesPboardType];
        } else if (draggedType == "image") {
          [pasteboardTypes addObject:NSPasteboardTypePNG];
          [pasteboardTypes addObject:NSPasteboardTypeTIFF];
        } else if (draggedType == "string") {
          [pasteboardTypes addObject:NSPasteboardTypeString];
        }
      }
      [self registerForDraggedTypes:pasteboardTypes];
    }
  }

  // `tooltip`
  if (oldViewProps.tooltip != newViewProps.tooltip) {
    if (newViewProps.tooltip.has_value()) {
      self.toolTip = RCTNSStringFromStringNilIfEmpty(newViewProps.tooltip.value());
    } else {
      self.toolTip = nil;
    }
  }
#endif // macOS]

  _needsInvalidateLayer = _needsInvalidateLayer || needsInvalidateLayer;

  _props = std::static_pointer_cast<const ViewProps>(props);
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter
{
  assert(std::dynamic_pointer_cast<const ViewEventEmitter>(eventEmitter));
  _eventEmitter = std::static_pointer_cast<const ViewEventEmitter>(eventEmitter);
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  // Using stored `_layoutMetrics` as `oldLayoutMetrics` here to avoid
  // re-applying individual sub-values which weren't changed.
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:_layoutMetrics];

  _layoutMetrics = layoutMetrics;
  _needsInvalidateLayer = YES;

  _borderLayer.frame = self.layer.bounds;

  if (_contentView) {
    _contentView.frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());
  }

  if (_containerView) {
    _containerView.frame = CGRectMake(0, 0, self.layer.bounds.size.width, self.layer.bounds.size.height);
  }

  if (_backgroundColorLayer) {
    _backgroundColorLayer.frame = CGRectMake(0, 0, self.layer.bounds.size.width, self.layer.bounds.size.height);
  }

  if ((_props->transformOrigin.isSet() || _props->transform.operations.size() > 0) &&
      layoutMetrics.frame.size != oldLayoutMetrics.frame.size) {
    auto newTransform = _props->resolveTransform(layoutMetrics);
    self.layer.transform = RCTCATransform3DFromTransformMatrix(newTransform);
  }
}

- (BOOL)isJSResponder
{
  return _isJSResponder;
}

- (void)setIsJSResponder:(BOOL)isJSResponder
{
  _isJSResponder = isJSResponder;
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask
{
  [super finalizeUpdates:updateMask];
  _useCustomContainerView = [self styleWouldClipOverflowInk];

  [self updateTrackingAreas];
  [self updateClipViewBoundsObserverIfNeeded];

  if (!_needsInvalidateLayer) {
    return;
  }

  _needsInvalidateLayer = NO;
  [self invalidateLayer];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];

  // If view was managed by animated, its props need to align with UIView's properties.
  const auto &props = static_cast<const ViewProps &>(*_props);
  if ([_propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN containsObject:@"transform"]) {
    self.layer.transform = RCTCATransform3DFromTransformMatrix(props.transform);
  }
  if ([_propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN containsObject:@"opacity"]) {
    self.layer.opacity = (float)props.opacity;
  }

  _propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN = nil;
  _eventEmitter.reset();
  _isJSResponder = NO;
  _removeClippedSubviews = NO;
  _reactSubviews = [NSMutableArray new];
}

- (void)setPropKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN:(NSSet<NSString *> *_Nullable)props
{
  _propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN = props;
}

- (NSSet<NSString *> *_Nullable)propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN
{
  return _propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN;
}

- (RCTUIView *)betterHitTest:(CGPoint)point withEvent:(UIEvent *)event // [macOS]
{
  // This is a classic textbook implementation of `hitTest:` with a couple of improvements:
  //   * It does not stop algorithm if some touch is outside the view
  //     which does not have `clipToBounds` enabled.
  //   * Taking `layer.zIndex` field into an account is not required because
  //     lists of `ShadowView`s are already sorted based on `zIndex` prop.

#if !TARGET_OS_OSX // [macOS]
  if (!self.userInteractionEnabled || self.hidden || self.alpha < 0.01) {
#else // [macOS
  if (!self.userInteractionEnabled || self.hidden) {
#endif // macOS]
    return nil;
  }

  BOOL isPointInside = [self pointInside:point withEvent:event];

  BOOL clipsToBounds = false;

  clipsToBounds = clipsToBounds || _layoutMetrics.overflowInset == EdgeInsets{};

  if (clipsToBounds && !isPointInside) {
    return nil;
  }

  for (RCTUIView *subview in [self.subviews reverseObjectEnumerator]) { // [macOS]
#if !TARGET_OS_OSX // [macOS]
    RCTUIView *hitView = [subview hitTest:[subview convertPoint:point fromView:self] withEvent:event]; // [macOS]
#else // [macOS
    // Native macOS views require the point to be in the super view coordinate space for hit testing.
    CGPoint hitTestPoint = point;
    // Fabric components use the target view coordinate space for hit testing
    if ([subview isKindOfClass:[RCTViewComponentView class]]) {
      hitTestPoint = [subview convertPoint:point fromView:self];
    }
    RCTUIView *hitView = [subview hitTest:hitTestPoint withEvent:event]; // [macOS]
#endif // macOS]
    if (hitView) {
      return hitView;
    }
  }

  return isPointInside ? self : nil;
}

- (RCTUIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event // [macOS]
{
  switch (_props->pointerEvents) {
    case PointerEventsMode::Auto:
      return [self betterHitTest:point withEvent:event];
    case PointerEventsMode::None:
      return nil;
    case PointerEventsMode::BoxOnly:
      return [self pointInside:point withEvent:event] ? self : nil;
    case PointerEventsMode::BoxNone:
      RCTUIView *view = [self betterHitTest:point withEvent:event]; // [macOS]
      return view != self ? view : nil;
  }
}

static RCTCornerRadii RCTCornerRadiiFromBorderRadii(BorderRadii borderRadii)
{
  return RCTCornerRadii{
      .topLeftHorizontal = (CGFloat)borderRadii.topLeft.horizontal,
      .topLeftVertical = (CGFloat)borderRadii.topLeft.vertical,
      .topRightHorizontal = (CGFloat)borderRadii.topRight.horizontal,
      .topRightVertical = (CGFloat)borderRadii.topRight.vertical,
      .bottomLeftHorizontal = (CGFloat)borderRadii.bottomLeft.horizontal,
      .bottomLeftVertical = (CGFloat)borderRadii.bottomLeft.vertical,
      .bottomRightHorizontal = (CGFloat)borderRadii.bottomRight.horizontal,
      .bottomRightVertical = (CGFloat)borderRadii.bottomRight.vertical};
}

static RCTBorderColors RCTCreateRCTBorderColorsFromBorderColors(BorderColors borderColors)
{
  return RCTBorderColors{
      .top = RCTUIColorFromSharedColor(borderColors.top),
      .left = RCTUIColorFromSharedColor(borderColors.left),
      .bottom = RCTUIColorFromSharedColor(borderColors.bottom),
      .right = RCTUIColorFromSharedColor(borderColors.right)};
}

static CALayerCornerCurve CornerCurveFromBorderCurve(BorderCurve borderCurve)
{
  // The constants are available only starting from iOS 13
  // CALayerCornerCurve is a typealias on NSString *
  switch (borderCurve) {
    case BorderCurve::Continuous:
      return @"continuous"; // kCACornerCurveContinuous;
    case BorderCurve::Circular:
      return @"circular"; // kCACornerCurveCircular;
  }
}

static RCTBorderStyle RCTBorderStyleFromBorderStyle(BorderStyle borderStyle)
{
  switch (borderStyle) {
    case BorderStyle::Solid:
      return RCTBorderStyleSolid;
    case BorderStyle::Dotted:
      return RCTBorderStyleDotted;
    case BorderStyle::Dashed:
      return RCTBorderStyleDashed;
  }
}

#if TARGET_OS_OSX // [macOS
static RCTCursor RCTCursorFromCursor(Cursor cursor)
{
  switch (cursor) {
    case Cursor::Auto:
      return RCTCursorAuto;
    case Cursor::Alias:
      return RCTCursorAlias;
    case Cursor::AllScroll:
      return RCTCursorAllScroll;
    case Cursor::Cell:
      return RCTCursorCell;
    case Cursor::ColResize:
      return RCTCursorColResize;
    case Cursor::ContextMenu:
      return RCTCursorContextMenu;
    case Cursor::Copy:
      return RCTCursorCopy;
    case Cursor::Crosshair:
      return RCTCursorCrosshair;
    case Cursor::Default:
      return RCTCursorDefault;
    case Cursor::EResize:
      return RCTCursorEResize;
    case Cursor::EWResize:
      return RCTCursorEWResize;
    case Cursor::Grab:
      return RCTCursorGrab;
    case Cursor::Grabbing:
      return RCTCursorGrabbing;
    case Cursor::Help:
      return RCTCursorHelp;
    case Cursor::Move:
      return RCTCursorMove;
    case Cursor::NEResize:
      return RCTCursorNEResize;
    case Cursor::NESWResize:
      return RCTCursorNESWResize;
    case Cursor::NResize:
      return RCTCursorNResize;
    case Cursor::NSResize:
      return RCTCursorNSResize;
    case Cursor::NWResize:
      return RCTCursorNWResize;
    case Cursor::NWSEResize:
      return RCTCursorNWSEResize;
    case Cursor::NoDrop:
      return RCTCursorNoDrop;
    case Cursor::None:
      return RCTCursorNone;
    case Cursor::NotAllowed:
      return RCTCursorNotAllowed;
    case Cursor::Pointer:
      return RCTCursorPointer;
    case Cursor::Progress:
      return RCTCursorProgress;
    case Cursor::RowResize:
      return RCTCursorRowResize;
    case Cursor::SResize:
      return RCTCursorSResize;
    case Cursor::SEResize:
      return RCTCursorSEResize;
    case Cursor::SWResize:
      return RCTCursorSWResize;
    case Cursor::Text:
      return RCTCursorText;
    case Cursor::Url:
      return RCTCursorUrl;
    case Cursor::WResize:
      return RCTCursorWResize;
    case Cursor::Wait:
      return RCTCursorWait;
    case Cursor::ZoomIn:
      return RCTCursorZoomIn;
    case Cursor::ZoomOut:
      return RCTCursorZoomOut;
  }
}
#endif // macOS]

- (BOOL)styleWouldClipOverflowInk
{
  const auto borderMetrics = _props->resolveBorderMetrics(_layoutMetrics);
  BOOL nonZeroBorderWidth = !(borderMetrics.borderWidths.isUniform() && borderMetrics.borderWidths.left == 0);
  BOOL clipToPaddingBox = ReactNativeFeatureFlags::enableIOSViewClipToPaddingBox();
  return _props->getClipsContentToBounds() && (!_props->boxShadow.empty() || (clipToPaddingBox && nonZeroBorderWidth));
}

// This UIView is the UIView that holds all subviews. It is sometimes not self
// because we want to render "overflow ink" that extends beyond the bounds of
// the view and is not affected by clipping.
- (RCTUIView *)currentContainerView // [macOS]
{
  if (_useCustomContainerView) {
    if (!_containerView) {
      _containerView = [[RCTPlatformView alloc] initWithFrame:CGRectMake(0, 0, self.frame.size.width, self.frame.size.height)]; // [macOS]
      for (RCTPlatformView *subview in self.subviews) { // [macOS]
        [_containerView addSubview:subview];
      }
      _containerView.clipsToBounds = self.clipsToBounds;
      self.clipsToBounds = NO;
      _containerView.layer.mask = self.layer.mask;
      self.layer.mask = nil;
      [self addSubview:_containerView];
    }

    return _containerView;
  } else {
    if (_containerView) {
      for (RCTPlatformView *subview in _containerView.subviews) { // [macOS]
        [self addSubview:subview];
      }
      self.clipsToBounds = _containerView.clipsToBounds;
      self.layer.mask = _containerView.layer.mask;
      [_containerView removeFromSuperview];
      _containerView = nil;
    }

    return self;
  }
}

#if TARGET_OS_OSX // [macOS
- (void)setClipsToBounds:(BOOL)clipsToBounds
{
  // Set the property managed by RCTUIView
  super.clipsToBounds = clipsToBounds;

  // Bounds clipping must also be configured on the view's layer
  self.layer.masksToBounds = clipsToBounds;
}
#endif // macOS]

- (void)invalidateLayer
{
  CALayer *layer = self.layer;

  if (CGSizeEqualToSize(layer.bounds.size, CGSizeZero)) {
    return;
  }

#if TARGET_OS_OSX // [macOS
  // clipsToBounds is stubbed out on macOS because it's not part of NSView
  layer.masksToBounds = self.clipsToBounds;
#endif // macOS]

  const auto borderMetrics = _props->resolveBorderMetrics(_layoutMetrics);

  // Stage 1. Shadow Path
  BOOL const layerHasShadow = layer.shadowOpacity > 0 && CGColorGetAlpha(layer.shadowColor) > 0;
  if (layerHasShadow) {
    if (CGColorGetAlpha(_backgroundColor.CGColor) > 0.999) {
      // If view has a solid background color, calculate shadow path from border.
      const RCTCornerInsets cornerInsets =
          RCTGetCornerInsets(RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero);
      CGPathRef shadowPath = RCTPathCreateWithRoundedRect(self.bounds, cornerInsets, nil);
      layer.shadowPath = shadowPath;
      CGPathRelease(shadowPath);
    } else {
      // Can't accurately calculate box shadow, so fall back to pixel-based shadow.
      layer.shadowPath = nil;
    }
  } else {
    layer.shadowPath = nil;
  }

#if !TARGET_OS_OSX // [visionOS]
  // Stage 1.5. Cursor / Hover Effects
  if (@available(iOS 17.0, *)) {
    UIHoverStyle *hoverStyle = nil;
    if (_props->cursor == Cursor::Pointer) {
      const RCTCornerInsets cornerInsets =
          RCTGetCornerInsets(RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero);
#if TARGET_OS_IOS
      // Due to an Apple bug, it seems on iOS, UIShapes made with `[UIShape shapeWithBezierPath:]`
      // evaluate their shape on the superviews' coordinate space. This leads to the hover shape
      // rendering incorrectly on iOS, iOS apps in compatibility mode on visionOS, but not on visionOS.
      // To work around this, for iOS, we can calculate the border path based on `view.frame` (the
      // superview's coordinate space) instead of view.bounds.
      CGPathRef borderPath = RCTPathCreateWithRoundedRect(self.frame, cornerInsets, NULL);
#else // TARGET_OS_VISION
      CGPathRef borderPath = RCTPathCreateWithRoundedRect(self.bounds, cornerInsets, NULL);
#endif
      UIBezierPath *bezierPath = [UIBezierPath bezierPathWithCGPath:borderPath];
      CGPathRelease(borderPath);
      UIShape *shape = [UIShape shapeWithBezierPath:bezierPath];

      hoverStyle = [UIHoverStyle styleWithEffect:[UIHoverAutomaticEffect effect] shape:shape];
    }
    [self setHoverStyle:hoverStyle];
  }
#endif // [visionOS]

#if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && __IPHONE_OS_VERSION_MAX_ALLOWED >= 170000 /* __IPHONE_17_0 */
  // Stage 1.5. Cursor / Hover Effects
  if (@available(iOS 17.0, *)) {
    UIHoverStyle *hoverStyle = nil;
    if (_props->cursor == Cursor::Pointer) {
      const RCTCornerInsets cornerInsets =
          RCTGetCornerInsets(RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero);
#if TARGET_OS_IOS
      // Due to an Apple bug, it seems on iOS, UIShapes made with `[UIShape shapeWithBezierPath:]`
      // evaluate their shape on the superviews' coordinate space. This leads to the hover shape
      // rendering incorrectly on iOS, iOS apps in compatibility mode on visionOS, but not on visionOS.
      // To work around this, for iOS, we can calculate the border path based on `view.frame` (the
      // superview's coordinate space) instead of view.bounds.
      CGPathRef borderPath = RCTPathCreateWithRoundedRect(self.frame, cornerInsets, NULL);
#else // TARGET_OS_VISION
      CGPathRef borderPath = RCTPathCreateWithRoundedRect(self.bounds, cornerInsets, NULL);
#endif
      UIBezierPath *bezierPath = [UIBezierPath bezierPathWithCGPath:borderPath];
      CGPathRelease(borderPath);
      UIShape *shape = [UIShape shapeWithBezierPath:bezierPath];

      hoverStyle = [UIHoverStyle styleWithEffect:[UIHoverAutomaticEffect effect] shape:shape];
    }
    [self setHoverStyle:hoverStyle];
  }
#endif
  const bool useCoreAnimationBorderRendering =
      borderMetrics.borderColors.isUniform() && borderMetrics.borderWidths.isUniform() &&
      borderMetrics.borderStyles.isUniform() && borderMetrics.borderRadii.isUniform() &&
      (
          // iOS draws borders in front of the content whereas CSS draws them behind
          // the content. For this reason, only use iOS border drawing when clipping
          // or when the border is hidden.
          borderMetrics.borderWidths.left == 0 || self.currentContainerView.clipsToBounds ||
          (colorComponentsFromColor(borderMetrics.borderColors.left).alpha == 0 &&
           (*borderMetrics.borderColors.left).getUIColor() != nullptr));

#if !TARGET_OS_OSX // [macOS]
  RCTUIColor *backgroundColor = [_backgroundColor resolvedColorWithTraitCollection:self.traitCollection];
#else // [macOS
  RCTUIColor *backgroundColor = _backgroundColor;
#endif // macOS]
  // The reason we sometimes do not set self.layer's backgroundColor is because
  // we want to support non-uniform border radii, which apple does not natively
  // support. To get this behavior we need to create a CGPath in the shape that
  // we want. If we mask self.layer to this path, we would be clipping subviews
  // which we may not want to do. The generalized solution in this case is just
  // create a new layer
  if (useCoreAnimationBorderRendering) {
    [_backgroundColorLayer removeFromSuperlayer];
    _backgroundColorLayer = nil;
    layer.backgroundColor = backgroundColor.CGColor;
  } else {
    layer.backgroundColor = nil;
    if (!_backgroundColorLayer) {
      _backgroundColorLayer = [CALayer layer];
      _backgroundColorLayer.frame = CGRectMake(0, 0, self.frame.size.width, self.frame.size.height);
      _backgroundColorLayer.zPosition = BACKGROUND_COLOR_ZPOSITION;
      [self.layer addSublayer:_backgroundColorLayer];
    }

    _backgroundColorLayer.backgroundColor = backgroundColor.CGColor;
    if (borderMetrics.borderRadii.isUniform()) {
      _backgroundColorLayer.mask = nil;
      _backgroundColorLayer.cornerRadius = borderMetrics.borderRadii.topLeft.horizontal;
      _backgroundColorLayer.cornerCurve = CornerCurveFromBorderCurve(borderMetrics.borderCurves.topLeft);
    } else {
      CAShapeLayer *maskLayer =
          [self createMaskLayer:self.bounds
                   cornerInsets:RCTGetCornerInsets(
                                    RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero)];
      _backgroundColorLayer.mask = maskLayer;
      _backgroundColorLayer.cornerRadius = 0;
    }
  }

  // borders
  if (useCoreAnimationBorderRendering) {
    [_borderLayer removeFromSuperlayer];
    _borderLayer = nil;

    layer.borderWidth = (CGFloat)borderMetrics.borderWidths.left;
    RCTUIColor *borderColor = RCTUIColorFromSharedColor(borderMetrics.borderColors.left);
    layer.borderColor = borderColor.CGColor;

#if TARGET_OS_OSX // macOS]
    // Setting the corner radius on view's layer enables back clipping to bounds. To
    // avoid getting the native view out of sync with the component's props, we make
    // sure that clipsToBounds stays unchanged after setting the corner radius.
    BOOL clipsToBounds = self.clipsToBounds;
#endif
    layer.cornerRadius = (CGFloat)borderMetrics.borderRadii.topLeft.horizontal;
#if TARGET_OS_OSX // macOS]
    self.clipsToBounds = clipsToBounds;
#endif

    layer.cornerCurve = CornerCurveFromBorderCurve(borderMetrics.borderCurves.topLeft);

    layer.backgroundColor = backgroundColor.CGColor;
  } else {
    if (!_borderLayer) {
      CALayer *borderLayer = [CALayer new];
      borderLayer.zPosition = BACKGROUND_COLOR_ZPOSITION + 1;
      borderLayer.frame = layer.bounds;
      borderLayer.magnificationFilter = kCAFilterNearest;
      [layer addSublayer:borderLayer];
      _borderLayer = borderLayer;
    }

    layer.borderWidth = 0;
    layer.borderColor = nil;
    layer.cornerRadius = 0;

    RCTBorderColors borderColors = RCTCreateRCTBorderColorsFromBorderColors(borderMetrics.borderColors);

    UIImage *image = RCTGetBorderImage(
        RCTBorderStyleFromBorderStyle(borderMetrics.borderStyles.left),
        layer.bounds.size,
        RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii),
        RCTUIEdgeInsetsFromEdgeInsets(borderMetrics.borderWidths),
        borderColors,
        backgroundColor,
        self.clipsToBounds);


    if (image == nil) {
      _borderLayer.contents = nil;
    } else {
      CGSize imageSize = image.size;
      UIEdgeInsets imageCapInsets = image.capInsets;
      CGRect contentsCenter = CGRect{
          CGPoint{imageCapInsets.left / imageSize.width, imageCapInsets.top / imageSize.height},
          CGSize{(CGFloat)1.0 / imageSize.width, (CGFloat)1.0 / imageSize.height}};

#if !TARGET_OS_OSX // [macOS]
        _borderLayer.contents = (id)image.CGImage;
        _borderLayer.contentsScale = image.scale;
#else // [macOS
        CGFloat scaleFactor = _layoutMetrics.pointScaleFactor;
        _borderLayer.contents = [image layerContentsForContentsScale:scaleFactor];
        _borderLayer.contentsScale = scaleFactor;
#endif // macOS]

      BOOL isResizable = !UIEdgeInsetsEqualToEdgeInsets(image.capInsets, UIEdgeInsetsZero);
      if (isResizable) {
        _borderLayer.contentsCenter = contentsCenter;
      } else {
        _borderLayer.contentsCenter = CGRect{CGPoint{0.0, 0.0}, CGSize{1.0, 1.0}};
      }
    }

    // If mutations are applied inside of Animation block, it may cause _borderLayer to be animated.
    // To stop that, imperatively remove all animations from _borderLayer.
    [_borderLayer removeAllAnimations];
  }

  // filter
  [_filterLayer removeFromSuperlayer];
  _filterLayer = nil;
  self.layer.opacity = (float)_props->opacity;
  if (!_props->filter.empty()) {
    float multiplicativeBrightness = 1;
    for (const auto &primitive : _props->filter) {
      if (std::holds_alternative<Float>(primitive.parameters)) {
        if (primitive.type == FilterType::Brightness) {
          multiplicativeBrightness *= std::get<Float>(primitive.parameters);
        } else if (primitive.type == FilterType::Opacity) {
          self.layer.opacity *= std::get<Float>(primitive.parameters);
        }
      }
    }

    _filterLayer = [CALayer layer];
    _filterLayer.frame = CGRectMake(0, 0, layer.frame.size.width, layer.frame.size.height);
    _filterLayer.compositingFilter = @"multiplyBlendMode";
    _filterLayer.backgroundColor = [RCTUIColor colorWithRed:multiplicativeBrightness // [macOS]
                                                      green:multiplicativeBrightness
                                                       blue:multiplicativeBrightness
                                                      alpha:self.layer.opacity]
                                       .CGColor;
    if (borderMetrics.borderRadii.isUniform()) {
      _filterLayer.cornerRadius = borderMetrics.borderRadii.topLeft.horizontal;
    } else {
      RCTCornerInsets cornerInsets =
          RCTGetCornerInsets(RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero);
      _filterLayer.mask = [self createMaskLayer:self.bounds cornerInsets:cornerInsets];
    }
    // So that this layer is always above any potential sublayers this view may
    // add
    _filterLayer.zPosition = CGFLOAT_MAX;
    [self.layer addSublayer:_filterLayer];
  }

  // background image
  [self clearExistingBackgroundImageLayers];
  if (!_props->backgroundImage.empty()) {
    // iterate in reverse to match CSS specification
    for (const auto &backgroundImage : std::ranges::reverse_view(_props->backgroundImage)) {
      if (std::holds_alternative<LinearGradient>(backgroundImage)) {
        const auto &linearGradient = std::get<LinearGradient>(backgroundImage);
        CALayer *backgroundImageLayer = [RCTLinearGradient gradientLayerWithSize:self.layer.bounds.size
                                                                        gradient:linearGradient];
        backgroundImageLayer.frame = layer.bounds;
        backgroundImageLayer.masksToBounds = YES;
        // To make border radius work with gradient layers
        if (borderMetrics.borderRadii.isUniform()) {
          backgroundImageLayer.cornerRadius = layer.cornerRadius;
          backgroundImageLayer.cornerCurve = layer.cornerCurve;
          backgroundImageLayer.mask = nil;
        } else {
          CAShapeLayer *maskLayer =
              [self createMaskLayer:self.bounds
                       cornerInsets:RCTGetCornerInsets(
                                        RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero)];
          backgroundImageLayer.mask = maskLayer;
          backgroundImageLayer.cornerRadius = 0;
        }

        backgroundImageLayer.zPosition = BACKGROUND_COLOR_ZPOSITION;

        [self.layer addSublayer:backgroundImageLayer];
        [_backgroundImageLayers addObject:backgroundImageLayer];
      }
    }
  }

  // box shadow
  [_boxShadowLayer removeFromSuperlayer];
  _boxShadowLayer = nil;
  if (!_props->boxShadow.empty()) {
    _boxShadowLayer = [CALayer layer];
    [self.layer addSublayer:_boxShadowLayer];
    _boxShadowLayer.zPosition = _borderLayer.zPosition;
    _boxShadowLayer.frame = RCTGetBoundingRect(_props->boxShadow, self.layer.frame.size);

    UIImage *boxShadowImage = RCTGetBoxShadowImage(
        _props->boxShadow,
        RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii),
        RCTUIEdgeInsetsFromEdgeInsets(borderMetrics.borderWidths),
        layer);

#if !TARGET_OS_OSX // [macOS]
    _boxShadowLayer.contents = (id)boxShadowImage.CGImage;
#else // [macOS
    _boxShadowLayer.contents = (__bridge id)UIImageGetCGImageRef(boxShadowImage);
#endif // macOS]
  }

  // clipping
  if (false) {
    BOOL clipToPaddingBox = false;
    if (clipToPaddingBox) {
      CALayer *maskLayer = [self createMaskLayer:RCTCGRectFromRect(_layoutMetrics.getPaddingFrame())
                                    cornerInsets:RCTGetCornerInsets(
                                                     RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii),
                                                     RCTUIEdgeInsetsFromEdgeInsets(borderMetrics.borderWidths))];
      self.currentContainerView.layer.mask = maskLayer;
    } else {
      if (borderMetrics.borderRadii.isUniform()) {
        self.currentContainerView.layer.cornerRadius = borderMetrics.borderRadii.topLeft.horizontal;
      } else {
        CALayer *maskLayer =
            [self createMaskLayer:self.bounds
                     cornerInsets:RCTGetCornerInsets(
                                      RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii), UIEdgeInsetsZero)];
        self.currentContainerView.layer.mask = maskLayer;
      }

      for (RCTPlatformView *subview in self.currentContainerView.subviews) { // [macOS]
        if ([subview isKindOfClass:[RCTUIImageView class]]) { // [macOS]
          RCTCornerInsets cornerInsets = RCTGetCornerInsets(
              RCTCornerRadiiFromBorderRadii(borderMetrics.borderRadii),
              RCTUIEdgeInsetsFromEdgeInsets(borderMetrics.borderWidths));

          // If the subview is an image view, we have to apply the mask directly to the image view's layer,
          // otherwise the image might overflow with the border radius.
          subview.layer.mask = [self createMaskLayer:subview.bounds cornerInsets:cornerInsets];
        }
      }
    }
  } else {
    self.currentContainerView.layer.mask = nil;
  }
}

- (CAShapeLayer *)createMaskLayer:(CGRect)bounds cornerInsets:(RCTCornerInsets)cornerInsets
{
  CGPathRef path = RCTPathCreateWithRoundedRect(bounds, cornerInsets, nil);
  CAShapeLayer *maskLayer = [CAShapeLayer layer];
  maskLayer.path = path;
  CGPathRelease(path);
  return maskLayer;
}

- (void)clearExistingBackgroundImageLayers
{
  if (_backgroundImageLayers == nil) {
    _backgroundImageLayers = [NSMutableArray new];
    return;
  }
  for (CALayer *backgroundImageLayer in _backgroundImageLayers) {
    [backgroundImageLayer removeFromSuperlayer];
  }
  [_backgroundImageLayers removeAllObjects];
}

#if TARGET_OS_OSX // [macOS
#pragma mark - Native Commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTComponentViewHandleCommand(self, commandName, args);
}

- (void)focus
{
  NSWindow *window = self.window;
  if (window && self.focusable) {
    [window makeFirstResponder:self];
  }
}

- (void)blur
{
  NSWindow *window = self.window;
  if (window && window.firstResponder == self) {
    // Calling makeFirstResponder with nil will call resignFirstResponder and make the window the first responder
    [window makeFirstResponder:nil];
  }
}
#endif // macOS]


#pragma mark - Accessibility

- (NSObject *)accessibilityElement
{
  return self;
}

static NSString *RCTRecursiveAccessibilityLabel(RCTUIView *view) // [macOS]
{
  NSMutableString *result = [NSMutableString stringWithString:@""];
  for (RCTUIView *subview in view.subviews) { // [macOS]
    NSString *label = subview.accessibilityLabel;
    if (!label) {
      label = RCTRecursiveAccessibilityLabel(subview);
    }
    if (label && label.length > 0) {
      if (result.length > 0) {
        [result appendString:@" "];
      }
      [result appendString:label];
    }
  }
  return result;
}

- (NSString *)accessibilityLabel
{
  NSString *label = super.accessibilityLabel;
  if (label) {
    return label;
  }

  return RCTRecursiveAccessibilityLabel(self.currentContainerView);
}

- (BOOL)isAccessibilityElement
{
  if (self.contentView != nil) {
    return self.contentView.isAccessibilityElement;
  }

  return [super isAccessibilityElement];
}

- (NSString *)accessibilityValue
{
  const auto &props = static_cast<const ViewProps &>(*_props);
  const auto accessibilityState = props.accessibilityState.value_or(AccessibilityState{});

  // Handle Switch.
#if !TARGET_OS_OSX // [macOS]
  if ((self.accessibilityTraits & AccessibilityTraitSwitch) == AccessibilityTraitSwitch) {
    if (accessibilityState.checked == AccessibilityState::Checked) {
      return @"1";
    } else if (accessibilityState.checked == AccessibilityState::Unchecked) {
      return @"0";
    }
  }
#endif // [macOS]

  NSMutableArray *valueComponents = [NSMutableArray new];
  NSString *roleString = (props.role != Role::None) ? [NSString stringWithUTF8String:toString(props.role).c_str()]
                                                    : [NSString stringWithUTF8String:props.accessibilityRole.c_str()];

  // In iOS, checkbox and radio buttons aren't recognized as traits. However,
  // because our apps use checkbox and radio buttons often, we should announce
  // these to screenreader users.  (They should already be familiar with them
  // from using web).
  if ([roleString isEqualToString:@"checkbox"]) {
    [valueComponents addObject:RCTLocalizedString("checkbox", "checkable interactive control")];
  }

  if ([roleString isEqualToString:@"radio"]) {
    [valueComponents
        addObject:
            RCTLocalizedString(
                "radio button",
                "a checkable input that when associated with other radio buttons, only one of which can be checked at a time")];
  }

  // Handle states which haven't already been handled.
  if (accessibilityState.checked == AccessibilityState::Checked) {
    [valueComponents
        addObject:RCTLocalizedString("checked", "a checkbox, radio button, or other widget which is checked")];
  }
  if (accessibilityState.checked == AccessibilityState::Unchecked) {
    [valueComponents
        addObject:RCTLocalizedString("unchecked", "a checkbox, radio button, or other widget which is unchecked")];
  }
  if (accessibilityState.checked == AccessibilityState::Mixed) {
    [valueComponents
        addObject:RCTLocalizedString(
                      "mixed", "a checkbox, radio button, or other widget which is both checked and unchecked")];
  }
  if (accessibilityState.expanded.value_or(false)) {
    [valueComponents
        addObject:RCTLocalizedString("expanded", "a menu, dialog, accordian panel, or other widget which is expanded")];
  }

  if (accessibilityState.busy) {
    [valueComponents addObject:RCTLocalizedString("busy", "an element currently being updated or modified")];
  }

  // Using super.accessibilityValue:
  // 1. to access the value that is set to accessibilityValue in updateProps
  // 2. can't access from self.accessibilityElement because it resolves to self
  if (super.accessibilityValue) {
    [valueComponents addObject:super.accessibilityValue];
  }

  if (valueComponents.count > 0) {
    return [valueComponents componentsJoinedByString:@", "];
  }

  return nil;
}

#pragma mark - Accessibility Events

- (BOOL)shouldGroupAccessibilityChildren
{
  return YES;
}

- (NSArray<UIAccessibilityCustomAction *> *)accessibilityCustomActions
{
  const auto &accessibilityActions = _props->accessibilityActions;

  if (accessibilityActions.empty()) {
    return nil;
  }

  NSMutableArray<UIAccessibilityCustomAction *> *customActions = [NSMutableArray array];
  for (const auto &accessibilityAction : accessibilityActions) {
    [customActions
        addObject:[[UIAccessibilityCustomAction alloc] initWithName:RCTNSStringFromString(accessibilityAction.name)
                                                             target:self
                                                           selector:@selector(didActivateAccessibilityCustomAction:)]];
  }

  return [customActions copy];
}

- (BOOL)accessibilityActivate
{
  if (_eventEmitter && _props->onAccessibilityTap) {
    _eventEmitter->onAccessibilityTap();
    return YES;
  } else {
    return NO;
  }
}

- (BOOL)accessibilityPerformMagicTap
{
  if (_eventEmitter && _props->onAccessibilityMagicTap) {
    _eventEmitter->onAccessibilityMagicTap();
    return YES;
  } else {
    return NO;
  }
}

- (BOOL)accessibilityPerformEscape
{
  if (_eventEmitter && _props->onAccessibilityEscape) {
    _eventEmitter->onAccessibilityEscape();
    return YES;
  } else {
    return NO;
  }
}

- (BOOL)didActivateAccessibilityCustomAction:(UIAccessibilityCustomAction *)action
{
  if (_eventEmitter && _props->onAccessibilityAction) {
    _eventEmitter->onAccessibilityAction(RCTStringFromNSString(action.name));
    return YES;
  } else {
    return NO;
  }
}


#if TARGET_OS_OSX // [macOS

#pragma mark - Focus Events

- (BOOL)becomeFirstResponder
{
  if (![super becomeFirstResponder]) {
    return NO;
  }

  if (_eventEmitter) {
    _eventEmitter->onFocus();
  }

  return YES;
}

-  (BOOL)resignFirstResponder
{
  if (![super resignFirstResponder]) {
    return NO;
  }

  if (_eventEmitter) {
    _eventEmitter->onBlur();
  }

  return YES;
}


#pragma mark - Keyboard Events

- (BOOL)handleKeyboardEvent:(NSEvent *)event {
  BOOL keyDown = event.type == NSEventTypeKeyDown;
  BOOL hasHandler = keyDown ? _props->hostPlatformEvents[HostPlatformViewEvents::Offset::KeyDown]
                            : _props->hostPlatformEvents[HostPlatformViewEvents::Offset::KeyUp];
  if (hasHandler) {
    auto validKeys = keyDown ? _props->validKeysDown : _props->validKeysUp;

    // If the view is focusable and the component didn't explicity set the validKeysDown or validKeysUp,
    // allow enter/return and spacebar key events to mimic the behavior of native controls.
    if (self.focusable && !validKeys.has_value()) {
      validKeys = { { .key = "Enter" }, { .key = " " } };
    }

    // If there are no valid keys defined, no key event handling is required.
    if (!validKeys.has_value()) {
      return NO;
    }

    // Convert the event to a KeyEvent
    NSEventModifierFlags modifierFlags = event.modifierFlags;
    KeyEvent keyEvent = {
      .key = [[RCTViewKeyboardEvent keyFromEvent:event] UTF8String],
      .altKey = static_cast<bool>(modifierFlags & NSEventModifierFlagOption),
      .ctrlKey = static_cast<bool>(modifierFlags & NSEventModifierFlagControl),
      .shiftKey = static_cast<bool>(modifierFlags & NSEventModifierFlagShift),
      .metaKey = static_cast<bool>(modifierFlags & NSEventModifierFlagCommand),
      .capsLockKey = static_cast<bool>(modifierFlags & NSEventModifierFlagCapsLock),
      .numericPadKey = static_cast<bool>(modifierFlags & NSEventModifierFlagNumericPad),
      .helpKey = static_cast<bool>(modifierFlags & NSEventModifierFlagHelp),
      .functionKey = static_cast<bool>(modifierFlags & NSEventModifierFlagFunction),
    };

    BOOL shouldBlock = NO;
    for (auto const &validKey : *validKeys) {
      if (keyEvent == validKey) {
        shouldBlock = YES;
        break;
      }
    }

    if (_eventEmitter && shouldBlock) {
      if (keyDown) {
        _eventEmitter->onKeyDown(keyEvent);
      } else {
        _eventEmitter->onKeyUp(keyEvent);
      }
      return YES;
    }
  }

  return NO;
}

- (void)keyDown:(NSEvent *)event {
  if (![self handleKeyboardEvent:event]) {
    [super keyDown:event];
  }
}

- (void)keyUp:(NSEvent *)event {
  if (![self handleKeyboardEvent:event]) {
    [super keyUp:event];
  }
}


#pragma mark - Drag and Drop Events

enum DragEventType {
  DragEnter,
  DragLeave,
  Drop,
};

- (void)buildDataTransferItems:(std::vector<DataTransferItem> &)dataTransferItems forPasteboard:(NSPasteboard *)pasteboard {
  NSArray *fileNames = [pasteboard propertyListForType:NSFilenamesPboardType] ?: @[];
  for (NSString *file in fileNames) {
    NSURL *fileURL = [NSURL fileURLWithPath:file];
    BOOL isDir = NO;
    BOOL isValid = (![[NSFileManager defaultManager] fileExistsAtPath:fileURL.path isDirectory:&isDir] || isDir) ? NO : YES;
    if (isValid) {

      NSString *MIMETypeString = nil;
      if (fileURL.pathExtension) {
        CFStringRef fileExtension = (__bridge CFStringRef)fileURL.pathExtension;
        CFStringRef UTI = UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, fileExtension, NULL);
        if (UTI != NULL) {
          CFStringRef MIMEType = UTTypeCopyPreferredTagWithClass(UTI, kUTTagClassMIMEType);
          CFRelease(UTI);
          MIMETypeString = (__bridge_transfer NSString *)MIMEType;
        }
      }

      NSNumber *fileSizeValue = nil;
      NSError *fileSizeError = nil;
      BOOL success = [fileURL getResourceValue:&fileSizeValue
                                        forKey:NSURLFileSizeKey
                                         error:&fileSizeError];

      NSNumber *width = nil;
      NSNumber *height = nil;
      if ([MIMETypeString hasPrefix:@"image/"]) {
        NSImage *image = [[NSImage alloc] initWithContentsOfURL:fileURL];
        width = @(image.size.width);
        height = @(image.size.height);
      }

      DataTransferItem transferItem = {
        .name = fileURL.lastPathComponent.UTF8String,
        .kind = "file",
        .type = MIMETypeString.UTF8String,
        .uri = fileURL.path.UTF8String,
      };

      if (success) {
        transferItem.size = fileSizeValue.intValue;
      }

      if (width != nil) {
        transferItem.width = width.intValue;
      }

      if (height != nil) {
        transferItem.height = height.intValue;
      }

      dataTransferItems.push_back(transferItem);
    }
  }

  NSPasteboardType imageType = [pasteboard availableTypeFromArray:@[NSPasteboardTypePNG, NSPasteboardTypeTIFF]];
  if (imageType && fileNames.count == 0) {
    NSString *MIMETypeString = imageType == NSPasteboardTypePNG ? @"image/png" : @"image/tiff";
    NSData *imageData = [pasteboard dataForType:imageType];
    NSImage *image = [[NSImage alloc] initWithData:imageData];

    DataTransferItem transferItem = {
      .kind = "image",
      .type = MIMETypeString.UTF8String,
      .uri = RCTDataURL(MIMETypeString, imageData).absoluteString.UTF8String,
      .size = imageData.length,
      .width = image.size.width,
      .height = image.size.height,
    };

    dataTransferItems.push_back(transferItem);
  }
}

- (void)sendDragEvent:(DragEventType)eventType withLocation:(NSPoint)locationInWindow pasteboard:(NSPasteboard *)pasteboard {
  if (!_eventEmitter) {
    return;
  }

  std::vector<DataTransferItem> dataTransferItems{};
  [self buildDataTransferItems:dataTransferItems forPasteboard:pasteboard];

  NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];
  NSEventModifierFlags modifierFlags = self.window.currentEvent.modifierFlags;

  DragEvent dragEvent = {
    {
      .clientX = locationInView.x,
      .clientY = locationInView.y,
      .screenX = locationInWindow.x,
      .screenY = locationInWindow.y,
      .altKey = static_cast<bool>(modifierFlags & NSEventModifierFlagOption),
      .ctrlKey = static_cast<bool>(modifierFlags & NSEventModifierFlagControl),
      .shiftKey = static_cast<bool>(modifierFlags & NSEventModifierFlagShift),
      .metaKey = static_cast<bool>(modifierFlags & NSEventModifierFlagCommand),
    },
    .dataTransferItems = dataTransferItems,
  };

  switch (eventType) {
    case DragEnter:
      _eventEmitter->onDragEnter(dragEvent);
      break;

    case DragLeave:
      _eventEmitter->onDragLeave(dragEvent);
      break;

    case Drop:
      _eventEmitter->onDrop(dragEvent);
      break;
  }
}

- (NSDragOperation)draggingEntered:(id <NSDraggingInfo>)sender
{
  NSPasteboard *pboard = sender.draggingPasteboard;
  NSDragOperation sourceDragMask = sender.draggingSourceOperationMask;

  [self sendDragEvent:DragEnter withLocation:sender.draggingLocation pasteboard:pboard];

  if ([pboard availableTypeFromArray:self.registeredDraggedTypes]) {
    if (sourceDragMask & NSDragOperationLink) {
      return NSDragOperationLink;
    } else if (sourceDragMask & NSDragOperationCopy) {
      return NSDragOperationCopy;
    }
  }
  return NSDragOperationNone;
}

- (void)draggingExited:(id<NSDraggingInfo>)sender
{
  [self sendDragEvent:DragLeave withLocation:sender.draggingLocation pasteboard:sender.draggingPasteboard];
}

- (BOOL)performDragOperation:(id <NSDraggingInfo>)sender
{
  [self sendDragEvent:Drop withLocation:sender.draggingLocation pasteboard:sender.draggingPasteboard];
  return YES;
}


#pragma mark - Mouse Events

enum MouseEventType {
  MouseEnter,
  MouseLeave,
  DoubleClick,
};

- (void)sendMouseEvent:(MouseEventType)eventType {
  if (!_eventEmitter) {
    return;
  }

  NSPoint locationInWindow = self.window.mouseLocationOutsideOfEventStream;
  NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];

  NSEventModifierFlags modifierFlags = self.window.currentEvent.modifierFlags;

  MouseEvent mouseEvent = {
    .clientX = locationInView.x,
    .clientY = locationInView.y,
    .screenX = locationInWindow.x,
    .screenY = locationInWindow.y,
    .altKey = static_cast<bool>(modifierFlags & NSEventModifierFlagOption),
    .ctrlKey = static_cast<bool>(modifierFlags & NSEventModifierFlagControl),
    .shiftKey = static_cast<bool>(modifierFlags & NSEventModifierFlagShift),
    .metaKey = static_cast<bool>(modifierFlags & NSEventModifierFlagCommand),
  };

  switch (eventType) {
    case MouseEnter:
      _eventEmitter->onMouseEnter(mouseEvent);
      break;
    case MouseLeave:
      _eventEmitter->onMouseLeave(mouseEvent);
      break;
    case DoubleClick:
      _eventEmitter->onDoubleClick(mouseEvent);
      break;
  }
}

- (void)updateMouseOverIfNeeded
{
  // When an enclosing scrollview is scrolled using the scrollWheel or trackpad,
  // the mouseExited: event does not get called on the view where mouseEntered: was previously called.
  // This creates an unnatural pairing of mouse enter and exit events and can cause problems.
  // We therefore explicitly check for this here and handle them by calling the appropriate callbacks.

  BOOL hasMouseOver = _hasMouseOver;
  NSPoint locationInWindow = self.window.mouseLocationOutsideOfEventStream;
  NSPoint locationInView = [self convertPoint:locationInWindow fromView:nil];
  BOOL insideBounds = NSPointInRect(locationInView, self.visibleRect);

  // On macOS 14.0 visibleRect can be larger than the view bounds
  insideBounds &= NSPointInRect(locationInView, self.bounds);

  if (hasMouseOver && !insideBounds) {
    hasMouseOver = NO;
  } else if (!hasMouseOver && insideBounds) {
    // The window's frame view must be used for hit testing against `locationInWindow`
    NSView *hitView = [self.window.contentView.superview hitTest:locationInWindow];
    hasMouseOver = [hitView isDescendantOf:self];
  }

  if (hasMouseOver != _hasMouseOver) {
    _hasMouseOver = hasMouseOver;
    [self sendMouseEvent:hasMouseOver ? MouseEnter : MouseLeave];
  }
}

- (void)updateClipViewBoundsObserverIfNeeded
{
  // Subscribe to view bounds changed notification so that the view can be notified when a
  // scroll event occurs either due to trackpad/gesture based scrolling or a scrollwheel event
  // both of which would not cause the mouseExited to be invoked.

  NSClipView *clipView = self.window ? self.enclosingScrollView.contentView : nil;

  BOOL hasMouseEventHandler = _props->hostPlatformEvents[HostPlatformViewEvents::Offset::MouseEnter] ||
    _props->hostPlatformEvents[HostPlatformViewEvents::Offset::MouseLeave];

  if (_hasClipViewBoundsObserver && (!clipView || !hasMouseEventHandler)) {
    _hasClipViewBoundsObserver = NO;
    [[NSNotificationCenter defaultCenter] removeObserver:self
                                                    name:NSViewBoundsDidChangeNotification
                                                  object:nil];
  } else if (!_hasClipViewBoundsObserver && clipView && hasMouseEventHandler) {
    _hasClipViewBoundsObserver = YES;
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(updateMouseOverIfNeeded)
                                                 name:NSViewBoundsDidChangeNotification
                                               object:clipView];
    [self updateMouseOverIfNeeded];
  }
}

- (void)viewDidMoveToWindow
{
  [self updateClipViewBoundsObserverIfNeeded];
  [super viewDidMoveToWindow];
}

- (void)updateTrackingAreas
{
  if (_trackingArea) {
    [self removeTrackingArea:_trackingArea];
  }

  if (
    _props->hostPlatformEvents[HostPlatformViewEvents::Offset::MouseEnter] ||
    _props->hostPlatformEvents[HostPlatformViewEvents::Offset::MouseLeave]
  ) {
    _trackingArea = [[NSTrackingArea alloc] initWithRect:self.bounds
                                                 options:NSTrackingActiveAlways | NSTrackingMouseEnteredAndExited
                                                   owner:self
                                                userInfo:nil];
    [self addTrackingArea:_trackingArea];
    [self updateMouseOverIfNeeded];
  }

  [super updateTrackingAreas];
}

- (void)mouseUp:(NSEvent *)event
{
  BOOL hasDoubleClickEventHandler = _props->hostPlatformEvents[HostPlatformViewEvents::Offset::DoubleClick];
  if (hasDoubleClickEventHandler && event.clickCount == 2) {
    [self sendMouseEvent:DoubleClick];
  } else {
    [super mouseUp:event];
  }
}

- (void)mouseEntered:(NSEvent *)event
{
  if (_hasMouseOver) {
    return;
  }

  // The window's frame view must be used for hit testing against `locationInWindow`
  NSView *hitView = [self.window.contentView.superview hitTest:event.locationInWindow];
  if (![hitView isDescendantOf:self]) {
    return;
  }

  _hasMouseOver = YES;
  [self sendMouseEvent:MouseEnter];
}

- (void)mouseExited:(NSEvent *)event
{
  if (!_hasMouseOver) {
    return;
  }

  _hasMouseOver = NO;
  [self sendMouseEvent:MouseLeave];
}
#endif // macOS]

- (SharedTouchEventEmitter)touchEventEmitterAtPoint:(CGPoint)point
{
  return _eventEmitter;
}

- (NSString *)componentViewName_DO_NOT_USE_THIS_IS_BROKEN
{
  return RCTNSStringFromString([[self class] componentDescriptorProvider].name);
}

- (BOOL)wantsUpdateLayer
{
  return YES;
}

@end

#ifdef __cplusplus
extern "C" {
#endif

// Can't the import generated Plugin.h because plugins are not in this BUCK target
Class<RCTComponentViewProtocol> RCTViewCls(void);

#ifdef __cplusplus
}
#endif

Class<RCTComponentViewProtocol> RCTViewCls(void)
{
  return RCTViewComponentView.class;
}
