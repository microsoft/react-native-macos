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
  NSTableView *backingTable = [tableView valueForKey:@"tableView"];
  XCTAssertTrue([backingTable isKindOfClass:NSTableView.class]);
  return backingTable;
}

static BOOL RCTUIAccessibilityTreeContainsIdentifier(id element, NSString *identifier, NSUInteger depth)
{
  if (depth == 0 || element == nil) {
    return NO;
  }
  if ([element respondsToSelector:@selector(accessibilityIdentifier)] &&
      [[element accessibilityIdentifier] isEqualToString:identifier]) {
    return YES;
  }
  if (![element respondsToSelector:@selector(accessibilityChildren)]) {
    return NO;
  }

  for (id child in [element accessibilityChildren]) {
    if (RCTUIAccessibilityTreeContainsIdentifier(child, identifier, depth - 1)) {
      return YES;
    }
  }
  return NO;
}

@interface RCTUITableViewTestDataSource : NSObject <RCTUITableViewDataSource, RCTUITableViewDelegate>

@property (nonatomic, copy) NSArray<NSNumber *> *rowCounts;
@property (nonatomic, copy) NSArray<NSNumber *> *headerHeights;
@property (nonatomic, copy) RCTUITableViewTestCellProvider cellProvider;
@property (nonatomic, copy) RCTUITableViewTestHeightProvider heightProvider;
@property (nonatomic, copy) RCTUITableViewTestHeaderProvider headerProvider;
@property (nonatomic, strong) NSMutableDictionary<NSNumber *, NSNumber *> *headerViewCallCounts;
@property (nonatomic, strong) NSIndexPath *selectedIndexPath;
@property (nonatomic, assign) NSInteger selectionCallCount;
@property (nonatomic, assign) BOOL deselectDuringSelection;

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
  self.selectionCallCount++;
  self.selectedIndexPath = indexPath;
  if (self.deselectDuringSelection) {
    [tableView deselectRowAtIndexPath:indexPath animated:YES];
  }
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

@interface RCTUIInsetControlDataSource : NSObject <NSTableViewDataSource, NSTableViewDelegate>
@end

@implementation RCTUIInsetControlDataSource

- (NSInteger)numberOfRowsInTableView:(NSTableView *)tableView
{
  return 1;
}

- (NSView *)tableView:(NSTableView *)tableView
    viewForTableColumn:(NSTableColumn *)tableColumn
                   row:(NSInteger)row
{
  return [NSTableCellView new];
}

@end

static NSTableView *RCTUICreateInsetControlTable(CGFloat width, RCTUIInsetControlDataSource *dataSource)
{
  NSTableView *tableView = [[NSTableView alloc] initWithFrame:NSMakeRect(0, 0, width, 400)];
  tableView.dataSource = dataSource;
  tableView.delegate = dataSource;
  tableView.headerView = nil;
  tableView.allowsColumnReordering = NO;
  tableView.allowsColumnResizing = NO;
  tableView.allowsTypeSelect = NO;
  tableView.columnAutoresizingStyle = NSTableViewFirstColumnOnlyAutoresizingStyle;
  tableView.backgroundColor = NSColor.clearColor;
  tableView.style = NSTableViewStyleInset;
  [tableView addTableColumn:[[NSTableColumn alloc] initWithIdentifier:@"ControlColumn"]];
  [tableView reloadData];
  [tableView layoutSubtreeIfNeeded];
  return tableView;
}

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
    NSTableView *backingTable = RCTUIBackingTable(_tableView);
    XCTAssertEqual(backingTable.numberOfRows, rowCount.integerValue);
    XCTAssertTrue(isfinite(NSMinY(backingTable.visibleRect)));
    XCTAssertGreaterThanOrEqual(NSWidth(backingTable.visibleRect), 0);
    XCTAssertGreaterThanOrEqual(NSHeight(backingTable.visibleRect), 0);
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
  dataSource.deselectDuringSelection = YES;
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertFalse([backingTable.delegate tableView:backingTable shouldSelectRow:0]);
  XCTAssertNil(dataSource.selectedIndexPath);
  XCTAssertEqual(dataSource.selectionCallCount, 0);

  XCTAssertFalse([backingTable.delegate tableView:backingTable shouldSelectRow:3]);
  XCTAssertEqual(dataSource.selectedIndexPath.section, 1);
  XCTAssertEqual(dataSource.selectedIndexPath.row, 1);
  XCTAssertEqual(dataSource.selectionCallCount, 1);
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
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@1, @2];

  __block RCTUITableViewCell *automaticCell;
  dataSource.cellProvider = ^RCTUITableViewCell *(RCTUITableView *tableView, NSIndexPath *indexPath) {
    if (indexPath.section == 0) {
      automaticCell = [tableView dequeueReusableCellWithIdentifier:@"automatic"];
      if (automaticCell == nil) {
        automaticCell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                                  reuseIdentifier:@"automatic"];
      }
      automaticCell.textLabel.font = [NSFont systemFontOfSize:14];
      automaticCell.textLabel.lineBreakMode = NSLineBreakByWordWrapping;
      automaticCell.textLabel.numberOfLines = 0;
      automaticCell.textLabel.text = text;
      automaticCell.wantsLayer = YES;
      automaticCell.layer.cornerRadius = 8;
      automaticCell.layer.cornerCurve = kCACornerCurveContinuous;
      return automaticCell;
    }

    RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"fixed"];
    if (cell == nil) {
      cell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault reuseIdentifier:@"fixed"];
    }
    cell.textLabel.text = @"Fixed";
    return cell;
  };
  dataSource.heightProvider = ^CGFloat(NSIndexPath *indexPath) {
    return indexPath.section == 0 ? RCTUITableViewAutomaticDimension : 50;
  };

  [self installDataSource:dataSource delegate:dataSource];
  [self setContentWidth:880];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertTrue(backingTable.usesAutomaticRowHeights);
  XCTAssertEqual(backingTable.effectiveStyle, NSTableViewStyleInset);

  RCTUIInsetControlDataSource *controlDataSource = [RCTUIInsetControlDataSource new];
  NSTableView *wideControlTable =
      RCTUICreateInsetControlTable(NSWidth(backingTable.bounds), controlDataSource);
  NSRect wideCellFrame = [backingTable frameOfCellAtColumn:0 row:0];
  NSRect wideControlFrame = [wideControlTable frameOfCellAtColumn:0 row:0];
  XCTAssertEqual(wideCellFrame.origin.x, wideControlFrame.origin.x);
  XCTAssertEqual(wideCellFrame.size.width, wideControlFrame.size.width);
  CGFloat wideLeftInset = NSMinX(wideCellFrame);
  CGFloat wideRightInset = NSWidth(backingTable.bounds) - NSMaxX(wideCellFrame);
  XCTAssertEqualWithAccuracy(wideLeftInset, wideRightInset, 0.5);

  CGFloat rowSpacing = backingTable.intercellSpacing.height;
  CGFloat wideAutomaticHeight = NSHeight([backingTable rectOfRow:0]) - rowSpacing;
  CGFloat wideFixedHeight = NSHeight([backingTable rectOfRow:1]);
  XCTAssertEqual([backingTable.delegate tableView:backingTable heightOfRow:1], 50);
  XCTAssertEqual([backingTable.delegate tableView:backingTable heightOfRow:2], 50);
  XCTAssertEqualWithAccuracy(wideFixedHeight, 50 + rowSpacing, 0.5);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:2]), wideFixedHeight, 0.5);
  XCTAssertGreaterThan(wideAutomaticHeight, 50);
  XCTAssertGreaterThan(automaticCell.textLabel.preferredMaxLayoutWidth, 0);
  CGFloat widePreferredWidth = automaticCell.textLabel.preferredMaxLayoutWidth;
  XCTAssertEqual(automaticCell.layer.cornerRadius, 8);
  XCTAssertEqualObjects(automaticCell.layer.cornerCurve, kCACornerCurveContinuous);

  [self setContentWidth:320];
  NSTableView *narrowControlTable =
      RCTUICreateInsetControlTable(NSWidth(backingTable.bounds), controlDataSource);
  NSRect narrowCellFrame = [backingTable frameOfCellAtColumn:0 row:0];
  NSRect narrowControlFrame = [narrowControlTable frameOfCellAtColumn:0 row:0];
  XCTAssertEqual(narrowCellFrame.origin.x, narrowControlFrame.origin.x);
  XCTAssertEqual(narrowCellFrame.size.width, narrowControlFrame.size.width);
  CGFloat narrowLeftInset = NSMinX(narrowCellFrame);
  CGFloat narrowRightInset = NSWidth(backingTable.bounds) - NSMaxX(narrowCellFrame);
  XCTAssertEqualWithAccuracy(narrowLeftInset, narrowRightInset, 0.5);
  XCTAssertEqualWithAccuracy(narrowLeftInset, wideLeftInset, 0.5);

  CGFloat narrowAutomaticHeight = NSHeight([backingTable rectOfRow:0]) - rowSpacing;
  CGFloat narrowFixedHeight = NSHeight([backingTable rectOfRow:1]);
  XCTAssertGreaterThan(narrowAutomaticHeight, wideAutomaticHeight);
  XCTAssertLessThan(automaticCell.textLabel.preferredMaxLayoutWidth, widePreferredWidth);
  XCTAssertEqualWithAccuracy(narrowFixedHeight, wideFixedHeight, 0.5);
  XCTAssertEqualWithAccuracy(NSHeight([backingTable rectOfRow:2]), wideFixedHeight, 0.5);
  XCTAssertEqual([backingTable.delegate tableView:backingTable heightOfRow:1], 50);
  XCTAssertEqual([backingTable.delegate tableView:backingTable heightOfRow:2], 50);
}

- (void)testCellLayoutInsetsAndMessageCardLayer
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@2];
  dataSource.heightProvider = ^CGFloat(NSIndexPath *indexPath) {
    return 80;
  };
  dataSource.cellProvider = ^RCTUITableViewCell *(RCTUITableView *tableView, NSIndexPath *indexPath) {
    RCTUITableViewCellStyle style =
        indexPath.row == 0 ? RCTUITableViewCellStyleDefault : RCTUITableViewCellStyleSubtitle;
    NSString *identifier = indexPath.row == 0 ? @"message-layout" : @"stack-layout";
    RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:identifier];
    if (cell == nil) {
      cell = [[RCTUITableViewCell alloc] initWithStyle:style reuseIdentifier:identifier];
    }
    cell.textLabel.text = indexPath.row == 0 ? @"Message" : @"Stack frame";
    cell.detailTextLabel.text = @"RCTUITableViewParity.js:42:7";
    if (indexPath.row == 0) {
      cell.wantsLayer = YES;
      cell.layer.backgroundColor = [NSColor colorWithRed:0.82 green:0.10 blue:0.15 alpha:1].CGColor;
      cell.layer.cornerRadius = 8;
      cell.layer.cornerCurve = kCACornerCurveContinuous;
    }
    return cell;
  };

  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  for (NSInteger row = 0; row < 2; row++) {
    RCTUITableViewCell *cell = [backingTable viewAtColumn:0 row:row makeIfNecessary:YES];
    [cell layoutSubtreeIfNeeded];

    XCTAssertEqual(cell.rowSizeStyle, NSTableViewRowSizeStyleCustom);
    XCTAssertGreaterThanOrEqual(NSMinX(cell.textLabel.frame), 5);
    XCTAssertGreaterThanOrEqual(NSMinY(cell.textLabel.frame), 5);
    XCTAssertLessThanOrEqual(NSMaxX(cell.textLabel.frame), NSMaxX(cell.contentView.bounds) - 5);
    XCTAssertLessThanOrEqual(NSMaxY(cell.textLabel.frame), NSMaxY(cell.contentView.bounds) - 5);
    XCTAssertTrue(NSContainsRect(cell.contentView.bounds, cell.textLabel.frame));
    XCTAssertTrue(NSContainsRect(cell.textLabel.bounds, cell.textLabel.visibleRect));
    XCTAssertTrue(
        NSContainsRect(cell.textLabel.bounds, [cell.textLabel.cell drawingRectForBounds:cell.textLabel.bounds]));
  }

  RCTUITableViewCell *messageCell = [backingTable viewAtColumn:0 row:0 makeIfNecessary:YES];
  XCTAssertEqual(messageCell.layer.cornerRadius, 8);
  XCTAssertEqualObjects(messageCell.layer.cornerCurve, kCACornerCurveContinuous);
  XCTAssertNotNil((__bridge id)messageCell.layer.backgroundColor);
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
  XCTAssertEqual([backingTable.delegate tableView:backingTable heightOfRow:0], 30);
  XCTAssertEqual([backingTable.delegate tableView:backingTable heightOfRow:41], 25);
  XCTAssertEqualWithAccuracy(
      NSHeight([backingTable rectOfRow:0]), 30 + backingTable.intercellSpacing.height, 0.5);
  XCTAssertEqualWithAccuracy(
      NSHeight([backingTable rectOfRow:41]), 25 + backingTable.intercellSpacing.height, 0.5);
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

- (void)testReusedHeaderViewMaintainsOnePrimitiveHeightConstraint
{
  RCTUITableViewTestDataSource *dataSource = [RCTUITableViewTestDataSource new];
  dataSource.rowCounts = @[@1];
  dataSource.headerHeights = @[@30];
  RCTPlatformView *sharedHeader = [RCTPlatformView new];
  dataSource.headerProvider = ^RCTPlatformView *(NSInteger section) {
    return sharedHeader;
  };
  [self installDataSource:dataSource delegate:dataSource];
  [self reloadAndDisplay];

  NSTableView *backingTable = RCTUIBackingTable(_tableView);
  XCTAssertEqual([backingTable viewAtColumn:0 row:0 makeIfNecessary:YES], sharedHeader);
  NSPredicate *primitiveConstraint =
      [NSPredicate predicateWithFormat:@"identifier == %@", @"RCTUITableViewHeaderHeight"];
  NSArray<NSLayoutConstraint *> *heightConstraints =
      [sharedHeader.constraints filteredArrayUsingPredicate:primitiveConstraint];
  XCTAssertFalse(sharedHeader.translatesAutoresizingMaskIntoConstraints);
  XCTAssertEqual(heightConstraints.count, 1);
  XCTAssertTrue(heightConstraints.firstObject.active);
  XCTAssertEqual(heightConstraints.firstObject.constant, 30);
  NSLayoutConstraint *originalHeightConstraint = heightConstraints.firstObject;

  dataSource.headerHeights = @[@44];
  [self reloadAndDisplay];
  XCTAssertEqual([backingTable viewAtColumn:0 row:0 makeIfNecessary:YES], sharedHeader);
  heightConstraints = [sharedHeader.constraints filteredArrayUsingPredicate:primitiveConstraint];
  XCTAssertEqual(heightConstraints.count, 1);
  XCTAssertEqual(heightConstraints.firstObject, originalHeightConstraint);
  XCTAssertTrue(heightConstraints.firstObject.active);
  XCTAssertEqual(heightConstraints.firstObject.constant, 44);
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
  XCTAssertTrue(RCTUIAccessibilityTreeContainsIdentifier(backingTable, @"redbox-error", 6));

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:99 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  XCTAssertTrue(RCTUIAccessibilityTreeContainsIdentifier(backingTable, @"cell-99", 6));
  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];

  firstCell = [backingTable viewAtColumn:0 row:0 makeIfNecessary:YES];
  XCTAssertEqualObjects(firstCell.textLabel.accessibilityIdentifier, @"redbox-error");
  XCTAssertTrue(RCTUIAccessibilityTreeContainsIdentifier(backingTable, @"redbox-error", 6));
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
  XCTAssertEqualWithAccuracy(NSMinY(targetRect), NSMinY(backingTable.visibleRect), 1);
  XCTAssertTrue(NSContainsRect(backingTable.visibleRect, targetRect));

  [_tableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                    atScrollPosition:RCTUITableViewScrollPositionTop
                            animated:NO];
  [self forceLayoutAndDisplay];
  XCTAssertEqualWithAccuracy(NSMinY(backingTable.visibleRect), 0, 0.5);
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
