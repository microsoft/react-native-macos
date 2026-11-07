/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#if TARGET_OS_OSX

#import <React/RCTUISecureTextField.h>
#import <React/RCTUIKit.h>

#pragma mark - RCTUISecureTextFieldCell

@interface RCTUISecureTextFieldCell : NSSecureTextFieldCell

@property (nonatomic, assign) UIEdgeInsets textContainerInset;
@property (nonatomic, getter=isAutomaticTextReplacementEnabled) BOOL automaticTextReplacementEnabled;
@property (nonatomic, getter=isAutomaticSpellingCorrectionEnabled) BOOL automaticSpellingCorrectionEnabled;
@property (nonatomic, getter=isContinuousSpellCheckingEnabled) BOOL continuousSpellCheckingEnabled;
@property (nonatomic, getter=isGrammarCheckingEnabled) BOOL grammarCheckingEnabled;
@property (nonatomic, strong, nullable) RCTPlatformColor *selectionColor;
@property (nonatomic, strong, nullable) RCTPlatformColor *insertionPointColor;

@end

@implementation RCTUISecureTextFieldCell

- (NSRect)titleRectForBounds:(NSRect)rect
{
  NSRect titleRect = UIEdgeInsetsInsetRect([super titleRectForBounds:rect], self.textContainerInset);
  // Center the intrinsic text height within the padded control bounds.
  CGFloat contentHeight = self.cellSize.height;
  if (contentHeight < titleRect.size.height) {
    titleRect.origin.y += (titleRect.size.height - contentHeight) / 2;
    titleRect.size.height = contentHeight;
  }
  return titleRect;
}

- (void)editWithFrame:(NSRect)rect inView:(NSView *)controlView editor:(NSText *)textObj delegate:(id)delegate event:(NSEvent *)event
{
  [super editWithFrame:[self titleRectForBounds:rect] inView:controlView editor:textObj delegate:delegate event:event];
}

- (void)selectWithFrame:(NSRect)rect inView:(NSView *)controlView editor:(NSText *)textObj delegate:(id)delegate start:(NSInteger)selStart length:(NSInteger)selLength
{
  [super selectWithFrame:[self titleRectForBounds:rect] inView:controlView editor:textObj delegate:delegate start:selStart length:selLength];
}

- (void)drawInteriorWithFrame:(NSRect)cellFrame inView:(NSView *)controlView
{
  if (self.drawsBackground && self.backgroundColor && self.backgroundColor.alphaComponent > 0) {
    [self.backgroundColor set];
    NSRectFill(cellFrame);
  }

  [super drawInteriorWithFrame:[self titleRectForBounds:cellFrame] inView:controlView];
}

- (NSText *)setUpFieldEditorAttributes:(NSText *)textObj
{
  NSTextView *fieldEditor = (NSTextView *)[super setUpFieldEditorAttributes:textObj];
  fieldEditor.automaticSpellingCorrectionEnabled = self.isAutomaticSpellingCorrectionEnabled;
  fieldEditor.automaticTextReplacementEnabled = self.isAutomaticTextReplacementEnabled;
  fieldEditor.continuousSpellCheckingEnabled = self.isContinuousSpellCheckingEnabled;
  fieldEditor.grammarCheckingEnabled = self.isGrammarCheckingEnabled;
  NSMutableDictionary *selectTextAttributes = fieldEditor.selectedTextAttributes.mutableCopy;
  selectTextAttributes[NSBackgroundColorAttributeName] = self.selectionColor ?: [NSColor selectedControlColor];
  fieldEditor.selectedTextAttributes = selectTextAttributes;
  fieldEditor.insertionPointColor = self.insertionPointColor ?: [NSColor textColor];
  return fieldEditor;
}

@end

#pragma mark - RCTUISecureTextField

@implementation RCTUISecureTextField

+ (Class)cellClass
{
  return RCTUISecureTextFieldCell.class;
}

// AppKit's secure field editor (NSSecureTextView) requires its delegate to be an NSSecureTextField,
// and throws as the field takes focus when it is not ("NSSecureTextFieldCell is not secure because
// the secure field editor's delegate must be an NSSecureTextField!"). This class subclasses
// RCTUITextField to share its behaviour, but its cell is an NSSecureTextFieldCell, which masks the
// text and turns on secure keyboard input, so it answers as an NSSecureTextField.
- (BOOL)isKindOfClass:(Class)aClass
{
  return aClass == [NSSecureTextField class] || [super isKindOfClass:aClass];
}

// Taken for an NSSecureTextField, the field is also asked this by NSSecureTextView as it draws, and
// an unanswered message throws there. NSSecureTextField answers from a flag that is off unless its
// private setter turns it on, so this answers NO, as an NSSecureTextField does by default.
- (BOOL)_shouldShowIndicators
{
  return NO;
}

@end

#endif // TARGET_OS_OSX
