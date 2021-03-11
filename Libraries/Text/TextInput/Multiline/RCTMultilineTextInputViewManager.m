/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTMultilineTextInputViewManager.h>
#import <React/RCTMultilineTextInputView.h>

@implementation RCTMultilineTextInputViewManager

RCT_EXPORT_MODULE()

- (RCTUIView *)view // TODO(macOS ISS#3536887)
{
  return [[RCTMultilineTextInputView alloc] initWithBridge:self.bridge];
}

#pragma mark - Multiline <TextInput> (aka TextView) specific properties

<<<<<<< HEAD
#if !TARGET_OS_TV
RCT_REMAP_NOT_OSX_VIEW_PROPERTY(dataDetectorTypes, backedTextInputView.dataDetectorTypes, UIDataDetectorTypes) // TODO(macOS ISS#2323203)
RCT_REMAP_OSX_VIEW_PROPERTY(dataDetectorTypes, backedTextInputView.enabledTextCheckingTypes, NSTextCheckingTypes) // TODO(macOS ISS#2323203)
#endif
=======
RCT_REMAP_VIEW_PROPERTY(dataDetectorTypes, backedTextInputView.dataDetectorTypes, UIDataDetectorTypes)
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

@end
