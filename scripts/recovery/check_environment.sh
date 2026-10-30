#!/usr/bin/env bash
# check_environment.sh — verify the tools, versions, files and variables the Pynwheel projects need.
# Read-only; prints OK / WARN / MISSING per item and never prints a secret value. Exit 1 if anything is MISSING.
#   usage: scripts/recovery/check_environment.sh        (from the repository root)
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
fail=0
ok()   { printf 'OK       %s\n' "$*"; }
warn() { printf 'WARN     %s\n' "$*"; }
miss() { printf 'MISSING  %s\n' "$*"; fail=1; }
need() { command -v "$1" >/dev/null 2>&1 && ok "$1 $("$1" "${2:---version}" 2>&1 | head -1 | cut -c1-60)" || miss "$1 ($3)"; }

echo "## tools"
need git --version "brew install git"; need gh --version "brew install gh"; need heroku --version "brew install heroku/brew/heroku"
need node -v "brew install node@22"; need npm -v "comes with node"; need psql --version "brew install postgresql@16 libpq"
need redis-cli --version "brew install redis"; need magick -version "brew install imagemagick"; need gpg --version "brew install gnupg"
need gitleaks version "brew install gitleaks"; need xcodebuild -version "install Xcode"; if command -v adb >/dev/null 2>&1; then ok "adb on PATH"; elif [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then ok "adb at ~/Library/Android/sdk/platform-tools (not on PATH)"; else miss "adb (Android Studio platform-tools)"; fi
node -v 2>/dev/null | grep -qE '^v2[2-9]|^v[3-9]' && ok "node >= 22" || warn "node < 22 (projects pin 22)"

echo "## ruby toolchain"
R="$HOME/.rvm/rubies/ruby-3.3.5/bin/ruby"
if [ -x "$R" ]; then ok "RVM ruby 3.3.5 ($("$R" -v | cut -d' ' -f2))"
elif command -v rbenv >/dev/null && rbenv versions --bare 2>/dev/null | grep -q '^3.3.5'; then warn "only rbenv 3.3.5 present (rebuild gems/ under it)"
else miss "ruby 3.3.5 (rvm install 3.3.5 or rbenv install 3.3.5)"; fi
grep -q 'BUNDLED WITH' Gemfile.lock && ok "Gemfile.lock bundler $(grep -A1 'BUNDLED WITH' Gemfile.lock | tail -1 | tr -d ' ')"
[ -f .bundle/config ] && ok ".bundle/config present (BUNDLE_PATH=$(grep BUNDLE_PATH .bundle/config | awk '{print $2}'))" || warn ".bundle/config missing: set path gems + build flags (POST_WIPE_RECOVERY_GUIDE step 7)"
[ -d gems ] && ok "gems/ vendored tree present" || warn "gems/ missing: bundle install"

echo "## java / android"
JH=$(/usr/libexec/java_home -v 21 2>/dev/null) && ok "JDK 21 at $JH" || miss "JDK 21 (Android Studio > Gradle JDK > download 21)"
[ -d "$HOME/Library/Android/sdk/platforms/android-36" ] && ok "Android platform 36" || miss "platforms;android-36"
[ -d "$HOME/Library/Android/sdk/build-tools/36.0.0" ] && ok "build-tools 36.0.0" || miss "build-tools;36.0.0"
[ -f "$HOME/.android/debug.keystore" ] && ok "~/.android/debug.keystore" || warn "no debug keystore yet (created on first build)"
grep -q iglooGitlabToken "$HOME/.gradle/gradle.properties" 2>/dev/null && ok "iglooGitlabToken set in ~/.gradle/gradle.properties" || miss "iglooGitlabToken (restore ~/.gradle/gradle.properties from the backup)"

echo "## xcode"
xcode-select -p 2>/dev/null | grep -q Xcode.app && ok "developer dir $(xcode-select -p)" || warn "developer dir is not Xcode.app (sudo xcode-select -s /Applications/Xcode.app/Contents/Developer)"
security find-identity -v -p codesigning 2>/dev/null | grep -q 'Apple Development' && ok "Apple Development identity present" || warn "no Apple Development identity (sign in to Xcode; Automatic signing creates one)"
{ [ -f "$HOME/.netrc" ] && grep -q 'gitlab.com' "$HOME/.netrc"; } && ok "~/.netrc has gitlab.com (igloohome iOS SDK)" || warn "no gitlab.com in ~/.netrc (or add the GitLab account in Xcode > Accounts)"

echo "## project files (presence only)"
for f in config/application.yml pyn-connect-web/.env.local tour-app/.env.production.local credentails.md .claude/launch.json; do [ -e "$f" ] && ok "$f" || miss "$f (restore from the backup 01_secrets/ or 02_local_docs_and_design/)"; done
for f in "$HOME/.pynwheel_ro_url" "$HOME/.igloohome_sdk_token" "$HOME/.igloohome_ios_sdk_token"; do [ -e "$f" ] && ok "$f" || warn "$f absent (needed for prod reads / SDK builds)"; done
[ -d pyn-connect-web/node_modules ] && ok "pyn-connect-web/node_modules" || warn "pyn-connect-web: npm ci"
[ -d tour-app/node_modules ] && ok "tour-app/node_modules" || warn "tour-app: npm ci"

echo "## variables in the local env files (names only)"
for pair in "pyn-connect-web/.env.local:PYNWHEEL_CMS_URL NEXT_PUBLIC_CMS_URL" "tour-app/.env.production.local:VITE_TOUR_API_URL" "config/application.yml:AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY IGLOOHOME_API_KEY PYNWHEEL_IGLOOHOME_CLIENT_ID PYNWHEEL_IGLOOHOME_CLIENT_SECRET"; do
  f=${pair%%:*}; for k in ${pair#*:}; do [ -f "$f" ] && grep -qE "^$k[:=]" "$f" && ok "$f defines $k" || miss "$f lacks $k"; done
done
echo "## services"
redis-cli ping >/dev/null 2>&1 && ok "redis responds" || miss "redis (brew services start redis)"
psql -d postgres -Atc 'select 1' >/dev/null 2>&1 && ok "postgres responds" || miss "postgres (brew services start postgresql@16)"
for db in pynwheel_development pynwheel_test; do psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$db" && ok "database $db" || warn "database $db absent (POST_WIPE_RECOVERY_GUIDE step 6)"; done
echo "## git"
sshout=$(ssh -T -o BatchMode=yes -o ConnectTimeout=15 git@github-work 2>&1); echo "$sshout" | grep -q 'ZubairZ2' && ok "ssh github-work authenticates as ZubairZ2" || miss "ssh github-work (GIT_AND_GITHUB_RECOVERY.md)"
git remote get-url origin 2>/dev/null | grep -q 'pynwheel-connect-remap' && ok "origin = $(git remote get-url origin)" || warn "origin is not pynwheel-connect-remap"
gh auth status >/dev/null 2>&1 && ok "gh logged in" || warn "gh not logged in (gh auth login)"
heroku auth:whoami >/dev/null 2>&1 && ok "heroku logged in" || warn "heroku not logged in (heroku login)"
[ $fail -eq 0 ] && echo "RESULT: nothing missing" || echo "RESULT: items MISSING (see above)"
exit $fail
