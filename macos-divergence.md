<!-- @format -->

# React Native macOS: API and functional divergence

<!-- [macOS] -->

## Scope and overall assessment

React Native macOS is an **AppKit-based desktop adaptation of React Native**, not a separate application framework. Its largest divergences are in interaction, accessibility, window integration, and native hosting. Most application structure, React components, layout, and runtime concepts remain shared.

This analysis describes this repository's `main` at commit `459c4e15de37205ee3bcd94db5dfe767a4e04d56`, inspected on November 11, 2026. The comparison is with the upstream iOS/Android model represented in the shared sources, not a release-by-release diff against the latest upstream HEAD. It focuses on functional boundaries rather than individual implementation patches.

**Observed** statements below are grounded in the linked API declarations and native implementations. **Implication** paragraphs are architectural conclusions, not runtime test results. The runtime baseline is the New Architecture; legacy Paper code remains in the tree but is not evidence that a feature works on current `main`.

Not every API mentioned here originated in this fork. Upstream already has focus, pointer events, accessibility, native embedding, and multiple React surfaces. The divergence is often **where those APIs work and which native semantics they expose**, rather than a new API name.

## 1. Focus and keyboard navigation become general desktop concerns

**Observed:** Focus is extended beyond mobile text-entry workflows to ordinary views and custom controls. A focusable view participates in AppKit's first-responder system; focus and blur are tied to the containing window, and the fork provides native focus-ring control. The default macOS app setup also enables automatic key-view-loop recalculation.

The fork adds general key-down/key-up handling, modifier-key information, and declarations of keys to consume before native responder-chain handling continues. This is different from relying only on `TextInput.onKeyPress` or touch activation. `Pressability` adds Enter/Space activation on macOS, so keyboard input is part of the button interaction model.

**Implication:** A desktop component needs an explicit keyboard-focus and activation design. Keyboard focus, accessibility focus, and the JavaScript gesture responder are related but distinct; configuring one does not automatically configure the others. These primitives do not themselves provide a complete application-level focus-zone or shortcut-management system.

Sources: [Fabric view focus and keyboard handling](packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm), [macOS view props](packages/react-native/ReactCommon/react/renderer/components/view/platform/macos/react/renderer/components/view/HostPlatformViewProps.h), [Pressability](packages/react-native/Libraries/Pressability/Pressability.js), [app window setup](packages/react-native/Libraries/AppDelegate/RCTAppDelegate.mm).

## 2. Accessibility includes macOS display modes and AppKit semantics

**Observed:** The fork adds `AccessibilityInfo.isHighContrastEnabled()` and the `highContrastChanged` event for macOS's Increase Contrast setting. Existing screen-reader, reduced-motion, reduced-transparency, and inverted-color facilities are adapted to `NSWorkspace` and macOS VoiceOver rather than iOS accessibility notifications.

Component accessibility also targets a different native model. React Native roles, labels, hints, values, and actions must map to AppKit's accessibility elements and attributes, not just UIKit traits. For example, hints become AppKit accessibility help, while role handling selects native AppKit roles.

This is not complete semantic parity. Current Fabric view code excludes some iOS accessibility handling on macOS, including the direct selected/disabled `accessibilityState` update block and several modal/hidden-element properties. Other state information is still represented through accessibility values. A declared shared prop therefore does not prove equivalent native exposure.

**Implication:** Accessibility divergence has two dimensions: additional desktop preferences and a different accessibility-tree contract. High contrast is an explicit addition; reduced motion and VoiceOver detection are platform adaptations, not newly invented accessibility modes. Components need macOS-specific verification of roles, states, actions, and keyboard navigation.

Sources: [AccessibilityInfo](packages/react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo.js), [native accessibility manager](packages/react-native/React/CoreModules/RCTAccessibilityManager.mm), [Fabric accessibility mapping](packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm).

## 3. Top-level windows are native desktop objects, not mobile screens

**Observed:** Application startup and root-view attachment use `NSApplication`, `NSWindow`, and AppKit view controllers. The default app-delegate path creates a titled, resizable, closable, miniaturizable window and preserves its frame. The factory path can attach React Native content to a supplied native window.

Views also expose window-aware interaction policies: `acceptsFirstMouse` controls click-through into an inactive window, and `mouseDownCanMoveWindow` controls whether dragging a view can move its window. Surface hosting accounts for AppKit layout and live resizing.

The boundary matters: the package's public JavaScript exports do **not** include a general `Window` component or window manager. Native window integration is not a turnkey JavaScript API for creating and managing arbitrary top-level windows, menus, or document lifecycles.

**Implication:** The native host owns the desktop shell. Multi-window applications must decide how windows, React roots, focus, and lifecycle relate, rather than treating a window as just another mobile navigation screen.

Sources: [app delegate](packages/react-native/Libraries/AppDelegate/RCTAppDelegate.mm), [React Native factory](packages/react-native/Libraries/AppDelegate/RCTReactNativeFactory.mm), [surface hosting](packages/react-native/React/Base/Surface/SurfaceHostingView/RCTSurfaceHostingView.mm), [view API](packages/react-native/Libraries/Components/View/ViewPropTypes.js), [public exports](packages/react-native/index.js).

## 4. Hosting changes at the native boundary, not through a new instance model

**Observed:** The fork retains the shared `RCTReactNativeFactory`, `RCTRootViewFactory`, `RCTHost`, `RCTInstance`, and Fabric surface concepts. The root-view factory creates surfaces through its React host and wraps them in native hosting views. Multiple surfaces and native embedding are not uniquely macOS inventions.

The substantive adaptation is that hosted content is an AppKit view hierarchy. The fork's `RCTUIKit` compatibility layer supplies platform aliases, AppKit-backed subclasses, and UIKit-style helpers so much of the iOS implementation can remain shared. Host APIs return platform-compatible views, and surface integration handles desktop geometry, appearance changes, and developer-menu routing.

**Implication:** The useful distinction is **React runtime versus React surface versus native window**. A window is not inherently a separate JavaScript runtime. Applications still need to choose shared-host versus separate-host ownership and coordinate teardown and module state. The sources do not justify describing macOS as having an entirely different runtime or automatic per-window instance isolation.

Sources: [root-view factory](packages/react-native/Libraries/AppDelegate/RCTRootViewFactory.mm), [React host API](packages/react-native/ReactCommon/react/runtime/platform/ios/ReactCommon/RCTHost.h), [React instance](packages/react-native/ReactCommon/react/runtime/platform/ios/ReactCommon/RCTInstance.mm), [RCTUIKit architecture](packages/react-native/ReactApple/Libraries/RCTUIKit/README.md), [surface hosting](packages/react-native/React/Base/Surface/SurfaceHostingView/RCTSurfaceHostingView.mm).

## 5. Mouse interaction and desktop data transfer extend the touch model

**Observed:** The macOS view implementation supports desktop mouse behavior, including hover, double-click, auxiliary-button clicks, tooltips, and a broader cursor vocabulary. `Pressability` distinguishes primary-button activation from right/middle clicks instead of treating every mouse click as a press.

The fork also exposes native drop-target behavior through accepted data types and drag-enter, drag-leave, and drop events. Current Fabric payload construction reads files and images from the macOS pasteboard. This is OS data transfer, not merely moving a React view with a gesture recognizer.

**Implication:** Touch-compatible press handling is only part of a desktop control's interaction contract. Context-menu triggers, hover feedback, drag feedback, and data-transfer behavior need deliberate support. The presence of drop-target APIs should not be read as a complete drag-source framework or a built-in context-menu component.

Sources: [view props](packages/react-native/Libraries/Components/View/ViewPropTypes.js), [desktop event surface](packages/react-native/ReactCommon/react/renderer/components/view/platform/macos/react/renderer/components/view/HostPlatformViewEventEmitter.h), [native mouse and pasteboard handling](packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm), [Pressability](packages/react-native/Libraries/Pressability/Pressability.js), [cursor vocabulary](packages/react-native/React/Views/RCTCursor.h).

## 6. Text entry integrates desktop editing workflows

**Observed:** `TextInput` adds desktop-oriented capabilities around the AppKit text system: configurable submit-key combinations, grammar checking, notifications when spelling/autocorrection/grammar settings change, and typed paste handling. It also exposes a `setGhostText` command for inline suggestion text.

These extend the usual controlled-text, selection, and submit APIs rather than replacing them. Their implementation depends on the backing native control; some editing-setting callbacks are specifically documented for multiline input.

**Implication:** Editors, search boxes, and command inputs can participate in desktop editing conventions without rebuilding text entry from scratch. Conversely, mobile assumptions about Return, software keyboards, and text-field focus do not fully describe macOS behavior.

Sources: [TextInput API additions](packages/react-native/Libraries/Components/TextInput/TextInput.flow.js), [Fabric text-input implementation](packages/react-native/React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputComponentView.mm), [native text-input commands](packages/react-native/React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputNativeCommands.h).

## 7. Scrolling and viewport behavior follow desktop geometry

**Observed:** Scroll views are backed by AppKit scrolling, document views, and scroll notifications rather than only UIKit touch-scroll delegates. This introduces desktop scrollbar, wheel/trackpad, and content-geometry concerns behind the familiar `ScrollView` API. Current Fabric code explicitly forces overlay scrollbars, so it should not be described as honoring every system scrollbar preference.

Window sizing also differs from device sizing. The default macOS `Dimensions` implementation derives window and screen metrics from AppKit's key window and screen; surface hosting separately measures the embedded React surface. A native window's dimensions are not necessarily the layout bounds of every React root inside it.

**Implication:** Resizable windows and embedded roots make responsive layout central. Multi-window hosts must not assume a global dimensions value is automatically scoped to the particular surface being rendered, and mobile scrolling-event assumptions need checking against the macOS implementation.

Sources: [Fabric scroll view](packages/react-native/React/Fabric/Mounting/ComponentViews/ScrollView/RCTScrollViewComponentView.mm), [AppKit scroll compatibility layer](packages/react-native/ReactApple/Libraries/RCTUIKit/RCTUIScrollView.m), [device/window metrics](packages/react-native/React/CoreModules/RCTDeviceInfo.mm), [surface sizing](packages/react-native/React/Base/Surface/SurfaceHostingView/RCTSurfaceHostingView.mm).

## 8. Appearance includes desktop system colors, effects, and vibrancy

**Observed:** `PlatformColor` resolves macOS system colors. The fork adds `DynamicColorMacOS` for light/dark and high-contrast variants, and `ColorWithSystemEffectMacOS` for native control-state effects such as pressed, disabled, and rollover.

Views can opt into vibrancy participation, and native components respond to AppKit effective-appearance changes. `allowsVibrancy` is not itself a component that creates a blurred material background; the backing visual-effect surface must come from the native host or an appropriate component.

**Implication:** Desktop appearance is more than a light/dark switch. Components can use system control colors and state effects, but applications still need to design high-contrast behavior and decide where native materials belong.

Sources: [macOS color API](packages/react-native/Libraries/StyleSheet/PlatformColorValueTypesMacOS.macos.js), [platform-color overview](docsite/api/platform-color.md), [view vibrancy API](packages/react-native/Libraries/Components/View/ViewPropTypes.js), [native appearance handling](packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm).

## 9. Dialogs and application services use desktop lifecycle semantics

**Observed:** Alerts use `NSAlert`, with sheet presentation by default and an app-modal option. The fork exposes macOS prompt configuration and critical-alert behavior. These are native desktop dialogs, not an implementation of arbitrary React content in a new window.

`AppState` is adapted to application activation and hiding rather than mirroring the mobile foreground/background lifecycle exactly. Linking uses `NSWorkspace` and Apple-event handling; incoming URLs can activate the application and foreground a native window.

**Implication:** Window activation, application activation, and component visibility are separate concerns. Desktop hosts need an explicit policy for URL routing, dialog ownership, and which window receives attention. Reusing the same JavaScript API names does not imply identical mobile lifecycle behavior.

Sources: [Alert API](packages/react-native/Libraries/Alert/Alert.js), [native alert presentation](packages/react-native/React/CoreModules/RCTAlertManager.mm), [AppState](packages/react-native/React/CoreModules/RCTAppState.mm), [Linking](packages/react-native/Libraries/LinkingIOS/RCTLinkingManager.mm).

## 10. macOS is a distinct platform target for applications and libraries

**Observed:** `Platform.OS` is `macos`; `Platform.select` checks `macos`, then `native`, then `default`, rather than treating macOS as an iOS fallback. The repository has macOS-specific module files, a separately published `react-native-macos` package, and macOS project/CLI integration.

Native dependencies must support an AppKit/macOS target. Sharing Objective-C or C++ code with iOS is encouraged, but UIKit imports, platform declarations, and platform-specific behavior still require adaptation. This is a native AppKit port, not simply running an unchanged iOS application through Mac Catalyst.

**Implication:** Much application logic remains reusable, but platform conditionals and native-library support need auditing. A package that works on iOS is not automatically a macOS-compatible package, and an iOS-only `Platform.select` branch will not automatically be selected.

Sources: [Platform implementation](packages/react-native/Libraries/Utilities/Platform.macos.js), [package identity](packages/react-native/package.json), [macOS setup](docsite/docs/getting-started.md), [native-library porting guidance](docsite/docs/guides/native-development.md), [AppKit compatibility architecture](packages/react-native/ReactApple/Libraries/RCTUIKit/README.md).

## Compatibility boundaries, not just added features

The fork is not a strict functional superset of upstream React Native. Important boundaries in this snapshot include:

- **Arbitrary modal content:** `Modal` remains a JavaScript export, but the normal Fabric modal presentation implementation is guarded out on macOS. Native `NSAlert` sheets are not evidence of working React `Modal` support.
- **Mobile-only facilities:** The software-keyboard observer does not register UIKit keyboard-show/hide notifications on macOS, and the normal status-bar manager is excluded from the macOS build. Mobile presentation and keyboard-avoidance assumptions therefore cannot be carried over wholesale.
- **Accessibility parity:** Shared prop names and type declarations do not establish equivalent AppKit roles, states, actions, or tree behavior.
- **Renderer and release differences:** A feature present in Paper source, older examples, or a stable release is not necessarily implemented by the current Fabric path. This document is a source-level architectural overview, not an exhaustive supported-API matrix.

Sources: [Fabric modal implementation](packages/react-native/React/Fabric/Mounting/ComponentViews/Modal/RCTModalHostViewComponentView.mm), [keyboard observer](packages/react-native/React/CoreModules/RCTKeyboardObserver.mm), [core-module platform exclusions](packages/react-native/React/CoreModules/React-CoreModules.podspec), [Fabric accessibility handling](packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm).

## Architectural takeaway

The largest divergence is the **desktop UI contract**: general keyboard focus, richer mouse and data-transfer behavior, AppKit accessibility, resizable native windows, and desktop editing and appearance. The React runtime and surface model remain substantially shared.

For applications, the main work is adapting interaction and the native shell. For component libraries, it is supplying desktop behavior and verifying AppKit accessibility. For hosts, it is choosing how windows, surfaces, and runtime instances are owned without assuming the fork provides a complete window-management framework.
