---
sidebar_label: 'Native Development'
sidebar_position: 1
---

# Native Platform

React Native macOS is very similar to React Native on iOS, so you can write native modules and components the same way—just use [AppKit](https://developer.apple.com/documentation/appkit) instead of [UIKit](https://developer.apple.com/documentation/uikit)!

:::note
Please refer to the React Native docs on [Native Platform developement](https://reactnative.dev/docs/native-platform) for the iOS docs
:::

## Add macOS support to your iOS library

Suppose you have an existing native module or component you would like to bring to macOS. The steps are fairly straightforward:

1. **Update your Podspec**

  Add macOS as a supported platform in your `.podspec` file:
  ```ruby
  s.platforms = { :ios => "15.0", :osx => "12.0" }
  ```

2. **Port Your Native Code**

  You have two main options:
  - Use `#if TARGET_OS_OSX` (or similar preprocessor macros) to share code between iOS and macOS, switching imports and logic as needed.
    ```objective c
    #if !TARGET_OS_OSX // iOS
    #import <UIKit/UIKit.h>
    #else // macOS
    #import <Appkit/Appkit.h>
    #endif

    ...
     ```
   - Or, maintain separate codebases for iOS and macOS if the implementations are very different.

3. **Update Directory Structure**

  If you keep your iOS and macOS code in the same files with ifdefs, consider renaming your `ios` directory to `apple` to better reflect this code is no longer iOS specific.

  - `src/ios/myNativeView.swift` --> `src/apple/myNativeView.swift`

  Similarily, you may want to update any "iOS" prefixes or suffixes in classnames to "Apple".

  - `IOSPlatformContext.mm` --> `ApplePlatformContext.mm`

With these steps, you can write native modules and components that work on both iOS and macOS, making it easier to share code and maintain your library.

## Examples of Community Modules with macOS Support

Many popular React Native community modules already support macOS. Here are some examples:

- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [React Native SVG](https://github.com/software-mansion/react-native-svg)
- [React Native Skia](https://github.com/Shopify/react-native-skia)
- [React Native Reanimated](https://github.com/software-mansion/react-native-reanimated)
- [React Native Gesture Handler](https://github.com/software-mansion/react-native-gesture-handler)

These modules can serve as references for adding macOS support to your own libraries.
