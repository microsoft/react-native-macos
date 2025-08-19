---
sidebar_label: 'Overview'
sidebar_position: 1
---

# Contributing

This guide is intended for contributors driving a new release of React Native macOS, not the average contributor. It describes the steps needed to publish new minor and patch releases. 

We assume your local git repository is setup with the following remotes, where `<user>` is your personal fork:
```shell
> git remote -v
facebook        git@github.com:facebook/react-native.git (fetch)
facebook        git@github.com:facebook/react-native.git (push)
origin          git@github.com:<user>/react-native-macos.git (fetch)
origin          git@github.com:<user>/react-native-macos.git (push)
upstream        git@github.com:microsoft/react-native-macos.git (fetch)
upstream        git@github.com:microsoft/react-native-macos.git (push)
```

