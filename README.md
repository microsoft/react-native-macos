<h1 align="center"> React Native for macOS </h1>

<p align="center">
  Build native macOS apps with React.
</p>

<p align="center">
  <a href="https://github.com/microsoft/react-native-macos/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="React Native for macOS is released under the MIT license." />
  </a>
  <a href="https://www.npmjs.org/package/react-native-macos">
    <img src="https://img.shields.io/npm/v/react-native-macos?color=e80441&label=react-native-macos" alt="Current npm package version." />
  </a>
  <a href="https://github.com/microsoft/react-native-macos/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
  </a>
</p>

<h3 align="center">
  <a href="https://reactnative.dev/docs/getting-started">Getting Started</a>
  <span> · </span>
  <a href="https://reactnative.dev/docs/tutorial">Learn the Basics</a>
  <span> · </span>
  <a href="https://reactnative.dev/showcase.html">Showcase</a>
  <span> · </span>
  <a href="https://reactnative.dev/docs/contributing">Contribute</a>
  <span> · </span>
  <a href="https://reactnative.dev/help">Community</a>
  <span> · </span>
  <a href="https://github.com/facebook/react-native/blob/HEAD/.github/SUPPORT.md">Support</a>
</h3>

React Native brings [**React**'s][r] declarative UI framework to iOS and Android. With React Native, you use native UI controls and have full access to the native platform.

- **Declarative.** React makes it painless to create interactive UIs. Declarative views make your code more predictable and easier to debug.
- **Component-Based.** Build encapsulated components that manage their state, then compose them to make complex UIs.
- **Developer Velocity.** See local changes in seconds. Changes to JavaScript code can be live reloaded without rebuilding the native app.
- **Portability.** Reuse code across iOS, Android, and [other platforms][p].

React Native is developed and supported by many companies and individual core contributors. Find out more in our [ecosystem overview][e].

[r]: https://reactjs.org/
[p]: https://reactnative.dev/docs/out-of-tree-platforms
[e]: https://github.com/facebook/react-native/blob/HEAD/ECOSYSTEM.md

## Contents

- [Requirements](#-requirements)
- [Building your first React Native app](#-building-your-first-react-native-app)
- [Documentation](#-documentation)
- [Upgrading](#-upgrading)
- [How to Contribute](#-how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [License](#-license)


## 📋 Requirements

React Native apps may target iOS 11.0 and Android 5.0 (API 21) or newer. You may use Windows, macOS, or Linux as your development operating system, though building and running iOS apps is limited to macOS. Tools like [Expo](https://expo.io) can be used to work around this.

## 🎉 Building your first React Native app

Follow the [Getting Started guide](https://reactnative.dev/docs/getting-started). The recommended way to install React Native depends on your project. Here you can find short guides for the most common scenarios:

[React Native](https://reactnative.dev) is a framework developed by Facebook that enables you to build world-class application experiences on native platforms using a consistent developer experience based on JavaScript and [React](https://reactjs.org/). The focus of React Native is on developer efficiency across all the platforms you care about - learn once, write anywhere.

This repository is a working fork of **facebook/react-native** that adds support for the official React Native for macOS implementation from Microsoft. 

[hello-world]: https://snack.expo.io/@hramos/hello,-world!
[new-app]: https://reactnative.dev/docs/getting-started
[existing]: https://reactnative.dev/docs/integration-with-existing-apps

You can read more about the macOS implementation in our website - [React Native for Windows + macOS](https://microsoft.github.io/react-native-windows/)

The full documentation for React Native can be found on our [website][docs].

The React Native documentation discusses components, APIs, and topics that are specific to React Native. For further documentation on the React API that is shared between React Native and React DOM, refer to the [React documentation][r-docs].

The source for the React Native documentation and website is hosted on a separate repo, [**@facebook/react-native-website**][repo-website].

[docs]: https://reactnative.dev/docs/getting-started
[r-docs]: https://reactjs.org/docs/getting-started.html
[repo-website]: https://github.com/facebook/react-native-website

## 🚀 Upgrading

Upgrading to new versions of React Native may give you access to more APIs, views, developer tools, and other goodies. See the [Upgrading Guide][u] for instructions.

React Native releases are discussed in the React Native Community, [**@react-native-community/react-native-releases**][repo-releases].

[u]: https://reactnative.dev/docs/upgrading
[repo-releases]: https://github.com/react-native-community/react-native-releases

## 👏 How to Contribute

The main purpose of this repository is to continue evolving React Native core. We want to make contributing to this project as easy and transparent as possible, and we are grateful to the community for contributing bug fixes and improvements. Read below to learn how you can take part in improving React Native.

### [Code of Conduct][code]

- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [License](#license)
- [Code of Conduct](#code-of-conduct)

## Requirements

You can run React Native for macOS apps on Mac devices with versions Mojave (10.14) or newer.

For a full and detailed list of the system requirements and how to set up your development platform, see our [System Requirements](https://microsoft.github.io/react-native-windows/docs/rnm-dependencies) documentation on our website.

## Getting Started
See the [Getting Started Guide](https://microsoft.github.io/react-native-windows/docs/rnm-getting-started) on our React Native for Windows + macOS website to build your first React Native for macOS app.

### Logging Issues
Search the [existing issues](https://github.com/microsoft/react-native-macos/issues) and try to make sure your problem doesn’t already exist before opening a new issue. If your issue doesn't exist yet, try to make sure you provide as much information as possible to us so we can help you sooner. It’s helpful if you include information like:

- The version of macOS, React Native, React Native macOS extension where you ran into the issue.
- A stack trace and reduced repro case when possible.
- Ensure the [appropriate template](https://github.com/microsoft/react-native-macos/issues/new/choose) is used when filing your issue(s).

##  Contributing
See [Contributing guidelines](https://github.com/microsoft/react-native-macos/blob/master/CONTRIBUTING.md) for how to setup your fork of the repo and start a PR to contribute to React Native for macOS.

[Good First Issue](https://github.com/microsoft/react-native-macos/labels/good%20first%20issue) and [help wanted](https://github.com/microsoft/react-native-macos/labels/help%20wanted) are great starting points for PRs.

## Documentation
[React Native already has great documentation](https://reactnative.dev/docs/getting-started) and we're working to ensure the React Native for Windows + macOS are part of that documentation story.

[React Native for Windows + macOS](https://microsoft.github.io/react-native-windows/) has it's own separate documentation site where Windows and macOS
specific information, like API docs and blog updates live. We are bootstrapping documentation for macOS at this time, tune in for updates.

### Examples

- Using the CLI in the [Getting Started](https://microsoft.github.io/react-native-windows/docs/rnm-getting-started) guide will set you up with a sample React Native for macOS app that you can begin editing right away.
- If you're looking for sample code, just browse the [RNTester folder](https://github.com/microsoft/react-native-macos/tree/master/packages/rn-tester) for examples

## License

The React Native for macOS extension, including modifications to the original Facebook source code, and all newly contributed code is provided under the [MIT License](LICENSE). Portions of the React Native for macOS extension derived from React Native are copyright Facebook.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

[l]: https://github.com/facebook/react-native/blob/HEAD/LICENSE
[ld]: https://github.com/facebook/react-native/blob/HEAD/LICENSE-docs
