/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <TargetConditionals.h>
#import <XCTest/XCTest.h>

#if TARGET_OS_OSX // [macOS

#import <React/RCTUIKit.h>

typedef RCTUITableViewCell * (^RCTUITableViewTestCellProvider)(
    RCTUITableView *tableView,
    NSIndexPath *indexPath);
typedef CGFloat (^RCTUITableViewTestHeightProvider)(NSIndexPath *indexPath);
typedef RCTPlatformView * (^RCTUITableViewTestHeaderProvider)(NSInteger section);

static void RCTUIPumpRunLoop(NSTimeInterval duration)
{
  NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:duration];
  while (deadline.timeIntervalSinceNow > 0) {
    NSDate *slice = [NSDate dateWithTimeIntervalSinceNow:0.002];
    NSEvent *event = [NSApp nextEventMatchingMask:NSEventMaskAny
                                       untilDate:slice
                                          inMode:NSDefaultRunLoopMode
                                         dequeue:YES];
    if (event != nil) {
      [NSApp sendEvent:event];
    }
    [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:slice];
  }
}

static NSTableView *RCTUIBackingTable(RCTUITableView *tableView)
{
  XCTAssertTrue([tableView.documentView isKindOfClass:NSTableView.class]);
  return (NSTableView *)tableView.documentView;
}

@interface RCTUITableViewTestDataSource : NSObject <RCTUITableViewDataSource, RCTUITableViewDelegate>

@property (nonatomic, copy) NSArray<NSNumber *> *rowCounts;
@property (nonatomic, copy) NSArray<NSNumber *> *headerHeights;
@property (nonatomic, copy) RCTUITableViewTestCellProvider cellProvider;
@property (nonatomic, copy) RCTUITableViewTestHeightProvider heightProvider;
@property (nonatomic, copy) RCTUITableViewTestHeaderProvider headerProvider;
@property (nonatomic, strong) NSMutableDictionary<NSNumber *, NSNumber *> *headerViewCallCounts;
@property (nonatomic, strong) NSIndexPath *selectedIndexPath;

@end

@implementation RCTUITableViewTestDataSource

- (instancetype)init
{
  if (self = [super init]) {
    _rowCounts = @[];
    _headerHeights = @[];
    _headerViewCallCounts = [NSMutableDictionary new];
  }
  return self;
}

- (NSInteger)numberOfSectionsInTableView:(RCTUITableView *)tableView
{
  return self.rowCounts.count;
}

- (NSInteger)tableView:(RCTUITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  return self.rowCounts[section].integerValue;
}

- (RCTUITableViewCell *)tableView:(RCTUITableView *)tableView
           cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (self.cellProvider != nil) {
    return self.cellProvider(tableView, indexPath);
  }

  RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"cell"];
  if (cell == nil) {
    cell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault reuseIdentifier:@"cell"];
  }
  cell.textLabel.text = [NSString stringWithFormat:@"%ld:%ld", (long)indexPath.section, (long)indexPath.row];
  return cell;
}

- (CGFloat)tableView:(RCTUITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath
{
  return self.heightProvider != nil ? self.heightProvider(indexPath) : 24;
}

- (CGFloat)tableView:(RCTUITableView *)tableView heightForHeaderInSection:(NSInteger)section
{
  return section < (NSInteger)self.headerHeights.count ? self.headerHeights[section].doubleValue : 0;
}

- (RCTPlatformView *)tableView:(RCTUITableView *)tableView viewForHeaderInSection:(NSInteger)section
{
  NSNumber *key = @(section);
  self.headerViewCallCounts[key] = @(self.headerViewCallCounts[key].integerValue + 1);
  return self.headerProvider != nil ? self.headerProvider(section) : [RCTPlatformView new];
}

- (void)tableView:(RCTUITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
  self.selectedIndexPath = indexPath;
}

@end

@interface RCTUITableViewSingleSectionDataSource : NSObject <RCTUITableViewDataSource>

@property (nonatomic, assign) NSInteger rowCount;

@end

@implementation RCTUITableViewSingleSectionDataSource

- (NSInteger)tableView:(RCTUITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  XCTAssertEqual(section, 0);
  return self.rowCount;
}

- (RCTUITableViewCell *)tableView:(RCTUITableView *)tableView
           cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"single-section"];
  return cell ?: [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                           reuseIdentifier:@"single-section"];
}

@end

static NSInteger RCTUITrackingCellAllocationCount;

@interface RCTUITrackingTableCell : RCTUITableViewCell

@property (nonatomic, assign) NSInteger prepareForReuseCount;
@property (nonatomic, assign) NSInteger vendCount;

@end

@implementation RCTUITrackingTableCell

- (instancetype)initWithStyle:(RCTUITableViewCellStyle)style reuseIdentifier:(NSString *)reuseIdentifier
{
  if (self = [super initWithStyle:style reuseIdentifier:reuseIdentifier]) {
    RCTUITrackingCellAllocationCount++;
  }
  return self;
}

- (void)prepareForReuse
{
  [super prepareForReuse];
  self.prepareForReuseCount++;
}

@end

static CGFloat RCTUIExpectedTextHeight(NSString *text, NSFont *font, CGFloat width)
{
  NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
  paragraphStyle.lineBreakMode = NSLineBreakByWordWrapping;
  NSRect bounds = [text boundingRectWithSize:NSMakeSize(width, CGFLOAT_MAX)
                                     options:NSStringDrawingUsesLineFragmentOrigin
                                  attributes:@{
                                    NSFontAttributeName : font,
                                    NSParagraphStyleAttributeName : paragraphStyle,
                                  }];
  return ceil(NSHeight(bounds)) + 10;
}

@interface RCTUISizingTableCell : RCTUITableViewCell

@property (nonatomic, copy) NSString *sizingText;
@property (nonatomic, strong) NSFont *sizingFont;
@property (nonatomic, assign) CGFloat lastFittingWidth;

@end

@implementation RCTUISizingTableCell

- (NSSize)fittingSize
{
  self.lastFittingWidth = NSWidth(self.frame);
  return NSMakeSize(
      self.lastFittingWidth, RCTUIExpectedTextHeight(self.sizingText, self.sizingFont, self.lastFittingWidth));
}

@end

@interface RCTUITableViewTests : XCTestCase
@end

@implementation RCTUITableViewTests {
  NSWindow *_window;
  RCTUITableView *_tableView;
  id _dataSource;
  id _delegate;
}

- (void)setUp
{
  [super setUp];
  [NSApplication sharedApplication];
  NSApp.activationPolicy = NSApplicationActivationPolicyAccessory;

  _window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 600, 400)
                                        styleMask:NSWindowStyleMaskTitled
                                          backing:NSBackingStoreBuffered
                                            defer:NO];
  [_window setFrameOrigin:NSMakePoint(-4000, -4000)];

  _tableView = [[RCTUITableView alloc] initWithFrame:NSZeroRect];
  _tableView.translatesAutoresizingMaskIntoConstraints = NO;
  [_window.contentView addSubview:_tableView];
  [NSLayoutConstraint activateConstraints:@[
    [_tableView.leadingAnchor constraintEqualToAnchor:_window.contentView.leadingAnchor],
    [_tableView.topAnchor constraintEqualToAnchor:_window.contentView.topAnchor],
    [_tableView.trailingAnchor constraintEqualToAnchor:_window.contentView.trailingAnchor],
    [_tableView.bottomAnchor constraintEqualToAnchor:_window.contentView.bottomAnchor],
  ]];

  [_window orderFront:nil];
}

- (void)tearDown
{
  [_window orderOut:nil];
  [_window close];
  _delegate = nil;
  _dataSource = nil;
  _tableView = nil;
  _window = nil;
  [super tearDown];
}

- (void)installDataSource:(id<RCTUITableViewDataSource>)dataSource
                 delegate:(id<RCTUITableViewDelegate>)delegate
{
  _dataSource = dataSource;
  _delegate = delegate;
  _tableView.dataSource = dataSource;
  _tableView.delegate = delegate;
}

- (void)setContentWidth:(CGFloat)width
{
  [_window setContentSize:NSMakeSize(width, 400)];
  [self forceLayoutAndDisplay];
}

- (void)forceLayoutAndDisplay
{
  [_window.contentView layoutSubtreeIfNeeded];
  [_tableView layoutSubtreeIfNeeded];
  [RCTUIBackingTable(_tableView) layoutSubtreeIfNeeded];
  [_window displayIfNeeded];
  RCTUIPumpRunLoop(0.05);
}

- (void)reloadAndDisplay
{
  [_tableView reloadData];
  [self forceLayoutAndDisplay];
}

- (void)testSectionsDefaultsAndEmptySections
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@1, @0, @4];
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  XCTAssertEqual(RCTUIBackingTable(_tableView).numberOfRows, 5);
  NSIndexPath *indexPath = [NSIndexPath indexPathForRow:3 inSection:2];
  XCTAssertEqual(indexPath.section, 2);
  XCTAssertEqual(indexPath.row, 3);

  RCTUITableViewSingleSectionDataSource *singleSection = [RCTUITableViewSingleSectionDataSource new];
  singleSection.rowCount = 2;
  [self installDataSource:singleSection delegate:nil];
  [self reloadAndDisplay];
  XCTAssertEqual(RCTUIBackingTable(_tableView).numberOfRows, 2);

  singleSection.rowCount = 0;
  [self reloadAndDisplay];
  XCTAssertEqual(RCTUIBackingTable(_tableView).numberOfRows, 0);
}

- (void)testRowsTrackSuccessiveReloads
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  [self installDataSource:dataSource delegate:dataSource];

  for (NSNumber *rowCount in @[@2, @9, @1, @0]) {
    dataSource.rowCounts = @[rowCount];
    [self reloadAndDisplay];
    XCTAssertEqual(RCTUIBackingTable(_tableView).numberOfRows, rowCount.integerValue);
    XCTAssertTrue(isfinite(NSMinY(_tableView.visibleRect)));
    XCTAssertGreaterThanOrEqual(NSWidth(_tableView.visibleRect), 0);
    XCTAssertGreaterThanOrEqual(NSHeight(_tableView.visibleRect), 0);
  }
}

- (void)testRealReuseIsNilFirstBoundedAndPreparedExactlyOnce
{
  RCTUITrackingCellAllocationCount = 0;
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@200];

  __block BOOL observedFirstDequeue = NO;
  __block BOOL firstDequeueWasNil = NO;
  __block BOOL prepareCountMismatch = NO;
  __block BOOL doubleAttachmentDetected = NO;
  NSMutableArray<RCTUITrackingTableCell *> *allocatedCells = [NSMutableArray new];
  dataSource.cellProvider = ^RCTUITableViewCell *(RCTUITableView *tableView, NSIndexPath *indexPath) {
    RCTUITrackingTableCell *cell = [tableView dequeueReusableCellWithIdentifier:@"tracking"];
    if (!observedFirstDequeue) {
      observedFirstDequeue = YES;
      firstDequeueWasNil = cell == nil;
    }

    if (cell == nil) {
      cell = [[RCTUITrackingTableCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                           reuseIdentifier:@"tracking"];
      [allocatedCells addObject:cell];
    } else {
      doubleAttachmentDetected |= cell.superview != nil;
      prepareCountMismatch |= cell.prepareForReuseCount != cell.vendCount;
    }

    cell.vendCount++;
    cell.textLabel.text = [NSString stringWithFormat:@"Row %ld", (long)indexPath.row];
    return cell;
  };

  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  NSUInteger maximumVisibleRows = [backingTable rowsInRect:backingTable.visibleRect].length;
  XCTAssertGreaterThan(maximumVisibleRows, 0u);

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:199 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  maximumVisibleRows = MAX(maximumVisibleRows, [backingTable rowsInRect:backingTable.visibleRect].length);

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  maximumVisibleRows = MAX(maximumVisibleRows, [backingTable rowsInRect:backingTable.visibleRect].length);

  XCTAssertTrue(observedFirstDequeue);
  XCTAssertTrue(firstDequeueWasNil);
  XCTAssertFalse(prepareCountMismatch);
  XCTAssertFalse(doubleAttachmentDetected);
  XCTAssertLessThanOrEqual(RCTUITrackingCellAllocationCount, (NSInteger)(3 * maximumVisibleRows));
  for (RCTUITrackingTableCell *cell in allocatedCells) {
    XCTAssertEqual(cell.prepareForReuseCount, MAX(cell.vendCount - 1, 0));
  }
}

- (void)testSelectionDeselectAndHeaderNonselection
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@1, @2];
  dataSource.headerHeights = @[@24, @0];
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertFalse([backingTable.delegate tableView:backingTable shouldSelectRow:0]);
  XCTAssertNil(dataSource.selectedIndexPath);

  XCTAssertFalse([backingTable.delegate tableView:backingTable shouldSelectRow:3]);
  XCTAssertEqual(dataSource.selectedIndexPath.section, 1);
  XCTAssertEqual(dataSource.selectedIndexPath.row, 1);
  XCTAssertEqual(backingTable.selectedRow, -1);

  XCTAssertNoThrow([_tableView deselectRowAtIndexPath:[NSIndexPath indexPathForRow:1 inSection:1] animated:YES]);
  XCTAssertEqual(backingTable.selectedRow, -1);
}

- (void)testMixedAutomaticAndFixedHeightsReflowWithContentWidth
{
  NSString *text =
      @"This deliberately long automatic row wraps repeatedly so the test can distinguish a wide content width from "
       "a narrow content width while preserving fixed rows. The compatibility layer must measure against the clip "
       "view's content width every time the window changes size, without allowing the two fixed rows to drift. This "
       "additional sentence keeps the wide layout above fifty points and makes the narrow reflow unambiguous.";
  NSFont *font = [NSFont systemFontOfSize:14];
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@1, @2];

  __block RCTUISizingTableCell *sizingCell;
  dataSource.cellProvider = ^RCTUITableViewCell *(RCTUITableView *tableView, NSIndexPath *indexPath) {
    if (indexPath.section == 0) {
      sizingCell = [tableView dequeueReusableCellWithIdentifier:@"sizing"];
      if (sizingCell == nil) {
        sizingCell = [[RCTUISizingTableCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                                 reuseIdentifier:@"sizing"];
      }
      sizingCell.sizingText = text;
      sizingCell.sizingFont = font;
      sizingCell.textLabel.text = text;
      sizingCell.contentView.wantsLayer = YES;
      sizingCell.contentView.layer.cornerRadius = 8;
      sizingCell.contentView.layer.cornerCurve = kCACornerCurveContinuous;
      return sizingCell;
    }

    RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"fixed"];
    return cell ?: [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault reuseIdentifier:@"fixed"];
  };
  dataSource.heightProvider = ^CGFloat(NSIndexPath *indexPath) {
    return indexPath.section == 0 ? RCTUITableViewAutomaticDimension : 50;
  };

  [self installDataSource:dataSource delegate:dataSource];
  [self setContentWidth:880];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertEqual(backingTable.effectiveStyle, NSTableViewStyleInset);
  NSRect wideCellFrame = [backingTable frameOfCellAtColumn:0 row:0];
  XCTAssertEqual(NSMinX(wideCellFrame), 16);
  XCTAssertEqual(NSWidth(wideCellFrame), 848);

  CGFloat wideContentWidth = _tableView.contentSize.width;
  CGFloat wideHeight = NSHeight([backingTable rectOfRow:0]);
  XCTAssertEqual(sizingCell.lastFittingWidth, wideContentWidth);
  XCTAssertEqualWithAccuracy(wideHeight, RCTUIExpectedTextHeight(text, font, wideContentWidth), 0.5);
  XCTAssertGreaterThan(wideHeight, 50);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:1]), 50, 0.5);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:2]), 50, 0.5);
  XCTAssertEqual(sizingCell.contentView.layer.cornerRadius, 8);
  XCTAssertEqualObjects(sizingCell.contentView.layer.cornerCurve, kCACornerCurveContinuous);

  [self setContentWidth:320];
  NSRect narrowCellFrame = [backingTable frameOfCellAtColumn:0 row:0];
  XCTAssertEqual(NSMinX(narrowCellFrame), 16);
  XCTAssertEqual(NSWidth(narrowCellFrame), 288);

  CGFloat narrowContentWidth = _tableView.contentSize.width;
  CGFloat narrowHeight = NSHeight([backingTable rectOfRow:0]);
  XCTAssertEqual(sizingCell.lastFittingWidth, narrowContentWidth);
  XCTAssertEqualWithAccuracy(narrowHeight, RCTUIExpectedTextHeight(text, font, narrowContentWidth), 0.5);
  XCTAssertGreaterThan(narrowHeight, wideHeight);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:1]), 50, 0.5);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:2]), 50, 0.5);
}

- (void)testHeadersAreLazyStablePerReloadAndHeightZeroHasNoSlot
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@40, @0, @40];
  dataSource.headerHeights = @[@30, @0, @25];
  dataSource.headerProvider = ^RCTPlatformView *(NSInteger section) {
    RCTPlatformView *view = [RCTPlatformView new];
    view.accessibilityIdentifier = [NSString stringWithFormat:@"header-%ld", (long)section];
    return view;
  };
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertEqual(backingTable.numberOfRows, 82);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:0]), 30, 0.5);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:41]), 25, 0.5);
  XCTAssertFalse([backingTable.delegate tableView:backingTable shouldSelectRow:0]);
  XCTAssertFalse([backingTable.delegate tableView:backingTable shouldSelectRow:41]);

  NSView *firstHeader = [backingTable.delegate tableView:backingTable
                                      viewForTableColumn:backingTable.tableColumns.firstObject
                                                     row:0];
  NSView *firstHeaderAgain = [backingTable.delegate tableView:backingTable
                                           viewForTableColumn:backingTable.tableColumns.firstObject
                                                          row:0];
  XCTAssertEqual(firstHeader, firstHeaderAgain);
  NSView *thirdSectionHeader = [backingTable.delegate tableView:backingTable
                                             viewForTableColumn:backingTable.tableColumns.firstObject
                                                            row:41];
  NSView *thirdSectionHeaderAgain = [backingTable.delegate tableView:backingTable
                                                  viewForTableColumn:backingTable.tableColumns.firstObject
                                                                 row:41];
  XCTAssertEqual(thirdSectionHeader, thirdSectionHeaderAgain);
  XCTAssertEqual(dataSource.headerViewCallCounts[@0].integerValue, 1);
  XCTAssertEqual(dataSource.headerViewCallCounts[@1].integerValue, 0);
  XCTAssertEqual(dataSource.headerViewCallCounts[@2].integerValue, 1);

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:39 inSection:2]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  XCTAssertEqual(dataSource.headerViewCallCounts[@0].integerValue, 1);
  XCTAssertEqual(dataSource.headerViewCallCounts[@2].integerValue, 1);

  dataSource.headerViewCallCounts[@0] = @0;
  dataSource.headerViewCallCounts[@2] = @0;
  [self reloadAndDisplay];
  NSView *nextGenerationHeader = [backingTable.delegate tableView:backingTable
                                                   viewForTableColumn:backingTable.tableColumns.firstObject
                                                                  row:0];
  XCTAssertNotEqual(firstHeader, nextGenerationHeader);
  XCTAssertEqual(dataSource.headerViewCallCounts[@0].integerValue, 1);
  XCTAssertEqual(dataSource.headerViewCallCounts[@1].integerValue, 0);

  dataSource.headerProvider = ^RCTPlatformView *(NSInteger section) {
    return nil;
  };
  [self reloadAndDisplay];
  NSView *emptyHeader = [backingTable.delegate tableView:backingTable
                                     viewForTableColumn:backingTable.tableColumns.firstObject
                                                    row:0];
  XCTAssertNotNil(emptyHeader);
  XCTAssertTrue([emptyHeader isKindOfClass:RCTPlatformView.class]);
}

- (void)testAccessibilityContainerAndCellIdentifiersSurviveReuse
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@100];
  dataSource.cellProvider = ^RCTUITableViewCell *(RCTUITableView *tableView, NSIndexPath *indexPath) {
    RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"accessible"];
    if (cell == nil) {
      cell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                      reuseIdentifier:@"accessible"];
    }
    cell.textLabel.accessibilityIdentifier =
        indexPath.row == 0 ? @"redbox-error" : [NSString stringWithFormat:@"cell-%ld", (long)indexPath.row];
    return cell;
  };

  _tableView.accessibilityIdentifier = @"compatibility-table";
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertEqualObjects(backingTable.accessibilityRole, NSAccessibilityTableRole);
  XCTAssertEqualObjects(backingTable.accessibilityIdentifier, @"compatibility-table");

  RCTUITableViewCell *firstCell = [backingTable viewAtColumn:0 row:0 makeIfNecessary:YES];
  XCTAssertEqualObjects(firstCell.textLabel.accessibilityIdentifier, @"redbox-error");

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:99 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];

  firstCell = [backingTable viewAtColumn:0 row:0 makeIfNecessary:YES];
  XCTAssertEqualObjects(firstCell.textLabel.accessibilityIdentifier, @"redbox-error");
  XCTAssertEqual(
      backingTable.accessibilityChildren.count, [backingTable rowsInRect:backingTable.visibleRect].length);
}

- (void)testScrollToTopPositionAndReturnToFirstRow
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@100];
  dataSource.heightProvider = ^CGFloat(NSIndexPath *indexPath) {
    return 30;
  };
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:80 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];

  NSRect targetRect = [backingTable rectOfRow:80];
  XCTAssertEqualWithAccuracy(NSMinY(targetRect), NSMinY(_tableView.visibleRect), 1);
  XCTAssertTrue(NSContainsRect(_tableView.visibleRect, targetRect));

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  XCTAssertEqualWithAccuracy(NSMinY(_tableView.visibleRect), 0, 0.5);
}

- (void)testLabelButtonActionAndIdentifierForwarding
{
  RCTUILabel *label = [RCTUILabel new];
  label.text = @"forwarded";
  label.numberOfLines = 3;
  label.textAlignment = NSTextAlignmentCenter;
  XCTAssertEqualObjects(label.text, @"forwarded");
  XCTAssertEqualObjects(label.stringValue, @"forwarded");
  XCTAssertEqual(label.numberOfLines, 3);
  XCTAssertEqual(label.maximumNumberOfLines, 3);
  XCTAssertEqual(label.textAlignment, NSTextAlignmentCenter);
  XCTAssertEqual(label.alignment, NSTextAlignmentCenter);

  RCTUIButton *button = [RCTUIButton new];
  NSFont *font = [NSFont systemFontOfSize:13];
  button.titleLabel.font = font;
  button.titleLabel.lineBreakMode = NSLineBreakByWordWrapping;
  button.titleLabel.textAlignment = NSTextAlignmentCenter;
  [button setTitle:@"Reload" forState:RCTUIControlStateNormal];
  [button setTitleColor:NSColor.whiteColor forState:RCTUIControlStateNormal];
  [button setTitleColor:[NSColor colorWithWhite:1 alpha:0.5] forState:RCTUIControlStateHighlighted];
  button.accessibilityIdentifier = @"redbox-reload";

  XCTAssertEqualObjects(button.attributedTitle.string, @"Reload");
  XCTAssertEqualObjects(
      [button.attributedTitle attribute:NSFontAttributeName atIndex:0 effectiveRange:nil], font);
  NSParagraphStyle *paragraphStyle =
      [button.attributedTitle attribute:NSParagraphStyleAttributeName atIndex:0 effectiveRange:nil];
  XCTAssertEqual(paragraphStyle.lineBreakMode, NSLineBreakByWordWrapping);
  XCTAssertEqual(paragraphStyle.alignment, NSTextAlignmentCenter);
  XCTAssertEqualObjects(button.accessibilityIdentifier, @"redbox-reload");

  __block NSInteger clickCount = 0;
  __weak RCTUIAction *weakAction;
  @autoreleasepool {
    RCTUIAction *action = [RCTUIAction actionWithHandler:^{
      clickCount++;
    }];
    weakAction = action;
    [button rct_setPrimaryAction:action];
  }
  XCTAssertNotNil(weakAction);
  [button performClick:nil];
  XCTAssertEqual(clickCount, 1);
}

@end

#endif // macOS]
