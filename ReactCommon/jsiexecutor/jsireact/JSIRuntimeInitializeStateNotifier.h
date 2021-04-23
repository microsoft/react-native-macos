//
//  JSIRuntimeInitializeStateNotifier.h
//
// TODO(OSS Candidate ISS#2710739)

#define JSIRuntimeInitializationEndNotificationName @"JSIRuntimeInitializationEndNotificationName"
 
 /*
  * When the globabl JS runtime is set up, post a notification that can be used to trigger JS bundle loads.
  */
@interface JSIRuntimeInitializeStateNotifier : NSObject
+ (void)notifyRuntimeInitializationEnd;
@end
