/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import "RCTUIButton.h"

#import <objc/runtime.h>

@interface RCTUIAction ()

- (instancetype)initWithHandler:(RCTUIActionHandler)handler;
- (void)invoke;

@end

@implementation RCTUIAction

+ (instancetype)actionWithHandler:(RCTUIActionHandler)handler
{
  return [[self alloc] initWithHandler:handler];
}

- (instancetype)initWithHandler:(RCTUIActionHandler)handler
{
  if (self = [super init]) {
    _handler = [handler copy];
  }
  return self;
}

- (void)invoke
{
  self.handler();
}

@end

#if TARGET_OS_OSX

@class RCTUIButton;

@interface RCTUIButtonTitleProxy ()

@property (nonatomic, weak) RCTUIButton *button;

- (instancetype)initWithButton:(RCTUIButton *)button;

@end

@interface RCTUIButton ()

- (void)updateAttributedTitles;

@end

@implementation RCTUIButtonTitleProxy

- (instancetype)initWithButton:(RCTUIButton *)button
{
  if (self = [super init]) {
    _button = button;
    _font = button.font;
    _lineBreakMode = NSLineBreakByClipping;
    _textAlignment = NSTextAlignmentNatural;
  }
  return self;
}

- (void)setFont:(UIFont *)font
{
  _font = font;
  [self.button updateAttributedTitles];
}

- (void)setLineBreakMode:(NSLineBreakMode)lineBreakMode
{
  _lineBreakMode = lineBreakMode;
  [self.button updateAttributedTitles];
}

- (void)setTextAlignment:(NSTextAlignment)textAlignment
{
  _textAlignment = textAlignment;
  [self.button updateAttributedTitles];
}

@end

@implementation RCTUIButton {
  NSString *_normalTitle;
  NSString *_highlightedTitle;
  RCTUIColor *_normalTitleColor;
  RCTUIColor *_highlightedTitleColor;
}

- (instancetype)initWithFrame:(NSRect)frameRect
{
  if (self = [super initWithFrame:frameRect]) {
    _titleLabel = [[RCTUIButtonTitleProxy alloc] initWithButton:self];
  }
  return self;
}

- (instancetype)initWithCoder:(NSCoder *)coder
{
  if (self = [super initWithCoder:coder]) {
    _titleLabel = [[RCTUIButtonTitleProxy alloc] initWithButton:self];
  }
  return self;
}

- (void)setTitle:(NSString *)title forState:(RCTUIControlState)state
{
  if (state == RCTUIControlStateHighlighted) {
    _highlightedTitle = [title copy];
  } else {
    _normalTitle = [title copy];
  }
  [self updateAttributedTitles];
}

- (void)setTitleColor:(RCTUIColor *)color forState:(RCTUIControlState)state
{
  if (state == RCTUIControlStateHighlighted) {
    _highlightedTitleColor = [color copy];
  } else {
    _normalTitleColor = [color copy];
  }
  [self updateAttributedTitles];
}

- (void)setBackgroundColor:(RCTUIColor *)backgroundColor
{
  _backgroundColor = [backgroundColor copy];
  self.wantsLayer = YES;
  self.layer.backgroundColor = backgroundColor.CGColor;
  self.bordered = NO;
}

- (void)updateAttributedTitles
{
  self.attributedTitle = [self attributedTitleForTitle:_normalTitle ?: @""
                                                 color:_normalTitleColor];
  self.attributedAlternateTitle = [self attributedTitleForTitle:_highlightedTitle ?: _normalTitle ?: @""
                                                          color:_highlightedTitleColor ?: _normalTitleColor];
}

- (NSAttributedString *)attributedTitleForTitle:(NSString *)title color:(RCTUIColor *)color
{
  NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary new];
  if (color != nil) {
    attributes[NSForegroundColorAttributeName] = color;
  }
  if (self.titleLabel.font != nil) {
    attributes[NSFontAttributeName] = self.titleLabel.font;
  }

  NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
  paragraphStyle.lineBreakMode = self.titleLabel.lineBreakMode;
  paragraphStyle.alignment = self.titleLabel.textAlignment;
  attributes[NSParagraphStyleAttributeName] = paragraphStyle;

  return [[NSAttributedString alloc] initWithString:title attributes:attributes];
}

@end

#endif

@implementation RCTUIButton (RCTUIAction)

- (void)rct_setPrimaryAction:(RCTUIAction *)action
{
#if !TARGET_OS_OSX
  RCTUIAction *previousAction = objc_getAssociatedObject(self, @selector(rct_setPrimaryAction:));
  if (previousAction != nil) {
    [self removeTarget:previousAction action:@selector(invoke) forControlEvents:UIControlEventTouchUpInside];
  }
#endif

  objc_setAssociatedObject(
      self, @selector(rct_setPrimaryAction:), action, OBJC_ASSOCIATION_RETAIN_NONATOMIC);

#if !TARGET_OS_OSX
  [self addTarget:action action:@selector(invoke) forControlEvents:UIControlEventTouchUpInside];
#else
  self.target = action;
  self.action = @selector(invoke);
#endif
}

@end
