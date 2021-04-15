//
//  RCTRuntimeInitializeStateNotifier.m
//
// TODO(OSS Candidate ISS#2710739)

#import <jsireact/RCTRuntimeInitializeStateNotifier-C-Interface.h>
#import "RCTRuntimeInitializeStateNotifier.h"

void NotifyRuntimeInitializationEnd() {
  [RCTRuntimeInitializeStateNotifier notifyRuntimeInitializationEnds];
}

@implementation RCTRuntimeInitializeStateNotifier

+ (void)notifyRuntimeInitializationEnds {
    NSNotification *runtimeNotification = [[NSNotification alloc] initWithName:(NSString*)RCTRuntimeInitializationEndNotificationName object:nil userInfo:nil];
    [[NSNotificationCenter defaultCenter] postNotification:runtimeNotification];
}

@end
