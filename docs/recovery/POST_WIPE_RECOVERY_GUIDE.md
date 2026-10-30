# Post-wipe recovery guide — rebuild the Pynwheel development Mac

Give this file (or the whole `docs/recovery/` folder) to Claude after macOS is reinstalled and work
through it top to bottom. Each step says what it needs, the exact commands, and how to check it. Commands
marked **safe** change nothing you would regret; commands marked **manual** need a decision or a sign-in.
`$BK` is the decrypted backup folder. Nothing here resets or drops a database.

Expected starting point: a fresh macOS 27 (or newer) on the same Apple Silicon Mac, your Apple ID, the
encrypted backup archive `PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30.tar.gpg` and its passphrase, access to
GitHub (`ZubairZ2`, `ZubairZulfiqarZ2`), Heroku (`zubair@pynwheel.com`), the igloohome developer portal, and the
Samsung A02s.

---

## Step 0 — decrypt the backup (manual)

```bash
mkdir -p ~/Restore && cd ~/Restore
# copy PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30.tar.gpg (+ .sha256) here from the external drive / company storage
shasum -a 256 -c PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30.tar.gpg.sha256
gpg --decrypt PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30.tar.gpg | tar -x
export BK=~/Restore/PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30
( cd "$BK" && shasum -a 256 -c SHA256SUMS | grep -vc ': OK$' )   # expect 0
```

`gpg` is not on a fresh macOS: install Xcode CLT + Homebrew first (step 1) if needed, then `brew install gnupg`.

## Step 1 — macOS developer foundations (safe)

```bash
xcode-select --install                                   # Command Line Tools (wait for the dialog to finish)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile && eval "$(/opt/homebrew/bin/brew shellenv)"
brew bundle --file="$BK/../pynwheel-staging/docs/recovery/manifests/brew-bundle.Brewfile" 2>/dev/null \
  || brew install git gh heroku/brew/heroku gnupg postgresql@16 libpq redis imagemagick libyaml openssl@3 watchman node@22 yarn rbenv ruby-build autojump tmux gitleaks jq
brew install --cask iterm2 font-meslo-lg-nerd-font postman
brew services start postgresql@16 && brew services start redis
```

(The Brewfile lives in the repository; if you have not cloned yet, use the explicit `brew install` line —
it is the Pynwheel-relevant subset. The MySQL/PHP/nginx/httpd/ffmpeg/go/composer entries in the Brewfile
belong to other projects; install them later if wanted.)

Shell (safe): follow MACOS_DEVELOPER_CONFIGURATION.md "Shell" — oh-my-zsh, the two plugins, powerlevel10k,
then copy `.zshrc`, `.p10k.zsh`, `.profile`, `.zlogin` from `$BK/04_dotfiles/home/`. Open a new terminal.

Git + SSH (manual): GIT_AND_GITHUB_RECOVERY.md sections A or B (keys), C (`gh auth login`, `heroku login`), D
(identity). Check: `ssh -T git@github-work` greets **ZubairZ2**; `gh auth status`; `heroku auth:whoami`.

## Step 2 — Xcode (manual, long download)

XCODE_SETUP_AND_RECOVERY.md "Reinstalling after the wipe" steps 1–3: install Xcode 27.x, accept the
licence, `xcode-select -s`, add the two Apple IDs (personal team + Pynwheel, LLC `M2G7SBRU58`) and the GitLab
account for the igloohome SDK (or restore `~/.netrc` from `$BK/01_secrets/home/`). Optionally a simulator
runtime. Check: `xcodebuild -version` shows 27.x; `xcrun simctl list runtimes`.

## Step 3 — Android Studio (manual)

ANDROID_STUDIO_SETUP_AND_RECOVERY.md "Reinstalling after the wipe" steps 1–6: install Android Studio,
Standard setup, SDK platform 36 + build-tools 36.0.0 + platform-tools + emulator, Gradle JDK 21
(download inside the IDE), restore `~/.gradle/gradle.properties` and `~/.android/{adbkey,adbkey.pub,debug.keystore}`
from `$BK/01_secrets/home/`, connect the A02s with USB debugging. Check:

```bash
~/Library/Android/sdk/platform-tools/adb devices -l        # the phone listed as "device", not "unauthorized"
/usr/libexec/java_home -v 21                                 # prints the JDK 21 path
```

## Step 4 — languages and package managers

Ruby (safe). Choose **one** manager this time. RVM is what every documented command uses:

```bash
\curl -sSL https://get.rvm.io | bash -s stable
source ~/.rvm/scripts/rvm
rvm install 3.3.5 --with-openssl-dir=$(brew --prefix openssl@3)
rvm use 3.3.5 --default
gem install bundler -v 2.5.16
ruby -v && bundle -v                                        # ruby 3.3.5, Bundler 2.5.16
```

If you prefer rbenv (`brew install rbenv ruby-build && rbenv install 3.3.5 && rbenv global 3.3.5`), then
every "export PATH=…rvm…" line in the docs becomes unnecessary — but do not mix the two as before.

Node (safe): `brew install node@22 && brew link --overwrite node@22` (or `nvm install 22`); `node -v` → 22.x;
`npm i -g newman` (optional). Python: Homebrew `python@3.15` was present; nothing in Pynwheel needs it.
Java: done in step 3 (JDK 21 via Android Studio). CocoaPods: not needed.

## Step 5 — the repository (safe)

```bash
cd ~
git clone git@github-work:ZubairZ2/pynwheel-connect-remap.git pynwheel-staging
cd pynwheel-staging
git remote add upstream git@github-work:Pynwheel/pynwheel-staging.git
git remote add heroku https://git.heroku.com/pyn-system.git
git remote add heroku-connect https://git.heroku.com/pyn-system-connect.git
git fetch --all --prune
git switch --track origin/temporary/local_unpushed_code_branch      # the recovery snapshot
ls docs/recovery && git log --oneline -3
git switch main                                                      # day-to-day work continues on main
git checkout temporary/local_unpushed_code_branch -- docs/recovery scripts/recovery PR_DESCRIPTION_*.md HANDOFF_2026-10-18_to_2026-10-22.md hand_off_doc_22_oct.md hand_off_doc_25_oct.md TOUR_APP_DEEP_REGRESSION_QA_2026-10-29.md app_ui_redesign_17_oct.md new_app_design_17_oct.md deploy_production.sh db_compat_audit
git restore --staged . && git status --short | head                  # untracked again, as before the wipe
git branch temporary/stash-igloohome-ios-plugin-prep-2026-10-30 origin/temporary/stash-igloohome-ios-plugin-prep-2026-10-30
```

If GitHub is unreachable: `git clone "$BK/05_git_bundles/pynwheel-staging-all-refs.bundle" pynwheel-staging`.

## Step 6 — project configuration (manual: it restores secrets)

```bash
cd ~/pynwheel-staging
cp "$BK/01_secrets/repo/credentails.md" .
cp "$BK/01_secrets/repo/config/application.yml" config/
cp "$BK/01_secrets/repo/pyn-connect-web/.env.local" pyn-connect-web/
cp "$BK/01_secrets/repo/tour-app/.env.production.local" tour-app/
cp "$BK/01_secrets/repo/pyn-tour-old/.env" pyn-tour-old/
cp "$BK/01_secrets/repo/pyn-tour-old/android/app/selftour-key.keystore" pyn-tour-old/android/app/
printf 'sdk.dir=%s/Library/Android/sdk\n' "$HOME" > pyn-tour-old/android/local.properties
cp -R "$BK/02_local_docs_and_design/pyn-tour-old/ios/Zerv_SDK_Library.framework" pyn-tour-old/ios/
cp "$BK/02_local_docs_and_design/"*.html "$BK/02_local_docs_and_design/"*.md "$BK/02_local_docs_and_design/.ruby-version" .
cp -R "$BK/02_local_docs_and_design/critical_issues_pictures" "$BK/02_local_docs_and_design/artifacts" .
mkdir -p .claude && cp "$BK/02_local_docs_and_design/.claude/launch.json" .claude/   # then fix absolute paths inside
cp "$BK/01_secrets/home/.pynwheel_ro_url" "$BK/01_secrets/home/.igloohome_sdk_token" "$BK/01_secrets/home/.igloohome_ios_sdk_token" "$BK/01_secrets/home/.netrc" ~/
chmod 600 ~/.pynwheel_ro_url ~/.igloohome_* ~/.netrc
mkdir -p ~/.gradle && cp "$BK/01_secrets/home/.gradle/gradle.properties" ~/.gradle/
git status --short | grep -vE '^\?\? (PR_DESCRIPTION|HANDOFF|hand_off|TOUR_APP_DEEP|app_ui|new_app|deploy_production|db_compat|credentails)' # expect nothing tracked modified
```

Claude Code state (so this assistant remembers the project):

```bash
rsync -a "$BK/03_claude_home/.claude/" ~/.claude/
ls ~/.claude/projects/-Users-zubairzulifqar-pynwheel-staging/memory | wc -l     # 37
```

Do this **before** opening the project in the Claude desktop app, then sign in to Claude.

Databases (manual; needs the Heroku login and disk space — the production copy is ~6 GB):

```bash
createdb pynwheel_development && createdb pynwheel_test
# either restore a dump you kept (if dump_local_databases.sh was run and policy allowed it):
pg_restore --no-owner -d pynwheel_development "$BK/06_databases/pynwheel_development.dump"
# or rebuild from a Heroku backup of the production database (what the local copies were made from):
heroku pg:backups:capture -a pyn-system          # or skip and use the latest existing backup
heroku pg:backups:download -a pyn-system -o /tmp/latest.dump
pg_restore --no-owner --no-acl -d pynwheel_development /tmp/latest.dump
```

Then migrate the dev and test databases (safe, additive):

```bash
export PATH="$HOME/.rvm/gems/ruby-3.3.5/bin:$HOME/.rvm/gems/ruby-3.3.5@global/bin:$HOME/.rvm/rubies/ruby-3.3.5/bin:$PATH" DISABLE_SPRING=1
DATABASE_URL=postgres://$USER@localhost/pynwheel_development bundle exec rails db:migrate
RAILS_ENV=test DATABASE_URL=postgres://$USER@localhost/pynwheel_test bundle exec rails db:schema:load
```

`config/database.yml` points `development` at a database named `pynwheel_prod` under the `postgres` role;
either recreate that too (`createdb pynwheel_prod` + restore) or always pass `DATABASE_URL` as the
documented commands do. The `postgres` role's local password is in the tracked `database.yml`.

Redis: nothing to restore (`redis-cli ping` → PONG).

Other machine config (safe): `$BK/04_dotfiles/` per MACOS_DEVELOPER_CONFIGURATION.md — iTerm plist, Cursor
settings + extensions, VS Code if wanted, Raycast import (manual), Android Studio `options/`, Xcode UserData.

## Step 7 — dependencies and first boot

```bash
cd ~/pynwheel-staging
bundle config set --local path gems
bundle config set --local build.pg --with-pg-config=/opt/homebrew/opt/libpq/bin/pg_config
bundle config set --local build.rmagick --with-opt-dir=/opt/homebrew/opt/imagemagick
bundle config set --local build.scout_apm --with-cflags=-Wno-error=incompatible-function-pointer-types
bundle install                                                      # ~124 gems into gems/
(cd pyn-connect-web && npm ci && npx playwright install chromium)
(cd tour-app && npm ci)

# Rails
DATABASE_URL=postgres://$USER@localhost/pynwheel_development OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES API_ACCESS=true \
  bundle exec rails server -p 3000 -b 127.0.0.1 &
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/users/sign_in     # 200
curl -s http://127.0.0.1:3000/api/tour/v1/health                                # JSON with capabilities

# Connect
(cd pyn-connect-web && PYNWHEEL_CMS_URL=http://127.0.0.1:3000 npm run dev &) ; sleep 8
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/sign-in           # 200

# Tour App (web)
(cd tour-app && VITE_TOUR_API_URL=http://127.0.0.1:3000 npm run dev &) ; sleep 5
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3012/                  # 200

# tests
bundle exec rails test test/models 2>&1 | tail -3
(cd pyn-connect-web && npm run typecheck && npm test)
(cd tour-app && npm run typecheck && npm test)

# native
(cd tour-app && npm run build && npx cap sync)                     # both platforms
(cd tour-app/android && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew assembleDebug)
ls -l tour-app/android/app/build/outputs/apk/debug/app-debug.apk
(cd tour-app && xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -allowProvisioningUpdates build | tail -3)   # BUILD SUCCEEDED
```

Or run the two scripts: `scripts/recovery/check_environment.sh` then `scripts/recovery/verify_pynwheel_setup.sh`.

## Step 8 — verification checklist

| Check | How | Expected |
|---|---|---|
| GitHub (SSH) | `ssh -T git@github-work` | `Hi ZubairZ2!` |
| GitHub (gh) | `gh auth status` | logged in as ZubairZulfiqarZ2 |
| Recovery branch | `git branch -r \| grep temporary/` | both `temporary/*` branches listed |
| Heroku | `heroku config -a pyn-system \| head -3` | config keys print |
| Ruby | `ruby -v; bundle -v` (with the toolchain on PATH) | 3.3.5 / 2.5.16 |
| Gems | `bundle check` | "The Gemfile's dependencies are satisfied" |
| PostgreSQL | `psql -d pynwheel_development -Atc 'select count(*) from communities'` | a number |
| Redis | `redis-cli ping` | PONG |
| Rails | `curl 127.0.0.1:3000/users/sign_in` | 200 |
| Tour API | `curl 127.0.0.1:3000/api/tour/v1/health` | JSON |
| Connect | `curl 127.0.0.1:3001/sign-in` | 200; sign-in with a CMS user works in the browser |
| Tour App web | `curl 127.0.0.1:3012/` | 200 |
| Capacitor | `npx cap doctor` in `tour-app` | both platforms listed, no errors |
| Android | `./gradlew assembleDebug` | `app-debug.apk` exists; `adb install -r` succeeds on the A02s |
| iOS | `xcodebuild … build` | BUILD SUCCEEDED (SPM resolved the igloohome SDK) |
| Env vars | `scripts/recovery/check_environment.sh` | no `MISSING` lines for required items |
| Integrations | `heroku config -a pyn-system` has `TWILIO_*`, `AWS_*`; `credentails.md` present | yes |
| Claude memory | `ls ~/.claude/projects/-Users-zubairzulifqar-pynwheel-staging/memory \| wc -l` | 37 |
| Raycast / Cursor / iTerm | opened and configured | manual |

When every row passes, the environment is where it was on October 30, 2026, with `main` at or past
`b9e861683` and the untracked documents back in the working tree.
