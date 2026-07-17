/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTRedBox2Controller+Internal.h"

#import <React/RCTDefines.h>
#import <React/RCTJSStackFrame.h>
#import <React/RCTReloadCommand.h>
#import <React/RCTUtils.h>

#include <array>

#import "RCTJscSafeUrl+Internal.h"
#import "RCTRedBox2AnsiParser+Internal.h"
#import "RCTRedBox2ErrorParser+Internal.h"
#import "RCTRedBoxHMRClient+Internal.h"

// @lint-ignore-every CLANGTIDY clang-diagnostic-switch-default
// NOTE: clang-diagnostic-switch-default conflicts with clang-diagnostic-switch-enum

#if RCT_DEV_MENU && !TARGET_OS_OSX // [macOS]

#pragma mark - RCTRedBox2Controller

// Color Palette (matching LogBoxStyle.js)
// [macOS
static RCTUIColor *RCTRedBox2BackgroundColor()
{
  return [RCTUIColor colorWithRed:51.0 / 255 green:51.0 / 255 blue:51.0 / 255 alpha:1.0];
}

static RCTUIColor *RCTRedBox2ErrorColor()
{
  return [RCTUIColor colorWithRed:243.0 / 255 green:83.0 / 255 blue:105.0 / 255 alpha:1.0];
}

static RCTUIColor *RCTRedBox2TextColor(CGFloat opacity)
{
  return [RCTUIColor colorWithWhite:1.0 alpha:opacity];
}
// macOS]

enum class Section : uint8_t { Message, CodeFrame, CallStack, kMaxValue };
static constexpr size_t kSectionCount = static_cast<size_t>(Section::kMaxValue);

struct SectionState {
  bool visible = false;
};

static const NSTimeInterval kAutoRetryInterval = 20.0;

@implementation RCTRedBox2Controller {
  // [macOS
  RCTUITableView *_stackTraceTableView;
  RCTUILabel *_headerTitleLabel;
  RCTUILabel *_errorCategoryLabel;
  // macOS]
  NSString *_lastErrorMessage;
  NSArray<RCTJSStackFrame *> *_lastStackTrace;
  NSArray<NSString *> *_customButtonTitles;
  NSArray<RCTRedBox2ButtonPressHandler> *_customButtonHandlers;
  int _lastErrorCookie;
  RCTRedBox2ErrorData *_errorData;
  std::array<SectionState, kSectionCount> _sectionStates;
  NSTimer *_autoRetryTimer;
  NSInteger _autoRetryCountdown;
  RCTUIButton *_reloadButton; // [macOS]
  NSString *_reloadBaseText;
  RCTRedBoxHMRClient *_hmrClient;
}

- (instancetype)initWithCustomButtonTitles:(NSArray<NSString *> *)customButtonTitles
                      customButtonHandlers:(NSArray<RCTRedBox2ButtonPressHandler> *)customButtonHandlers
{
  self = [super init];
  if (self != nullptr) {
    _lastErrorCookie = -1;
    _customButtonTitles = customButtonTitles;
    _customButtonHandlers = customButtonHandlers;
#if !TARGET_OS_OSX // [macOS]
    self.modalPresentationStyle = UIModalPresentationFullScreen;
#endif // [macOS]
  }
  return self;
}

- (void)viewDidLoad
{
  [super viewDidLoad];
#if !TARGET_OS_OSX // [macOS]
  self.view.backgroundColor = RCTRedBox2BackgroundColor();
#else // [macOS
  self.view.wantsLayer = YES;
  self.view.layer.backgroundColor = RCTRedBox2BackgroundColor().CGColor;
#endif // macOS]

  RCTPlatformView *headerBar = [self createHeaderBar]; // [macOS]
  RCTPlatformView *footerBar = [self createFooterBar]; // [macOS]

  // Stack trace table
#if !TARGET_OS_OSX // [macOS]
  _stackTraceTableView = [[RCTUITableView alloc] initWithFrame:CGRectZero style:UITableViewStylePlain]; // [macOS]
  _stackTraceTableView.backgroundColor = [UIColor clearColor];
#if !TARGET_OS_TV
  _stackTraceTableView.separatorStyle = UITableViewCellSeparatorStyleNone;
#endif
  _stackTraceTableView.indicatorStyle = UIScrollViewIndicatorStyleWhite;
  _stackTraceTableView.bounces = NO;
#else // [macOS
  _stackTraceTableView = [[RCTUITableView alloc] initWithFrame:NSZeroRect];
  _stackTraceTableView.hasVerticalScroller = YES;
#endif // macOS]
  _stackTraceTableView.translatesAutoresizingMaskIntoConstraints = NO;
  _stackTraceTableView.dataSource = self;
  _stackTraceTableView.delegate = self;
  [self.view addSubview:_stackTraceTableView];

  [NSLayoutConstraint activateConstraints:@[
    [_stackTraceTableView.topAnchor constraintEqualToAnchor:headerBar.bottomAnchor],
    [_stackTraceTableView.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
    [_stackTraceTableView.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    [_stackTraceTableView.bottomAnchor constraintEqualToAnchor:footerBar.topAnchor],
  ]];
}

#pragma mark - Header Bar

- (RCTUILabel *)makeLabel // [macOS]
{
  RCTUILabel *label = [[RCTUILabel alloc] initWithFrame:CGRectZero];
  label.translatesAutoresizingMaskIntoConstraints = NO;
  label.lineBreakMode = NSLineBreakByWordWrapping;
  label.numberOfLines = 0; // [macOS]
  return label;
}

- (RCTPlatformView *)createHeaderBar // [macOS]
{
  RCTUIView *headerContainer = [[RCTUIView alloc] init]; // [macOS]
  headerContainer.translatesAutoresizingMaskIntoConstraints = NO;
  headerContainer.backgroundColor = RCTRedBox2ErrorColor();

  _headerTitleLabel = [self makeLabel]; // [macOS]
  _headerTitleLabel.textColor = [RCTUIColor whiteColor]; // [macOS]
  _headerTitleLabel.font = [UIFont systemFontOfSize:16 weight:UIFontWeightSemibold]; // [macOS]
  _headerTitleLabel.textAlignment = NSTextAlignmentCenter; // [macOS]
  [headerContainer addSubview:_headerTitleLabel];
  [self.view addSubview:headerContainer];

  [NSLayoutConstraint activateConstraints:@[
    [headerContainer.topAnchor constraintEqualToAnchor:self.view.topAnchor],
    [headerContainer.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
    [headerContainer.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    [_headerTitleLabel.leadingAnchor constraintEqualToAnchor:headerContainer.leadingAnchor constant:12],
    [_headerTitleLabel.trailingAnchor constraintEqualToAnchor:headerContainer.trailingAnchor constant:-12],
    [_headerTitleLabel.bottomAnchor constraintEqualToAnchor:headerContainer.bottomAnchor constant:-12],
#if !TARGET_OS_OSX // [macOS]
    [_headerTitleLabel.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor constant:12],
#else // [macOS
    [_headerTitleLabel.topAnchor constraintEqualToAnchor:headerContainer.topAnchor constant:12],
#endif // macOS]
  ]];

  return headerContainer;
}

#pragma mark - Footer Bar

- (RCTPlatformView *)createFooterBar // [macOS]
{
  const CGFloat buttonHeight = 48;
  NSString *reloadText = @"Reload";

  __weak __typeof(self) weakSelf = self;
  RCTUIButton *dismissButton = [self footerButton:@"Dismiss"
                          accessibilityIdentifier:@"redbox-dismiss"
                                          handler:^{
                                            [weakSelf dismiss];
                                          }]; // [macOS]
  _reloadBaseText = reloadText;
  _reloadButton = [self footerButton:reloadText
             accessibilityIdentifier:@"redbox-reload"
                             handler:^{
                               [weakSelf reload];
                             }];
  RCTUIButton *copyButton = [self footerButton:@"Copy"
                       accessibilityIdentifier:@"redbox-copy"
                                       handler:^{
                                         [weakSelf copyStack];
                                       }]; // [macOS]

#if !TARGET_OS_OSX // [macOS]
  UIStackView *buttonStackView = [[UIStackView alloc] init];
  buttonStackView.axis = UILayoutConstraintAxisHorizontal;
  buttonStackView.distribution = UIStackViewDistributionFillEqually;
  buttonStackView.alignment = UIStackViewAlignmentTop;
  buttonStackView.backgroundColor = RCTRedBox2BackgroundColor();
#else // [macOS
  [dismissButton setKeyEquivalent:@"\e"];
  [_reloadButton setKeyEquivalent:@"r"];
  [_reloadButton setKeyEquivalentModifierMask:NSEventModifierFlagCommand];
  [copyButton setKeyEquivalent:@"c"];
  [copyButton setKeyEquivalentModifierMask:NSEventModifierFlagOption | NSEventModifierFlagCommand];

  NSStackView *buttonStackView = [[NSStackView alloc] init];
  buttonStackView.orientation = NSUserInterfaceLayoutOrientationHorizontal;
  buttonStackView.distribution = NSStackViewDistributionFillEqually;
  buttonStackView.alignment = NSLayoutAttributeCenterY;
  buttonStackView.wantsLayer = YES;
  buttonStackView.layer.backgroundColor = RCTRedBox2BackgroundColor().CGColor;
#endif // macOS]
  buttonStackView.translatesAutoresizingMaskIntoConstraints = NO;
  [buttonStackView addArrangedSubview:dismissButton];
  [buttonStackView addArrangedSubview:_reloadButton];
  [buttonStackView addArrangedSubview:copyButton];

  for (NSUInteger i = 0; i < [_customButtonTitles count]; i++) {
    RCTUIButton *button = [self footerButton:_customButtonTitles[i]
                     accessibilityIdentifier:@""
                                     handler:_customButtonHandlers[i]]; // [macOS]
    [buttonStackView addArrangedSubview:button];
  }

  buttonStackView.layer.shadowColor = [RCTUIColor blackColor].CGColor; // [macOS]
  buttonStackView.layer.shadowOffset = CGSizeMake(0, -2);
  buttonStackView.layer.shadowRadius = 2;
  buttonStackView.layer.shadowOpacity = 0.5;
  [self.view addSubview:buttonStackView];

  [NSLayoutConstraint activateConstraints:@[
    [buttonStackView.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
    [buttonStackView.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    [buttonStackView.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
    [buttonStackView.heightAnchor constraintEqualToConstant:buttonHeight + [self bottomSafeViewHeight]],
  ]];

  for (RCTPlatformView *button in buttonStackView.arrangedSubviews) { // [macOS]
    [button.heightAnchor constraintEqualToConstant:buttonHeight].active = YES;
  }

  return buttonStackView;
}

- (RCTUIButton *)styledButton:(NSString *)title accessibilityIdentifier:(NSString *)accessibilityIdentifier // [macOS]
{
  RCTUIButton *button = [[RCTUIButton alloc] initWithFrame:CGRectZero]; // [macOS]
  button.translatesAutoresizingMaskIntoConstraints = NO;
  button.accessibilityIdentifier = accessibilityIdentifier;
  button.titleLabel.font = [UIFont systemFontOfSize:14];
  button.titleLabel.textAlignment = NSTextAlignmentCenter;
  button.backgroundColor = RCTRedBox2BackgroundColor();
  [button setTitle:title forState:RCTUIControlStateNormal]; // [macOS]
  [button setTitleColor:[RCTUIColor whiteColor] forState:RCTUIControlStateNormal]; // [macOS]
  [button setTitleColor:RCTRedBox2TextColor(0.5) forState:RCTUIControlStateHighlighted]; // [macOS]
  return button;
}

- (RCTUIButton *)footerButton:(NSString *)title // [macOS]
      accessibilityIdentifier:(NSString *)accessibilityIdentifier
                      handler:(RCTRedBox2ButtonPressHandler)handler
{
  RCTUIButton *button = [self styledButton:title accessibilityIdentifier:accessibilityIdentifier]; // [macOS]
  [button rct_setPrimaryAction:[RCTUIAction actionWithHandler:handler]]; // [macOS]
  return button;
}

- (CGFloat)bottomSafeViewHeight
{
#if TARGET_OS_MACCATALYST || TARGET_OS_OSX // [macOS]
  return 0;
#else
  return RCTKeyWindow().safeAreaInsets.bottom;
#endif
}

#pragma mark - Error Display

- (NSString *)stripAnsi:(NSString *)text
{
  NSError *error = nil;
  NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:@"\\x1b\\[[0-9;]*m"
                                                                         options:NSRegularExpressionCaseInsensitive
                                                                           error:&error];
  return [regex stringByReplacingMatchesInString:text options:0 range:NSMakeRange(0, [text length]) withTemplate:@""];
}

- (void)showErrorMessage:(NSString *)message
               withStack:(NSArray<RCTJSStackFrame *> *)stack
                isUpdate:(BOOL)isUpdate
             errorCookie:(int)errorCookie
{
  // Remove ANSI color codes from the message
  NSString *messageWithoutAnsi = [self stripAnsi:message];

  BOOL isRootViewControllerPresented = self.presentingViewController != nil;
  // Show if this is a new message, or if we're updating the previous message
  BOOL isNew = !isRootViewControllerPresented && !isUpdate;
  BOOL isUpdateForSameMessage = !isNew &&
      (isRootViewControllerPresented && isUpdate &&
       ((errorCookie == -1 && [_lastErrorMessage isEqualToString:messageWithoutAnsi]) ||
        (errorCookie == _lastErrorCookie)));
  if (isNew || isUpdateForSameMessage) {
    _lastStackTrace = stack;
    // message is displayed using UILabel, which is unable to render text of
    // unlimited length, so we truncate it
    _lastErrorMessage = [messageWithoutAnsi substringToIndex:MIN((NSUInteger)10000, messageWithoutAnsi.length)];
    _lastErrorCookie = errorCookie;

    // Parse the message to extract structure (title, code frame, etc.)
    _errorData = [RCTRedBox2ErrorParser parseErrorMessage:message name:nil componentStack:nil isFatal:YES];
    [self updateSectionVisibility];

    [_stackTraceTableView reloadData];

    if (!isRootViewControllerPresented) {
#if !TARGET_OS_OSX // [macOS]
      [RCTKeyWindow().rootViewController presentViewController:self animated:NO completion:nil];
#else // [macOS
      [[RCTKeyWindow() contentViewController] presentViewControllerAsSheet:self];
#endif // macOS]
    }

    // Update all UI from _errorData (view is now guaranteed to be loaded)
    _headerTitleLabel.text = _errorData.isCompileError ? @"Failed to compile" : @"Error"; // [macOS]
    [_stackTraceTableView reloadData];
    [_stackTraceTableView scrollToRowAtIndexPath:[NSIndexPath indexPathForRow:0 inSection:0]
                                atScrollPosition:RCTUITableViewScrollPositionTop
                                        animated:NO]; // [macOS]

    [self startAutoRetryIfApplicable];
    [self _startHMRClient];
  }
}

- (void)dismiss
{
  [self stopAutoRetry];
#if !TARGET_OS_OSX // [macOS]
  [self dismissViewControllerAnimated:NO completion:nil];
#else // [macOS
  if (self.presentingViewController) {
    [[RCTKeyWindow() contentViewController] dismissViewController:self];
  }
#endif // macOS]
}

- (void)reload
{
  [self _stopHMRClient];
  [self stopAutoRetry];
  if (_actionDelegate != nil) {
    [_actionDelegate reloadFromRedBoxController:self];
  } else {
    // In bridgeless mode `RCTRedBox` gets deallocated, we need to notify listeners anyway.
    RCTTriggerReloadCommandListeners(@"Redbox");
    [self dismiss];
  }
}

#pragma mark - Native HMR Connection

- (void)_startHMRClient
{
  [self _stopHMRClient];
  if (!_bundleURL) {
    return;
  }
  __weak __typeof(self) weakSelf = self;
  _hmrClient = [[RCTRedBoxHMRClient alloc] initWithBundleURL:_bundleURL
                                                onFileChange:^{
                                                  [weakSelf reload];
                                                }];
  [_hmrClient start];
}

- (void)_stopHMRClient
{
  [_hmrClient stop];
  _hmrClient = nil;
}

#pragma mark - Auto-Retry

- (void)startAutoRetryIfApplicable
{
  [self stopAutoRetry];
  if (!_errorData.isRetryable) {
    return;
  }
  _autoRetryCountdown = (NSInteger)kAutoRetryInterval;
  [self updateReloadButtonTitle];
  _autoRetryTimer = [NSTimer scheduledTimerWithTimeInterval:1.0
                                                     target:self
                                                   selector:@selector(autoRetryTick)
                                                   userInfo:nil
                                                    repeats:YES];
}

- (void)stopAutoRetry
{
  [_autoRetryTimer invalidate];
  _autoRetryTimer = nil;
  if (_reloadButton) {
    [_reloadButton setTitle:_reloadBaseText forState:RCTUIControlStateNormal]; // [macOS]
  }
}

- (void)autoRetryTick
{
  _autoRetryCountdown--;
  if (_autoRetryCountdown <= 0) {
    [self stopAutoRetry];
    [self reload];
  } else {
    [self updateReloadButtonTitle];
  }
}

- (void)updateReloadButtonTitle
{
  NSString *title = [NSString stringWithFormat:@"%@ (%lds)", _reloadBaseText, (long)_autoRetryCountdown];
  [_reloadButton setTitle:title forState:RCTUIControlStateNormal]; // [macOS]
}

- (void)copyStack
{
  NSMutableString *fullStackTrace;

  if (_lastErrorMessage != nil) {
    fullStackTrace = [_lastErrorMessage mutableCopy];
    [fullStackTrace appendString:@"\n\n"];
  } else {
    fullStackTrace = [NSMutableString string];
  }

  for (RCTJSStackFrame *stackFrame in _lastStackTrace) {
    [fullStackTrace appendString:[NSString stringWithFormat:@"%@\n", stackFrame.methodName]];
    if (stackFrame.file != nullptr) {
      [fullStackTrace appendFormat:@"    %@\n", [self formatFrameSource:stackFrame]];
    }
  }
#if !TARGET_OS_OSX // [macOS]
#if !TARGET_OS_TV
  UIPasteboard *pb = [UIPasteboard generalPasteboard];
  [pb setString:fullStackTrace];
#endif
#else // [macOS
  NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
  [pasteboard clearContents];
  [pasteboard setString:fullStackTrace forType:NSPasteboardTypeString];
#endif // macOS]
}

- (NSString *)formatFrameSource:(RCTJSStackFrame *)stackFrame
{
  NSString *file = [RCTJscSafeUrl normalUrlFromJscSafeUrl:stackFrame.file];
  // Strip query string (e.g. ?platform=ios&dev=true) before extracting the filename.
  NSRange queryRange = [file rangeOfString:@"?"];
  if (queryRange.location != NSNotFound) {
    file = [file substringToIndex:queryRange.location];
  }
  NSString *fileName = RCTNilIfNull(file) ? [file lastPathComponent] : @"<unknown file>";
  NSString *lineInfo = [NSString stringWithFormat:@"%@:%lld", fileName, (long long)stackFrame.lineNumber];

  if (stackFrame.column != 0) {
    lineInfo = [lineInfo stringByAppendingFormat:@":%lld", (long long)stackFrame.column];
  }
  return lineInfo;
}

#pragma mark - Section Helpers

- (void)updateSectionVisibility
{
  _sectionStates = {};
  _sectionStates[static_cast<size_t>(Section::Message)].visible = true;
  _sectionStates[static_cast<size_t>(Section::CodeFrame)].visible = _errorData.codeFrame.length > 0;
  _sectionStates[static_cast<size_t>(Section::CallStack)].visible =
      _lastStackTrace.count > 0 && _errorData.codeFrame.length == 0;
}

- (NSInteger)visibleSectionCount
{
  NSInteger count = 0;
  for (size_t i = 0; i < kSectionCount; i++) {
    if (_sectionStates[i].visible) {
      count++;
    }
  }
  return count;
}

- (Section)sectionForIndex:(NSInteger)index
{
  NSInteger visible = 0;
  for (size_t i = 0; i < kSectionCount; i++) {
    if (_sectionStates[i].visible) {
      if (visible == index) {
        return static_cast<Section>(i);
      }
      visible++;
    }
  }
  RCTAssert(NO, @"Invalid section index %ld", (long)index);
  return Section::kMaxValue;
}

- (NSString *)displayMessage
{
  return _errorData.message.length > 0 ? [self stripAnsi:_errorData.message] : _lastErrorMessage;
}

#pragma mark - TableView DataSource & Delegate

- (NSInteger)numberOfSectionsInTableView:(__unused RCTUITableView *)tableView // [macOS]
{
  return [self visibleSectionCount];
}

- (NSInteger)tableView:(__unused RCTUITableView *)tableView numberOfRowsInSection:(NSInteger)section // [macOS]
{
  if ([self sectionForIndex:section] == Section::CallStack) {
    return static_cast<NSInteger>(_lastStackTrace.count);
  }
  return 1;
}

- (RCTUITableViewCell *)tableView:(RCTUITableView *)tableView // [macOS]
            cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  switch ([self sectionForIndex:indexPath.section]) {
    case Section::Message: {
      RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"msg-cell"]; // [macOS]
      return [self reuseCell:cell forErrorMessage:[self displayMessage]];
    }
    case Section::CodeFrame: {
      RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"code-cell"]; // [macOS]
      return [self reuseCell:cell forCodeFrame:_errorData];
    }
    case Section::CallStack:
    case Section::kMaxValue:
      break;
  }
  RCTUITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:@"cell"]; // [macOS]
  NSUInteger index = indexPath.row;
  RCTJSStackFrame *stackFrame = _lastStackTrace[index];
  return [self reuseCell:cell forStackFrame:stackFrame];
}

- (RCTUITableViewCell *)reuseCell:(RCTUITableViewCell *)cell forErrorMessage:(NSString *)message // [macOS]
{
  if (cell == nullptr) {
    cell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                     reuseIdentifier:@"msg-cell"]; // [macOS]
    cell.textLabel.hidden = YES;
#if !TARGET_OS_OSX // [macOS]
    cell.backgroundColor = RCTRedBox2BackgroundColor();
    cell.selectionStyle = UITableViewCellSelectionStyleNone;
#else // [macOS
    cell.wantsLayer = YES;
    cell.layer.backgroundColor = RCTRedBox2BackgroundColor().CGColor;
    cell.layer.cornerRadius = 8.0;
    cell.layer.cornerCurve = kCACornerCurveContinuous;
#endif // macOS]

    // Error category label (e.g. "Syntax Error", "Uncaught Error")
    _errorCategoryLabel = [self makeLabel]; // [macOS]
    _errorCategoryLabel.tag = 101;
    _errorCategoryLabel.textColor = RCTRedBox2ErrorColor();
    _errorCategoryLabel.font = [UIFont systemFontOfSize:21 weight:UIFontWeightBold];
    _errorCategoryLabel.numberOfLines = 1;
    [cell.contentView addSubview:_errorCategoryLabel];

    // Error message label
    RCTUILabel *messageLabel = [self makeLabel]; // [macOS]
    messageLabel.accessibilityIdentifier = @"redbox-error";
    messageLabel.textColor = [RCTUIColor whiteColor]; // [macOS]
    messageLabel.font = [UIFont systemFontOfSize:14 weight:UIFontWeightMedium];
    messageLabel.numberOfLines = 0;
    messageLabel.tag = 100;
    [cell.contentView addSubview:messageLabel];

    [NSLayoutConstraint activateConstraints:@[
      [_errorCategoryLabel.topAnchor constraintEqualToAnchor:cell.contentView.topAnchor constant:15],
      [_errorCategoryLabel.leadingAnchor constraintEqualToAnchor:cell.contentView.leadingAnchor constant:12],
      [_errorCategoryLabel.trailingAnchor constraintEqualToAnchor:cell.contentView.trailingAnchor constant:-12],

      [messageLabel.topAnchor constraintEqualToAnchor:_errorCategoryLabel.bottomAnchor constant:10],
      [messageLabel.leadingAnchor constraintEqualToAnchor:cell.contentView.leadingAnchor constant:12],
      [messageLabel.trailingAnchor constraintEqualToAnchor:cell.contentView.trailingAnchor constant:-12],
      [messageLabel.bottomAnchor constraintEqualToAnchor:cell.contentView.bottomAnchor constant:-15],
    ]];
  }

  _errorCategoryLabel = [cell.contentView viewWithTag:101];
  _errorCategoryLabel.text = _errorData.title;
  RCTUILabel *messageLabel = [cell.contentView viewWithTag:100]; // [macOS]
  messageLabel.text = message;

  return cell;
}

- (RCTUITableViewCell *)reuseCell:(RCTUITableViewCell *)cell forStackFrame:(RCTJSStackFrame *)stackFrame // [macOS]
{
  if (cell == nullptr) {
    cell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleSubtitle
                                     reuseIdentifier:@"cell"]; // [macOS]
    cell.textLabel.font = [UIFont fontWithName:@"Menlo-Regular" size:14];
    cell.textLabel.lineBreakMode = NSLineBreakByCharWrapping;
    cell.textLabel.numberOfLines = 2;
    cell.detailTextLabel.font = [UIFont systemFontOfSize:12 weight:UIFontWeightLight];
    cell.detailTextLabel.lineBreakMode = NSLineBreakByTruncatingMiddle;
    cell.backgroundColor = [RCTUIColor clearColor]; // [macOS]
#if !TARGET_OS_OSX // [macOS]
    cell.selectedBackgroundView = [UIView new];
    cell.selectedBackgroundView.backgroundColor = RCTRedBox2BackgroundColor();
    cell.selectedBackgroundView.layer.cornerRadius = 5;
#endif // [macOS]
  }

  cell.textLabel.text = stackFrame.methodName ?: @"(unnamed method)";
  if (stackFrame.file != nullptr) {
    cell.detailTextLabel.text = [self formatFrameSource:stackFrame];
  } else {
    cell.detailTextLabel.text = @"";
  }

  if (stackFrame.collapse) {
    cell.textLabel.textColor = RCTRedBox2TextColor(0.4);
    cell.detailTextLabel.textColor = RCTRedBox2TextColor(0.3);
  } else {
    cell.textLabel.textColor = [RCTUIColor whiteColor]; // [macOS]
    cell.detailTextLabel.textColor = RCTRedBox2TextColor(0.8);
  }

  return cell;
}

- (RCTUITableViewCell *)reuseCell:(RCTUITableViewCell *)cell forCodeFrame:(RCTRedBox2ErrorData *)errorData // [macOS]
{
  if (cell == nullptr) {
    cell = [[RCTUITableViewCell alloc] initWithStyle:RCTUITableViewCellStyleDefault
                                     reuseIdentifier:@"code-cell"]; // [macOS]
    cell.textLabel.hidden = YES;
    cell.backgroundColor = [RCTUIColor clearColor]; // [macOS]
#if !TARGET_OS_OSX // [macOS]
    cell.selectionStyle = UITableViewCellSelectionStyleNone;
#endif // [macOS]
  }

  // Remove old subviews
  for (RCTPlatformView *subview in cell.contentView.subviews) { // [macOS]
    if (subview != cell.textLabel && subview != cell.detailTextLabel) {
      [subview removeFromSuperview];
    }
  }

  // Code frame container with rounded corners
  RCTUIView *container = [[RCTUIView alloc] init]; // [macOS]
  container.translatesAutoresizingMaskIntoConstraints = NO;
  container.backgroundColor = RCTRedBox2BackgroundColor();
  container.layer.cornerRadius = 3;
  container.layer.masksToBounds = YES;
  [cell.contentView addSubview:container];

  // Render code frame with ANSI syntax highlighting
  UIFont *codeFont = [UIFont fontWithName:@"Menlo-Regular" size:12];
  NSAttributedString *highlighted =
      [RCTRedBox2AnsiParser attributedStringFromAnsiText:errorData.codeFrame
                                                baseFont:codeFont
                                               baseColor:[RCTUIColor whiteColor]]; // [macOS]

  RCTUILabel *codeLabel = [self makeLabel]; // [macOS]
#if !TARGET_OS_OSX // [macOS]
  codeLabel.attributedText = highlighted;
#else // [macOS
  codeLabel.attributedStringValue = highlighted;
#endif // macOS]
  codeLabel.lineBreakMode = NSLineBreakByClipping;

#if !TARGET_OS_OSX // [macOS]
  UIScrollView *codeScrollView = [[UIScrollView alloc] init];
  codeScrollView.translatesAutoresizingMaskIntoConstraints = NO;
  codeScrollView.showsHorizontalScrollIndicator = YES;
  codeScrollView.showsVerticalScrollIndicator = NO;
  codeScrollView.bounces = NO;
  [codeScrollView addSubview:codeLabel];
  [container addSubview:codeScrollView];
#else // [macOS
  [container addSubview:codeLabel];
#endif // macOS]

  // File name label below the code frame
  RCTUILabel *fileLabel = [self makeLabel]; // [macOS]
  fileLabel.numberOfLines = 1;
  NSString *fileName = errorData.codeFrameFileName.lastPathComponent ?: errorData.codeFrameFileName;
  if (errorData.codeFrameRow > 0) {
    fileLabel.text = [NSString
        stringWithFormat:@"%@ (%ld:%ld)", fileName, (long)errorData.codeFrameRow, (long)errorData.codeFrameColumn + 1];
  } else if (fileName.length > 0) {
    fileLabel.text = fileName;
  }
  fileLabel.textColor = RCTRedBox2TextColor(0.5);
  fileLabel.font = [UIFont fontWithName:@"Menlo-Regular" size:12];
  fileLabel.textAlignment = NSTextAlignmentCenter;
  [cell.contentView addSubview:fileLabel];

  [NSLayoutConstraint activateConstraints:@[
    [container.topAnchor constraintEqualToAnchor:cell.contentView.topAnchor constant:5],
    [container.leadingAnchor constraintEqualToAnchor:cell.contentView.leadingAnchor constant:10],
    [container.trailingAnchor constraintEqualToAnchor:cell.contentView.trailingAnchor constant:-10],

#if !TARGET_OS_OSX // [macOS]
    [codeScrollView.topAnchor constraintEqualToAnchor:container.topAnchor constant:10],
    [codeScrollView.leadingAnchor constraintEqualToAnchor:container.leadingAnchor constant:10],
    [codeScrollView.trailingAnchor constraintEqualToAnchor:container.trailingAnchor constant:-10],
    [codeScrollView.bottomAnchor constraintEqualToAnchor:container.bottomAnchor constant:-10],

    [codeLabel.topAnchor constraintEqualToAnchor:codeScrollView.topAnchor],
    [codeLabel.leadingAnchor constraintEqualToAnchor:codeScrollView.leadingAnchor],
    [codeLabel.trailingAnchor constraintEqualToAnchor:codeScrollView.trailingAnchor],
    [codeLabel.bottomAnchor constraintEqualToAnchor:codeScrollView.bottomAnchor],
    [codeLabel.heightAnchor constraintEqualToAnchor:codeScrollView.heightAnchor],
#else // [macOS
    [codeLabel.topAnchor constraintEqualToAnchor:container.topAnchor constant:10],
    [codeLabel.leadingAnchor constraintEqualToAnchor:container.leadingAnchor constant:10],
    [codeLabel.trailingAnchor constraintEqualToAnchor:container.trailingAnchor constant:-10],
    [codeLabel.bottomAnchor constraintEqualToAnchor:container.bottomAnchor constant:-10],
#endif // macOS]

    [fileLabel.topAnchor constraintEqualToAnchor:container.bottomAnchor constant:10],
    [fileLabel.leadingAnchor constraintEqualToAnchor:cell.contentView.leadingAnchor constant:10],
    [fileLabel.trailingAnchor constraintEqualToAnchor:cell.contentView.trailingAnchor constant:-10],
    [fileLabel.bottomAnchor constraintEqualToAnchor:cell.contentView.bottomAnchor constant:-10],
  ]];

  return cell;
}

- (CGFloat)tableView:(__unused RCTUITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath // [macOS]
{
  auto section = [self sectionForIndex:indexPath.section];
  if (section == Section::Message || section == Section::CodeFrame) {
    return RCTUITableViewAutomaticDimension; // [macOS]
  }
  return 50;
}

- (CGFloat)tableView:(__unused RCTUITableView *)tableView // [macOS]
    estimatedHeightForRowAtIndexPath:(NSIndexPath *)indexPath
{
  switch ([self sectionForIndex:indexPath.section]) {
    case Section::Message:
      return 100;
    case Section::CodeFrame:
      return 200;
    case Section::CallStack:
    case Section::kMaxValue:
      return 50;
  }
}

- (RCTPlatformView *)sectionHeaderViewWithTitle:(NSString *)title // [macOS]
{
  RCTUIView *headerView = [[RCTUIView alloc] initWithFrame:CGRectMake(0, 0, 0, 38)]; // [macOS]
  headerView.backgroundColor = [RCTUIColor clearColor]; // [macOS]

  RCTUILabel *label = [self makeLabel]; // [macOS]
  label.text = title;
  label.textColor = [RCTUIColor whiteColor]; // [macOS]
  label.font = [UIFont systemFontOfSize:18 weight:UIFontWeightSemibold];
  [headerView addSubview:label];

  [NSLayoutConstraint activateConstraints:@[
    [label.leadingAnchor constraintEqualToAnchor:headerView.leadingAnchor constant:12],
    [label.trailingAnchor constraintEqualToAnchor:headerView.trailingAnchor constant:-12],
    [label.bottomAnchor constraintEqualToAnchor:headerView.bottomAnchor constant:-10],
  ]];

  return headerView;
}

- (nullable RCTPlatformView *)tableView:(__unused RCTUITableView *)tableView // [macOS]
                 viewForHeaderInSection:(NSInteger)section
{
  switch ([self sectionForIndex:section]) {
    case Section::CodeFrame:
      return [self sectionHeaderViewWithTitle:@"Source"];
    case Section::CallStack:
      return [self sectionHeaderViewWithTitle:@"Call Stack"];
    case Section::Message:
    case Section::kMaxValue:
      return nil;
  }
}

- (CGFloat)tableView:(__unused RCTUITableView *)tableView heightForHeaderInSection:(NSInteger)section // [macOS]
{
  auto s = [self sectionForIndex:section];
  return (s == Section::CodeFrame || s == Section::CallStack) ? 38 : 0;
}

- (void)tableView:(RCTUITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath // [macOS]
{
  if ([self sectionForIndex:indexPath.section] == Section::CallStack) {
    NSUInteger row = indexPath.row;
    RCTJSStackFrame *stackFrame = _lastStackTrace[row];
    [_actionDelegate redBoxController:self openStackFrameInEditor:stackFrame];
  }
  [tableView deselectRowAtIndexPath:indexPath animated:YES];
}
#pragma mark - Key Commands

#if !TARGET_OS_OSX // [macOS]
- (NSArray<UIKeyCommand *> *)keyCommands
{
  return @[
    // Dismiss red box
    [UIKeyCommand keyCommandWithInput:UIKeyInputEscape modifierFlags:0 action:@selector(dismiss)],
    // Reload
    [UIKeyCommand keyCommandWithInput:@"r" modifierFlags:UIKeyModifierCommand action:@selector(reload)],
    // Copy = Cmd-Option C since Cmd-C in the simulator copies the pasteboard from
    // the simulator to the desktop pasteboard.
    [UIKeyCommand keyCommandWithInput:@"c"
                        modifierFlags:UIKeyModifierCommand | UIKeyModifierAlternate
                               action:@selector(copyStack)],
  ];
}

- (BOOL)canBecomeFirstResponder
{
  return YES;
}
#endif // [macOS]

@end

#endif
