//
//  RNTesterUnitTests_macOS.m
//  RNTesterUnitTests-macOS
//
//  Created by Jeff Cruikshank on 6/5/17.
//  Copyright © 2017 Facebook. All rights reserved.
//

// [macOS]

#import <React/RCTUIKit.h>
#import <XCTest/XCTest.h>

@interface RCTSafeAreaObservingView : RCTUIView
@property (nonatomic, assign) NSUInteger safeAreaChangeCount;
@property (nonatomic, assign) NSEdgeInsets observedSafeAreaInsets;
@end

@implementation RCTSafeAreaObservingView

- (void)safeAreaInsetsDidChange
{
  [super safeAreaInsetsDidChange];
  self.safeAreaChangeCount++;
  self.observedSafeAreaInsets = self.safeAreaInsets;
}

@end

static void RCTPerformOnMainThread(dispatch_block_t block)
{
  if (NSThread.isMainThread) {
    block();
  } else {
    dispatch_sync(dispatch_get_main_queue(), block);
  }
}

@interface RNTesterUnitTests_macOS : XCTestCase

@end

@implementation RNTesterUnitTests_macOS

- (void)testSafeAreaCallbackSupportsSuperclassCalls
{
  RCTPerformOnMainThread(^{
    [NSApplication sharedApplication];
    RCTSafeAreaObservingView *view = [RCTSafeAreaObservingView new];
    XCTAssertNoThrow([view safeAreaInsetsDidChange]);
    XCTAssertEqual(view.safeAreaChangeCount, 1u);
  });
}

- (void)testLayoutReportsChangedSafeAreaInsetsOnce
{
  RCTPerformOnMainThread(^{
    [NSApplication sharedApplication];
    NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 400, 300)
                                                   styleMask:NSWindowStyleMaskBorderless
                                                     backing:NSBackingStoreBuffered
                                                       defer:NO];
    window.releasedWhenClosed = NO;
    @try {
      RCTSafeAreaObservingView *view = [[RCTSafeAreaObservingView alloc] initWithFrame:window.contentView.bounds];
      window.contentView = view;
      [view layoutSubtreeIfNeeded];
      NSUInteger originalCount = view.safeAreaChangeCount;

      view.additionalSafeAreaInsets = NSEdgeInsetsMake(5, 7, 11, 13);
      view.needsLayout = YES;
      [view layoutSubtreeIfNeeded];
      XCTAssertEqual(view.safeAreaChangeCount, originalCount + 1);
      XCTAssertTrue(NSEdgeInsetsEqual(view.observedSafeAreaInsets, view.safeAreaInsets));

      view.needsLayout = YES;
      [view layoutSubtreeIfNeeded];
      XCTAssertEqual(view.safeAreaChangeCount, originalCount + 1);

      view.additionalSafeAreaInsets = NSEdgeInsetsMake(7, 11, 13, 17);
      view.needsLayout = YES;
      [view layoutSubtreeIfNeeded];
      XCTAssertEqual(view.safeAreaChangeCount, originalCount + 2);
      XCTAssertTrue(NSEdgeInsetsEqual(view.observedSafeAreaInsets, view.safeAreaInsets));
    } @finally {
      [window close];
    }
  });
}

@end
