#!/usr/bin/env bash
# verify_pynwheel_setup.sh — prove the restored checkout works: bundle, node modules, databases, Redis,
# Capacitor platforms, Rails boot, Next/Vite build tooling. Read-only on data (no migrations, no writes).
# Starts a throw-away Rails server on port 3999 for one health request and stops it again.
#   usage: scripts/recovery/verify_pynwheel_setup.sh        (from the repository root)
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
fail=0; ok() { printf 'OK       %s\n' "$*"; }; bad() { printf 'FAIL     %s\n' "$*"; fail=1; }
RB="$HOME/.rvm/rubies/ruby-3.3.5/bin"
if [ -x "$RB/ruby" ]; then
  export PATH="$HOME/.rvm/gems/ruby-3.3.5/bin:$HOME/.rvm/gems/ruby-3.3.5@global/bin:$RB:$PATH" GEM_HOME="$HOME/.rvm/gems/ruby-3.3.5" GEM_PATH="$HOME/.rvm/gems/ruby-3.3.5:$HOME/.rvm/gems/ruby-3.3.5@global"
fi
export DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES LC_ALL=en_US.UTF-8
DB="${DATABASE_URL:-postgres://$USER@localhost/pynwheel_development}"
echo "## git"; git rev-parse --is-inside-work-tree >/dev/null 2>&1 && ok "repo at $(git rev-parse --short HEAD) on $(git branch --show-current)" || bad "not a git repo"
git ls-remote --exit-code origin refs/heads/temporary/local_unpushed_code_branch >/dev/null 2>&1 && ok "origin has temporary/local_unpushed_code_branch" || bad "recovery branch not on origin"
echo "## ruby"; ruby -v | grep -q 3.3.5 && ok "$(ruby -v)" || bad "ruby is $(ruby -v), need 3.3.5"
bundle check >/dev/null 2>&1 && ok "bundle check" || bad "bundle check (run bundle install)"
echo "## databases"; psql "$DB" -Atc 'select 1' >/dev/null 2>&1 && ok "connects to $DB" || bad "cannot connect to $DB"
psql "$DB" -Atc "select count(*) from communities" 2>/dev/null | xargs -I{} echo "OK       communities: {}" || bad "communities table missing (restore a dump)"
pending=$(DATABASE_URL="$DB" bundle exec rails runner 'print ActiveRecord::Base.connection_pool.migration_context.needs_migration? ? "pending" : "none"' 2>/dev/null | tail -1); [ "$pending" = "none" ] && ok "no pending migrations" || bad "pending migrations ($pending) — bundle exec rails db:migrate"
redis-cli ping 2>/dev/null | grep -q PONG && ok "redis" || bad "redis"
echo "## rails boot (port 3999)"; DATABASE_URL="$DB" API_ACCESS=true bundle exec rails server -p 3999 -b 127.0.0.1 -P /tmp/pyn-verify.pid >/tmp/pyn-verify.log 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null http://127.0.0.1:3999/api/tour/v1/health && break; sleep 1; done
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3999/api/tour/v1/health); [ "$code" = "200" ] && ok "GET /api/tour/v1/health -> 200" || bad "health -> $code (see /tmp/pyn-verify.log)"
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3999/users/sign_in); [ "$code" = "200" ] && ok "GET /users/sign_in -> 200" || bad "sign_in -> $code"
[ -f /tmp/pyn-verify.pid ] && { kill "$(cat /tmp/pyn-verify.pid)" 2>/dev/null; wait 2>/dev/null; }
echo "## connect"; ( cd pyn-connect-web && [ -d node_modules ] && npx --no-install next --version >/dev/null 2>&1 ) && ok "pyn-connect-web: next $(cd pyn-connect-web && npx --no-install next --version 2>/dev/null)" || bad "pyn-connect-web: npm ci"
[ -f pyn-connect-web/.env.local ] && ok "pyn-connect-web/.env.local" || bad "pyn-connect-web/.env.local missing"
echo "## tour app"; ( cd tour-app && [ -d node_modules ] && npx --no-install vite --version >/dev/null 2>&1 ) && ok "tour-app: vite $(cd tour-app && npx --no-install vite --version 2>/dev/null)" || bad "tour-app: npm ci"
capls=$(cd tour-app && npx --no-install cap ls 2>/dev/null)
echo "$capls" | grep -q 'plugins for android' && ok "capacitor android platform ($(echo "$capls" | grep -c '@capacitor/') plugins)" || bad "capacitor android platform (npx cap sync android)"
echo "$capls" | grep -q 'plugins for ios' && ok "capacitor ios platform" || bad "capacitor ios platform (npx cap sync ios)"
[ -f tour-app/android/gradlew ] && ok "android gradlew" || bad "tour-app/android/gradlew"
/usr/libexec/java_home -v 21 >/dev/null 2>&1 && ok "JDK 21" || bad "JDK 21"
xcodebuild -version >/dev/null 2>&1 && ok "$(xcodebuild -version | head -1)" || bad "xcodebuild"
[ $fail -eq 0 ] && echo "RESULT: setup verified" || echo "RESULT: failures above"
exit $fail
