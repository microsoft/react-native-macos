/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import "RCTUITableView.h"

#if TARGET_OS_OSX

#import <objc/runtime.h>

const CGFloat RCTUITableViewAutomaticDimension = -1.0;
static NSString *const RCTUITableViewHeaderHeightConstraintIdentifier = @"RCTUITableViewHeaderHeight";
static char RCTUITableViewHeaderHeightConstraintKey;

typedef NS_ENUM(NSInteger, RCTUITableViewSlotKind) {
  RCTUITableViewSlotKindHeader,
  RCTUITableViewSlotKindRow,
};

@interface RCTUITableViewSlot : NSObject

@property (nonatomic, readonly) RCTUITableViewSlotKind kind;
@property (nonatomic, readonly) NSInteger section;
@property (nonatomic, readonly) NSInteger row;
@property (nonatomic, readonly) CGFloat headerHeight;

- (instancetype)initWithKind:(RCTUITableViewSlotKind)kind
                     section:(NSInteger)section
                         row:(NSInteger)row
                headerHeight:(CGFloat)headerHeight;

@end

@implementation RCTUITableViewSlot

- (instancetype)initWithKind:(RCTUITableViewSlotKind)kind
                     section:(NSInteger)section
                         row:(NSInteger)row
                headerHeight:(CGFloat)headerHeight
{
  if (self = [super init]) {
    _kind = kind;
    _section = section;
    _row = row;
    _headerHeight = headerHeight;
  }

  return self;
}

@end

@implementation NSIndexPath (RCTUITableView)

- (NSInteger)row
{
  return self.item;
}

+ (instancetype)indexPathForRow:(NSInteger)row inSection:(NSInteger)section
{
  return [self indexPathForItem:row inSection:section];
}

@end

@interface RCTUITableViewCell ()

@property (nonatomic, readwrite, nullable, copy) NSString *reuseIdentifier;
@property (nonatomic, readwrite, strong) RCTPlatformView *contentView;
@property (nonatomic, readwrite, strong) RCTUILabel *textLabel;
@property (nonatomic, readwrite, nullable, strong) RCTUILabel *detailTextLabel;

- (void)setFixedHeight:(nullable NSNumber *)fixedHeight;

@end

@implementation RCTUITableViewCell {
  NSLayoutConstraint *_fixedHeightConstraint;
  RCTUITableViewCellStyle _style;
}

- (instancetype)initWithFrame:(NSRect)frameRect
{
  self = [self initWithStyle:RCTUITableViewCellStyleDefault reuseIdentifier:nil];
  self.frame = frameRect;
  return self;
}

- (instancetype)initWithStyle:(RCTUITableViewCellStyle)style reuseIdentifier:(NSString *)reuseIdentifier
{
  if (self = [super initWithFrame:NSZeroRect]) {
    [self initializeWithStyle:style reuseIdentifier:reuseIdentifier];
  }

  return self;
}

- (void)initializeWithStyle:(RCTUITableViewCellStyle)style reuseIdentifier:(NSString *)reuseIdentifier
{
  _style = style;
  _reuseIdentifier = [reuseIdentifier copy];
  self.identifier = reuseIdentifier;
  self.rowSizeStyle = NSTableViewRowSizeStyleCustom;

  _contentView = [[RCTPlatformView alloc] initWithFrame:NSZeroRect];
  _contentView.translatesAutoresizingMaskIntoConstraints = NO;
  [self addSubview:_contentView];
  [NSLayoutConstraint activateConstraints:@[
    [_contentView.leadingAnchor constraintEqualToAnchor:self.leadingAnchor],
    [_contentView.topAnchor constraintEqualToAnchor:self.topAnchor],
    [_contentView.trailingAnchor constraintEqualToAnchor:self.trailingAnchor],
    [_contentView.bottomAnchor constraintEqualToAnchor:self.bottomAnchor],
  ]];

  _textLabel = [[RCTUILabel alloc] initWithFrame:NSZeroRect];
  _textLabel.translatesAutoresizingMaskIntoConstraints = NO;
  [_contentView addSubview:_textLabel];
  self.textField = _textLabel;

  if (style == RCTUITableViewCellStyleSubtitle) {
    _detailTextLabel = [[RCTUILabel alloc] initWithFrame:NSZeroRect];
    _detailTextLabel.translatesAutoresizingMaskIntoConstraints = NO;
    [_contentView addSubview:_detailTextLabel];

    [NSLayoutConstraint activateConstraints:@[
      [_textLabel.leadingAnchor constraintEqualToAnchor:_contentView.leadingAnchor constant:5],
      [_textLabel.topAnchor constraintEqualToAnchor:_contentView.topAnchor],
      [_textLabel.trailingAnchor constraintEqualToAnchor:_contentView.trailingAnchor constant:-5],
      [_detailTextLabel.leadingAnchor constraintEqualToAnchor:_contentView.leadingAnchor constant:5],
      [_detailTextLabel.topAnchor constraintEqualToAnchor:_textLabel.bottomAnchor],
      [_detailTextLabel.trailingAnchor constraintEqualToAnchor:_contentView.trailingAnchor constant:-5],
      [_detailTextLabel.bottomAnchor constraintEqualToAnchor:_contentView.bottomAnchor],
    ]];
  } else {
    [NSLayoutConstraint activateConstraints:@[
      [_textLabel.leadingAnchor constraintEqualToAnchor:_contentView.leadingAnchor constant:5],
      [_textLabel.topAnchor constraintEqualToAnchor:_contentView.topAnchor constant:5],
      [_textLabel.trailingAnchor constraintEqualToAnchor:_contentView.trailingAnchor constant:-5],
      [_textLabel.bottomAnchor constraintEqualToAnchor:_contentView.bottomAnchor constant:-5],
    ]];
  }
}

- (void)setBackgroundColor:(RCTUIColor *)backgroundColor
{
  _backgroundColor = [backgroundColor copy];
  self.contentView.wantsLayer = YES;
  self.contentView.layer.backgroundColor = backgroundColor.CGColor;
}

- (void)setAccessibilityIdentifier:(NSString *)accessibilityIdentifier
{
  [super setAccessibilityIdentifier:accessibilityIdentifier];
  self.textLabel.accessibilityIdentifier = accessibilityIdentifier;
}

- (void)setAccessibilityLabel:(NSString *)accessibilityLabel
{
  [super setAccessibilityLabel:accessibilityLabel];
  self.textLabel.accessibilityLabel = accessibilityLabel;
}

- (void)prepareForReuse
{
  [super prepareForReuse];
  self.textLabel.text = @"";
  self.textLabel.maximumNumberOfLines = _style == RCTUITableViewCellStyleDefault ? 1 : 2;
  self.detailTextLabel.text = @"";
  self.detailTextLabel.maximumNumberOfLines = 1;
}

- (void)setFrameSize:(NSSize)newSize
{
  [super setFrameSize:newSize];

  CGFloat preferredWidth = MAX(newSize.width - 10, 0);
  self.textLabel.preferredMaxLayoutWidth = preferredWidth;
  self.detailTextLabel.preferredMaxLayoutWidth = preferredWidth;
}

- (void)setFixedHeight:(NSNumber *)fixedHeight
{
  if (fixedHeight == nil) {
    _fixedHeightConstraint.active = NO;
    _fixedHeightConstraint = nil;
    return;
  }

  if (_fixedHeightConstraint == nil) {
    _fixedHeightConstraint = [self.heightAnchor constraintEqualToConstant:fixedHeight.doubleValue];
    _fixedHeightConstraint.active = YES;
  } else {
    _fixedHeightConstraint.constant = fixedHeight.doubleValue;
  }
}

@end

@interface RCTUITableView () <NSTableViewDataSource, NSTableViewDelegate>
@end

@implementation RCTUITableView {
  NSTableView *_tableView;
  NSArray<RCTUITableViewSlot *> *_slots;
  NSMutableDictionary<NSNumber *, RCTPlatformView *> *_headerViews;
  NSMutableIndexSet *_automaticRows;
  CGFloat _lastContentWidth;
}

- (instancetype)initWithFrame:(NSRect)frameRect
{
  if (self = [super initWithFrame:frameRect]) {
    self.drawsBackground = NO;

    _slots = @[];
    _headerViews = [NSMutableDictionary new];
    _automaticRows = [NSMutableIndexSet new];

    _tableView = [[NSTableView alloc] initWithFrame:self.contentView.bounds];
    _tableView.autoresizingMask = NSViewWidthSizable;
    _tableView.dataSource = self;
    _tableView.delegate = self;
    _tableView.headerView = nil;
    _tableView.allowsColumnReordering = NO;
    _tableView.allowsColumnResizing = NO;
    _tableView.allowsTypeSelect = NO;
    _tableView.columnAutoresizingStyle = NSTableViewFirstColumnOnlyAutoresizingStyle;
    _tableView.backgroundColor = NSColor.clearColor;
    _tableView.style = NSTableViewStyleInset;
    _tableView.usesAutomaticRowHeights = YES;
    _tableView.accessibilityRole = NSAccessibilityTableRole;

    NSTableColumn *column = [[NSTableColumn alloc] initWithIdentifier:@"RCTUITableViewColumn"];
    [_tableView addTableColumn:column];

    self.documentView = _tableView;
    _lastContentWidth = self.contentSize.width;
    self.separatorColor = nil;
  }

  return self;
}

- (void)setAccessibilityIdentifier:(NSString *)accessibilityIdentifier
{
  [super setAccessibilityIdentifier:accessibilityIdentifier];
  _tableView.accessibilityIdentifier = accessibilityIdentifier;
}

- (void)setSeparatorColor:(RCTUIColor *)separatorColor
{
  _separatorColor = [separatorColor copy];
  if (separatorColor == nil) {
    _tableView.gridStyleMask = NSTableViewGridNone;
  } else {
    _tableView.gridColor = separatorColor;
    _tableView.gridStyleMask = NSTableViewSolidHorizontalGridLineMask;
  }
}

- (void)setFrameSize:(NSSize)newSize
{
  [super setFrameSize:newSize];

  CGFloat contentWidth = self.contentSize.width;
  if (_lastContentWidth != contentWidth) {
    _lastContentWidth = contentWidth;
    if (_automaticRows.count > 0) {
      [_tableView noteHeightOfRowsWithIndexesChanged:_automaticRows];
    }
  }
}

- (void)reloadData
{
  for (RCTPlatformView *headerView in _headerViews.allValues) {
    NSLayoutConstraint *heightConstraint =
        objc_getAssociatedObject(headerView, &RCTUITableViewHeaderHeightConstraintKey);
    heightConstraint.active = NO;
  }
  [_headerViews removeAllObjects];
  [_automaticRows removeAllIndexes];

  NSInteger sectionCount = 1;
  if ([self.dataSource respondsToSelector:@selector(numberOfSectionsInTableView:)]) {
    sectionCount = [self.dataSource numberOfSectionsInTableView:self];
  }
  sectionCount = MAX(sectionCount, 0);

  NSMutableArray<RCTUITableViewSlot *> *slots = [NSMutableArray new];
  for (NSInteger section = 0; section < sectionCount; section++) {
    if ([self.delegate respondsToSelector:@selector(tableView:heightForHeaderInSection:)]) {
      CGFloat headerHeight = [self.delegate tableView:self heightForHeaderInSection:section];
      if (headerHeight > 0) {
        [slots addObject:[[RCTUITableViewSlot alloc] initWithKind:RCTUITableViewSlotKindHeader
                                                        section:section
                                                            row:NSNotFound
                                                   headerHeight:headerHeight]];
      }
    }

    NSInteger rowCount = MAX([self.dataSource tableView:self numberOfRowsInSection:section], 0);
    for (NSInteger row = 0; row < rowCount; row++) {
      [slots addObject:[[RCTUITableViewSlot alloc] initWithKind:RCTUITableViewSlotKindRow
                                                      section:section
                                                          row:row
                                                 headerHeight:0]];
    }
  }

  _slots = [slots copy];
  [_tableView reloadData];
}

- (__kindof RCTUITableViewCell *)dequeueReusableCellWithIdentifier:(NSString *)identifier
{
  return [_tableView makeViewWithIdentifier:identifier owner:self];
}

- (void)scrollToRowAtIndexPath:(NSIndexPath *)indexPath
              atScrollPosition:(RCTUITableViewScrollPosition)position
                      animated:(BOOL)animated
{
  NSInteger backingRow = [self backingRowForIndexPath:indexPath];
  if (backingRow == NSNotFound || position != RCTUITableViewScrollPositionTop) {
    return;
  }

  NSRect rowRect = [_tableView rectOfRow:backingRow];
  NSClipView *clipView = self.contentView;
  NSRect proposedBounds = clipView.bounds;
  proposedBounds.origin.y = NSMinY(rowRect);
  NSRect constrainedBounds = [clipView constrainBoundsRect:proposedBounds];
  [clipView scrollToPoint:constrainedBounds.origin];
  [self reflectScrolledClipView:clipView];
}

- (void)deselectRowAtIndexPath:(NSIndexPath *)indexPath animated:(BOOL)animated
{
  NSInteger backingRow = [self backingRowForIndexPath:indexPath];
  if (backingRow != NSNotFound && [_tableView.selectedRowIndexes containsIndex:backingRow]) {
    [_tableView deselectRow:backingRow];
  }
}

- (NSInteger)backingRowForIndexPath:(NSIndexPath *)indexPath
{
  for (NSInteger backingRow = 0; backingRow < (NSInteger)_slots.count; backingRow++) {
    RCTUITableViewSlot *slot = _slots[backingRow];
    if (slot.kind == RCTUITableViewSlotKindRow && slot.section == indexPath.section && slot.row == indexPath.row) {
      return backingRow;
    }
  }
  return NSNotFound;
}

- (NSInteger)numberOfRowsInTableView:(NSTableView *)tableView
{
  return _slots.count;
}

- (NSView *)tableView:(NSTableView *)tableView
    viewForTableColumn:(NSTableColumn *)tableColumn
                   row:(NSInteger)row
{
  return [self viewForBackingRow:row];
}

- (NSView *)viewForBackingRow:(NSInteger)backingRow
{
  RCTUITableViewSlot *slot = _slots[backingRow];
  if (slot.kind == RCTUITableViewSlotKindRow) {
    NSIndexPath *indexPath = [NSIndexPath indexPathForRow:slot.row inSection:slot.section];
    RCTUITableViewCell *cell = [self.dataSource tableView:self cellForRowAtIndexPath:indexPath];
    CGFloat height = [self requestedHeightForSlot:slot];
    [cell setFixedHeight:height == RCTUITableViewAutomaticDimension ? nil : @(height)];
    return cell;
  }

  NSNumber *sectionKey = @(slot.section);
  RCTPlatformView *headerView = _headerViews[sectionKey];
  if (headerView == nil) {
    if ([self.delegate respondsToSelector:@selector(tableView:viewForHeaderInSection:)]) {
      headerView = [self.delegate tableView:self viewForHeaderInSection:slot.section];
    }
    if (headerView == nil) {
      headerView = [RCTPlatformView new];
    }
    headerView.translatesAutoresizingMaskIntoConstraints = NO;
    NSLayoutConstraint *heightConstraint =
        objc_getAssociatedObject(headerView, &RCTUITableViewHeaderHeightConstraintKey);
    if (heightConstraint == nil) {
      heightConstraint = [headerView.heightAnchor constraintEqualToConstant:slot.headerHeight];
      heightConstraint.identifier = RCTUITableViewHeaderHeightConstraintIdentifier;
      objc_setAssociatedObject(
          headerView,
          &RCTUITableViewHeaderHeightConstraintKey,
          heightConstraint,
          OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    } else {
      heightConstraint.constant = slot.headerHeight;
    }
    heightConstraint.active = YES;
    _headerViews[sectionKey] = headerView;
  }
  return headerView;
}

- (CGFloat)tableView:(NSTableView *)tableView heightOfRow:(NSInteger)row
{
  RCTUITableViewSlot *slot = _slots[row];
  if (slot.kind == RCTUITableViewSlotKindHeader) {
    return slot.headerHeight;
  }

  CGFloat height = [self requestedHeightForSlot:slot];
  if (height != RCTUITableViewAutomaticDimension) {
    return height;
  }

  [_automaticRows addIndex:row];
  return tableView.rowHeight;
}

- (CGFloat)requestedHeightForSlot:(RCTUITableViewSlot *)slot
{
  if (![self.delegate respondsToSelector:@selector(tableView:heightForRowAtIndexPath:)]) {
    return _tableView.rowHeight;
  }

  NSIndexPath *indexPath = [NSIndexPath indexPathForRow:slot.row inSection:slot.section];
  return [self.delegate tableView:self heightForRowAtIndexPath:indexPath];
}

- (BOOL)tableView:(NSTableView *)tableView shouldSelectRow:(NSInteger)row
{
  RCTUITableViewSlot *slot = _slots[row];
  if (slot.kind == RCTUITableViewSlotKindHeader) {
    return NO;
  }

  if ([self.delegate respondsToSelector:@selector(tableView:didSelectRowAtIndexPath:)]) {
    NSIndexPath *indexPath = [NSIndexPath indexPathForRow:slot.row inSection:slot.section];
    [self.delegate tableView:self didSelectRowAtIndexPath:indexPath];
  }
  return NO;
}

@end

#endif
