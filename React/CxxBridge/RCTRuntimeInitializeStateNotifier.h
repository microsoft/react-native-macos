//
//  RCTRuntimeInitializeStateNotifier.h
//
// TODO(OSS Candidate ISS#2710739)

#define RCTRuntimeInitializationEndNotificationName @"RCTRuntimeInitializationEndNotificationName"

@interface RCTRuntimeInitializeStateNotifier : NSObject

+ (void)notifyRuntimeInitializationEnds;

@end
