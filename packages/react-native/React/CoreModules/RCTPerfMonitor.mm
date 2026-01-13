/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDefines.h>

#import "CoreModulesPlugins.h"

#if RCT_DEV

#import <dlfcn.h>

#import <mach/mach.h>

#import <React/RCTDevSettings.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTBridge.h>
#import <React/RCTFPSGraph.h>
#import <React/RCTInitializing.h>
#import <React/RCTInvalidating.h>
#import <React/RCTJavaScriptExecutor.h>
#import <React/RCTPerformanceLogger.h>
#import <React/RCTPerformanceLoggerLabels.h>
#import <React/RCTRootView.h>
#import <React/RCTUIManager.h>
#import <React/RCTUtils.h>
#import <React/RCTPlatformDisplayLink.h> // [macOS]
#import <React/RCTUIKit.h> // [macOS]
#import <ReactCommon/RCTTurboModule.h>

#if __has_include(<React/RCTDevMenu.h>)
#import <React/RCTDevMenu.h>
#endif

static NSString *const RCTPerfMonitorCellIdentifier = @"RCTPerfMonitorCellIdentifier";

static const CGFloat RCTPerfMonitorBarHeight = 50;
static const CGFloat RCTPerfMonitorExpandHeight = 250;

typedef BOOL (*RCTJSCSetOptionType)(const char *);

NSArray<NSString *> *LabelsForRCTPerformanceLoggerTags();

static BOOL RCTJSCSetOption(const char *option)
{
  return NO;
}

static vm_size_t RCTGetResidentMemorySize(void)
{
  vm_size_t memoryUsageInByte = 0;
  task_vm_info_data_t vmInfo;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
  kern_return_t kernelReturn = task_info(mach_task_self(), TASK_VM_INFO, (task_info_t)&vmInfo, &count);
  if (kernelReturn == KERN_SUCCESS) {
    memoryUsageInByte = (vm_size_t)vmInfo.phys_footprint;
  }
  return memoryUsageInByte;
}

#if !TARGET_OS_OSX // [macOS]
@interface RCTPerfMonitor
    : NSObject <RCTBridgeModule, RCTTurboModule, RCTInvalidating, UITableViewDataSource, UITableViewDelegate>
#else // [macOS
@interface RCTPerfMonitor
    : NSObject <RCTBridgeModule, RCTTurboModule, RCTInvalidating, NSTableViewDataSource, NSTableViewDelegate>
#endif // macOS]

#if __has_include(<React/RCTDevMenu.h>)
@property (nonatomic, strong, readonly) RCTDevMenuItem *devMenuItem;
#endif
@property (nonatomic, strong, readonly) RCTUIPanGestureRecognizer *gestureRecognizer; // [macOS]
@property (nonatomic, strong, readonly) RCTPlatformView *container; // [macOS]
#if TARGET_OS_OSX // [macOS
@property (nonatomic, strong, readonly) NSWindow *containerWindow;
@property (nonatomic, strong, readonly) NSScrollView *metricsScrollView;
#endif // macOS]
@property (nonatomic, strong, readonly) RCTUILabel *memory; // [macOS]
@property (nonatomic, strong, readonly) RCTUILabel *heap; // [macOS]
@property (nonatomic, strong, readonly) RCTUILabel *views; // [macOS]
@property (nonatomic, strong, readonly) RCTFPSGraph *jsGraph;
@property (nonatomic, strong, readonly) RCTFPSGraph *uiGraph;
@property (nonatomic, strong, readonly) RCTUILabel *jsGraphLabel; // [macOS]
@property (nonatomic, strong, readonly) RCTUILabel *uiGraphLabel; // [macOS]

@end

@implementation RCTPerfMonitor {
#if __has_include(<React/RCTDevMenu.h>)
  RCTDevMenuItem *_devMenuItem;
#endif
  RCTUIPanGestureRecognizer *_gestureRecognizer; // [macOS]
  RCTPlatformView *_container; // [macOS]
#if !TARGET_OS_OSX // [macOS]
  UITableView *_metrics;
#else // [macOS
  NSWindow *_containerWindow;
  NSScrollView *_metricsScrollView;
  NSTableView *_metrics;
#endif // macOS]
  RCTUILabel *_memory; // [macOS]
  RCTUILabel *_heap; // [macOS]
  RCTUILabel *_views; // [macOS]
  RCTUILabel *_uiGraphLabel; // [macOS]
  RCTUILabel *_jsGraphLabel; // [macOS]

  RCTFPSGraph *_uiGraph;
  RCTFPSGraph *_jsGraph;

  RCTPlatformDisplayLink *_uiDisplayLink; // [macOS]
  RCTPlatformDisplayLink *_jsDisplayLink; // [macOS]

  NSUInteger _heapSize;

  dispatch_queue_t _queue;
  dispatch_io_t _io;
  int _stderr;
  int _pipe[2];
  NSString *_remaining;

  CGRect _storedMonitorFrame;

  NSArray *_perfLoggerMarks;
}

@synthesize bridge = _bridge;
@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)invalidate
{
  [self hide];
}

#if __has_include(<React/RCTDevMenu.h>)
- (RCTDevMenuItem *)devMenuItem
{
  if (!_devMenuItem) {
    __weak __typeof__(self) weakSelf = self;
    __weak RCTDevSettings *devSettings = [[self bridge] devSettings]; // [macOS]
    if (devSettings.isPerfMonitorShown) {
      [weakSelf show];
    }
    _devMenuItem = [RCTDevMenuItem
        buttonItemWithTitleBlock:^NSString * {
          return (devSettings.isPerfMonitorShown) ? @"Hide Perf Monitor" : @"Show Perf Monitor";
        }
        handler:^{
          if (devSettings.isPerfMonitorShown) {
            [weakSelf hide];
            devSettings.isPerfMonitorShown = NO;
          } else {
            [weakSelf show];
            devSettings.isPerfMonitorShown = YES;
          }
        }];
  }

  return _devMenuItem;
}
#endif

- (RCTUIPanGestureRecognizer *)gestureRecognizer // [macOS]
{
  if (!_gestureRecognizer) {
    _gestureRecognizer = [[RCTUIPanGestureRecognizer alloc] initWithTarget:self action:@selector(gesture:)];
  }

  return _gestureRecognizer;
}

- (RCTUILabel *)memory // [macOS]
{
  if (!_memory) {
#if !TARGET_OS_OSX // [macOS]
    _memory = [[RCTUILabel alloc] initWithFrame:CGRectMake(0, 0, 44, RCTPerfMonitorBarHeight)];
#else // [macOS
    _memory = [[RCTUILabel alloc] initWithFrame:CGRectMake(2, 0, 58, RCTPerfMonitorBarHeight)];
    _memory.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
    _memory.font = [UIFont systemFontOfSize:12];
    _memory.numberOfLines = 3;
    _memory.textAlignment = NSTextAlignmentCenter;
  }

  return _memory;
}

- (RCTUILabel *)heap // [macOS]
{
  if (!_heap) {
#if !TARGET_OS_OSX // [macOS]
    _heap = [[RCTUILabel alloc] initWithFrame:CGRectMake(44, 0, 44, RCTPerfMonitorBarHeight)];
#else // [macOS
    _heap = [[RCTUILabel alloc] initWithFrame:CGRectMake(60, 0, 58, RCTPerfMonitorBarHeight)];
    _heap.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
    _heap.font = [UIFont systemFontOfSize:12];
    _heap.numberOfLines = 3;
    _heap.textAlignment = NSTextAlignmentCenter;
  }

  return _heap;
}

- (RCTUILabel *)views // [macOS]
{
  if (!_views) {
#if !TARGET_OS_OSX // [macOS]
    _views = [[RCTUILabel alloc] initWithFrame:CGRectMake(88, 0, 44, RCTPerfMonitorBarHeight)];
#else // [macOS
    _views = [[RCTUILabel alloc] initWithFrame:CGRectMake(118, 0, 52, RCTPerfMonitorBarHeight)];
    _views.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
    _views.font = [UIFont systemFontOfSize:12];
    _views.numberOfLines = 3;
    _views.textAlignment = NSTextAlignmentCenter;
  }

  return _views;
}

- (RCTFPSGraph *)uiGraph
{
  if (!_uiGraph) {
#if !TARGET_OS_OSX // [macOS]
    _uiGraph = [[RCTFPSGraph alloc] initWithFrame:CGRectMake(134, 14, 40, 30) color:[RCTUIColor lightGrayColor]];
#else // [macOS
    _uiGraph = [[RCTFPSGraph alloc] initWithFrame:CGRectMake(175, 14, 46, 30) color:[RCTUIColor lightGrayColor]];
    _uiGraph.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
  }
  return _uiGraph;
}

- (RCTFPSGraph *)jsGraph
{
  if (!_jsGraph) {
#if !TARGET_OS_OSX // [macOS]
    _jsGraph = [[RCTFPSGraph alloc] initWithFrame:CGRectMake(178, 14, 40, 30) color:[RCTUIColor lightGrayColor]];
#else // [macOS
    _jsGraph = [[RCTFPSGraph alloc] initWithFrame:CGRectMake(226, 14, 46, 30) color:[RCTUIColor lightGrayColor]];
    _jsGraph.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
  }
  return _jsGraph;
}

- (RCTUILabel *)uiGraphLabel // [macOS]
{
  if (!_uiGraphLabel) {
#if !TARGET_OS_OSX // [macOS]
    _uiGraphLabel = [[RCTUILabel alloc] initWithFrame:CGRectMake(134, 3, 40, 10)];
#else // [macOS
    _uiGraphLabel = [[RCTUILabel alloc] initWithFrame:CGRectMake(175, 3, 46, 12)];
    _uiGraphLabel.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
    _uiGraphLabel.font = [UIFont systemFontOfSize:11];
    _uiGraphLabel.textAlignment = NSTextAlignmentCenter;
    _uiGraphLabel.text = @"UI";
  }

  return _uiGraphLabel;
}

- (RCTUILabel *)jsGraphLabel // [macOS]
{
  if (!_jsGraphLabel) {
#if !TARGET_OS_OSX // [macOS]
    _jsGraphLabel = [[RCTUILabel alloc] initWithFrame:CGRectMake(178, 3, 38, 10)];
#else // [macOS
    _jsGraphLabel = [[RCTUILabel alloc] initWithFrame:CGRectMake(226, 3, 46, 12)];
    _jsGraphLabel.autoresizingMask = NSViewMinYMargin;
#endif // macOS]
    _jsGraphLabel.font = [UIFont systemFontOfSize:11];
    _jsGraphLabel.textAlignment = NSTextAlignmentCenter;
    _jsGraphLabel.text = @"JS";
  }

  return _jsGraphLabel;
}

#if !TARGET_OS_OSX // [macOS]
- (RCTPlatformView *)container // [macOS]
{
  if (!_container) {
    UIEdgeInsets safeInsets = RCTKeyWindow().safeAreaInsets;

    _container =
        [[RCTPlatformView alloc] initWithFrame:CGRectMake(safeInsets.left, safeInsets.top, 180, RCTPerfMonitorBarHeight)]; // [macOS]
    _container.layer.borderWidth = 2;
    _container.layer.borderColor = [UIColor lightGrayColor].CGColor;
    [_container addGestureRecognizer:self.gestureRecognizer];
    [_container addGestureRecognizer:[[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(tap)]];

    _container.backgroundColor = [UIColor systemBackgroundColor];
  }

  return _container;
}

- (UITableView *)metrics
{
  if (!_metrics) {
    _metrics = [[UITableView alloc] initWithFrame:CGRectMake(
                                                      0,
                                                      RCTPerfMonitorBarHeight,
                                                      self.container.frame.size.width,
                                                      self.container.frame.size.height - RCTPerfMonitorBarHeight)];
    _metrics.dataSource = self;
    _metrics.delegate = self;
    _metrics.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;
    [_metrics registerClass:[UITableViewCell class] forCellReuseIdentifier:RCTPerfMonitorCellIdentifier];
  }

  return _metrics;
}

- (void)show
{
  if (_container) {
    return;
  }

  [self.container addSubview:self.memory];
  [self.container addSubview:self.heap];
  [self.container addSubview:self.views];
  [self.container addSubview:self.uiGraph];
  [self.container addSubview:self.uiGraphLabel];

  [self redirectLogs];

  RCTJSCSetOption("logGC=1");

  [self updateStats];

  [RCTKeyWindow() addSubview:self.container];

  _uiDisplayLink = [RCTPlatformDisplayLink displayLinkWithTarget:self selector:@selector(threadUpdate:)]; // [macOS]
  [_uiDisplayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];

  self.container.frame =
      (CGRect){self.container.frame.origin, {self.container.frame.size.width + 44, self.container.frame.size.height}};
  [self.container addSubview:self.jsGraph];
  [self.container addSubview:self.jsGraphLabel];

  [_bridge
      dispatchBlock:^{
        self->_jsDisplayLink = [RCTPlatformDisplayLink displayLinkWithTarget:self selector:@selector(threadUpdate:)]; // [macOS]
        [self->_jsDisplayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
      }
              queue:RCTJSThread];
}

- (void)hide
{
  if (!_container) {
    return;
  }

  [self.container removeFromSuperview];
  _container = nil;
  _jsGraph = nil;
  _uiGraph = nil;

  RCTJSCSetOption("logGC=0");

  [self stopLogs];

  [_uiDisplayLink invalidate];
  [_jsDisplayLink invalidate];

  _uiDisplayLink = nil;
  _jsDisplayLink = nil;
}

#else // [macOS

- (NSWindow *)containerWindow
{
  if (!_containerWindow) {
    CGFloat windowWidth = 300;
    // Initial frame - will be repositioned when attached to parent
    NSRect frame = NSMakeRect(0, 0, windowWidth, RCTPerfMonitorBarHeight);
    _containerWindow = [[NSWindow alloc] initWithContentRect:frame
                                                   styleMask:NSWindowStyleMaskBorderless
                                                     backing:NSBackingStoreBuffered
                                                       defer:NO];
    _containerWindow.level = NSFloatingWindowLevel;
    _containerWindow.backgroundColor = [NSColor windowBackgroundColor];
    _containerWindow.opaque = NO;
    _containerWindow.hasShadow = YES;
    _containerWindow.movableByWindowBackground = YES;
  }
  return _containerWindow;
}

- (RCTPlatformView *)container
{
  if (!_container) {
    _container = self.containerWindow.contentView;
    _container.wantsLayer = YES;
    _container.layer.borderWidth = 2;
    _container.layer.borderColor = [NSColor lightGrayColor].CGColor;
    
    NSClickGestureRecognizer *clickRecognizer = [[NSClickGestureRecognizer alloc] initWithTarget:self action:@selector(tap)];
    [_container addGestureRecognizer:clickRecognizer];
  }

  return _container;
}

- (NSScrollView *)metricsScrollView
{
  if (!_metricsScrollView) {
    // Use expanded height since this is only added when expanding
    CGFloat expandedHeight = RCTPerfMonitorExpandHeight - RCTPerfMonitorBarHeight;
    _metricsScrollView = [[NSScrollView alloc] initWithFrame:CGRectMake(
                                                      0,
                                                      0,
                                                      300,
                                                      expandedHeight)];
    _metricsScrollView.hasVerticalScroller = YES;
    _metricsScrollView.autoresizingMask = NSViewWidthSizable; // Only resize width, not height - leave room for bar at top
    _metricsScrollView.documentView = self.metrics;
    
    // Add click recognizer so tapping on scroll view also toggles expand/collapse
    NSClickGestureRecognizer *clickRecognizer = [[NSClickGestureRecognizer alloc] initWithTarget:self action:@selector(tap)];
    [_metricsScrollView addGestureRecognizer:clickRecognizer];
  }
  return _metricsScrollView;
}

- (NSTableView *)metrics
{
  if (!_metrics) {
    _metrics = [[NSTableView alloc] initWithFrame:CGRectMake(0, 0, 300, 200)];
    
    NSTableColumn *column = [[NSTableColumn alloc] initWithIdentifier:RCTPerfMonitorCellIdentifier];
    column.width = 300;
    [_metrics addTableColumn:column];
    
    _metrics.dataSource = self;
    _metrics.delegate = self;
    _metrics.headerView = nil;
    _metrics.rowHeight = 20;
  }

  return _metrics;
}

- (void)show
{
  if (_containerWindow.isVisible) {
    return;
  }

  [self.container addSubview:self.memory];
  [self.container addSubview:self.heap];
  [self.container addSubview:self.views];
  [self.container addSubview:self.uiGraph];
  [self.container addSubview:self.uiGraphLabel];
  [self.container addSubview:self.jsGraph];
  [self.container addSubview:self.jsGraphLabel];

  [self redirectLogs];

  RCTJSCSetOption("logGC=1");

  [self updateStats];

  // Attach to the key window
  NSWindow *parentWindow = RCTKeyWindow();
  if (parentWindow) {
    // Position at top-left of parent window's content area
    NSRect parentFrame = parentWindow.frame;
    NSRect contentRect = [parentWindow contentRectForFrameRect:parentFrame];
    CGFloat xPos = contentRect.origin.x + 10;
    CGFloat yPos = contentRect.origin.y + contentRect.size.height - RCTPerfMonitorBarHeight - 10;
    NSRect perfFrame = self.containerWindow.frame;
    perfFrame.origin = NSMakePoint(xPos, yPos);
    [self.containerWindow setFrame:perfFrame display:YES];
    
    // Add as child window so it moves with parent
    [parentWindow addChildWindow:self.containerWindow ordered:NSWindowAbove];
  }
  
  [self.containerWindow orderFront:nil];

  _uiDisplayLink = [RCTPlatformDisplayLink displayLinkWithTarget:self selector:@selector(threadUpdate:)];
  [_uiDisplayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];

  [_bridge
      dispatchBlock:^{
        self->_jsDisplayLink = [RCTPlatformDisplayLink displayLinkWithTarget:self selector:@selector(threadUpdate:)];
        [self->_jsDisplayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
      }
              queue:RCTJSThread];
}

- (void)hide
{
  if (!_containerWindow.isVisible) {
    return;
  }

  // Remove from parent window if attached
  NSWindow *parentWindow = _containerWindow.parentWindow;
  if (parentWindow) {
    [parentWindow removeChildWindow:_containerWindow];
  }

  [self.containerWindow orderOut:nil];
  _containerWindow = nil;
  _container = nil;
  _jsGraph = nil;
  _uiGraph = nil;

  RCTJSCSetOption("logGC=0");

  [self stopLogs];

  [_uiDisplayLink invalidate];
  [_jsDisplayLink invalidate];

  _uiDisplayLink = nil;
  _jsDisplayLink = nil;
}

#endif // macOS]

- (void)redirectLogs
{
  _stderr = dup(STDERR_FILENO);

  if (pipe(_pipe) != 0) {
    return;
  }

  dup2(_pipe[1], STDERR_FILENO);
  close(_pipe[1]);

  __weak __typeof__(self) weakSelf = self;
  _queue = dispatch_queue_create("com.facebook.react.RCTPerfMonitor", DISPATCH_QUEUE_SERIAL);
  _io = dispatch_io_create(
      DISPATCH_IO_STREAM,
      _pipe[0],
      _queue,
      ^(__unused int error){
      });

  dispatch_io_set_low_water(_io, 20);

  dispatch_io_read(_io, 0, SIZE_MAX, _queue, ^(__unused bool done, dispatch_data_t data, __unused int error) {
    if (!data) {
      return;
    }

    dispatch_data_apply(
        data, ^bool(__unused dispatch_data_t region, __unused size_t offset, const void *buffer, size_t size) {
          write(self->_stderr, buffer, size);

          NSString *log = [[NSString alloc] initWithBytes:buffer length:size encoding:NSUTF8StringEncoding];
          [weakSelf parse:log];
          return true;
        });
  });
}

- (void)stopLogs
{
  dup2(_stderr, STDERR_FILENO);
  dispatch_io_close(_io, 0);
}

- (void)parse:(NSString *)log
{
  static NSRegularExpression *GCRegex;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    NSString *pattern =
        @"\\[GC: [\\d\\.]+ \\wb => (Eden|Full)Collection, (?:Skipped copying|Did copy), ([\\d\\.]+) \\wb, [\\d.]+ \\ws\\]";
    GCRegex = [NSRegularExpression regularExpressionWithPattern:pattern options:0 error:nil];
  });

  if (_remaining) {
    log = [_remaining stringByAppendingString:log];
    _remaining = nil;
  }

  NSArray<NSString *> *lines = [log componentsSeparatedByString:@"\n"];
  if (lines.count == 1) { // no newlines
    _remaining = log;
    return;
  }

  for (NSString *line in lines) {
    NSTextCheckingResult *match = [GCRegex firstMatchInString:line options:0 range:NSMakeRange(0, line.length)];
    if (match) {
      NSString *heapSizeStr = [line substringWithRange:[match rangeAtIndex:2]];
      _heapSize = [heapSizeStr integerValue];
    }
  }
}

- (void)updateStats
{
#if !TARGET_OS_OSX // [macOS]
  NSDictionary<NSNumber *, UIView *> *views = [_bridge.uiManager valueForKey:@"viewRegistry"];
  NSUInteger viewCount = views.count;
  NSUInteger visibleViewCount = 0;
  for (UIView *view in views.allValues) {
    if (view.window || view.superview.window) {
      visibleViewCount++;
    }
  }

  // Ensure the container always stays on top of newly added views
  if ([_container.superview.subviews lastObject] != _container) {
    [_container.superview bringSubviewToFront:_container];
  }

  double mem = (double)RCTGetResidentMemorySize() / 1024 / 1024;
  self.memory.text = [NSString stringWithFormat:@"RAM\n%.2lf\nMB", mem];
  self.heap.text = [NSString stringWithFormat:@"JSC\n%.2lf\nMB", (double)_heapSize / 1024];
  self.views.text =
      [NSString stringWithFormat:@"Views\n%lu\n%lu", (unsigned long)visibleViewCount, (unsigned long)viewCount];

  __weak __typeof__(self) weakSelf = self;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    __strong __typeof__(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_container.superview) {
      [strongSelf updateStats];
    }
  });
#else // [macOS
  NSDictionary<NSNumber *, NSView *> *views = [_bridge.uiManager valueForKey:@"viewRegistry"];
  NSUInteger viewCount = views.count;
  NSUInteger visibleViewCount = 0;
  for (NSView *view in views.allValues) {
    if (view.window || view.superview.window) {
      visibleViewCount++;
    }
  }

  double mem = (double)RCTGetResidentMemorySize() / 1024 / 1024;
  self.memory.text = [NSString stringWithFormat:@"RAM\n%.1lfMB", mem];
  self.heap.text = [NSString stringWithFormat:@"JSC\n%.1lfMB", (double)_heapSize / 1024];
  self.views.text =
      [NSString stringWithFormat:@"Views\n%lu/%lu", (unsigned long)visibleViewCount, (unsigned long)viewCount];

  __weak __typeof__(self) weakSelf = self;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    __strong __typeof__(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_containerWindow.isVisible) {
      [strongSelf updateStats];
    }
  });
#endif // macOS]
}

- (void)gesture:(RCTUIPanGestureRecognizer *)gestureRecognizer // [macOS]
{
#if !TARGET_OS_OSX // [macOS]
  CGPoint translation = [gestureRecognizer translationInView:self.container.superview];
  self.container.center = CGPointMake(self.container.center.x + translation.x, self.container.center.y + translation.y);
  [gestureRecognizer setTranslation:CGPointMake(0, 0) inView:self.container.superview];
#else // [macOS
  // Window dragging is handled by movableByWindowBackground on macOS
  (void)gestureRecognizer;
#endif // macOS]
}

- (void)tap
{
  [self loadPerformanceLoggerData];
#if !TARGET_OS_OSX // [macOS]
  if (CGRectIsEmpty(_storedMonitorFrame)) {
    UIEdgeInsets safeInsets = RCTKeyWindow().safeAreaInsets;
    _storedMonitorFrame =
        CGRectMake(safeInsets.left, safeInsets.top, self.container.window.frame.size.width, RCTPerfMonitorExpandHeight);
    [self.container addSubview:self.metrics];
  } else {
    [_metrics reloadData];
  }

  [UIView animateWithDuration:.25
                   animations:^{
                     CGRect tmp = self.container.frame;
                     self.container.frame = self->_storedMonitorFrame;
                     self->_storedMonitorFrame = tmp;
                   }];
#else // [macOS
  if (CGRectIsEmpty(_storedMonitorFrame)) {
    // First tap: expand
    // Save current collapsed frame
    NSRect collapsedFrame = self.containerWindow.frame;
    _storedMonitorFrame = collapsedFrame;
    
    // Calculate expanded frame - keep top-left corner fixed, expand downward
    // In macOS coords, origin is bottom-left, so we need to move origin.y down
    CGFloat heightDelta = RCTPerfMonitorExpandHeight - collapsedFrame.size.height;
    NSRect expandedFrame = NSMakeRect(
        collapsedFrame.origin.x,
        collapsedFrame.origin.y - heightDelta,
        300,
        RCTPerfMonitorExpandHeight);
    
    [self.container addSubview:self.metricsScrollView];
    
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
      context.duration = 0.25;
      [self.containerWindow.animator setFrame:expandedFrame display:YES];
    }];
  } else {
    // Second tap: collapse
    [_metrics reloadData];
    
    // Hide the scroll view when collapsing
    [_metricsScrollView removeFromSuperview];
    
    NSRect collapsedFrame = _storedMonitorFrame;
    _storedMonitorFrame = CGRectZero; // Reset so next tap expands again
    
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
      context.duration = 0.25;
      [self.containerWindow.animator setFrame:collapsedFrame display:YES];
    }];
  }
#endif // macOS]
}

- (void)threadUpdate:(RCTPlatformDisplayLink *)displayLink // [macOS]
{
  RCTFPSGraph *graph = displayLink == _jsDisplayLink ? _jsGraph : _uiGraph;
  [graph onTick:displayLink.timestamp];
}

- (void)loadPerformanceLoggerData
{
  NSUInteger i = 0;
  NSMutableArray<NSString *> *data = [NSMutableArray new];
  RCTPerformanceLogger *performanceLogger = [_bridge performanceLogger];
  NSArray<NSNumber *> *values = [performanceLogger valuesForTags];
  for (NSString *label in LabelsForRCTPerformanceLoggerTags()) {
    long long value = values[i + 1].longLongValue - values[i].longLongValue;
    NSString *unit = @"ms";
    if ([label hasSuffix:@"Size"]) {
      unit = @"b";
    } else if ([label hasSuffix:@"Count"]) {
      unit = @"";
    }
    [data addObject:[NSString stringWithFormat:@"%@: %lld%@", label, value, unit]];
    i += 2;
  }
  _perfLoggerMarks = [data copy];
}

#if !TARGET_OS_OSX // [macOS]
#pragma mark - UITableViewDataSource

- (NSInteger)numberOfSectionsInTableView:(__unused UITableView *)tableView
{
  return 1;
}

- (NSInteger)tableView:(__unused UITableView *)tableView numberOfRowsInSection:(__unused NSInteger)section
{
  return _perfLoggerMarks.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:RCTPerfMonitorCellIdentifier
                                                          forIndexPath:indexPath];

  if (!cell) {
    cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault
                                  reuseIdentifier:RCTPerfMonitorCellIdentifier];
  }

  cell.textLabel.text = _perfLoggerMarks[indexPath.row];
  cell.textLabel.font = [UIFont systemFontOfSize:12];

  return cell;
}

#pragma mark - UITableViewDelegate

- (CGFloat)tableView:(__unused UITableView *)tableView heightForRowAtIndexPath:(__unused NSIndexPath *)indexPath
{
  return 20;
}

#else // [macOS
#pragma mark - NSTableViewDataSource

- (NSInteger)numberOfRowsInTableView:(__unused NSTableView *)tableView
{
  return _perfLoggerMarks.count;
}

#pragma mark - NSTableViewDelegate

- (NSView *)tableView:(NSTableView *)tableView viewForTableColumn:(NSTableColumn *)tableColumn row:(NSInteger)row
{
  NSTextField *cell = [tableView makeViewWithIdentifier:RCTPerfMonitorCellIdentifier owner:self];
  if (!cell) {
    cell = [[NSTextField alloc] initWithFrame:NSZeroRect];
    cell.identifier = RCTPerfMonitorCellIdentifier;
    cell.bezeled = NO;
    cell.drawsBackground = NO;
    cell.editable = NO;
    cell.selectable = NO;
  }
  cell.stringValue = _perfLoggerMarks[row];
  cell.font = [NSFont systemFontOfSize:12];
  return cell;
}

- (CGFloat)tableView:(__unused NSTableView *)tableView heightOfRow:(__unused NSInteger)row
{
  return 20;
}

#endif // macOS]

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return nullptr;
}

@end

NSArray<NSString *> *LabelsForRCTPerformanceLoggerTags()
{
  NSMutableArray<NSString *> *labels = [NSMutableArray new];
  for (int i = 0; i < RCTPLSize; i++) {
    [labels addObject:RCTPLLabelForTag((RCTPLTag)i)];
  }
  return labels;
}

#endif

Class RCTPerfMonitorCls(void)
{
#if RCT_DEV
  return RCTPerfMonitor.class;
#else
  return nil;
#endif
}
