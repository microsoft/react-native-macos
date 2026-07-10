# RCTUIKit

RCTUIKit is a UIKit/AppKit compatibility layer for React Native macOS. It lets the rest of the
codebase use UIKit-style types and APIs on both iOS and macOS by providing:

- **`#define` / `typedef` aliases** — On iOS, names like `RCTUIView` resolve to their UIKit
  equivalents (`UIView`). On macOS, they resolve to custom `NSView` subclasses that fill in
  missing UIKit API surface.
- **Inline helper functions** — Small cross-platform wrappers (e.g. `RCTUIViewHitTestWithEvent`,
  `UIImageGetScale`) that smooth over behavioral differences between the two frameworks.
- **UIKit → AppKit shims** — Constants, enums, notifications, and font defines that let code
  written against UIKit compile on macOS without `#if` guards everywhere.

## Naming convention: `RCTUI` vs `RCTPlatform`

There are two prefixes used in this layer, and the distinction matters:

```objc
#if !TARGET_OS_OSX // iOS
#define RCTPlatformBar UIBar    // RCTPlatform — plain alias
#define RCTUIFoo UIFoo          // RCTUI — plain alias
#else
// macOS
#define RCTPlatformBar NSBar    // RCTPlatform — plain alias
@interface RCTUIFoo : NSFoo.    // RCTUI — Subclass for iOS compatibility
...
@end
#endif
```

| Prefix | Meaning | iOS | macOS | Examples |
|--------|---------|-----|-------|----------|
| **`RCTPlatform`** | Plain typedef / `#define` alias — no extra API | Resolves to UIKit type | Resolves to AppKit type | `RCTPlatformColor`, `RCTPlatformView`, `RCTPlatformImage` |
| **`RCTUI`** | Real subclass that adds UIKit-compatible API on macOS | `#define` to UIKit type | Custom `@interface` (e.g. `NSView` subclass) | `RCTUIView`, `RCTUIScrollView`, `RCTUIImage` |

Use `RCTUI`-prefixed types when you need the extra UIKit compatibility surface that the macOS
subclass provides. Use `RCTPlatform`-prefixed types when you just need a type-safe way to refer
to "the color class" or "the base view class" without caring about additional API.

For backward compatibility, the old `RCTUI` names still exist as aliases for the three types
that were moved to `RCTPlatform`: `RCTUIColor`, `RCTUIPanGestureRecognizer`, `RCTUIApplication`.

The `.m` files are wrapped in `#if TARGET_OS_OSX ... #endif` since they only contain macOS
implementations.