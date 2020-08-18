/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "Screenshot.h"
#import <React/RCTUIManager.h>
#import <React/RCTUtils.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <ReactCommon/TurboModuleUtils.h>

class ScreenshotManagerTurboModule : public facebook::react::TurboModule
{
public:
  ScreenshotManagerTurboModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    :facebook::react::TurboModule("ScreenshotManager", jsInvoker)
  {
  }
  
  facebook::jsi::Value get(
    facebook::jsi::Runtime& runtime,
    const facebook::jsi::PropNameID& propName
  ) override
  {
    auto key = propName.utf8(runtime);
    if (key == "takeScreenshot")
    {
      return facebook::jsi::Function::createFromHostFunction(
        runtime,
        propName,
        0,
        [](
          facebook::jsi::Runtime& runtime,
          const facebook::jsi::Value& thisVal,
          const facebook::jsi::Value *args,
          size_t count)
        {
          return facebook::react::createPromiseAsJSIValue(
            runtime,
            [](facebook::jsi::Runtime& runtime, std::shared_ptr<facebook::react::Promise> promise)
            {
              promise->reject("takeScreenshot is not yet implemented!");
              return;
              // ignore arguments, assume to be ('window', {format: 'jpeg', quality: 0.8})
            
              // find the key window
              NSWindow* keyWindow;
              for (NSWindow* window in NSApp.windows) {
                if (window.keyWindow) {
                  keyWindow = window;
                  break;
                }
              }
              if (!keyWindow)
              {
                promise->reject("Failed to find the key window!");
              }

              // take a snapshot of the key window
              CGWindowID windowID = (CGWindowID)[keyWindow windowNumber];
              CGWindowImageOption imageOptions = kCGWindowImageDefault;
              CGWindowListOption listOptions = kCGWindowListOptionIncludingWindow;
              CGRect imageBounds = CGRectNull;
              CGImageRef windowImage = CGWindowListCreateImage(
                imageBounds,
                listOptions,
                windowID,
                imageOptions);
              NSImage* image = [[NSImage alloc] initWithCGImage:windowImage size:[keyWindow frame].size];
            
              // save to a temp file
              NSError *error = nil;
              NSString *tempFilePath = RCTTempFilePath(@"jpeg", &error);
              NSData* imageData = [image TIFFRepresentation];
              NSBitmapImageRep* imageRep = [NSBitmapImageRep imageRepWithData:imageData];
              NSDictionary* imageProps =
                [NSDictionary
                dictionaryWithObject:@0.8
                forKey:NSImageCompressionFactor
                ];
              imageData = [imageRep representationUsingType:NSBitmapImageFileTypeJPEG properties:imageProps];
              [imageData writeToFile:tempFilePath atomically:NO];
            
              promise->resolve(facebook::jsi::Value(
                runtime,
                facebook::jsi::String::createFromUtf8(
                  runtime,
                  std::string([tempFilePath UTF8String])
                  )
                ));
            }
          );
        }
      );
    }
    else
    {
      return facebook::jsi::Value::undefined();
    }
  }
};

@implementation ScreenshotManagerTurboModuleManagerDelegate

- (std::shared_ptr<facebook::react::TurboModule>)
  getTurboModule:(const std::string &)name
  jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  if (name == "ScreenshotManager")
  {
    return std::make_shared<ScreenshotManagerTurboModule>(jsInvoker);
  }
  return nullptr;
}


- (std::shared_ptr<facebook::react::TurboModule>)
  getTurboModule:(const std::string &)name
  instance:(id<RCTTurboModule>)instance
  jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  if (name == "ScreenshotManager")
  {
    return std::make_shared<ScreenshotManagerTurboModule>(jsInvoker);
  }
  return nullptr;
}

@end

@implementation ScreenshotManager

// RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(takeScreenshot:(id /* NSString or NSNumber */)target
                  withOptions:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSError* error = [NSError
    errorWithDomain:@"What is a domain?"
    code:200
    userInfo:@{@"reason": @"Not Implemented"}
    ];
  reject(RCTErrorUnspecified, error.userInfo[@"reason"], error);
  /*
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {

    // Get view
    UIView *view;
    if (target == nil || [target isEqual:@"window"]) {
      view = RCTKeyWindow();
    } else if ([target isKindOfClass:[NSNumber class]]) {
      view = viewRegistry[target];
      if (!view) {
        RCTLogError(@"No view found with reactTag: %@", target);
        return;
      }
    }

    // Get options
    CGSize size = [RCTConvert CGSize:options];
    NSString *format = [RCTConvert NSString:options[@"format"] ?: @"png"];

    // Capture image
    if (size.width < 0.1 || size.height < 0.1) {
      size = view.bounds.size;
    }
    UIGraphicsBeginImageContextWithOptions(size, NO, 0);
    BOOL success = [view drawViewHierarchyInRect:(CGRect){CGPointZero, size} afterScreenUpdates:YES];
    UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    if (!success || !image) {
      reject(RCTErrorUnspecified, @"Failed to capture view snapshot.", nil);
      return;
    }

    // Convert image to data (on a background thread)
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{

      NSData *data;
      if ([format isEqualToString:@"png"]) {
        data = UIImagePNGRepresentation(image);
      } else if ([format isEqualToString:@"jpeg"]) {
        CGFloat quality = [RCTConvert CGFloat:options[@"quality"] ?: @1];
        data = UIImageJPEGRepresentation(image, quality);
      } else {
        RCTLogError(@"Unsupported image format: %@", format);
        return;
      }

      // Save to a temp file
      NSError *error = nil;
      NSString *tempFilePath = RCTTempFilePath(format, &error);
      if (tempFilePath) {
        if ([data writeToFile:tempFilePath options:(NSDataWritingOptions)0 error:&error]) {
          resolve(tempFilePath);
          return;
        }
      }

      // If we reached here, something went wrong
      reject(RCTErrorUnspecified, error.localizedDescription, error);
    });
  }];
  */
}

@end
