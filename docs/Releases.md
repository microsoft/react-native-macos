# Releases Guide

We use Azure Pipelines for our publish pipeline. The pipeline is defined in `.ado/publish.yml`, and is set to run on pushes to `main` and `*-stable` branches. The pipeline steps differ between stable branches, with the latest as of time of writing (`0.71-stable`) attempting to re-use some of the NodeJS scripts used by our upstream repo React Native in their CircleCI pipeline. 

## Relevant Scripts from React Native Core

There are various nodejs scripts that React Native Core uses to maintain their releases. These have been refactored over time, so I'll be brief and mention the relevant scripts for React Native macOS. For more info on upstream releases, you can take a look at https://reactnative.dev/contributing/release-testing

- set-rn-version.js : This will modify file version numbers, (optionally) commit the version bump, and delete "private" and "workspace" keys from the root package.json to make it suitable for publishing. Most of the other scripts below call this script.
- bump-oss-version.js : This is an interactive script used by Open Source maintainers to push React Native releases. It will walk you through the steps of trigerring a new release, which includes triggering some CircleCI jobs to publish to NPM.
prepare-package-for-release.js: This is used by CircleCI. It will call `set-rn-version`, update the podfile.lock, and appropriately `git tag` the release with the version and/or the "latest" tag. It will also `git push` the version bump and tags back to Github. 
- publish-npm.js: This is used by CircleCI, and is generally triggered by a new git tag. This script takes care of the actual `npm publish`, along with creating and publishing Android artifacts. 
  - For nightlies and dry-runs, it will call `set-rn-version` to bump versions in the repo.
  - For releases (pre-release and stable), it is expected that CircleCI already ran `prepare-package-for-release.js` in an earlier job to bump versions. I think

## How our Publish pipeline works

### 0.68 and earlier

Our publish pipeline was mostly separate from React Native Core. At this point in time, we only re-used `set-rn-version.js`, with heavy modifications to:
1. An extra arguments to handle nightlies, 
2. Not destructively delete `private` / `workspace` keys from the package.json file (we have separate steps to delete and restore those keys in our pipeline)
3. Make it more similar to `bump-oss-version.js` (I guess the intention was to make it the one script to call that is more CI friendly?)
4. .. but also skip some of those modifications with an extra `rnmpublish` flag because we do `git tag` and `git push separately? I suspect merges made the history here a little weird 😅

Our publish yaml will mostly do:

1. Set tags for NPM based on the branch
2. Conditional based on branch:
    - If we're on the *main* branch
      - Call `set-rn-version` with the extra nightly / rnm-publish args
    - If we're on a *stable* branch
      - Call our own script `bumpFileVersions` to auto-bump versions in files, calling `set-rn-version`
4. Remove `workspace` / `private` keys from package.json manually 
5. Publish to NPM
6. Restore `workspace` / `private` keys from package.json manually 
7. `gitTagRelease.js` to push the tags and new version bump back to git.

### 0.71+

An attempt was made to simplify the steps above and re-use more of the scripts that React Native Core uses. Namely:
- Use more of the RN scripts to handle things like git tagging, git pushing, and NPM publishing. The intention is to leverage new features that have been added to those scripts, like the ability to build nightlies and dry runs, along with increased safety via checks on the version number. 
- Don't bother with manually removing and restoring workspace config. We don't need the `private` field set anyway since we don't have beachball auto-publishing or anything. 
- Extract all the steps to a template `apple-job-publish` with a parameter to switch between nightlies, dry runs, and releases. This was we can now add a new "NPM Publish Dry Run" step to our PR checks.

We don't however, use the scripts from upstream to publish to NPM or Github, we still keep that as separate steps in Azure Pipelines. In the future, we can look into removing these steps and just using the scripts directly. 

The new publish yaml looks like this:

1. Setup our pipeline with NPM / Github auth tokens (extracted into the template `apple-release-setup`)
2. Call the template `apple-job-publish` with either nightly or release as the build type based on branch name. 
3. The template will do the following steps based on build type:
    - If we're a *nightly* or *dry run*
      - Just call `publish-npm.js`, as this will take care of bumping versions, and publishing and no pushing back to Github is needed
    - If we're a release:
      1. Autogenerate the next version number and set to an environment variable (this logic was extracted from bumpFileVersions in 0.68)
      2. Set the `latest` tag to an environment variable. This will be passed to..
      3. Call `prepare-package-for-release` to bump versions, tag the commit, and push to git
      4. Call `publish-npm` to publish to NPM the version that was just tagged. 
4. Generate the correct NPM `dist-tag` and publish to NPM
5. Commit all changed files and push back to Github 

