
# Git flow and Syncing with Upstream

We aim to keep this forked repository as up to date as possible against [Meta's repository](https://github.com/facebook/react-native). This document explains guidelines for pulling in the newest commits and how new changes should be introduced to the codebase.

For visual reference, here's a graph that showcases the relationship of core and this fork, along with all the main flows:

![React Native macos git flow](./graphs/RNmacosGITFLOW.png "React Native macos git flow")

In broad strokes, there are 4 flows we focus on:

* (A) syncing `react-native-macos` to a new version of `react-native`
* (B) syncing a `0.XX-stable` branch to its upstream counterpart
* (C) adding new changes and fixes in the fork
* (D) doing a local commit against a `0.XX-stable` branch

Here are the details on how we want to behave on each of these - to make things easier, we'll be using version 0.68 as the example version:

## (A) syncing `react-native-macos` to a new version of `react-native`

Because of the inherit way `react-native` works as an OSS repo on GitHub, we **DO NOT** want to sync the `react-native-macos` fork against a specific tag release.
What we want to do instead is to sync `react-native-macos` main branch against `react-native` main branch up to the commit on which the `0.68-stable` branch was created.

This will avoid a lot of messiness caused by all the extra work that goes on in a `0.68-stable` branch upstream before a release reaches `0.68.0` (local commits, cherry picks, etc. as showcased in the graph).

### how do I find the hash of the commit against which `0.XX-stable` branch was created?

The quick&dirty way is composed of two steps.

First, git clone locally `react-native` upstream (in a separate folder), and within it run
```
git log main..0.68-stable --oneline | tail -1
```
This will return the first actual commit of the repo, in this case:
```
0fd6ade8624 [0.68.0-rc.0] Bump version numbers
```

We can now use this reference to check the commit *right before it* in the [0.68-branch upstream on GitHub](https://github.com/facebook/react-native/tree/0.68-stable):

![git history for upstream 68](./graphs/git-history-example.png "git history for upstream 68")

So what we want now is to use the commit hash `8aa87814f62e42741ebb01994796625473c1310f` as reference point for syncing the fork and upstream `main` branches.

Now we can move to:

### do the "actual" upstream sync

1. Within the `react-native-macos` local clone, create a reference to a remote to Meta's repo *(if not already present)*
    1. `git remote add meta https://github.com/facebook/react-native.git`
    2. `git pull meta`
2. Create a branch to work in. Below is for merging in Facebook's React Native 0.68 version.
    1. `git branch meta68merge`
    2. `git checkout meta68merge`
3. Pull the new contents at the merge point we want, meaning the hash commit we found earlier `git fetch meta 8aa87814f62e42741ebb01994796625473c1310f`
4. Do the merge at the point we want `git merge 8aa87814f62e42741ebb01994796625473c1310f`

It's likely that the `git merge` command will cause in the order of 100s of merge conflicts: that's expected! Push the initial merge up to github **with** the merge conflicts. This makes it easier for other people to see where the errors are and help fix their platforms quickly.

Now, the work is to address all the conflicts and make sure to keep the custom macos code around, without breaking anything. Good luck - this is the hardest part of working on this repo.

Once the work in the `meta68merge` branch is completed, a PR against `react-native-macos`'s `main` branch needs to be created. This PR must be merged **WITHOUT SQUASHING IT** in order to avoid messing up with the git history and reduce the likeliness of merge conflicts.

Once this sync PR has been merged, a stable branch can be created: `git branch 0.68-stable` and we can move to (B).
## (B) syncing a `0.XX-stable` branch to its upstream counterpart

add me

## (C) adding new changes and fixes in the fork

add me

## (D) doing a local commit against a `0.XX-stable` branch

add me