/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#pragma once

#include <TargetConditionals.h>

#import "RCTUILabel.h"
#import "RCTUIView.h"

#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

@compatibility_alias RCTUITableView UITableView;
@compatibility_alias RCTUITableViewCell UITableViewCell;
#define RCTUITableViewDataSource UITableViewDataSource
#define RCTUITableViewDelegate UITableViewDelegate
#define RCTUITableViewCellStyleDefault UITableViewCellStyleDefault
#define RCTUITableViewCellStyleSubtitle UITableViewCellStyleSubtitle
#define RCTUITableViewScrollPositionTop UITableViewScrollPositionTop
#define RCTUITableViewAutomaticDimension UITableViewAutomaticDimension

#else // TARGET_OS_OSX [

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

@class RCTUITableView;

typedef NS_ENUM(NSInteger, RCTUITableViewCellStyle) {
  RCTUITableViewCellStyleDefault,
  RCTUITableViewCellStyleSubtitle,
};

typedef NS_ENUM(NSInteger, RCTUITableViewScrollPosition) {
  RCTUITableViewScrollPositionTop,
};

extern const CGFloat RCTUITableViewAutomaticDimension;

@interface NSIndexPath (RCTUITableView)

@property (nonatomic, readonly) NSInteger row;
+ (instancetype)indexPathForRow:(NSInteger)row inSection:(NSInteger)section;

@end

@interface RCTUITableViewCell : NSTableCellView

- (instancetype)initWithStyle:(RCTUITableViewCellStyle)style
              reuseIdentifier:(nullable NSString *)reuseIdentifier NS_DESIGNATED_INITIALIZER;
- (nullable instancetype)initWithCoder:(NSCoder *)coder NS_UNAVAILABLE;

@property (nonatomic, readonly, nullable, copy) NSString *reuseIdentifier;
@property (nonatomic, readonly, strong) RCTPlatformView *contentView;
@property (nonatomic, readonly, strong) RCTUILabel *textLabel;
@property (nonatomic, readonly, nullable, strong) RCTUILabel *detailTextLabel;
@property (nonatomic, nullable, strong) RCTUIColor *backgroundColor;

- (void)prepareForReuse;

@end

@protocol RCTUITableViewDataSource <NSObject>

@required
- (NSInteger)tableView:(RCTUITableView *)tableView numberOfRowsInSection:(NSInteger)section;
- (RCTUITableViewCell *)tableView:(RCTUITableView *)tableView
           cellForRowAtIndexPath:(NSIndexPath *)indexPath;

@optional
- (NSInteger)numberOfSectionsInTableView:(RCTUITableView *)tableView;

@end

@protocol RCTUITableViewDelegate <NSObject>

@optional
- (CGFloat)tableView:(RCTUITableView *)tableView heightForRowAtIndexPath:(NSIndexPath *)indexPath;
- (nullable RCTPlatformView *)tableView:(RCTUITableView *)tableView viewForHeaderInSection:(NSInteger)section;
- (CGFloat)tableView:(RCTUITableView *)tableView heightForHeaderInSection:(NSInteger)section;
- (void)tableView:(RCTUITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath;

@end

@interface RCTUITableView : NSScrollView

@property (nonatomic, weak, nullable) id<RCTUITableViewDataSource> dataSource;
@property (nonatomic, weak, nullable) id<RCTUITableViewDelegate> delegate;
@property (nonatomic, nullable, copy) RCTUIColor *separatorColor;

- (void)reloadData;
- (nullable __kindof RCTUITableViewCell *)dequeueReusableCellWithIdentifier:(NSString *)identifier;
- (void)scrollToRowAtIndexPath:(NSIndexPath *)indexPath
              atScrollPosition:(RCTUITableViewScrollPosition)position
                      animated:(BOOL)animated;
- (void)deselectRowAtIndexPath:(NSIndexPath *)indexPath animated:(BOOL)animated;

@end

NS_ASSUME_NONNULL_END

#endif // ] TARGET_OS_OSX
