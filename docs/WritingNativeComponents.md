# Writing native components derived from NSView


React Native macOS inherits some assumptions from React Native on iOS / UIKit. There are subtle differences in how AppKit's and UIKit's implementation, such as where the coordinate system places the origin (bottom left on Appkit, top left on UIKit), or how hit testing is implemented. This serves as an issue when we want to write our own native components derived from NSView, as we don't inherit the "fixes" made in RCTView to get views working properly. This doc illustrates what methods / implementation you will need to override in order for your native component, using the NSView derived `NSVisualEffectView` as our base class.

```Swift
internal class FixedVisualEffectView: NSVisualEffectView {

	/// React Native macOS uses a flipped coordinate space by default. to match the other platforms.
	/// Let's stay consistent and ensure any views hosting React Native views are also flipped.
	/// This helps RCTTouchHandler register clicks in the right location, and ensures `layer.geometryFlipped` is true.
	override var isFlipped: Bool {
		return true
	}
}
```
