---
sidebar_position: 2
title: Get Started
---

This guide will help you get started on setting up your very first React Native for macOS app.

>** Please check either [NPM](https://www.npmjs.com/package/react-native-macos) or our [GitHub releases](https://github.com/microsoft/react-native-macos/releases) to see our latest release**

For information around how to set up:
- React Native for iOS and Android: See [React Native Getting Started Guide](https://reactnative.dev/docs/getting-started)
- React Native for Windows: See [React Native for Windows Getting Started Guide](https://microsoft.github.io/react-native-windows/docs/getting-started)

## Install React Native for macOS

Remember to call `@react-native-community/cli init` from the place you want your project directory to live. Be sure to use the same minor version between React Native and React Native macOS. We'll use `^0.79.0`

```
npx @react-native-community/cli init <projectName> --version 0.79
```

### Navigate into this newly created directory

Once your project has been initialized, React Native will have created a new sub directory where all your generated files live.

```
cd <projectName>
```

### Install the macOS extension

Install the React Native for macOS packages.

```
npx react-native-macos-init
```

## Running a React Native macOS App

### Quick Start

1. **Start the Metro bundler** in your React Native macOS project directory:

```bash
npm run start
```

Keep this terminal window open. The Metro bundler must be running for your app to load JavaScript code.

2. **Build and launch your app** in a separate terminal window:

```bash
npx react-native run-macos
```

This will build your app and launch it automatically.

### Alternative Methods

- **Using Xcode**: Open `macos/{YourProject}.xcworkspace` in Xcode or run `xed -b macos`, then hit the Run button.
- **Build only**: Use `npx react-native build-macos` to build without launching.

:::tip
The first run may take a while since it involves building the entire project and all dependencies. Subsequent runs will be much faster!
:::

For more detailed information about CLI commands and build options, see the [CLI Commands](./cli-commands.md).

Happy coding! 🎉
