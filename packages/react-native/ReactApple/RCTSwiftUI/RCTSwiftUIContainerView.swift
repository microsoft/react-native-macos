/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SwiftUI
import RCTUIKit

// [macOS
// These SwiftUI platform types would ideally live with the other RCTPlatform* aliases in
// React-RCTUIKit, but that module is Objective-C and SwiftPM can't mix Obj-C and Swift in one
// target, so they live here in the consuming module for now.
#if os(macOS)
typealias RCTPlatformHostingController = NSHostingController
#else
typealias RCTPlatformHostingController = UIHostingController
#endif

#if os(macOS)
protocol RCTPlatformViewRepresentable: NSViewRepresentable where NSViewType == RCTPlatformView {
  func makeRCTPlatformView(context: Context) -> RCTPlatformView
  func updateRCTPlatformView(_ view: RCTPlatformView, context: Context)
}

extension RCTPlatformViewRepresentable {
  func makeNSView(context: Context) -> RCTPlatformView {
    makeRCTPlatformView(context: context)
  }

  func updateNSView(_ nsView: RCTPlatformView, context: Context) {
    updateRCTPlatformView(nsView, context: context)
  }
}
#else
protocol RCTPlatformViewRepresentable: UIViewRepresentable where UIViewType == RCTPlatformView {
  func makeRCTPlatformView(context: Context) -> RCTPlatformView
  func updateRCTPlatformView(_ view: RCTPlatformView, context: Context)
}

extension RCTPlatformViewRepresentable {
  func makeUIView(context: Context) -> RCTPlatformView {
    makeRCTPlatformView(context: context)
  }

  func updateUIView(_ uiView: RCTPlatformView, context: Context) {
    updateRCTPlatformView(uiView, context: context)
  }
}
#endif
// macOS]

@MainActor @objc public class RCTSwiftUIContainerView: NSObject {
  private var containerViewModel = ContainerViewModel()
  private var hostingController: RCTPlatformHostingController<SwiftUIContainerView>? // [macOS]

  @objc public override init() {
    super.init()
    hostingController = RCTPlatformHostingController(rootView: SwiftUIContainerView(viewModel: containerViewModel)) // [macOS]
    guard let view = hostingController?.view else {
      return
    }
#if os(macOS) // [macOS
    view.wantsLayer = true
    view.layer?.backgroundColor = NSColor.clear.cgColor
#else // macOS]
    view.backgroundColor = .clear
#endif // [macOS]
  }

  @objc public func updateContentView(_ view: RCTPlatformView) { // [macOS]
    containerViewModel.contentView = view
  }

  @objc public func hostingView() -> RCTPlatformView? { // [macOS]
    return hostingController?.view
  }

  @objc public func contentView() -> RCTPlatformView? { // [macOS]
    return containerViewModel.contentView
  }

  @objc public func updateBlurRadius(_ radius: NSNumber) {
    let blurRadius = CGFloat(radius.floatValue)
    containerViewModel.blurRadius = blurRadius
  }

  @objc public func updateGrayscale(_ grayscale: NSNumber) {
    containerViewModel.grayscale = CGFloat(grayscale.floatValue)
  }

  @objc public func updateDropShadow(standardDeviation: NSNumber, x: NSNumber, y: NSNumber, color: RCTPlatformColor) { // [macOS]
    containerViewModel.shadowRadius = CGFloat(standardDeviation.floatValue)
    containerViewModel.shadowX = CGFloat(x.floatValue)
    containerViewModel.shadowY = CGFloat(y.floatValue)
    containerViewModel.shadowColor = Color(color)
  }

  @objc public func updateSaturation(_ saturation: NSNumber) {
    containerViewModel.saturationAmount = CGFloat(saturation.floatValue)
  }

  @objc public func updateContrast(_ contrast: NSNumber) {
    containerViewModel.contrastAmount = CGFloat(contrast.floatValue)
  }

  @objc public func updateHueRotate(_ degrees: NSNumber) {
    containerViewModel.hueRotationDegrees = CGFloat(degrees.floatValue)
  }

  @objc public func updateLayout(withBounds bounds: CGRect) {
    hostingController?.view.frame = bounds
    containerViewModel.contentView?.frame = bounds
  }

  @objc public func resetStyles() {
    containerViewModel.blurRadius = 0
    containerViewModel.grayscale = 0
    containerViewModel.shadowRadius = 0
    containerViewModel.shadowX = 0
    containerViewModel.shadowY = 0
    containerViewModel.shadowColor = Color.clear
    containerViewModel.saturationAmount = 1
    containerViewModel.contrastAmount = 1
    containerViewModel.hueRotationDegrees = 0
  }
}

class ContainerViewModel: ObservableObject {
  // blur filter properties
  @Published var blurRadius: CGFloat = 0

  // grayscale filter properties
  @Published var grayscale: CGFloat = 0

  // drop-shadow filter properties
  @Published var shadowRadius: CGFloat = 0
  @Published var shadowX: CGFloat = 0
  @Published var shadowY: CGFloat = 0
  @Published var shadowColor: Color = Color.clear

  // saturation filter properties
  @Published var saturationAmount: CGFloat = 1

  // contrast filter properties
  @Published var contrastAmount: CGFloat = 1

  // hue-rotate filter properties
  @Published var hueRotationDegrees: CGFloat = 0

  @Published var contentView: RCTPlatformView? // [macOS]
}

struct SwiftUIContainerView: View {
  @ObservedObject var viewModel: ContainerViewModel

  var body: some View {
    if let contentView = viewModel.contentView {
      RCTPlatformViewWrapper(view: contentView) // [macOS]
        .blur(radius: viewModel.blurRadius)
        .grayscale(viewModel.grayscale)
        .shadow(color: viewModel.shadowColor, radius: viewModel.shadowRadius, x: viewModel.shadowX, y: viewModel.shadowY)
        .saturation(viewModel.saturationAmount)
        .contrast(viewModel.contrastAmount)
        .hueRotation(.degrees(viewModel.hueRotationDegrees))
    }
  }
}

struct RCTPlatformViewWrapper: RCTPlatformViewRepresentable { // [macOS]
  let view: RCTPlatformView

  func makeRCTPlatformView(context: Context) -> RCTPlatformView { // [macOS]
    return view
  }

  func updateRCTPlatformView(_ view: RCTPlatformView, context: Context) { // [macOS]
  }
}
