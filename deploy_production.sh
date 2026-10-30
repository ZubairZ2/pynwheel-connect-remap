#!/usr/bin/env bash
# Production deploy: both Heroku apps from local `main`, plus the Connect
# writes switch. Run from the repo root: ./deploy_production.sh
set -euo pipefail

RAILS_APP=pyn-system
CONNECT_WRITES=on
CONNECT_WRITES_COMMUNITY_IDS=1411,1412,2000,2923,1329,3870,1847,1845,1413,1414

cd "$(dirname "$0")"

# Deploy only a main that matches GitHub, never a stale or unpushed one.
git fetch -q origin main
if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
  echo "local main is not origin/main; pull or push first" >&2
  exit 1
fi

# config:set restarts the dynos, so skip it when nothing changes.
current=$(heroku config:get PYN_CONNECT_WRITES PYN_CONNECT_WRITES_COMMUNITY_IDS -a "$RAILS_APP" | paste -sd, -)
if [ "$current" != "$CONNECT_WRITES,$CONNECT_WRITES_COMMUNITY_IDS" ]; then
  heroku config:set -a "$RAILS_APP" PYN_CONNECT_WRITES="$CONNECT_WRITES" PYN_CONNECT_WRITES_COMMUNITY_IDS="$CONNECT_WRITES_COMMUNITY_IDS"
fi

git push heroku main:main
git push heroku-connect main:main
