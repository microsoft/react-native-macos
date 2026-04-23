import Cocoa
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

class AppDelegate: NSObject, NSApplicationDelegate {
  var window: NSWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func applicationDidFinishLaunching(_ notification: Notification) {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = NSWindow(
      contentRect: NSMakeRect(0, 0, 1280, 720),
      styleMask: [.titled, .closable, .resizable, .miniaturizable],
      backing: .buffered,
      defer: false
    )

    setupMainMenu()

    factory.startReactNative(withModuleName: "HelloWorld", in: window)
  }

  // MARK: - Menu Bar

  private func setupMainMenu() {
    let servicesMenu = NSMenu(title: "Services")

    NSApp.mainMenu = NSMenu {
      NSMenuItem {
        NSMenu {
          NSMenuItem("About HelloWorld", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)))
          NSMenuItem.separator()
          NSMenuItem("Services", submenu: servicesMenu)
          NSMenuItem.separator()
          NSMenuItem("Hide HelloWorld", action: #selector(NSApplication.hide(_:)), key: "h")
          NSMenuItem("Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), key: "h")
            .keyModifiers([.command, .option])
          NSMenuItem("Show All", action: #selector(NSApplication.unhideAllApplications(_:)))
          NSMenuItem.separator()
          NSMenuItem("Quit HelloWorld", action: #selector(NSApplication.terminate(_:)), key: "q")
        }
      }
      NSMenuItem {
        NSMenu("Edit") {
          NSMenuItem("Undo", action: Selector(("undo:")), key: "z")
          NSMenuItem("Redo", action: Selector(("redo:")), key: "Z")
          NSMenuItem.separator()
          NSMenuItem("Cut", action: #selector(NSText.cut(_:)), key: "x")
          NSMenuItem("Copy", action: #selector(NSText.copy(_:)), key: "c")
          NSMenuItem("Paste", action: #selector(NSText.paste(_:)), key: "v")
          NSMenuItem("Paste and Match Style", action: #selector(NSTextView.pasteAsPlainText(_:)), key: "V")
            .keyModifiers([.command, .option])
          NSMenuItem("Delete", action: #selector(NSText.delete(_:)))
          NSMenuItem("Select All", action: #selector(NSText.selectAll(_:)), key: "a")
        }
      }
      NSMenuItem {
        NSMenu("View") {
          NSMenuItem("Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), key: "f")
            .keyModifiers([.command, .control])
        }
      }
      NSMenuItem {
        NSMenu("Window") {
          NSMenuItem("Close", action: #selector(NSWindow.performClose(_:)), key: "w")
          NSMenuItem("Minimize", action: #selector(NSWindow.performMiniaturize(_:)), key: "m")
          NSMenuItem("Zoom", action: #selector(NSWindow.performZoom(_:)))
          NSMenuItem.separator()
          NSMenuItem("Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)))
        }
      }
      NSMenuItem {
        NSMenu("Help") {}
      }
    }

    NSApp.servicesMenu = servicesMenu
    NSApp.windowsMenu = NSApp.mainMenu?.item(withTitle: "Window")?.submenu
    NSApp.helpMenu = NSApp.mainMenu?.item(withTitle: "Help")?.submenu
  }
}

// MARK: - React Native Delegate

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// MARK: - Declarative Menu Builder

/// A result builder that collects `NSMenuItem` instances into an array.
@resultBuilder
enum MenuBuilder {
  static func buildBlock(_ items: NSMenuItem...) -> [NSMenuItem] {
    Array(items)
  }
}

/// A result builder that expects a single `NSMenu` expression.
@resultBuilder
enum SubMenuBuilder {
  static func buildBlock(_ menu: NSMenu) -> NSMenu { menu }
}

extension NSMenu {
  /// Creates an `NSMenu` with items provided by a ``MenuBuilder``.
  convenience init(_ title: String = "", @MenuBuilder builder: () -> [NSMenuItem]) {
    self.init(title: title)
    self.items = builder()
  }
}

extension NSMenuItem {
  /// Creates an `NSMenuItem` with a shorter parameter name for `keyEquivalent`
  /// and an optional submenu.
  convenience init(
    _ title: String,
    action: Selector? = nil,
    key: String = "",
    submenu: NSMenu? = nil
  ) {
    self.init(title: title, action: action, keyEquivalent: key)
    self.submenu = submenu
  }

  /// Creates an `NSMenuItem` whose submenu is built by a ``SubMenuBuilder``.
  convenience init(@SubMenuBuilder builder: () -> NSMenu) {
    self.init(title: "", action: nil, keyEquivalent: "")
    self.submenu = builder()
  }

  /// Sets custom modifier keys on this menu item and returns it for chaining.
  func keyModifiers(_ modifiers: NSEvent.ModifierFlags) -> NSMenuItem {
    keyEquivalentModifierMask = modifiers
    return self
  }
}
