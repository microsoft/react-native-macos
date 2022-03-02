#!/bin/bash

# First check that the bundle has been built
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
if [[ ! -f "$SCRIPT_DIR"/yaml-to-script/build/index.js ]]; then
	echo "yaml-to-script hasn't been built yet. Building now."
	$( cd "$SCRIPT_DIR"/yaml-to-script && eval "npm install" && eval "npx tsc" )
fi

eval "node "$SCRIPT_DIR"/yaml-to-script/build/index.js "$@""
