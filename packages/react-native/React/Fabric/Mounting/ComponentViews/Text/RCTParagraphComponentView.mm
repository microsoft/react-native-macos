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
#if TARGET_OS_OSX // [macOS
#import <QuartzCore/CAShapeLayer.h>
#endif // macOS]

#import <React/RCTViewAccessibilityElement.h>
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

#if TARGET_OS_OSX // [macOS
#import <React/RCTSurfaceTouchHandler.h>
#endif // macOS]

using namespace facebook::react;

#if TARGET_OS_OSX // [macOS
// Cancel React Native's touch handling by finding the RCTSurfaceTouchHandler
// gesture recognizer in the view hierarchy and toggling its enabled state.
// This matches what RCTSurfaceTouchHandler._cancelTouches does internally.
static void RCTCancelTouchesForView(RCTPlatformView *view)
{
  while (view) {
    for (id gestureHandler in view.gestureRecognizers) {
      if ([gestureHandler isKindOfClass:[RCTSurfaceTouchHandler class]]) {
        [gestureHandler setEnabled:NO];
        [gestureHandler setEnabled:YES];
        return;
      }
    }
    view = view.superview;
  }
}
#endif // macOS]

#pragma mark - RCTParagraphTextView (default, non-selectable) // [macOS]

// ParagraphTextView is an auxiliary view we set as contentView so the drawing
// can happen on top of the layers manipulated by RCTViewComponentView (the parent view)
@interface RCTParagraphTextView : RCTUIView // [macOS]

@property (nonatomic) ParagraphShadowNode::ConcreteState::Shared state;
@property (nonatomic) ParagraphAttributes paragraphAttributes;
@property (nonatomic) LayoutMetrics layoutMetrics;

@end

// [macOS Platform-native text view used when selectable={true}.
// Handles both text rendering and native text selection.
#if TARGET_OS_OSX // [macOS
@interface RCTParagraphSelectableTextView : NSTextView

- (void)setNeedsDisplay;

#else
@interface RCTParagraphSelectableTextView : UITextView
#endif

@end
// macOS]

#pragma mark - RCTParagraphComponentView // [macOS]

#if !TARGET_OS_OSX // [macOS]
@interface RCTParagraphComponentView () <UIEditMenuInteractionDelegate>

@property (nonatomic, nullable) UIEditMenuInteraction *editMenuInteraction API_AVAILABLE(ios(16.0));

@end
#else // [macOS
@interface RCTParagraphComponentView () <NSTextViewDelegate>
@end
#endif // macOS]

@implementation RCTParagraphComponentView {
  ParagraphAttributes _paragraphAttributes;
  RCTParagraphComponentAccessibilityProvider *_accessibilityProvider;
#if !TARGET_OS_OSX // [macOS]
  UILongPressGestureRecognizer *_longPressGestureRecognizer;
#endif // [macOS]
  RCTParagraphTextView *_textView;
  RCTParagraphSelectableTextView *_selectableTextView; // [macOS]
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = ParagraphShadowNode::defaultSharedProps();

#if !TARGET_OS_OSX // [macOS]
    self.opaque = NO;
#endif // [macOS]
    _textView = [RCTParagraphTextView new];
    _textView.backgroundColor = RCTPlatformColor.clearColor; // [macOS]
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
  if (!_textView.state) {
    return nil;
  }

  return RCTNSAttributedStringFromAttributedString(_textView.state->getData().attributedString);
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
    // [macOS Replaced enableContextMenu/disableContextMenu with _enableSelection/_disableSelection
    // to swap in a native text view that supports text selection.
    if (newParagraphProps.isSelectable) {
      [self _enableSelection];
    } else {
      [self _disableSelection];
    }
    // macOS]
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _textView.state = std::static_pointer_cast<const ParagraphShadowNode::ConcreteState>(state);
  [_textView setNeedsDisplay];
  [self setNeedsLayout];

  if (_selectableTextView) {
    [self updateSelectableTextStorage];
  }
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

  if (_selectableTextView) {
    [self updateSelectableTextStorage];
  }
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  if (_selectableTextView) {
    [self _disableSelection];
  }
  _textView.state = nullptr;
  _accessibilityProvider = nil;
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  if (_selectableTextView) {
    _selectableTextView.frame = self.bounds;
  } else {
    _textView.frame = self.bounds;
  }
}

#pragma mark - Selection Management

- (void)_enableSelection
{
  if (_selectableTextView) {
    return;
  }

  _selectableTextView = [[RCTParagraphSelectableTextView alloc] initWithFrame:self.bounds];

#if TARGET_OS_OSX // [macOS
  _selectableTextView.delegate = self;
  _selectableTextView.usesFontPanel = NO;
  _selectableTextView.drawsBackground = NO;
  _selectableTextView.linkTextAttributes = @{};
  _selectableTextView.editable = NO;
  _selectableTextView.selectable = YES;
  _selectableTextView.verticallyResizable = NO;
  _selectableTextView.layoutManager.usesFontLeading = NO;
#else // macOS]
  _selectableTextView.editable = NO;
  _selectableTextView.selectable = YES;
  _selectableTextView.scrollEnabled = NO;
  _selectableTextView.textContainerInset = UIEdgeInsetsZero;
  _selectableTextView.textContainer.lineFragmentPadding = 0;
  _selectableTextView.backgroundColor = [UIColor clearColor];
#endif // macOS]

  // Sync text content into the native text view.
  [self updateSelectableTextStorage];

  // Swap: remove the default text view, install the selectable one.
  [_textView removeFromSuperview];
  self.contentView = _selectableTextView;

#if !TARGET_OS_OSX // [macOS]
  // On iOS, also enable the context menu (long press to copy).
  [self enableContextMenu];
#endif // [macOS]
}

- (void)_disableSelection
{
  if (!_selectableTextView) {
    return;
  }

#if !TARGET_OS_OSX // [macOS]
  [self disableContextMenu];
#endif // [macOS]

  // Swap back: remove the selectable text view, restore the default one.
  [_selectableTextView removeFromSuperview];
  _selectableTextView = nil;

  self.contentView = _textView;
  _textView.frame = self.bounds;
  [_textView setNeedsDisplay];
}

- (void)updateSelectableTextStorage
{
  if (!_selectableTextView || !_textView.state) {
    return;
  }

  const auto &stateData = _textView.state->getData();
  auto textLayoutManager = stateData.layoutManager.lock();
  if (!textLayoutManager) {
    return;
  }

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());
  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

  NSTextStorage *textStorage = [nativeTextLayoutManager getTextStorageForAttributedString:stateData.attributedString
                                                                      paragraphAttributes:_paragraphAttributes
                                                                                     size:frame.size];

#if TARGET_OS_OSX // [macOS
  // Sync the layout infrastructure into the NSTextView.
  NSLayoutManager *layoutManager = textStorage.layoutManagers.firstObject;
  NSTextContainer *textContainer = layoutManager.textContainers.firstObject;
  [_selectableTextView replaceTextContainer:textContainer];

  // Detach layout managers from the source text storage before syncing content.
  NSArray<NSLayoutManager *> *managers = [[textStorage layoutManagers] copy];
  for (NSLayoutManager *manager in managers) {
    [textStorage removeLayoutManager:manager];
  }

  _selectableTextView.minSize = frame.size;
  _selectableTextView.maxSize = frame.size;
  _selectableTextView.frame = frame;
  [[_selectableTextView textStorage] setAttributedString:textStorage];
#else // macOS]
  // On iOS, set the attributed text directly. UITextView manages its own layout.
  _selectableTextView.attributedText = textStorage;
  _selectableTextView.frame = frame;
#endif // macOS]
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

- (NSString *)accessibilityLabelForCoopting
{
  return self.accessibilityLabel;
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
  if (!_textView.state || !paragraphProps.accessible) {
    return [NSArray new];
  }

  auto &data = _textView.state->getData();

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

  NSArray<UIAccessibilityElement *> *elements = _accessibilityProvider.accessibilityElements;
  if ([elements count] > 0) {
    elements[0].isAccessibilityElement =
        elements[0].accessibilityTraits & UIAccessibilityTraitLink || ![self isAccessibilityCoopted];
  }
  return elements;
}

- (BOOL)isAccessibilityCoopted
{
  UIView *ancestor = self.superview;
  NSMutableSet<UIView *> *cooptingCandidates = [NSMutableSet new];
  while (ancestor) {
    if ([ancestor isKindOfClass:[RCTViewComponentView class]]) {
      if ([((RCTViewComponentView *)ancestor) accessibilityLabelForCoopting]) {
        // We found a label above us. That would be coopted before we would be
        return NO;
      } else if ([((RCTViewComponentView *)ancestor) wantsToCooptLabel]) {
        // We found an view that is looking to coopt a label below it
        [cooptingCandidates addObject:ancestor];
      }

      NSArray *elements = ancestor.accessibilityElements;
      if ([elements count] > 0 && [cooptingCandidates count] > 0) {
        for (NSObject *element in elements) {
          if ([element isKindOfClass:[UIView class]] && [cooptingCandidates containsObject:((UIView *)element)]) {
            return YES;
          } else if (
              [element isKindOfClass:[RCTViewAccessibilityElement class]] &&
              [cooptingCandidates containsObject:((RCTViewAccessibilityElement *)element).view]) {
            return YES;
          }
        }
      }
    } else if (![ancestor isKindOfClass:[RCTViewComponentView class]] && ancestor.accessibilityLabel) {
      // Same as above, for UIView case. Cannot call this on RCTViewComponentView
      // as it is recursive and quite expensive.
      return NO;
    }
    ancestor = ancestor.superview;
  }

  return NO;
}

- (UIAccessibilityTraits)accessibilityTraits
{
  return [super accessibilityTraits] | UIAccessibilityTraitStaticText;
}
#else // [macOS
- (NSAccessibilityRole)accessibilityRole
{
  return [super accessibilityRole] ?: NSAccessibilityStaticTextRole;
}
#endif // macOS]

#pragma mark - RCTTouchableComponentViewProtocol

- (SharedTouchEventEmitter)touchEventEmitterAtPoint:(CGPoint)point
{
  const auto &state = _textView.state;
  if (!state) {
    return _eventEmitter;
  }

  const auto &stateData = state->getData();
  auto textLayoutManager = stateData.layoutManager.lock();

  if (!textLayoutManager) {
    return _eventEmitter;
  }

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());
  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

  auto eventEmitter = [nativeTextLayoutManager getEventEmitterWithAttributeString:stateData.attributedString
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

#pragma mark - macOS Mouse Event Handling

#if TARGET_OS_OSX // [macOS

- (NSView *)hitTest:(NSPoint)point
{
  NSView *hitView = [super hitTest:point];

  if (!_selectableTextView) {
    return hitView;
  }

  // Intercept clicks on the selectable text view so we can manage selection ourselves,
  // preventing it from swallowing events that may be handled in JS (e.g. onPress).
  NSEventType eventType = NSApp.currentEvent.type;
  BOOL isMouseClickEvent = NSEvent.pressedMouseButtons > 0;
  BOOL isMouseMoveEventType = eventType == NSEventTypeMouseMoved ||
      eventType == NSEventTypeMouseEntered ||
      eventType == NSEventTypeMouseExited ||
      eventType == NSEventTypeCursorUpdate;
  BOOL isMouseMoveEvent = !isMouseClickEvent && isMouseMoveEventType;
  BOOL isTextViewClick = (hitView && hitView == _selectableTextView) && !isMouseMoveEvent;

  return isTextViewClick ? self : hitView;
}

- (void)rightMouseDown:(NSEvent *)event
{
  if (!_selectableTextView) {
    [super rightMouseDown:event];
    return;
  }

  RCTCancelTouchesForView(self);
  [_selectableTextView rightMouseDown:event];
}

- (void)mouseDown:(NSEvent *)event
{
  if (!_selectableTextView) {
    [super mouseDown:event];
    return;
  }

  // Double/triple-clicks should be forwarded to the NSTextView for word/line selection.
  BOOL shouldForward = event.clickCount > 1;

  if (!shouldForward) {
    // Peek at next event to know if a drag (selection) is beginning.
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

    if ([contentView hitTest:point] == self) {
      RCTCancelTouchesForView(self);
      [self.window makeFirstResponder:_selectableTextView];
      [_selectableTextView mouseDown:event];
    }
  } else {
    // Clear selection for single clicks.
    _selectableTextView.selectedRange = NSMakeRange(NSNotFound, 0);
  }
}

#pragma mark - NSTextViewDelegate

- (void)textDidEndEditing:(NSNotification *)notification
{
  _selectableTextView.selectedRange = NSMakeRange(NSNotFound, 0);
}

#endif // macOS]

#pragma mark - Responder Chain

- (BOOL)canBecomeFirstResponder
{
  const auto &paragraphProps = static_cast<const ParagraphProps &>(*_props);
  return paragraphProps.isSelectable;
}

#if !TARGET_OS_OSX // [macOS]
- (BOOL)canPerformAction:(SEL)action withSender:(id)sender
{
  const auto &paragraphProps = static_cast<const ParagraphProps &>(*_props);

  if (paragraphProps.isSelectable && action == @selector(copy:)) {
    return YES;
  }

  return [self.nextResponder canPerformAction:action withSender:sender];
}
#else // [macOS

- (BOOL)resignFirstResponder
{
  // Don't relinquish first responder while selecting text.
  if (_selectableTextView && NSRunLoop.currentRunLoop.currentMode == NSEventTrackingRunLoopMode) {
    return NO;
  }

  return [super resignFirstResponder];
}

#endif // macOS]

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

#pragma mark - RCTParagraphTextView Implementation

@implementation RCTParagraphTextView {
  CAShapeLayer *_highlightLayer;
}

- (RCTUIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  return nil;
}

- (void)drawRect:(CGRect)rect
{
  if (!_state) {
    return;
  }

  const auto &stateData = _state->getData();
  auto textLayoutManager = stateData.layoutManager.lock();
  if (!textLayoutManager) {
    return;
  }

  RCTTextLayoutManager *nativeTextLayoutManager =
      (RCTTextLayoutManager *)unwrapManagedObject(textLayoutManager->getNativeTextLayoutManager());

  CGRect frame = RCTCGRectFromRect(_layoutMetrics.getContentFrame());

  [nativeTextLayoutManager drawAttributedString:stateData.attributedString
                            paragraphAttributes:_paragraphAttributes
                                          frame:frame
                              drawHighlightPath:^(UIBezierPath *highlightPath) {
                                if (highlightPath) {
                                  if (!self->_highlightLayer) {
                                    self->_highlightLayer = [CAShapeLayer layer];
                                    self->_highlightLayer.fillColor = [RCTPlatformColor colorWithWhite:0 alpha:0.25].CGColor; // [macOS]
                                    [self.layer addSublayer:self->_highlightLayer];
                                  }
                                  self->_highlightLayer.position = frame.origin;
                                  self->_highlightLayer.path = highlightPath.CGPath;
                                } else {
                                  [self->_highlightLayer removeFromSuperlayer];
                                  self->_highlightLayer = nil;
                                }
                              }];
}

@end

// [macOS
#pragma mark - RCTParagraphSelectableTextView Implementation

@implementation RCTParagraphSelectableTextView

#if TARGET_OS_OSX

- (void)setNeedsDisplay
{
  [self setNeedsDisplay:YES];
}

- (BOOL)canBecomeKeyView
{
  // Prevent this NSTextView from participating in the key view loop directly.
  // The parent RCTParagraphComponentView manages focus instead.
  return NO;
}

- (BOOL)resignFirstResponder
{
  // Don't relinquish first responder while the user is actively selecting text.
  if (self.selectable && NSRunLoop.currentRunLoop.currentMode == NSEventTrackingRunLoopMode) {
    return NO;
  }

  return [super resignFirstResponder];
}

#else

// On iOS, let UITextView handle touches natively for selection support.
// No hitTest override needed — UITextView's built-in gesture recognizers
// handle long-press-to-select and other selection interactions.

#endif

@end
// macOS]
