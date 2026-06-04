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
  return UIEdgeInsetsInsetRect([super titleRectForBounds:rect], self.textContainerInset);
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

@end

#endif // TARGET_OS_OSX
