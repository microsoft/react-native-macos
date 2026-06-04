---
title: Install Expo modules
sidebar_position: 2
---

:::info
macOS support for Expo modules is currently experimental.
:::

To use Expo modules in your app, you will need to install and configure the `expo` package.

The `expo` package has a small footprint; it includes only a minimal set of packages that are needed in nearly every app and the module and autolinking infrastructure that other Expo SDK packages are built with. Once the `expo` package is installed and configured in your project, you can use `npx expo install` to add any other Expo module from the SDK.

The following instructions apply to installing the latest version of Expo modules. For previous versions, check the
Expo docs for compatibility for which [Expo SDK version depends on a React Native version](https://docs.expo.dev/versions/latest/#each-expo-sdk-version-depends-on-a-react-native-version).

```shell
npm install expo
```

Once installation is complete, apply the changes from the following diffs to configure Expo modules in your project. This is expected to take about five minutes, and you may need to adapt it slightly depending on how customized your project is.


### Configuration for macOS

To configure your macOS project to use Expo modules, you'll need to make changes to the `Podfile` and your `AppDelegate`.

Start by modifying your `Podfile` to use the `use_expo_modules!` directive. This will enable autolinking for Expo modules in your project.

```diff macos/Podfile
+require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

 target 'myapp' do
-  config = use_native_modules!
+  use_expo_modules!
+
+  config_command = [
+    'npx',
+    'expo-modules-autolinking',
+    'react-native-config',
+    '--json',
+    '--platform',
+    'ios'
+  ]
+  config = use_native_modules!(config_command)

   use_react_native!(
-     :path => '../node_modules/react-native-macos',
+     :path => "#{config[:reactNativePath]}-macos",
```

Optionally, you can also add additional delegate methods to your **AppDelegate.swift**. Some libraries may require them, so unless you have a good reason to leave them out, it is recommended to add them. [See delegate methods in AppDelegate.swift](https://github.com/expo/expo/blob/sdk-53/templates/expo-template-bare-minimum/ios/HelloWorld/AppDelegate.swift#L24-L42).

The last step is to install the project's CocoaPods again to pull in Expo modules that are detected by `use_expo_modules!` directive that we added to the **Podfile**:

```shell
# Install pods
npx pod-install
```

### Configure Expo CLI for bundling on macOS

We recommend using Expo CLI and related tooling configurations to bundle your app JavaScript code and assets. This adds support for using the `"main"` field in **package.json**. Not using Expo CLI for bundling may result in unexpected behavior. [Learn more about Expo CLI](https://docs.expo.dev/bare/using-expo-cli/).

#### Use babel-preset-expo in your babel.config.js
```diff babel.config.js
-  presets: ['module:@react-native/babel-preset'],
+  presets: ['babel-preset-expo'],
```

#### Extend expo/metro-config in your metro.config.js and resolve react-native-macos

```diff metro.config.js
-const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
+const {getDefaultConfig} = require('expo/metro-config');

 /**
  * Metro configuration

-const config = {};
+const config = getDefaultConfig(__dirname);

-module.exports = mergeConfig(getDefaultConfig(__dirname), config);
+config.resolver.resolveRequest = (context, moduleName, platform) => {
+  if (
+    platform === 'macos' &&
+    (moduleName === 'react-native' || moduleName.startsWith('react-native/'))
+  ) {
+    const newModuleName = moduleName.replace(
+      'react-native',
+      'react-native-macos',
+    );
+    return context.resolveRequest(context, newModuleName, platform);
+  }
+  return context.resolveRequest(context, moduleName, platform);
+};
+
+const originalGetModulesRunBeforeMainModule =
+  config.serializer.getModulesRunBeforeMainModule;
+config.serializer.getModulesRunBeforeMainModule = () => {
+  try {
+    return [
+      require.resolve('react-native/Libraries/Core/InitializeCore'),
+      require.resolve('react-native-macos/Libraries/Core/InitializeCore'),
+    ];
+  } catch {}
+  return originalGetModulesRunBeforeMainModule();
+};
+
+module.exports = config;
```

#### Configure macOS project to bundle with Expo CLI

Replace the shell script under **Build Phases** > **Bundle React Native code and images** in Xcode with the following:

```sh /bin/sh
if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

# The project root by default is one level up from the ios directory
export PROJECT_ROOT="$PROJECT_DIR"/..

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
if [[ -z "$ENTRY_FILE" ]]; then
  # Set the entry JS file using the bundler's entry resolution.
  export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios relative | tail -n 1)"
fi

if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli')")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi

`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"`
```

And add support the `"main"` field in **package.json** by making the following change to **AppDelegate.swift**:

```diff AppDelegate.swift
   override func bundleURL() -> URL? {
 #if DEBUG
-    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
+    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
 #else
     Bundle.main.url(forResource: "main", withExtension: "jsbundle")
 #endif
```

Finally, to start the Metro bundler using Expo CLI, run: `npx expo start` or replace your existing `start` command in `package.json`:

```diff package.json
-  "start": "react-native start",
+  "start": "expo start",
```

## Usage

### Verifying installation

You can verify that the installation was successful by logging a value from [`expo-constants`](https://docs.expo.dev/versions/latest/sdk/constants).

- Run `npx expo install expo-constants`
- Then, run `npx expo run` and modify your app JavaScript code to add the following:

```js
import Constants from 'expo-constants';
console.log(Constants.systemFonts);
```

### Using Expo SDK packages

Once the `expo` package is installed and configured in your project, you can use `npx expo install` to add any other Expo module from the SDK. See [Using Expo Libraries](https://docs.expo.dev/workflow/using-libraries/) for more information.

### Expo modules included in the `expo` package

The following Expo modules are brought in as dependencies of the `expo` package:

- [`expo-asset`](https://docs.expo.dev/versions/latest/sdk/asset) - A JavaScript-only package that builds around `expo-file-system` and provides a common foundation for assets across all Expo modules.
- [`expo-constants`](https://docs.expo.dev/versions/latest/sdk/constants) - Provides access to the manifest.
- [`expo-file-system`](https://docs.expo.dev/versions/latest/sdk/filesystem) - Interact with the device file system. Used by `expo-asset` and many other Expo modules. Commonly used directly by developers in application code.
- [`expo-font`](https://docs.expo.dev/versions/latest/sdk/font) - Load fonts at runtime. This module is optional and can be safely removed, however; it is recommended if you use `expo-dev-client` for development and it is required by `@expo/vector-icons`.
- [`expo-keep-awake`](https://docs.expo.dev/versions/latest/sdk/keep-awake) - Prevents your device from going to sleep while developing your app. This module is optional and can be safely removed.

To exclude any of these modules, refer to the following guide on [excluding modules from autolinking](#excluding-specific-modules-from-autolinking).

### Excluding specific modules from autolinking

If you need to exclude native code from Expo modules you are not using, but were installed by other dependencies, you can use the [`expo.autolinking.exclude`](https://docs.expo.dev/modules/autolinking/#exclude) property in **package.json**:

```json package.json
{
  "name": "...",
  "dependencies": {},
  "expo": {
    "autolinking": {
      "exclude": ["expo-keep-awake"]
    }
  }
}
```
