#!/usr/bin/env bash
# inventory_mac.sh — print the same inventory docs/recovery was built from. Read-only. No secrets are printed
# (values of tokens/passwords are never read; only file presence).
#   usage: scripts/recovery/inventory_mac.sh > inventory-$(date +%F).txt
set -uo pipefail
h() { printf '\n== %s ==\n' "$*"; }
v() { command -v "$1" >/dev/null 2>&1 && printf '%-14s %s\n' "$1" "$("$@" 2>&1 | head -1)" || printf '%-14s (not installed)\n' "$1"; }
h "Hardware / OS"; sw_vers; uname -m; system_profiler SPHardwareDataType 2>/dev/null | grep -E 'Model Identifier|Chip|Memory|Cores' | sed 's/^ *//'
df -h /System/Volumes/Data 2>/dev/null | tail -1
h "Shell"; echo "$SHELL"; zsh --version 2>/dev/null; echo "PATH:"; echo "$PATH" | tr ':' '\n' | sed 's/^/  /'
h "Tools"; v git --version; v gh --version; v heroku --version; v brew --version; v node -v; v npm -v; v yarn -v; v python3 --version
v ruby -v; v bundle -v; v rbenv --version; [ -x "$HOME/.rvm/bin/rvm" ] && printf '%-14s %s\n' rvm "$("$HOME/.rvm/bin/rvm" --version | head -1)"
[ -x "$HOME/.rvm/rubies/ruby-3.3.5/bin/ruby" ] && printf '%-14s %s\n' "rvm 3.3.5" "$("$HOME/.rvm/rubies/ruby-3.3.5/bin/ruby" -v)"
v psql --version; v redis-server --version; v watchman --version; v magick -version; v gitleaks version; v java -version; v pod --version
h "Homebrew"; brew list --formula --versions 2>/dev/null; echo "-- casks"; brew list --cask --versions 2>/dev/null; echo "-- services"; brew services list 2>/dev/null
h "Xcode"; xcodebuild -version 2>&1; xcode-select -p 2>&1; xcodebuild -showsdks 2>&1 | grep -E 'iOS|macOS'; echo "runtimes:"; xcrun simctl list runtimes 2>&1 | tail -n +2
security find-identity -v -p codesigning 2>/dev/null | sed -E 's/[0-9A-F]{40}/<sha1>/'
h "Android"; SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"; echo "SDK: $SDK"; for d in platforms build-tools cmdline-tools ndk system-images; do echo "$d: $(ls "$SDK/$d" 2>/dev/null | tr '\n' ' ')"; done
grep Pkg.Revision "$SDK/platform-tools/source.properties" 2>/dev/null | sed 's/^/platform-tools /'; "$SDK/platform-tools/adb" devices -l 2>/dev/null
defaults read "/Applications/Android Studio.app/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null | sed 's/^/Android Studio /'
/usr/libexec/java_home -V 2>&1 | head -5; echo "AVDs: $(ls ~/.android/avd 2>/dev/null | tr '\n' ' ')"
h "Applications"; ls /Applications ~/Applications 2>/dev/null | grep '\.app$' | sed 's/\.app$//' | sort -u | tr '\n' ',' ; echo
h "Editors"; "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" --list-extensions 2>/dev/null | wc -l | xargs printf 'Cursor extensions: %s\n'; command -v code >/dev/null && code --list-extensions | wc -l | xargs printf 'VS Code extensions: %s\n'
h "Git"; git config --global --list 2>/dev/null | grep -vE 'token|password'; grep -E '^Host ' ~/.ssh/config 2>/dev/null; for k in ~/.ssh/*.pub; do [ -f "$k" ] && ssh-keygen -lf "$k"; done
h "Secret files present (names only)"; for f in ~/.pynwheel_ro_url ~/.igloohome_sdk_token ~/.igloohome_ios_sdk_token ~/.netrc ~/.gradle/gradle.properties ~/.android/adbkey ~/.android/debug.keystore ~/.config/gh/hosts.yml; do [ -e "$f" ] && echo "present  $f" || echo "absent   $f"; done
h "Local PostgreSQL"; psql -At -d postgres -c "select datname||' '||pg_size_pretty(pg_database_size(datname)) from pg_database where not datistemplate order by 1" 2>/dev/null; redis-cli ping 2>/dev/null | sed 's/^/redis: /'
