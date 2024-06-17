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
#else // [macOS
#import <React/RCTSurfaceTouchHandler.h>
#endif // macOS]

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

using namespace facebook::react;

#if TARGET_OS_OSX // [macOS
@interface RCTParagraphComponentUnfocusableTextView : NSTextView
@end

@implementation RCTParagraphComponentUnfocusableTextView

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

@end
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
@interface RCTParagraphComponentView () <UIEditMenuInteractionDelegate>

@property (nonatomic, nullable) UIEditMenuInteraction *editMenuInteraction API_AVAILABLE(ios(16.0));

@end

@implementation RCTParagraphComponentView {
  ParagraphShadowNode::ConcreteState::Shared _state;
  ParagraphAttributes _paragraphAttributes;
  RCTParagraphComponentAccessibilityProvider *_accessibilityProvider;
  UILongPressGestureRecognizer *_longPressGestureRecognizer;
}
#else // [macOS
@interface RCTParagraphComponentView () <NSTextViewDelegate>
@end

@implementation RCTParagraphComponentView {
  ParagraphShadowNode::ConcreteState::Shared _state;
  ParagraphAttributes _paragraphAttributes;
  RCTParagraphComponentAccessibilityProvider *_accessibilityProvider;
  RCTParagraphComponentUnfocusableTextView *_textView;
}
#endif // macOS]

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const ParagraphProps>();
    _props = defaultProps;

#if !TARGET_OS_OSX  // [macOS]
    self.contentMode = UIViewContentModeRedraw;
    self.opaque = NO;
#else // [macOS
    // Make the RCTParagraphComponentView accessible and available in the a11y hierarchy.
    self.accessibilityElement = YES;
    self.accessibilityRole = NSAccessibilityStaticTextRole;
    // Fix blurry text on non-retina displays.
    self.canDrawSubviewsIntoLayer = YES;
    // The NSTextView is responsible for drawing text and managing selection.
    _textView = [[RCTParagraphComponentUnfocusableTextView alloc] initWithFrame:self.bounds];
    _textView.delegate = self;
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
  _state = std::static_pointer_cast<ParagraphShadowNode::ConcreteState const>(state);
#if !TARGET_OS_OSX // [macOS]
  [self setNeedsDisplay];
#else // [macOS
  [self _updateTextView];
#endif // macOS]
}

#if TARGET_OS_OSX // [macOS
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  [self _updateTextView];
}

- (void)_updateTextView
{
  if (!_state) {
    return;
  }

  auto textLayoutManager = _state->getData().paragraphLayoutManager.getTextLayoutManager();

  if (!textLayoutManager) {
    return;
  }

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());

  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

  NSTextStorage *textStorage = [nativeTextLayoutManager getTextStorageForAttributedString:_state->getData().attributedString paragraphAttributes:_paragraphAttributes frame:frame];

  NSLayoutManager *layoutManager = textStorage.layoutManagers.firstObject;
  NSTextContainer *textContainer = layoutManager.textContainers.firstObject;

  [_textView replaceTextContainer:textContainer];

  NSArray<NSLayoutManager *> *managers = [[textStorage layoutManagers] copy];
  for (NSLayoutManager *manager in managers) {
    [textStorage removeLayoutManager:manager];
  }

  _textView.minSize = frame.size;
  _textView.maxSize = frame.size;
  _textView.frame = frame;
  _textView.textStorage.attributedString = textStorage;

  [self setNeedsDisplay];
}
#endif // macOS]

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _state.reset();
  _accessibilityProvider = nil;
  
#if TARGET_OS_OSX // [macOS
  // Clear the text view to avoid displaying the previous text on recycle with undefined text content.
  _textView.string = @"";
#endif // macOS]
}

- (void)drawRect:(CGRect)rect
{
#if TARGET_OS_OSX // [macOS
  return;
#endif // macOS]

  if (!_state) {
    return;
  }

  auto textLayoutManager = _state->getData().paragraphLayoutManager.getTextLayoutManager();
  auto nsTextStorage = _state->getData().paragraphLayoutManager.getHostTextStorage();

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());

  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

  [nativeTextLayoutManager drawAttributedString:_state->getData().attributedString
                            paragraphAttributes:_paragraphAttributes
                                          frame:frame
                                    textStorage:unwrapManagedObject(nsTextStorage)];
}

#pragma mark - Accessibility

- (NSString *)accessibilityLabel
{
  return self.attributedText.string;
}

#if !TARGET_OS_OSX // [macOS]
- (BOOL)isAccessibilityElement
{
  // All accessibility functionality of the component is implemented in `accessibilityElements` method below.
  // Hence to avoid calling all other methods from `UIAccessibilityContainer` protocol (most of them have default
  // implementations), we return here `NO`.
  return NO;
}

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
    auto textLayoutManager = data.paragraphLayoutManager.getTextLayoutManager();
    RCTTextLayoutManager *nativeTextLayoutManager =
        (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());
    CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());
    _accessibilityProvider = [[RCTParagraphComponentAccessibilityProvider alloc] initWithString:data.attributedString
                                                                                  layoutManager:nativeTextLayoutManager
                                                                            paragraphAttributes:data.paragraphAttributes
                                                                                          frame:frame
                                                                                           view:self];
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

  auto textLayoutManager = _state->getData().paragraphLayoutManager.getTextLayoutManager();

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
#else // [macOS
- (NSView *)hitTest:(CGPoint)point withEvent:(NSEvent *)event
{
  // We will forward mouse click events to the NSTextView ourselves to prevent NSTextView from swallowing events that may be handled in JS (e.g. long press).
  NSView *hitView = [super hitTest:point withEvent:event];
  
  NSEventType eventType = NSApp.currentEvent.type;
  BOOL isMouseClickEvent = NSEvent.pressedMouseButtons > 0;
  BOOL isMouseMoveEventType = eventType == NSEventTypeMouseMoved || eventType == NSEventTypeMouseEntered || eventType == NSEventTypeMouseExited || eventType == NSEventTypeCursorUpdate;
  BOOL isMouseMoveEvent = !isMouseClickEvent && isMouseMoveEventType;
  BOOL isTextViewClick = (hitView && hitView == _textView) && !isMouseMoveEvent;
  
  return isTextViewClick ? self : hitView;
}

- (NSView *)hitTest:(NSPoint)point
{
  return [self hitTest:point withEvent:NSApp.currentEvent];
}

- (void)mouseDown:(NSEvent *)event
{
  if (!_textView.selectable) {
    [super mouseDown:event];
    return;
  }

  // Double/triple-clicks should be forwarded to the NSTextView.
  BOOL shouldForward = event.clickCount > 1;

  if (!shouldForward) {
    // Peek at next event to know if a selection should begin.
    NSEvent *nextEvent = [self.window nextEventMatchingMask:NSEventMaskLeftMouseUp | NSEventMaskLeftMouseDragged
                                                  untilDate:[NSDate distantFuture]
                                                     inMode:NSEventTrackingRunLoopMode
                                                    dequeue:NO];
    shouldForward = nextEvent.type == NSEventTypeLeftMouseDragged;
  }

  if (shouldForward) {
    NSView *contentView = self.window.contentView;
    // -[NSView hitTest:] takes coordinates in a view's superview coordinate system.
    NSPoint point = [contentView.superview convertPoint:event.locationInWindow fromView:nil];

    // Start selection if we're still selectable and hit-testable.
    if (_textView.selectable && [contentView hitTest:point] == self) {
      [self.window makeFirstResponder:_textView];
      [_textView mouseDown:event];
    }
  } else {
    // Clear selection for single clicks.
    _textView.selectedRange = NSMakeRange(NSNotFound, 0);
  }
}

#pragma mark - Selection

- (void)textDidEndEditing:(NSNotification *)notification
{
  _textView.selectedRange = NSMakeRange(NSNotFound, 0);
}

#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
- (BOOL)canBecomeFirstResponder
{
  const auto &paragraphProps = static_cast<const ParagraphProps &>(*_props);
  return paragraphProps.isSelectable;
}
#else
- (BOOL)becomeFirstResponder
{
  if (![super becomeFirstResponder]) {
    return NO;
  }

  return YES;
}

- (BOOL)canBecomeFirstResponder
{
  return self.focusable;
}
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
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
#endif // [macOS]

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
