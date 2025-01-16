#!/bin/bash
set -eox pipefail

workspace=$1
sdk=$2
configuration=$3
scheme=$4
action=$5

shift 5

build_cmd=$(
  echo xcodebuild \
    -workspace "$workspace" \
    -sdk "$sdk" \
    -configuration "$configuration" \
    -scheme "$scheme" \
    -derivedDataPath $(dirname $workspace) \
    CODE_SIGNING_ALLOWED=NO \
    COMPILER_INDEX_STORE_ENABLE=NO \
    "$action" \
    "$@" \

)

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  if ! command -v ccache 1> /dev/null; then
    brew install ccache
  fi

  CCACHE_HOME=$(dirname $(dirname $(which ccache)))/opt/ccache

  export CCACHE_DIR="$(git rev-parse --show-toplevel)/.ccache"

  export CC="${CCACHE_HOME}/libexec/clang"
  export CXX="${CCACHE_HOME}/libexec/clang++"
  export CMAKE_C_COMPILER_LAUNCHER=$(which ccache)
  export CMAKE_CXX_COMPILER_LAUNCHER=$(which ccache)

  ccache --zero-stats 1> /dev/null
fi
if ! command -v xcbeautify 1> /dev/null; then
  brew install xcbeautify
fi

eval "$build_cmd" | xcbeautify --report junit

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  ccache --show-stats --verbose
fi
