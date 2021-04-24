//
//  JSIRuntimeInitializeStateNotifier.m
//
// TODO(OSS Candidate ISS#2710739)

#import "JSIRuntimeInitializeStateNotifier-C-Interface.h"
#import "JSIRuntimeInitializeStateNotifier.h"

@implementation JSIRuntimeInitializeStateNotifier

void NotifyRuntimeInitializationEnd() {
  [JSIRuntimeInitializeStateNotifier notifyRuntimeInitializationEnd];
}
 
+ (void)notifyRuntimeInitializationEnd {
  NSNotification *runtimeNotification = [[NSNotification alloc] initWithName:(NSString*)JSIRuntimeInitializationEndNotificationName object:nil userInfo:nil];
  [[NSNotificationCenter defaultCenter] postNotification:runtimeNotification];
}

@end
