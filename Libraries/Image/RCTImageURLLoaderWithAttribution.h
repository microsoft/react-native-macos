/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTImageURLLoader.h>
#import <React/RCTImageLoaderProtocol.h>
<<<<<<< HEAD

#import <React/RCTUIKit.h> // TODO(macOS ISS#2323203)
=======
#import <React/RCTImageLoaderLoggable.h>
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

// TODO (T61325135): Remove C++ checks
#ifdef __cplusplus
namespace facebook {
namespace react {

struct ImageURLLoaderAttribution {
  int32_t nativeViewTag = 0;
  int32_t surfaceId = 0;
  NSString *analyticTag;
};

} // namespace react
} // namespace facebook
#endif

@interface RCTImageURLLoaderRequest : NSObject

@property (nonatomic, strong, readonly) NSString *requestId;
@property (nonatomic, strong, readonly) NSURL *imageURL;
@property (nonatomic, copy, readonly) RCTImageLoaderCancellationBlock cancellationBlock;

- (instancetype)initWithRequestId:(NSString *)requestId imageURL:(NSURL *)imageURL cancellationBlock:(RCTImageLoaderCancellationBlock)cancellationBlock;
- (void)cancel;

@end

/**
 * Same as the RCTImageURLLoader interface, but allows passing in optional `attribution` information.
 * This is useful for per-app logging and other instrumentation.
 */
@protocol RCTImageURLLoaderWithAttribution <RCTImageURLLoader, RCTImageLoaderLoggable>

// TODO (T61325135): Remove C++ checks
#ifdef __cplusplus
/**
 * Same as the RCTImageURLLoader variant above, but allows optional `attribution` information.
 * Caller may also specify a preferred requestId for tracking purpose.
 */
- (RCTImageURLLoaderRequest *)loadImageForURL:(NSURL *)imageURL
                                         size:(CGSize)size
                                        scale:(CGFloat)scale
                                   resizeMode:(RCTResizeMode)resizeMode
                                    requestId:(NSString *)requestId
                                    priority: (RCTImageLoaderPriority)priority
                                  attribution:(const facebook::react::ImageURLLoaderAttribution &)attribution
                              progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                           partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                            completionHandler:(RCTImageLoaderCompletionBlockWithMetadata)completionHandler;
#endif

/**
 * Image instrumentation - start tracking the on-screen visibility of the native image view.
 */
- (void)trackURLImageVisibilityForRequest:(RCTImageURLLoaderRequest *)loaderRequest imageView:(UIView *)imageView;

/**
 * Image instrumentation - notify that the request was destroyed.
 */
<<<<<<< HEAD
- (void)trackURLImageVisibilityForRequest:(RCTImageURLLoaderRequest *)loaderRequest imageView:(RCTUIView *)imageView; // TODO(macOS ISS#2323203)
=======
- (void)trackURLImageRequestDidDestroy:(RCTImageURLLoaderRequest *)loaderRequest;
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

/**
 * Image instrumentation - notify that the native image view was destroyed.
 */
- (void)trackURLImageDidDestroy:(RCTImageURLLoaderRequest *)loaderRequest;

@end
