---
id: testing.ax-probes
summary: Check what macOS accessibility clients see in RNTester-macOS with a small out-of-process AX probe, osascript keys, and testIDs.
kind: procedure
status: active
load_when: Verifying a macOS accessibility, focus, or Tab-order change in a running app
sources:
  - packages/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm#testId
  - packages/rn-tester/js/components/RNTesterNavbar.js#apis-tab
  - packages/rn-tester/js/components/RNTesterModuleList.js#explorer_search
  - packages/rn-tester/js/components/RNTesterModuleContainer.js#example_search
  - https://github.com/microsoft/react-native-macos/pull/2824#discussion_r2905251918
verified: 2026-10-29
rules: [baseline-first, unique-testids]
requires: [testing.rntester-macos]
related: [a11y.appkit, a11y.keyboard]
---

<!-- @format -->

# Accessibility probes

Use when: you need to prove what VoiceOver and other AX clients see after a macOS accessibility, focus, or Tab-order change. Not for: building the app ([testing.rntester-macos](rntester-macos.md)) or deciding what the result should be (the `a11y` topics).

## Rules

- **testing.ax-probes.baseline-first:** Record the probe output on the base branch before your change, then on your branch, and report both with the macOS version.
- **testing.ax-probes.unique-testids:** Give every element under test a unique `testID`, which AX clients see as `AXIdentifier`.

## Procedure

Grant your terminal Accessibility permission once, in System Settings > Privacy & Security > Accessibility. Save the probe as `/tmp/ax.swift` and compile it with `xcrun swiftc -O /tmp/ax.swift -o /tmp/ax`:

```swift
// ax.swift <pid> dump [testID-prefix] | focused | click <testID>
import ApplicationServices

let args = CommandLine.arguments
guard AXIsProcessTrusted() else { print("Grant this terminal Accessibility permission."); exit(3) }
let app = AXUIElementCreateApplication(pid_t(args[1])!)

func attr(_ e: AXUIElement, _ name: String) -> AnyObject? {
  var value: AnyObject?
  return AXUIElementCopyAttributeValue(e, name as CFString, &value) == .success ? value : nil
}

func describe(_ e: AXUIElement) -> String {
  var namesRef: CFArray?
  AXUIElementCopyAttributeNames(e, &namesRef)
  let names = namesRef as? [String] ?? []
  let show = { (a: String) in names.contains(a) ? attr(e, a).map { "\($0)" } ?? "nil" : "absent" }
  return "\(attr(e, "AXIdentifier") as? String ?? "(no id)") role=\(show("AXRole"))"
    + " enabled=\(show("AXEnabled")) selected=\(show("AXSelected")) expanded=\(show("AXExpanded"))"
    + " value=\(show("AXValue").prefix(40))"
}

func elements(_ e: AXUIElement, _ depth: Int = 0) -> [AXUIElement] {
  let children = depth < 80 ? attr(e, "AXChildren") as? [AXUIElement] ?? [] : []
  return [e] + children.flatMap { elements($0, depth + 1) }
}

let all = (attr(app, "AXWindows") as? [AXUIElement] ?? []).flatMap { elements($0) }
func withId(_ prefix: String) -> [AXUIElement] {
  all.filter { prefix.isEmpty || ((attr($0, "AXIdentifier") as? String)?.hasPrefix(prefix) ?? false) }
}

switch args[2] {
case "dump": withId(args.count > 3 ? args[3] : "").forEach { print(describe($0)) }
case "focused": print(attr(app, "AXFocusedUIElement").map { describe($0 as! AXUIElement) } ?? "(none)")
case "click":
  guard let e = all.first(where: { attr($0, "AXIdentifier") as? String == args[3] }) else { print("not found: \(args[3])"); exit(1) }
  var origin = CGPoint.zero, size = CGSize.zero
  AXValueGetValue(attr(e, "AXPosition") as! AXValue, .cgPoint, &origin)
  AXValueGetValue(attr(e, "AXSize") as! AXValue, .cgSize, &size)
  let point = CGPoint(x: origin.x + min(size.width / 2, 20), y: origin.y + size.height / 2)
  for type in [CGEventType.leftMouseDown, .leftMouseUp] {
    CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
  }
default: print("unknown command \(args[2])"); exit(2)
}
```

Build RNTester-macOS, start Metro, then launch the app and drive it from the repository root:

```sh
open -n packages/rn-tester/Build/Products/Debug/RNTester-macOS.app
PID=$(pgrep -n -f "RNTester-macOS.app/Contents/MacOS/RNTester-macOS")
until [ -n "$(/tmp/ax $PID dump explorer_search)" ]; do sleep 2; done
keys() { osascript -e "tell application \"System Events\" to $1"; }
keys "set frontmost of (first process whose unix id is $PID) to true"
/tmp/ax $PID click apis-tab            # or components-tab
/tmp/ax $PID click explorer_search
keys 'keystroke "a" using command down'
keys 'keystroke "Accessibility"'
/tmp/ax $PID click Accessibility       # a module's testID is its title
sleep 2                                # let the module render
/tmp/ax $PID dump my-test-id           # filter examples with example_search the same way
keys 'key code 48'                     # Tab; add "using shift down" for Shift-Tab
/tmp/ax $PID focused
```

For a focus change, also test the JavaScript ref path independently. Use RNTester controls or a temporary test control that calls the affected component's `ref.current.focus()` and `ref.current.blur()`. After each call, run `/tmp/ax $PID focused` and record the `AXFocusedUIElement`; then test Tab and Shift-Tab separately. A working keyboard path does not prove that the JS ref path works, or vice versa.

## Facts

- `absent` means AppKit doesn't advertise the attribute; `nil` means it's advertised with no value.
- RNTester-macOS ignores deep links, so navigate with the tabs and the search fields.
- Fabric views have no `AXPress`, so `click` posts a real mouse click at the element. The window must be frontmost and unobscured.

## Pitfalls

- A multiline TextInput has no `AXIdentifier` ([a11y.text-input](../a11y/text-input.md)). Run `dump` with no prefix and find it by value.
- `osascript` keystrokes go to the frontmost app. Activate the app again after anything else takes focus.
- On `main`, Tab doesn't move focus in RNTester-macOS, because its window doesn't recalculate the key view loop ([a11y.keyboard](../a11y/keyboard.md)).
- If the app shows "No script URL provided", Metro isn't serving `/status`. Start it as [testing.rntester-macos](rntester-macos.md) shows.

## Verify

`/tmp/ax $PID dump explorer_search` prints the search field once RNTester-macOS has loaded.
