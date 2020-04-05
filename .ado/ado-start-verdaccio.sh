#!/bin/bash
set -ex

# Script used by the Azure DevOps build agent to start the verdaccio npm proxy server

THIS_DIR=$PWD

COMMAND="$TMPDIR/launchWebSocketServer.command"
echo "cd ${THIS_DIR}; npx verdaccio --config ./.ado/verdaccio/config.yaml" > "$COMMAND"
chmod +x "$COMMAND"
open "$COMMAND"
