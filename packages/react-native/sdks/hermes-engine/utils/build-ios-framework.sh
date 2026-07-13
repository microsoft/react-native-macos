#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

if [ "$CI" ]; then
  set -x
fi
set -e

# Given a specific target, retrieve the right architecture for it
# $1 the target you want to build. Allowed values: iphoneos, iphonesimulator, catalyst, macosx, xros, xrsimulator
function get_architecture {
    if [[ $1 == "iphoneos" || $1 == "xros" ]]; then
      echo "arm64"
    elif [[ $1 == "iphonesimulator" || $1 == "xrsimulator" ]]; then
      echo "x86_64;arm64"
    elif [[ $1 == "appletvos" ]]; then
      echo "arm64"
    elif [[ $1 == "appletvsimulator" ]]; then
      echo "x86_64;arm64"
    elif [[ $1 == "catalyst" || $1 == "macosx" ]]; then # [macOS]
      echo "x86_64;arm64"
    else
      echo "Error: unknown architecture passed $1"
      exit 1
    fi
}

function get_deployment_target {
    if [[ $1 == "xros" || $1 == "xrsimulator" ]]; then
      echo "$(get_visionos_deployment_target)"
    # [macOS
    elif [[ $1 == "macosx" ]]; then
      echo "$(get_mac_deployment_target)"
    # macOS]
    else # tvOS and iOS use the same deployment target
      echo "$(get_ios_deployment_target)"
    fi
}

# build a single framework
# $1 is the target to build
function build_framework {
  if [ ! -d destroot/Library/Frameworks/universal/hermes.xcframework ]; then
    deployment_target=$(get_deployment_target "$1")

    architecture=$(get_architecture "$1")

    build_apple_framework "$1" "$architecture" "$deployment_target"
  else
    echo "Skipping; Clean \"destroot\" to rebuild".
  fi
}

# group the frameworks together to create a universal framework
function build_universal_framework {
    if [ ! -d destroot/Library/Frameworks/universal/hermes.xcframework ]; then
        # shellcheck disable=SC2086
        create_universal_framework $HERMES_APPLE_PLATFORMS # [macOS]
    else
        echo "Skipping; Clean \"destroot\" to rebuild".
    fi
}

# single function that builds sequentially iphoneos, iphonesimulator and catalyst
# this is used to preserve backward compatibility
function create_framework {
    if [ ! -d destroot/Library/Frameworks/universal/hermes.xcframework ]; then
        # [macOS] Build only the requested Apple platforms (defaults to all).
        for _hermes_platform in $HERMES_APPLE_PLATFORMS; do
            build_framework "$_hermes_platform"
        done
        # macOS]
        build_universal_framework
    else
        echo "Skipping; Clean \"destroot\" to rebuild".
    fi
}


CURR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=xplat/js/react-native-github/sdks/hermes-engine/utils/build-apple-framework.sh
. "${CURR_SCRIPT_DIR}/build-apple-framework.sh"

# [macOS] Apple platforms (slices) to build into hermes.xcframework. Defaults to all.
# Override with the HERMES_APPLE_PLATFORMS env var (space-separated) to build a subset,
# e.g. HERMES_APPLE_PLATFORMS="macosx" for a macOS-only build. Useful on Xcode 26+, where
# the upstream Hermes Mac Catalyst target triple is rejected by the newer clang, and to
# speed up macOS-only iteration.
HERMES_APPLE_PLATFORMS="${HERMES_APPLE_PLATFORMS:-macosx iphoneos iphonesimulator catalyst xros xrsimulator appletvos appletvsimulator}"
# macOS]

if [[ -z $1 ]]; then
  create_framework
elif [[ $1 == "build_framework" ]]; then
  build_universal_framework
else
  build_framework "$1"
fi
