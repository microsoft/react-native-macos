---
sidebar_label: 'Versioning'
sidebar_position: 3
---

# Versioning

React Native macOS uses [NX Release](https://nx.dev/features/manage-releases) to control it's versioning. Our minor releases are synced to upstream releases of React Native, but our patch versions may differ. For instance, `react-native-macos@0.78.5` corresponds to `react-native@0.78.2`. You can find out how we sync our releases by looking at our packages' [React Native peer dependency](https://github.com/microsoft/react-native-macos/blob/8f8fd013d2a36cf2635dbcef76970119f7672b51/packages/react-native/package.json#L105).

## How to push a new patch release

If you have a PR you'd like to be included in a new release, you can add a [Version Plan](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans#file-based-versioning-version-plans) to it. 

```shell
yarn nx release plan --message 'fix some bug' --only-touched=false patch
```