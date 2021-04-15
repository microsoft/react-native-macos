//
//  RCTRuntimeInitializeStateNotifier.h
//
// TODO(OSS Candidate ISS#2710739)

#import <AppKit/AppKit.h>

#define RCTRuntimeInitializationEndNotificationName @"RCTRuntimeInitializationEndNotificationName"

@interface RCTRuntimeInitializeStateNotifier : NSObject

+ (void)notifyRuntimeInitializationEnds;

@end
