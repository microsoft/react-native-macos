#!/bin/sh

NPM_REGISTRY=http://localhost:4873

set -eox pipefail

case ${1-} in
  "configure")
    yarn config set npmRegistryServer $NPM_REGISTRY
    yarn config set unsafeHttpWhitelist --json '["localhost"]'
    ;;

  "init")
    npm set registry $NPM_REGISTRY
    scripts_root=$(cd -P "$(dirname $0)" && pwd)
    node $scripts_root/waitForVerdaccio.mjs $NPM_REGISTRY
    node $scripts_root/npmAddUser.mjs user pass mail@nomail.com $NPM_REGISTRY
    ;;

  "publish")
    checkpoint=$(git rev-parse HEAD)
    cp nx.test.json nx.json
    yarn nx release version 1000.0.0
    yarn nx release publish --registry $NPM_REGISTRY
    git reset --hard $checkpoint
    ;;
esac
