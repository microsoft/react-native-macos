/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTTextInputComponentView.h"

#import <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#import <react/renderer/textlayoutmanager/RCTAttributedTextUtils.h>
#import <react/renderer/textlayoutmanager/TextLayoutManager.h>

#import <React/RCTBackedTextInputViewProtocol.h>

#if !TARGET_OS_OSX // [macOS]
#import <React/RCTUITextField.h>
#else // [macOS
#include <React/RCTUITextField.h>
#include <React/RCTUISecureTextField.h>
#endif // macOS]

#import <React/RCTUITextView.h>
#import <React/RCTUtils.h>
#if TARGET_OS_OSX // [macOS
#import <React/RCTWrappedTextView.h>
#import <React/RCTViewKeyboardEvent.h>
#endif // macOS]

#import "RCTConversions.h"
#import "RCTTextInputNativeCommands.h"
#import "RCTTextInputUtils.h"

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface RCTTextInputComponentView () <RCTBackedTextInputDelegate, RCTTextInputViewProtocol>
@end

@implementation RCTTextInputComponentView {
  TextInputShadowNode::ConcreteState::Shared _state;
#if !TARGET_OS_OSX // [macOS]
  RCTUIView<RCTBackedTextInputViewProtocol> *_backedTextInputView;
#else // [macOS
  RCTPlatformView<RCTBackedTextInputViewProtocol> *_backedTextInputView;
#endif // macOS]
  NSUInteger _mostRecentEventCount;
  NSAttributedString *_lastStringStateWasUpdatedWith;

  /*
   * UIKit uses either UITextField or UITextView as its UIKit element for <TextInput>. UITextField is for single line
   * entry, UITextView is for multiline entry. There is a problem with order of events when user types a character. In
   * UITextField (single line text entry), typing a character first triggers `onChange` event and then
   * onSelectionChange. In UITextView (multi line text entry), typing a character first triggers `onSelectionChange` and
   * then onChange. JavaScript depends on `onChange` to be called before `onSelectionChange`. This flag keeps state so
   * if UITextView is backing text input view, inside `-[RCTTextInputComponentView textInputDidChangeSelection]` we make
   * sure to call `onChange` before `onSelectionChange` and ignore next `-[RCTTextInputComponentView
   * textInputDidChange]` call.
   */
  BOOL _ignoreNextTextInputCall;

  /*
   * A flag that when set to true, `_mostRecentEventCount` won't be incremented when `[self _updateState]`
   * and delegate methods `textInputDidChange` and `textInputDidChangeSelection` will exit early.
   *
   * Setting `_backedTextInputView.attributedText` triggers delegate methods `textInputDidChange` and
   * `textInputDidChangeSelection` for multiline text input only.
   * In multiline text input this is undesirable as we don't want to be sending events for changes that JS triggered.
   */
  BOOL _comingFromJS;
  BOOL _didMoveToWindow;
}

#pragma mark - UIView overrides

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TextInputProps>();
    _props = defaultProps;
    auto &props = *defaultProps;

#if !TARGET_OS_OSX // [macOS]
    _backedTextInputView = props.traits.multiline ? [RCTUITextView new] : [RCTUITextField new];
#else // [macOS
    _backedTextInputView = props.traits.multiline ? [[RCTWrappedTextView alloc] initWithFrame:self.bounds] : [RCTUITextField new];
#endif // macOS]
    _backedTextInputView.textInputDelegate = self;
    _ignoreNextTextInputCall = NO;
    _comingFromJS = NO;
    _didMoveToWindow = NO;
    [self addSubview:_backedTextInputView];
  }

  return self;
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];

  if (self.window && !_didMoveToWindow) {
    const auto &props = static_cast<const TextInputProps &>(*_props);
    if (props.autoFocus) {
#if !TARGET_OS_OSX // [macOS]
      [_backedTextInputView becomeFirstResponder];
#else // [macOS
      NSWindow *window = _backedTextInputView.window;
      if (window) {
        [window makeFirstResponder:_backedTextInputView.responder];
      }
#endif // macOS]
    }
    _didMoveToWindow = YES;
  }
  [self _restoreTextSelection];
}

#pragma mark - RCTViewComponentView overrides

- (NSObject *)accessibilityElement
{
  return _backedTextInputView;
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TextInputComponentDescriptor>();
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldTextInputProps = static_cast<const TextInputProps &>(*_props);
  const auto &newTextInputProps = static_cast<const TextInputProps &>(*props);

  // Traits:
  if (newTextInputProps.traits.multiline != oldTextInputProps.traits.multiline) {
    [self _setMultiline:newTextInputProps.traits.multiline];
  }


#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.traits.autocapitalizationType != oldTextInputProps.traits.autocapitalizationType) {
    _backedTextInputView.autocapitalizationType =
        RCTUITextAutocapitalizationTypeFromAutocapitalizationType(newTextInputProps.traits.autocapitalizationType);
  }
#endif

#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.traits.autoCorrect != oldTextInputProps.traits.autoCorrect) {
    _backedTextInputView.autocorrectionType =
        RCTUITextAutocorrectionTypeFromOptionalBool(newTextInputProps.traits.autoCorrect);
  }
#else // [macOS
  if (newTextInputProps.traits.autoCorrect != oldTextInputProps.traits.autoCorrect && newTextInputProps.traits.autoCorrect.has_value()) {
    _backedTextInputView.automaticSpellingCorrectionEnabled =
        newTextInputProps.traits.autoCorrect.value();
  }
#endif // macOS]
  
  if (newTextInputProps.traits.contextMenuHidden != oldTextInputProps.traits.contextMenuHidden) {
    _backedTextInputView.contextMenuHidden = newTextInputProps.traits.contextMenuHidden;
  }

  if (newTextInputProps.traits.editable != oldTextInputProps.traits.editable) {
    _backedTextInputView.editable = newTextInputProps.traits.editable;
  }

  if (newTextInputProps.traits.enablesReturnKeyAutomatically !=
      oldTextInputProps.traits.enablesReturnKeyAutomatically) {
    _backedTextInputView.enablesReturnKeyAutomatically = newTextInputProps.traits.enablesReturnKeyAutomatically;
  }

#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.traits.keyboardAppearance != oldTextInputProps.traits.keyboardAppearance) {
    _backedTextInputView.keyboardAppearance =
        RCTUIKeyboardAppearanceFromKeyboardAppearance(newTextInputProps.traits.keyboardAppearance);
  }
#endif
  
#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.traits.spellCheck != oldTextInputProps.traits.spellCheck) {
    _backedTextInputView.spellCheckingType =
        RCTUITextSpellCheckingTypeFromOptionalBool(newTextInputProps.traits.spellCheck);
  }
#else // [macOS
  if (newTextInputProps.traits.spellCheck != oldTextInputProps.traits.spellCheck && newTextInputProps.traits.spellCheck.has_value()) {
    _backedTextInputView.continuousSpellCheckingEnabled =
        newTextInputProps.traits.spellCheck.value();
  }
#endif // macOS]
  
#if TARGET_OS_OSX // [macOS
  if (newTextInputProps.traits.grammarCheck != oldTextInputProps.traits.grammarCheck && newTextInputProps.traits.grammarCheck.has_value()) {
    _backedTextInputView.grammarCheckingEnabled =
        newTextInputProps.traits.grammarCheck.value();
  }
#endif // macOS]

  if (newTextInputProps.traits.caretHidden != oldTextInputProps.traits.caretHidden) {
    _backedTextInputView.caretHidden = newTextInputProps.traits.caretHidden;
  }

#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.traits.clearButtonMode != oldTextInputProps.traits.clearButtonMode) {
    _backedTextInputView.clearButtonMode =
        RCTUITextFieldViewModeFromTextInputAccessoryVisibilityMode(newTextInputProps.traits.clearButtonMode);
  }
#endif // [macOS]

  if (newTextInputProps.traits.scrollEnabled != oldTextInputProps.traits.scrollEnabled) {
    _backedTextInputView.scrollEnabled = newTextInputProps.traits.scrollEnabled;
  }

  if (newTextInputProps.traits.secureTextEntry != oldTextInputProps.traits.secureTextEntry) {
#if !TARGET_OS_OSX // [macOS]
    _backedTextInputView.secureTextEntry = newTextInputProps.traits.secureTextEntry;
#else // [macOS
    [self _setSecureTextEntry:newTextInputProps.traits.secureTextEntry];
#endif // macOS]
  }

#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.traits.keyboardType != oldTextInputProps.traits.keyboardType) {
    _backedTextInputView.keyboardType = RCTUIKeyboardTypeFromKeyboardType(newTextInputProps.traits.keyboardType);
  }

  if (newTextInputProps.traits.returnKeyType != oldTextInputProps.traits.returnKeyType) {
    _backedTextInputView.returnKeyType = RCTUIReturnKeyTypeFromReturnKeyType(newTextInputProps.traits.returnKeyType);
  }

  if (newTextInputProps.traits.textContentType != oldTextInputProps.traits.textContentType) {
    _backedTextInputView.textContentType = RCTUITextContentTypeFromString(newTextInputProps.traits.textContentType);
  }

  if (newTextInputProps.traits.passwordRules != oldTextInputProps.traits.passwordRules) {
    _backedTextInputView.passwordRules = RCTUITextInputPasswordRulesFromString(newTextInputProps.traits.passwordRules);
  }

  if (newTextInputProps.traits.smartInsertDelete != oldTextInputProps.traits.smartInsertDelete) {
    _backedTextInputView.smartInsertDeleteType =
        RCTUITextSmartInsertDeleteTypeFromOptionalBool(newTextInputProps.traits.smartInsertDelete);
  }
#endif // [macOS]

  // Traits `blurOnSubmit`, `clearTextOnFocus`, and `selectTextOnFocus` were omitted intentionally here
  // because they are being checked on-demand.

  // Other props:
  if (newTextInputProps.placeholder != oldTextInputProps.placeholder) {
    _backedTextInputView.placeholder = RCTNSStringFromString(newTextInputProps.placeholder);
  }

  if (newTextInputProps.placeholderTextColor != oldTextInputProps.placeholderTextColor) {
    _backedTextInputView.placeholderColor = RCTUIColorFromSharedColor(newTextInputProps.placeholderTextColor);
  }

  if (newTextInputProps.textAttributes != oldTextInputProps.textAttributes) {
    _backedTextInputView.defaultTextAttributes =
        RCTNSTextAttributesFromTextAttributes(newTextInputProps.getEffectiveTextAttributes(RCTFontSizeMultiplier()));
  }

#if !TARGET_OS_OSX // [macOS]
  if (newTextInputProps.selectionColor != oldTextInputProps.selectionColor) {
    _backedTextInputView.tintColor = RCTUIColorFromSharedColor(newTextInputProps.selectionColor);
  }
#endif // [macOS]

  if (newTextInputProps.inputAccessoryViewID != oldTextInputProps.inputAccessoryViewID) {
    _backedTextInputView.inputAccessoryViewID = RCTNSStringFromString(newTextInputProps.inputAccessoryViewID);
  }
  
#if TARGET_OS_OSX // [macOS
  if (newTextInputProps.traits.pastedTypes!= oldTextInputProps.traits.pastedTypes) {
    NSArray<NSPasteboardType> *types = RCTPasteboardTypeArrayFromProps(newTextInputProps.traits.pastedTypes);
    [_backedTextInputView setReadablePasteBoardTypes:types];
  }
#endif // macOS]
  
  [super updateProps:props oldProps:oldProps];

  [self setDefaultInputAccessoryView];
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<TextInputShadowNode::ConcreteState const>(state);

  if (!_state) {
    assert(false && "State is `null` for <TextInput> component.");
    _backedTextInputView.attributedText = nil;
    return;
  }

  auto data = _state->getData();

  if (!oldState) {
    _mostRecentEventCount = _state->getData().mostRecentEventCount;
  }

  if (_mostRecentEventCount == _state->getData().mostRecentEventCount) {
    _comingFromJS = YES;
    [self _setAttributedString:RCTNSAttributedStringFromAttributedStringBox(data.attributedStringBox)];
    _comingFromJS = NO;
  }
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];

#if TARGET_OS_OSX // [macOS
  _backedTextInputView.pointScaleFactor = layoutMetrics.pointScaleFactor;
#endif // macOS]
  _backedTextInputView.frame =
      UIEdgeInsetsInsetRect(self.bounds, RCTUIEdgeInsetsFromEdgeInsets(layoutMetrics.borderWidth));
  _backedTextInputView.textContainerInset =
      RCTUIEdgeInsetsFromEdgeInsets(layoutMetrics.contentInsets - layoutMetrics.borderWidth);

  if (_eventEmitter) {
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onContentSizeChange([self _textInputMetrics]);
  }
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _state.reset();
  _backedTextInputView.attributedText = nil;
  _mostRecentEventCount = 0;
  _comingFromJS = NO;
  _lastStringStateWasUpdatedWith = nil;
  _ignoreNextTextInputCall = NO;
  _didMoveToWindow = NO;
  [_backedTextInputView resignFirstResponder];
}

#pragma mark - RCTBackedTextInputDelegate

- (BOOL)textInputShouldBeginEditing
{
  return YES;
}

- (void)textInputDidBeginEditing
{
  const auto &props = static_cast<const TextInputProps &>(*_props);

  if (props.traits.clearTextOnFocus) {
    _backedTextInputView.attributedText = nil;
    [self textInputDidChange];
  }

  if (props.traits.selectTextOnFocus) {
    [_backedTextInputView selectAll:nil];
    [self textInputDidChangeSelection];
  }

  if (_eventEmitter) {
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onFocus([self _textInputMetrics]);
  }
}

- (BOOL)textInputShouldEndEditing
{
  return YES;
}

- (void)textInputDidEndEditing
{
  if (_eventEmitter) {
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onEndEditing([self _textInputMetrics]);
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onBlur([self _textInputMetrics]);
  }
}

- (BOOL)textInputShouldSubmitOnReturn
{
  const SubmitBehavior submitBehavior = [self getSubmitBehavior];
  const BOOL shouldSubmit = submitBehavior == SubmitBehavior::Submit || submitBehavior == SubmitBehavior::BlurAndSubmit;
  // We send `submit` event here, in `textInputShouldSubmitOnReturn`
  // (not in `textInputDidReturn)`, because of semantic of the event:
  // `onSubmitEditing` is called when "Submit" button
  // (the blue key on onscreen keyboard) did pressed
  // (no connection to any specific "submitting" process).

  if (_eventEmitter && shouldSubmit) {
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onSubmitEditing([self _textInputMetrics]);
  }
  return shouldSubmit;
}

- (BOOL)textInputShouldReturn
{
  return [self getSubmitBehavior] == SubmitBehavior::BlurAndSubmit;
}

- (void)textInputDidReturn
{
  // Does nothing.
}

- (NSString *)textInputShouldChangeText:(NSString *)text inRange:(NSRange)range
{
  const auto &props = static_cast<const TextInputProps &>(*_props);

  if (!_backedTextInputView.textWasPasted) {
    if (_eventEmitter) {
      KeyPressMetrics keyPressMetrics;
      keyPressMetrics.text = RCTStringFromNSString(text);
      keyPressMetrics.eventCount = _mostRecentEventCount;

      const auto &textInputEventEmitter = static_cast<const TextInputEventEmitter &>(*_eventEmitter);
      if (props.onKeyPressSync) {
        textInputEventEmitter.onKeyPressSync(keyPressMetrics);
      } else {
        textInputEventEmitter.onKeyPress(keyPressMetrics);
      }
    }
  }

  if (props.maxLength) {
    NSInteger allowedLength = props.maxLength - _backedTextInputView.attributedText.string.length + range.length;

    if (allowedLength > 0 && text.length > allowedLength) {
      // make sure unicode characters that are longer than 16 bits (such as emojis) are not cut off
      NSRange cutOffCharacterRange = [text rangeOfComposedCharacterSequenceAtIndex:allowedLength - 1];
      if (cutOffCharacterRange.location + cutOffCharacterRange.length > allowedLength) {
        // the character at the length limit takes more than 16bits, truncation should end at the character before
        allowedLength = cutOffCharacterRange.location;
      }
    }

    if (allowedLength <= 0) {
      return nil;
    }

    return allowedLength > text.length ? text : [text substringToIndex:allowedLength];
  }

  return text;
}

- (BOOL)textInputShouldChangeTextInRange:(NSRange)range replacementText:(NSString *)text
{
  return YES;
}

- (void)textInputDidChange
{
  if (_comingFromJS) {
    return;
  }

  if (_ignoreNextTextInputCall && [_lastStringStateWasUpdatedWith isEqual:_backedTextInputView.attributedText]) {
    _ignoreNextTextInputCall = NO;
    return;
  }

  [self _updateState];

  if (_eventEmitter) {
    const auto &textInputEventEmitter = static_cast<const TextInputEventEmitter &>(*_eventEmitter);
    const auto &props = static_cast<const TextInputProps &>(*_props);
    if (props.onChangeSync) {
      textInputEventEmitter.onChangeSync([self _textInputMetrics]);
    } else {
      textInputEventEmitter.onChange([self _textInputMetrics]);
    }
  }
}

- (void)textInputDidChangeSelection
{
  if (_comingFromJS) {
    return;
  }
  const auto &props = static_cast<const TextInputProps &>(*_props);
  if (props.traits.multiline && ![_lastStringStateWasUpdatedWith isEqual:_backedTextInputView.attributedText]) {
    [self textInputDidChange];
    _ignoreNextTextInputCall = YES;
  }

  if (_eventEmitter) {
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onSelectionChange([self _textInputMetrics]);
  }
}

#if TARGET_OS_OSX // [macOS
- (void)setEnableFocusRing:(BOOL)enableFocusRing {
  [super setEnableFocusRing:enableFocusRing];
  if ([_backedTextInputView respondsToSelector:@selector(setEnableFocusRing:)]) {
    [_backedTextInputView setEnableFocusRing:enableFocusRing];
  }
}

- (void)automaticSpellingCorrectionDidChange:(BOOL)enabled {
  if (_eventEmitter) {
    std::static_pointer_cast<TextInputEventEmitter const>(_eventEmitter)->onAutoCorrectChange({.enabled = static_cast<bool>(enabled)});
  }
}

- (void)continuousSpellCheckingDidChange:(BOOL)enabled
{
  if (_eventEmitter) {
    std::static_pointer_cast<TextInputEventEmitter const>(_eventEmitter)->onSpellCheckChange({.enabled = static_cast<bool>(enabled)});
  }
}

- (void)grammarCheckingDidChange:(BOOL)enabled 
{
  if (_eventEmitter) {
    std::static_pointer_cast<TextInputEventEmitter const>(_eventEmitter)->onGrammarCheckChange({.enabled = static_cast<bool>(enabled)});
  }
}

- (BOOL)hasValidKeyDownOrValidKeyUp:(nonnull NSString *)key {
  std::string keyString = key.UTF8String;

  if (_props->validKeysDown.has_value()) {
    for (auto const &validKey : *_props->validKeysDown) {
      if (validKey.key == keyString) {
        return YES;
      }
    }
  }

  if (_props->validKeysUp.has_value()) {
    for (auto const &validKey : *_props->validKeysUp) {
      if (validKey.key == keyString) {
        return YES;
      }
    }
  }
  
  return NO;
}

- (void)submitOnKeyDownIfNeeded:(nonnull NSEvent *)event
{
  BOOL shouldSubmit = NO;
  NSDictionary *keyEvent = [RCTViewKeyboardEvent bodyFromEvent:event];
  auto const &props = *std::static_pointer_cast<TextInputProps const>(_props);
  if (props.traits.submitKeyEvents.empty()) {
    shouldSubmit = [keyEvent[@"key"] isEqualToString:@"Enter"]
      && ![keyEvent[@"altKey"] boolValue]
      && ![keyEvent[@"shiftKey"] boolValue]
      && ![keyEvent[@"ctrlKey"] boolValue]
      && ![keyEvent[@"metaKey"] boolValue]
      && ![keyEvent[@"functionKey"] boolValue]; // Default clearTextOnSubmit key 
  } else {
    NSString *keyValue = keyEvent[@"key"];
    NSUInteger keyValueLength = [keyValue lengthOfBytesUsingEncoding:NSUTF8StringEncoding];
    std::string key = std::string([keyValue UTF8String], keyValueLength);
    for (auto const &submitKeyEvent : props.traits.submitKeyEvents) {
      if (
        submitKeyEvent.key == key &&
        submitKeyEvent.altKey == [keyEvent[@"altKey"] boolValue] &&
        submitKeyEvent.shiftKey == [keyEvent[@"shiftKey"] boolValue] &&
        submitKeyEvent.ctrlKey == [keyEvent[@"ctrlKey"] boolValue] &&
        submitKeyEvent.metaKey == [keyEvent[@"metaKey"] boolValue] &&
        submitKeyEvent.functionKey == [keyEvent[@"functionKey"] boolValue]
      ) {
        shouldSubmit = YES;
        break;
      }
    }
  }
  
  if (shouldSubmit) {
    if (_eventEmitter) {
      auto const &textInputEventEmitter = *std::static_pointer_cast<TextInputEventEmitter const>(_eventEmitter);
      textInputEventEmitter.onSubmitEditing([self _textInputMetrics]);
    }

    if (props.traits.clearTextOnSubmit) {
      _backedTextInputView.attributedText = nil;
      [self textInputDidChange];
    }
  }
}

- (void)textInputDidCancel
{
  if (_eventEmitter) {
    KeyPressMetrics keyPressMetrics;
    keyPressMetrics.text = RCTStringFromNSString(@"\x1B"); // Escape key
    keyPressMetrics.eventCount = _mostRecentEventCount;

    auto const &textInputEventEmitter = *std::static_pointer_cast<TextInputEventEmitter const>(_eventEmitter);
    auto const &props = *std::static_pointer_cast<TextInputProps const>(_props);
    if (props.onKeyPressSync) {
      textInputEventEmitter.onKeyPressSync(keyPressMetrics);
    } else {
      textInputEventEmitter.onKeyPress(keyPressMetrics);
    }
  }
  
  [self textInputDidEndEditing];
}

- (NSDragOperation)textInputDraggingEntered:(nonnull id<NSDraggingInfo>)draggingInfo {
  if ([draggingInfo.draggingPasteboard availableTypeFromArray:self.registeredDraggedTypes]) {
    return [self draggingEntered:draggingInfo];
  }
  return NSDragOperationNone;
}

- (void)textInputDraggingExited:(nonnull id<NSDraggingInfo>)draggingInfo {
  if ([draggingInfo.draggingPasteboard availableTypeFromArray:self.registeredDraggedTypes]) {
    [self draggingExited:draggingInfo];
  }
}

- (BOOL)textInputShouldHandleDragOperation:(nonnull id<NSDraggingInfo>)draggingInfo {
  if ([draggingInfo.draggingPasteboard availableTypeFromArray:self.registeredDraggedTypes]) {
    [self performDragOperation:draggingInfo];
    return NO;
  }

  return YES;
}

- (BOOL)textInputShouldHandleDeleteBackward:(nonnull id<RCTBackedTextInputViewProtocol>)sender {
  return YES;
}

- (BOOL)textInputShouldHandleDeleteForward:(nonnull id<RCTBackedTextInputViewProtocol>)sender {
  return YES;
}

- (BOOL)textInputShouldHandleKeyEvent:(nonnull NSEvent *)event {
  return ![self handleKeyboardEvent:event];
}

- (BOOL)textInputShouldHandlePaste:(nonnull id<RCTBackedTextInputViewProtocol>)sender {
  NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
  NSPasteboardType fileType = [pasteboard availableTypeFromArray:@[NSFilenamesPboardType, NSPasteboardTypePNG, NSPasteboardTypeTIFF]];
  NSArray<NSPasteboardType>* pastedTypes = ((RCTUITextView*) _backedTextInputView).readablePasteboardTypes;
      
  // If there's a fileType that is of interest, notify JS. Also blocks notifying JS if it's a text paste
  if (_eventEmitter && fileType != nil && [pastedTypes containsObject:fileType]) {
    auto const &textInputEventEmitter = *std::static_pointer_cast<TextInputEventEmitter const>(_eventEmitter);
    std::vector<DataTransferItem> dataTransferItems{};
    [self buildDataTransferItems:dataTransferItems forPasteboard:pasteboard];
    
    TextInputEventEmitter::PasteEvent pasteEvent = {
      .dataTransferItems = dataTransferItems,
    };
    textInputEventEmitter.onPaste(pasteEvent);
  }

  // Only allow pasting text.
  return fileType == nil;
}

#endif // macOS]

#pragma mark - RCTBackedTextInputDelegate (UIScrollViewDelegate)

- (void)scrollViewDidScroll:(RCTUIScrollView *)scrollView // [macOS]
{
  if (_eventEmitter) {
#if !TARGET_OS_OSX // [macOS]
    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onScroll([self _textInputMetrics]);
#else // [macOS
    TextInputMetrics metrics = [self _textInputMetrics]; // [macOS]

    CGPoint contentOffset = scrollView.contentOffset;
    metrics.contentOffset = {contentOffset.x, contentOffset.y};

    UIEdgeInsets contentInset = scrollView.contentInset;
    metrics.contentInset = {contentInset.left, contentInset.top, contentInset.right, contentInset.bottom};

    CGSize contentSize = scrollView.contentSize;
    metrics.contentSize = {contentSize.width, contentSize.height};

    CGSize layoutMeasurement = scrollView.bounds.size;
    metrics.layoutMeasurement = {layoutMeasurement.width, layoutMeasurement.height};

    CGFloat zoomScale = scrollView.zoomScale ?: 1;
    metrics.zoomScale = zoomScale;

    static_cast<const TextInputEventEmitter &>(*_eventEmitter).onScroll(metrics);
#endif // macOS]
  }
}

#pragma mark - Native Commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTTextInputHandleCommand(self, commandName, args);
}

- (void)focus
{
#if !TARGET_OS_OSX // [macOS]
  [_backedTextInputView becomeFirstResponder];
#else // [macOS
  NSWindow *window = _backedTextInputView.window;
  if (window) {
    [window makeFirstResponder:_backedTextInputView.responder];
  }
#endif // macOS]
}

- (void)blur
{
#if !TARGET_OS_OSX // [macOS]
  [_backedTextInputView resignFirstResponder];
#else
  NSWindow *window = _backedTextInputView.window;
  if (window && window.firstResponder == _backedTextInputView.responder) {
    // Calling makeFirstResponder with nil will call resignFirstResponder and make the window the first responder
    [window makeFirstResponder:nil];
  }
#endif // macOS];
}

- (void)setTextAndSelection:(NSInteger)eventCount
                      value:(NSString *__nullable)value
                      start:(NSInteger)start
                        end:(NSInteger)end
{
  if (_mostRecentEventCount != eventCount) {
    return;
  }
  _comingFromJS = YES;
  if (value && ![value isEqualToString:_backedTextInputView.attributedText.string]) {
    NSAttributedString *attributedString =
        [[NSAttributedString alloc] initWithString:value attributes:_backedTextInputView.defaultTextAttributes];
    [self _setAttributedString:attributedString];
    [self _updateState];
  }

#if !TARGET_OS_OSX // [macOS]
  UITextPosition *startPosition = [_backedTextInputView positionFromPosition:_backedTextInputView.beginningOfDocument
                                                                      offset:start];
  UITextPosition *endPosition = [_backedTextInputView positionFromPosition:_backedTextInputView.beginningOfDocument
                                                                    offset:end];

  if (startPosition && endPosition) {
    UITextRange *range = [_backedTextInputView textRangeFromPosition:startPosition toPosition:endPosition];
    [_backedTextInputView setSelectedTextRange:range notifyDelegate:NO];
  }
#else // [macOS
  NSInteger startPosition = MIN(start, end);
  NSInteger endPosition = MAX(start, end);
  [_backedTextInputView setSelectedTextRange:NSMakeRange(startPosition, endPosition - startPosition) notifyDelegate:YES];
#endif // macOS]
  _comingFromJS = NO;
}

#pragma mark - Default input accessory view

- (void)setDefaultInputAccessoryView
{
#if !TARGET_OS_OSX // [macOS]
  // InputAccessoryView component sets the inputAccessoryView when inputAccessoryViewID exists
  if (_backedTextInputView.inputAccessoryViewID) {
    if (_backedTextInputView.isFirstResponder) {
      [_backedTextInputView reloadInputViews];
    }
    return;
  }

  UIKeyboardType keyboardType = _backedTextInputView.keyboardType;

  // These keyboard types (all are number pads) don't have a "Done" button by default,
  // so we create an `inputAccessoryView` with this button for them.
  BOOL shouldHaveInputAccessoryView =
      (keyboardType == UIKeyboardTypeNumberPad || keyboardType == UIKeyboardTypePhonePad ||
       keyboardType == UIKeyboardTypeDecimalPad || keyboardType == UIKeyboardTypeASCIICapableNumberPad) &&
      _backedTextInputView.returnKeyType == UIReturnKeyDone;

#if !TARGET_OS_VISION // [visionOS]
  if ((_backedTextInputView.inputAccessoryView != nil) == shouldHaveInputAccessoryView) {
    return;
  }

  if (shouldHaveInputAccessoryView) {
    UIToolbar *toolbarView = [UIToolbar new];
    [toolbarView sizeToFit];
    UIBarButtonItem *flexibleSpace =
    [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:nil action:nil];
    UIBarButtonItem *doneButton =
    [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemDone
                                                  target:self
                                                  action:@selector(handleInputAccessoryDoneButton)];
    toolbarView.items = @[ flexibleSpace, doneButton ];
    _backedTextInputView.inputAccessoryView = toolbarView;
  } else {
    _backedTextInputView.inputAccessoryView = nil;
  }
#endif // [visionOS]

  if (_backedTextInputView.isFirstResponder) {
    [_backedTextInputView reloadInputViews];
  }
#endif // [macOS]
}

- (void)handleInputAccessoryDoneButton
{
#if !TARGET_OS_OSX // [macOS]
  if ([self textInputShouldReturn]) {
    [_backedTextInputView endEditing:YES];
  }
#endif // [macOS]
}

#pragma mark - Other

- (TextInputMetrics)_textInputMetrics
{
  TextInputMetrics metrics;
  metrics.text = RCTStringFromNSString(_backedTextInputView.attributedText.string);
  metrics.selectionRange = [self _selectionRange];
  metrics.eventCount = _mostRecentEventCount;

#if !TARGET_OS_OSX // [macOS]
  CGPoint contentOffset = _backedTextInputView.contentOffset;
  metrics.contentOffset = {contentOffset.x, contentOffset.y};

  UIEdgeInsets contentInset = _backedTextInputView.contentInset;
  metrics.contentInset = {contentInset.left, contentInset.top, contentInset.right, contentInset.bottom};
#endif // [macOS]

  CGSize contentSize = _backedTextInputView.contentSize;
  metrics.contentSize = {contentSize.width, contentSize.height};

  CGSize layoutMeasurement = _backedTextInputView.bounds.size;
  metrics.layoutMeasurement = {layoutMeasurement.width, layoutMeasurement.height};

#if !TARGET_OS_OSX // [macOS]
  CGFloat zoomScale = _backedTextInputView.zoomScale;
  metrics.zoomScale = zoomScale;
#endif // [macOS]

  return metrics;
}

- (void)_updateState
{
  if (!_state) {
    return;
  }
  NSAttributedString *attributedString = _backedTextInputView.attributedText;
  auto data = _state->getData();
  _lastStringStateWasUpdatedWith = attributedString;
  data.attributedStringBox = RCTAttributedStringBoxFromNSAttributedString(attributedString);
  _mostRecentEventCount += _comingFromJS ? 0 : 1;
  data.mostRecentEventCount = _mostRecentEventCount;
  _state->updateState(std::move(data));
}

- (AttributedString::Range)_selectionRange
{
#if !TARGET_OS_OSX // [macOS]
  UITextRange *selectedTextRange = _backedTextInputView.selectedTextRange;
  NSInteger start = [_backedTextInputView offsetFromPosition:_backedTextInputView.beginningOfDocument
                                                  toPosition:selectedTextRange.start];
  NSInteger end = [_backedTextInputView offsetFromPosition:_backedTextInputView.beginningOfDocument
                                                toPosition:selectedTextRange.end];
  return AttributedString::Range{(int)start, (int)(end - start)};
#else // [macOS
  NSRange selectedTextRange = [_backedTextInputView selectedTextRange];
  return AttributedString::Range{(int)selectedTextRange.location, (int)selectedTextRange.length};
#endif // macOS]
}

- (void)_restoreTextSelection
{
  const auto &selection = static_cast<const TextInputProps &>(*_props).selection;
  if (!selection.has_value()) {
    return;
  }
#if !TARGET_OS_OSX // [macOS]
  auto start = [_backedTextInputView positionFromPosition:_backedTextInputView.beginningOfDocument
                                                   offset:selection->start];
  auto end = [_backedTextInputView positionFromPosition:_backedTextInputView.beginningOfDocument offset:selection->end];
  auto range = [_backedTextInputView textRangeFromPosition:start toPosition:end];
  [_backedTextInputView setSelectedTextRange:range notifyDelegate:YES];
#endif // [macOS]
}

- (void)_setAttributedString:(NSAttributedString *)attributedString
{
#if TARGET_OS_OSX // [macOS
  // When the text view displays temporary content (e.g. completions, accents), do not update the attributed string.
  if (_backedTextInputView.hasMarkedText) {
    return;
  }
#endif // macOS]

  if ([self _textOf:attributedString equals:_backedTextInputView.attributedText]) {
    return;
  }
#if !TARGET_OS_OSX // [macOS]
  UITextRange *selectedRange = _backedTextInputView.selectedTextRange;
#else
  NSRange selection = [_backedTextInputView selectedTextRange];
#endif // macOS]
  NSAttributedString *oldAttributedText = [_backedTextInputView.attributedText copy];
  NSInteger oldTextLength = oldAttributedText.string.length;
  
  _backedTextInputView.attributedText = attributedString;
  
#if !TARGET_OS_OSX // [macOS]
  if (selectedRange.empty) {
    // Maintaining a cursor position relative to the end of the old text.
    NSInteger offsetStart = [_backedTextInputView offsetFromPosition:_backedTextInputView.beginningOfDocument
                                                          toPosition:selectedRange.start];
    NSInteger offsetFromEnd = oldTextLength - offsetStart;
    NSInteger newOffset = attributedString.string.length - offsetFromEnd;
    UITextPosition *position = [_backedTextInputView positionFromPosition:_backedTextInputView.beginningOfDocument
                                                                   offset:newOffset];
    [_backedTextInputView setSelectedTextRange:[_backedTextInputView textRangeFromPosition:position toPosition:position]
                                notifyDelegate:YES];
  }
  [self _restoreTextSelection];
  _lastStringStateWasUpdatedWith = attributedString;
#else // [macOS
  if (selection.length == 0) {
    // Maintaining a cursor position relative to the end of the old text.
    NSInteger start = selection.location;
    NSInteger offsetFromEnd = oldTextLength - start;
    NSInteger newOffset = _backedTextInputView.attributedText.length - offsetFromEnd;
    [_backedTextInputView setSelectedTextRange:NSMakeRange(newOffset, 0)
                                      notifyDelegate:YES];
  }
#endif // macOS]
}

- (void)_setMultiline:(BOOL)multiline
{
  [_backedTextInputView removeFromSuperview];
#if !TARGET_OS_OSX // [macOS]
  RCTUIView<RCTBackedTextInputViewProtocol> *backedTextInputView = multiline ? [RCTUITextView new] : [RCTUITextField new];
#else // [macOS
  RCTPlatformView<RCTBackedTextInputViewProtocol> *backedTextInputView = multiline ? [RCTWrappedTextView new] : [RCTUITextField new];
#endif // macOS]
  backedTextInputView.frame = _backedTextInputView.frame;
  RCTCopyBackedTextInput(_backedTextInputView, backedTextInputView);
  _backedTextInputView = backedTextInputView;
  [self addSubview:_backedTextInputView];
}

#if TARGET_OS_OSX // [macOS
- (void)_setSecureTextEntry:(BOOL)secureTextEntry
{
  [_backedTextInputView removeFromSuperview];
  RCTPlatformView<RCTBackedTextInputViewProtocol> *backedTextInputView = secureTextEntry ? [RCTUISecureTextField new] : [RCTUITextField new];
  backedTextInputView.frame = _backedTextInputView.frame;
  RCTCopyBackedTextInput(_backedTextInputView, backedTextInputView);
  
  // Copy the text field specific properties if we came from a single line input before the switch
  if ([_backedTextInputView isKindOfClass:[RCTUITextField class]]) {
    RCTUITextField *previousTextField = (RCTUITextField *)_backedTextInputView;
    RCTUITextField *newTextField = (RCTUITextField *)backedTextInputView;
    newTextField.textAlignment = previousTextField.textAlignment;
    newTextField.text = previousTextField.text;
  }

  _backedTextInputView = backedTextInputView;
  [self addSubview:_backedTextInputView];
}
#endif // macOS]

- (BOOL)_textOf:(NSAttributedString *)newText equals:(NSAttributedString *)oldText
{
  // When the dictation is running we can't update the attributed text on the backed up text view
  // because setting the attributed string will kill the dictation. This means that we can't impose
  // the settings on a dictation.
  // Similarly, when the user is in the middle of inputting some text in Japanese/Chinese, there will be styling on the
  // text that we should disregard. See
  // https://developer.apple.com/documentation/uikit/uitextinput/1614489-markedtextrange?language=objc for more info.
  // Also, updating the attributed text while inputting Korean language will break input mechanism.
  // If the user added an emoji, the system adds a font attribute for the emoji and stores the original font in
  // NSOriginalFont. Lastly, when entering a password, etc., there will be additional styling on the field as the native
  // text view handles showing the last character for a split second.
  __block BOOL fontHasBeenUpdatedBySystem = false;
  [oldText enumerateAttribute:@"NSOriginalFont"
                      inRange:NSMakeRange(0, oldText.length)
                      options:0
                   usingBlock:^(id value, NSRange range, BOOL *stop) {
                     if (value) {
                       fontHasBeenUpdatedBySystem = true;
                     }
                   }];

  BOOL shouldFallbackToBareTextComparison =
#if !TARGET_OS_OSX // [macOS]
  [_backedTextInputView.textInputMode.primaryLanguage isEqualToString:@"dictation"] ||
  [_backedTextInputView.textInputMode.primaryLanguage isEqualToString:@"ko-KR"] ||
  _backedTextInputView.markedTextRange ||
  _backedTextInputView.isSecureTextEntry ||
#else // [macOS
  // There are multiple Korean input sources (2-Set, 3-Set, etc). Check substring instead instead
  [[[_backedTextInputView inputContext] selectedKeyboardInputSource] containsString:@"com.apple.inputmethod.Korean"] ||
  [_backedTextInputView hasMarkedText] ||
  [_backedTextInputView isKindOfClass:[NSSecureTextField class]] ||
#endif // macOS]
  fontHasBeenUpdatedBySystem;

  if (shouldFallbackToBareTextComparison) {
    return ([newText.string isEqualToString:oldText.string]);
  } else {
    return ([newText isEqualToAttributedString:oldText]);
  }
}

- (SubmitBehavior)getSubmitBehavior
{
  const auto &props = static_cast<const TextInputProps &>(*_props);
  const SubmitBehavior submitBehaviorDefaultable = props.traits.submitBehavior;

  // We should always have a non-default `submitBehavior`, but in case we don't, set it based on multiline.
  if (submitBehaviorDefaultable == SubmitBehavior::Default) {
    return props.traits.multiline ? SubmitBehavior::Newline : SubmitBehavior::BlurAndSubmit;
  }

  return submitBehaviorDefaultable;
}

@end

Class<RCTComponentViewProtocol> RCTTextInputCls(void)
{
  return RCTTextInputComponentView.class;
}
