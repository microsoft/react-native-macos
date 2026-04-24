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

    NSApp.mainMenu = .standardMenu(appName: "HelloWorld")

    factory.startReactNative(withModuleName: "HelloWorld", in: window)
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

// MARK: - Standard macOS Menu Bar

extension NSMenu {
  /// Creates a standard macOS menu bar with App, Edit, View, Window, and Help menus.
  ///
  /// This provides the default set of menu items that most macOS apps need, including
  /// keyboard shortcuts for Quit (⌘Q), Close (⌘W), Copy (⌘C), Paste (⌘V), and others.
  /// You can customize the returned menu by adding, removing, or modifying items.
  static func standardMenu(appName: String) -> NSMenu {
    let mainMenu = NSMenu()

    mainMenu.addItem(appMenuItem(appName: appName))
    mainMenu.addItem(editMenuItem())
    mainMenu.addItem(viewMenuItem())
    mainMenu.addItem(windowMenuItem())
    mainMenu.addItem(helpMenuItem())

    return mainMenu
  }

  // MARK: App Menu

  private static func appMenuItem(appName: String) -> NSMenuItem {
    let item = NSMenuItem()
    let menu = NSMenu()

    menu.addItem(title: "About \(appName)",
                 action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)))
    menu.addItem(.separator())

    let servicesMenu = NSMenu(title: "Services")
    let servicesItem = NSMenuItem(title: "Services", action: nil, keyEquivalent: "")
    servicesItem.submenu = servicesMenu
    menu.addItem(servicesItem)
    NSApp.servicesMenu = servicesMenu
    menu.addItem(.separator())

    menu.addItem(title: "Hide \(appName)",
                 action: #selector(NSApplication.hide(_:)), key: "h")
    menu.addItem(title: "Hide Others",
                 action: #selector(NSApplication.hideOtherApplications(_:)),
                 key: "h", modifiers: [.command, .option])
    menu.addItem(title: "Show All",
                 action: #selector(NSApplication.unhideAllApplications(_:)))
    menu.addItem(.separator())
    menu.addItem(title: "Quit \(appName)",
                 action: #selector(NSApplication.terminate(_:)), key: "q")

    item.submenu = menu
    return item
  }

  // MARK: Edit Menu

  private static func editMenuItem() -> NSMenuItem {
    let item = NSMenuItem()
    let menu = NSMenu(title: "Edit")

    menu.addItem(title: "Undo", action: Selector(("undo:")), key: "z")
    menu.addItem(title: "Redo", action: Selector(("redo:")), key: "Z")
    menu.addItem(.separator())
    menu.addItem(title: "Cut", action: #selector(NSText.cut(_:)), key: "x")
    menu.addItem(title: "Copy", action: #selector(NSText.copy(_:)), key: "c")
    menu.addItem(title: "Paste", action: #selector(NSText.paste(_:)), key: "v")
    menu.addItem(title: "Paste and Match Style",
                 action: #selector(NSTextView.pasteAsPlainText(_:)),
                 key: "v", modifiers: [.command, .option])
    menu.addItem(title: "Delete", action: #selector(NSText.delete(_:)))
    menu.addItem(title: "Select All", action: #selector(NSText.selectAll(_:)), key: "a")

    item.submenu = menu
    return item
  }

  // MARK: View Menu

  private static func viewMenuItem() -> NSMenuItem {
    let item = NSMenuItem()
    let menu = NSMenu(title: "View")

    menu.addItem(title: "Enter Full Screen",
                 action: #selector(NSWindow.toggleFullScreen(_:)),
                 key: "f", modifiers: [.command, .control])

    item.submenu = menu
    return item
  }

  // MARK: Window Menu

  private static func windowMenuItem() -> NSMenuItem {
    let item = NSMenuItem()
    let menu = NSMenu(title: "Window")

    menu.addItem(title: "Close", action: #selector(NSWindow.performClose(_:)), key: "w")
    menu.addItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), key: "m")
    menu.addItem(title: "Zoom", action: #selector(NSWindow.performZoom(_:)))
    menu.addItem(.separator())
    menu.addItem(title: "Bring All to Front",
                 action: #selector(NSApplication.arrangeInFront(_:)))

    NSApp.windowsMenu = menu

    item.submenu = menu
    return item
  }

  // MARK: Help Menu

  private static func helpMenuItem() -> NSMenuItem {
    let item = NSMenuItem()
    let menu = NSMenu(title: "Help")

    NSApp.helpMenu = menu

    item.submenu = menu
    return item
  }

  // MARK: Convenience

  /// Adds a menu item with an optional keyboard shortcut and modifier keys.
  @discardableResult
  fileprivate func addItem(
    title: String,
    action: Selector?,
    key: String = "",
    modifiers: NSEvent.ModifierFlags = .command
  ) -> NSMenuItem {
    let item = addItem(withTitle: title, action: action, keyEquivalent: key)
    item.keyEquivalentModifierMask = modifiers
    return item
  }
}
