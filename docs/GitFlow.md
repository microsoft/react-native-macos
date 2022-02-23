
# Git flow and Syncing with Upstream

We aim to keep this forked repository as up to date as possible against [Meta's repository](https://github.com/facebook/react-native). This document explains guidelines for pulling in the newest commits and how new changes should be introduced to the codebase.

For visual reference, here's a graph that showcases the relationship of core and this fork, along with all the main flows:

![React Native macos git flow](./graphs/RNmacosGITFLOW.png "React Native macos git flow")

In broad strokes, there are 4 different main flows:

* (A) syncing `react-native-macos` to a new version of `react-native`
* (B) syncing a `0.XX-stable` branch to its upstream counterpart
* (C) adding new changes and fixes in the fork
* (D) doing a local commit against a `0.XX-stable` branch

Here are the details on how we want to behave on each of these:

## (A) syncing `react-native-macos` to a new version of `react-native`

1. Create a reference to a remote to Facebook's repo *(if not already present)*
    1. In terminal: `git remote add facebook https://github.com/facebook/react-native.git`
    2. In terminal: `git pull facebook`
2. Create a branch to work in. Below is for merging in Facebook's React Native 0.58 version.
    1. In terminal: e.g. `git branch fb58merge`
    2. In terminal: e.g. `git checkout fb58merge`
3. Pull the fb contents at the merge point we want. A list of their most recent versions can be found [here](https://facebook.github.io/react-native/versions).
    1. In terminal: e.g. `git fetch facebook v0.58.6`
4. Do the merge at the point we want, in this example it's the last version tag of their 0.58 build. Use the name you used in 3.1 here.
    1. In terminal: e.g. `git merge v0.58.6`

## (B) syncing a `0.XX-stable` branch to its upstream counterpart

add me

## (C) adding new changes and fixes in the fork

add me

## (D) doing a local commit against a `0.XX-stable` branch

add me