#!/bin/bash
set -ex

# Script used by the Azure DevOps build agent to start the packager and web socket server

THIS_DIR=$PWD

# Start the packager
# AppleScript can't be invoked from Azure DevOps Mojave agents until the following ticket is resolved: https://dev.azure.com/mseng/AzureDevOps/_workitems/edit/1513729
# osascript -e "tell application \"Terminal\" to do script \"cd ${THIS_DIR}; export SERVERS_NO_WAIT=1; ./scripts/launchPackager.command --reactNativePath ${THIS_DIR}\""
COMMAND=$TMPDIR/vsto-test-setup.command
echo "cd ${THIS_DIR}; export SERVERS_NO_WAIT=1; ./scripts/launchPackager.command --reactNativePath ${THIS_DIR}" > $COMMAND
chmod +x $COMMAND
open $COMMAND

# Start the WebSocket test server
osascript -e "tell application \"Terminal\" to do script \"cd ${THIS_DIR}; export SERVERS_NO_WAIT=1; ./IntegrationTests/launchWebSocketServer.command\""
