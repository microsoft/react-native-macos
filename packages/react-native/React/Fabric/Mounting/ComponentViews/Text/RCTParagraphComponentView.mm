/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTParagraphComponentView.h"
#import "RCTParagraphComponentAccessibilityProvider.h"

#if !TARGET_OS_OSX // [macOS]
#import <MobileCoreServices/UTCoreTypes.h>
#endif // [macOS]

#import <react/renderer/components/text/ParagraphComponentDescriptor.h>
#import <react/renderer/components/text/ParagraphProps.h>
#import <react/renderer/components/text/ParagraphState.h>
#import <react/renderer/components/text/RawTextComponentDescriptor.h>
#import <react/renderer/components/text/TextComponentDescriptor.h>
#import <react/renderer/textlayoutmanager/RCTAttributedTextUtils.h>
#import <react/renderer/textlayoutmanager/RCTTextLayoutManager.h>
#import <react/renderer/textlayoutmanager/TextLayoutManager.h>
#import <react/utils/ManagedObjectWrapper.h>

#import "RCTConversions.h"
#import "RCTFabricComponentsPlugins.h"

#import <QuartzCore/QuartzCore.h> // [macOS]

using namespace facebook::react;

#if !TARGET_OS_OSX // [macOS]
// ParagraphTextView is an auxiliary view we set as contentView so the drawing
// can happen on top of the layers manipulated by RCTViewComponentView (the parent view)
@interface RCTParagraphTextView : RCTUIView // [macOS]
#else // [macOS
// On macOS, we also defer drawing to an NSTextView,
// in order to get more native behaviors like text selection.
@interface RCTParagraphTextView : NSTextView // [macOS]
#endif // macOS]

@property (nonatomic) ParagraphShadowNode::ConcreteState::Shared state;
@property (nonatomic) ParagraphAttributes paragraphAttributes;
@property (nonatomic) LayoutMetrics layoutMetrics;

#if TARGET_OS_OSX // [macOS]
/// UIKit compatibility shim that simply calls `[self setNeedsDisplay:YES]`
- (void)setNeedsDisplay;
#endif

@end

#if !TARGET_OS_OSX // [macOS]
@interface RCTParagraphComponentView () <UIEditMenuInteractionDelegate>

@property (nonatomic, nullable) UIEditMenuInteraction *editMenuInteraction API_AVAILABLE(ios(16.0));

@end
#endif // [macOS]

@implementation RCTParagraphComponentView {
  ParagraphShadowNode::ConcreteState::Shared _state;
  ParagraphAttributes _paragraphAttributes;
  RCTParagraphComponentAccessibilityProvider *_accessibilityProvider;
#if !TARGET_OS_OSX // [macOS]
  UILongPressGestureRecognizer *_longPressGestureRecognizer;
#endif // macOS]
  RCTParagraphTextView *_textView;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = ParagraphShadowNode::defaultSharedProps();

#if !TARGET_OS_OSX  // [macOS]
    self.opaque = NO;
    _textView = [RCTParagraphTextView new];
    _textView.backgroundColor = RCTUIColor.clearColor; // [macOS]
#else // [macOS
    // Make the RCTParagraphComponentView accessible and available in the a11y hierarchy.
    self.accessibilityElement = YES;
    self.accessibilityRole = NSAccessibilityStaticTextRole;
    // Fix blurry text on non-retina displays.
    self.canDrawSubviewsIntoLayer = YES;
    // The NSTextView is responsible for drawing text and managing selection.
    _textView = [[RCTParagraphTextView alloc] initWithFrame:self.bounds];
    // The RCTParagraphComponentUnfocusableTextView is only used for rendering and should not appear in the a11y hierarchy.
    _textView.accessibilityElement = NO;
    _textView.usesFontPanel = NO;
    _textView.drawsBackground = NO;
    _textView.linkTextAttributes = @{};
    _textView.editable = NO;
    _textView.selectable = NO;
    _textView.verticallyResizable = NO;
    _textView.layoutManager.usesFontLeading = NO;
    self.contentView = _textView;
    self.layerContentsRedrawPolicy = NSViewLayerContentsRedrawDuringViewResize;
#endif // macOS]
    self.contentView = _textView;
  }

  return self;
}

- (NSString *)description
{
  NSString *superDescription = [super description];

  // Cutting the last `>` character.
  if (superDescription.length > 0 && [superDescription characterAtIndex:superDescription.length - 1] == '>') {
    superDescription = [superDescription substringToIndex:superDescription.length - 1];
  }

  return [NSString stringWithFormat:@"%@; attributedText = %@>", superDescription, self.attributedText];
}

- (NSAttributedString *_Nullable)attributedText
{
  if (!_state) {
    return nil;
  }

  return RCTNSAttributedStringFromAttributedString(_state->getData().attributedString);
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<ParagraphComponentDescriptor>();
}

+ (std::vector<facebook::react::ComponentDescriptorProvider>)supplementalComponentDescriptorProviders
{
  return {
      concreteComponentDescriptorProvider<RawTextComponentDescriptor>(),
      concreteComponentDescriptorProvider<TextComponentDescriptor>()};
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldParagraphProps = static_cast<const ParagraphProps &>(*_props);
  const auto &newParagraphProps = static_cast<const ParagraphProps &>(*props);

  _paragraphAttributes = newParagraphProps.paragraphAttributes;
  _textView.paragraphAttributes = _paragraphAttributes;

  if (newParagraphProps.isSelectable != oldParagraphProps.isSelectable) {
#if !TARGET_OS_OSX // [macOS]
    if (newParagraphProps.isSelectable) {
      [self enableContextMenu];
    } else {
      [self disableContextMenu];
    }
#else // [macOS
    _textView.selectable = newParagraphProps.isSelectable;
#endif // macOS]
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const ParagraphShadowNode::ConcreteState>(state);
  _textView.state = _state;
  [_textView setNeedsDisplay];
  [self setNeedsLayout];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  // Using stored `_layoutMetrics` as `oldLayoutMetrics` here to avoid
  // re-applying individual sub-values which weren't changed.
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:_layoutMetrics];
  _textView.layoutMetrics = _layoutMetrics;
  [_textView setNeedsDisplay];
  [self setNeedsLayout];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _state.reset();
  _accessibilityProvider = nil;
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  _textView.frame = self.bounds;
}

#pragma mark - Accessibility

- (NSString *)accessibilityLabel
{
  NSString *label = super.accessibilityLabel;
  if ([label length] > 0) {
    return label;
  }
  return self.attributedText.string;
}

- (BOOL)isAccessibilityElement
{
  // All accessibility functionality of the component is implemented in `accessibilityElements` method below.
  // Hence to avoid calling all other methods from `UIAccessibilityContainer` protocol (most of them have default
  // implementations), we return here `NO`.
  return NO;
}

#if !TARGET_OS_OSX // [macOS]
- (NSArray *)accessibilityElements
{
  const auto &paragraphProps = static_cast<const ParagraphProps &>(*_props);

  // If the component is not `accessible`, we return an empty array.
  // We do this because logically all nested <Text> components represent the content of the <Paragraph> component;
  // in other words, all nested <Text> components individually have no sense without the <Paragraph>.
  if (!_state || !paragraphProps.accessible) {
    return [NSArray new];
  }

  auto &data = _state->getData();

  if (![_accessibilityProvider isUpToDate:data.attributedString]) {
    auto textLayoutManager = data.layoutManager.lock();
    if (textLayoutManager) {
      RCTTextLayoutManager *nativeTextLayoutManager =
          (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());
      CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());
      _accessibilityProvider =
          [[RCTParagraphComponentAccessibilityProvider alloc] initWithString:data.attributedString
                                                               layoutManager:nativeTextLayoutManager
                                                         paragraphAttributes:data.paragraphAttributes
                                                                       frame:frame
                                                                        view:self];
    }
  }

  return _accessibilityProvider.accessibilityElements;
}

- (UIAccessibilityTraits)accessibilityTraits
{
  return [super accessibilityTraits] | UIAccessibilityTraitStaticText;
}
#endif // [macOS]

#pragma mark - RCTTouchableComponentViewProtocol

- (SharedTouchEventEmitter)touchEventEmitterAtPoint:(CGPoint)point
{
  if (!_state) {
    return _eventEmitter;
  }

  auto textLayoutManager = _state->getData().layoutManager.lock();

  if (!textLayoutManager) {
    return _eventEmitter;
  }

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());
  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

  auto eventEmitter = [nativeTextLayoutManager getEventEmitterWithAttributeString:_state->getData().attributedString
                                                              paragraphAttributes:_paragraphAttributes
                                                                            frame:frame
                                                                          atPoint:point];

  if (!eventEmitter) {
    return _eventEmitter;
  }

  assert(std::dynamic_pointer_cast<const TouchEventEmitter>(eventEmitter));
  return std::static_pointer_cast<const TouchEventEmitter>(eventEmitter);
}

#pragma mark - Context Menu

#if !TARGET_OS_OSX // [macOS]
- (void)enableContextMenu
{
  _longPressGestureRecognizer = [[UILongPressGestureRecognizer alloc] initWithTarget:self
                                                                              action:@selector(handleLongPress:)];

  if (@available(iOS 16.0, *)) {
    _editMenuInteraction = [[UIEditMenuInteraction alloc] initWithDelegate:self];
    [self addInteraction:_editMenuInteraction];
  }
  [self addGestureRecognizer:_longPressGestureRecognizer];
}

- (void)disableContextMenu
{
  [self removeGestureRecognizer:_longPressGestureRecognizer];
  if (@available(iOS 16.0, *)) {
    [self removeInteraction:_editMenuInteraction];
    _editMenuInteraction = nil;
  }
  _longPressGestureRecognizer = nil;
}

- (void)handleLongPress:(UILongPressGestureRecognizer *)gesture
{
  if (@available(iOS 16.0, macCatalyst 16.0, *)) {
    CGPoint location = [gesture locationInView:self];
    UIEditMenuConfiguration *config = [UIEditMenuConfiguration configurationWithIdentifier:nil sourcePoint:location];
    if (_editMenuInteraction) {
      [_editMenuInteraction presentEditMenuWithConfiguration:config];
    }
  } else {
    UIMenuController *menuController = [UIMenuController sharedMenuController];

    if (menuController.isMenuVisible) {
      return;
    }

    [menuController showMenuFromView:self rect:self.bounds];
  }
}
#endif // [macOS]

- (BOOL)canBecomeFirstResponder
{
  const auto &paragraphProps = static_cast<const ParagraphProps &>(*_props);
  return paragraphProps.isSelectable;
}

- (BOOL)canPerformAction:(SEL)action withSender:(id)sender
{
  const auto &paragraphProps = static_cast<const ParagraphProps &>(*_props);

  if (paragraphProps.isSelectable && action == @selector(copy:)) {
    return YES;
  }

#if !TARGET_OS_OSX // [macOS]
  return [self.nextResponder canPerformAction:action withSender:sender];
#else  // [macOS
  return NO;
#endif // macOS]
}

- (void)copy:(id)sender
{
  NSAttributedString *attributedText = self.attributedText;

  NSMutableDictionary *item = [NSMutableDictionary new];

  NSData *rtf = [attributedText dataFromRange:NSMakeRange(0, attributedText.length)
                           documentAttributes:@{NSDocumentTypeDocumentAttribute : NSRTFDTextDocumentType}
                                        error:nil];

  if (rtf) {
    [item setObject:rtf forKey:(id)kUTTypeFlatRTFD];
  }

  [item setObject:attributedText.string forKey:(id)kUTTypeUTF8PlainText];

#if !TARGET_OS_OSX // [macOS]
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  pasteboard.items = @[ item ];
#else // [macOS
  NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
  [pasteboard clearContents];
  [pasteboard setData:rtf forType:NSPasteboardTypeRTFD];
#endif // macOS]
}

@end

Class<RCTComponentViewProtocol> RCTParagraphCls(void)
{
  return RCTParagraphComponentView.class;
}

@implementation RCTParagraphTextView {
#if !TARGET_OS_OSX // [macOS]
  CAShapeLayer *_highlightLayer;
#endif // macOS]
}

- (RCTUIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event // [macOS]
{
  return nil;
}

- (void)drawRect:(CGRect)rect
{
  if (!_state) {
    return;
  }

  auto textLayoutManager = _state->getData().layoutManager.lock();

  if (!textLayoutManager) {
    return;
  }

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());

  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

#if !TARGET_OS_OSX // [macOS]
  [nativeTextLayoutManager drawAttributedString:_state->getData().attributedString
                            paragraphAttributes:_paragraphAttributes
                                          frame:frame
                              drawHighlightPath:^(UIBezierPath *highlightPath) {
                                if (highlightPath) {
                                  if (!self->_highlightLayer) {
                                    self->_highlightLayer = [CAShapeLayer layer];
                                    self->_highlightLayer.fillColor = [RCTUIColor colorWithWhite:0 alpha:0.25].CGColor; // [macOS]
                                    [self.layer addSublayer:self->_highlightLayer];
                                  }
                                  self->_highlightLayer.position = frame.origin;
                                  self->_highlightLayer.path = highlightPath.CGPath;
                                } else {
                                  [self->_highlightLayer removeFromSuperlayer];
                                  self->_highlightLayer = nil;
                                }
                              }];
#else // [macOS
  NSTextStorage *textStorage = [nativeTextLayoutManager getTextStorageForAttributedString:_state->getData().attributedString paragraphAttributes:_paragraphAttributes size:frame.size];

  NSLayoutManager *layoutManager = textStorage.layoutManagers.firstObject;
  NSTextContainer *textContainer = layoutManager.textContainers.firstObject;

  [self replaceTextContainer:textContainer];

  NSArray<NSLayoutManager *> *managers = [[textStorage layoutManagers] copy];
  for (NSLayoutManager *manager in managers) {
    [textStorage removeLayoutManager:manager];
  }

  self.minSize = frame.size;
  self.maxSize = frame.size;
  self.frame = frame;
  [[self textStorage] setAttributedString:textStorage];

  [super drawRect:rect];
#endif
}

#if TARGET_OS_OSX // [macOS
- (void)setNeedsDisplay
{
  [self setNeedsDisplay:YES];
}

- (BOOL)canBecomeKeyView
{
  return NO;
}

- (BOOL)resignFirstResponder
{
  // Don't relinquish first responder while selecting text.
  if (self.selectable && NSRunLoop.currentRunLoop.currentMode == NSEventTrackingRunLoopMode) {
    return NO;
  }

  return [super resignFirstResponder];
}
#endif // macOS]

@end
