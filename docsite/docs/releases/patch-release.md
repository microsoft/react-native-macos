---
sidebar_label: 'Sync to a new patch release'
sidebar_position: 2
---

# Sync to a new upstream React Native patch release 

Let's assume that we are trying to release a new patch release of `0.76.x`. Let's also assume that the latest commit in React Native's `0.76-stable` branch is the release commit we want to sync to. If not, `git merge` to an earlier commit. 


Roughly, run the following commands to:
- Sync to the latest commit in React Native's 0.76-stable branch.
- Merge that branch into yours
- Add a version plan

```shell
git switch -c 0.76/release upstream/0.76-stable
git merge facebook/0.76-stable
yarn nx release plan --message 'Sync to upstream React Native 0.76.x release' --only-touched=false patch
```

Remember to update the peer dependency in `packages/react-native` for React Native macOS to the version you have merged to.
