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
    let mainMenu = NSMenu()

    mainMenu.addItem(createAppMenu())
    mainMenu.addItem(createEditMenu())
    mainMenu.addItem(createViewMenu())
    mainMenu.addItem(createWindowMenu())
    mainMenu.addItem(createHelpMenu())

    NSApp.mainMenu = mainMenu
  }

  private func createAppMenu() -> NSMenuItem {
    let menuItem = NSMenuItem()
    let menu = NSMenu()
    menuItem.submenu = menu

    menu.addItem(withTitle: "About HelloWorld", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
    menu.addItem(.separator())

    let servicesItem = NSMenuItem(title: "Services", action: nil, keyEquivalent: "")
    let servicesMenu = NSMenu(title: "Services")
    servicesItem.submenu = servicesMenu
    NSApp.servicesMenu = servicesMenu
    menu.addItem(servicesItem)
    menu.addItem(.separator())

    menu.addItem(withTitle: "Hide HelloWorld", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
    let hideOthersItem = menu.addItem(withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
    hideOthersItem.keyEquivalentModifierMask = [.command, .option]
    menu.addItem(withTitle: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
    menu.addItem(.separator())
    menu.addItem(withTitle: "Quit HelloWorld", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

    return menuItem
  }

  private func createEditMenu() -> NSMenuItem {
    let menuItem = NSMenuItem()
    let menu = NSMenu(title: "Edit")
    menuItem.submenu = menu

    menu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
    menu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
    menu.addItem(.separator())
    menu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
    menu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
    menu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
    menu.addItem(withTitle: "Paste and Match Style", action: #selector(NSTextView.pasteAsPlainText(_:)), keyEquivalent: "V")
    menu.addItem(withTitle: "Delete", action: #selector(NSText.delete(_:)), keyEquivalent: "")
    menu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

    return menuItem
  }

  private func createViewMenu() -> NSMenuItem {
    let menuItem = NSMenuItem()
    let menu = NSMenu(title: "View")
    menuItem.submenu = menu

    let fullScreenItem = menu.addItem(withTitle: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
    fullScreenItem.keyEquivalentModifierMask = [.command, .control]

    return menuItem
  }

  private func createWindowMenu() -> NSMenuItem {
    let menuItem = NSMenuItem()
    let menu = NSMenu(title: "Window")
    menuItem.submenu = menu

    menu.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
    menu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
    menu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
    menu.addItem(.separator())
    menu.addItem(withTitle: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")

    NSApp.windowsMenu = menu

    return menuItem
  }

  private func createHelpMenu() -> NSMenuItem {
    let menuItem = NSMenuItem()
    let menu = NSMenu(title: "Help")
    menuItem.submenu = menu

    NSApp.helpMenu = menu

    return menuItem
  }
}

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
