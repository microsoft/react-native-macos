/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS] Forwarding header: RCTUIKit lives in the React-RCTUIKit pod (module
// React_RCTUIKit), but is imported throughout as <React/RCTUIView.h>. This alias keeps
// those imports working under use_frameworks! by re-exporting the (modular)
// React_RCTUIKit header. Under static libraries it resolves the same way.
#import <React_RCTUIKit/RCTUIView.h>
