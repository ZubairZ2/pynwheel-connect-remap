# Development commands (as run on this machine)

Set once per shell for anything Rails (the RVM 3.3.5 toolchain by path; see TROUBLESHOOTING.md for why):

```bash
export PATH="$HOME/.rvm/gems/ruby-3.3.5/bin:$HOME/.rvm/gems/ruby-3.3.5@global/bin:$HOME/.rvm/rubies/ruby-3.3.5/bin:$PATH"
export GEM_HOME="$HOME/.rvm/gems/ruby-3.3.5" GEM_PATH="$HOME/.rvm/gems/ruby-3.3.5:$HOME/.rvm/gems/ruby-3.3.5@global"
export DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES LC_ALL=en_US.UTF-8
export DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_development
```

| Task | Command (from the repo root unless noted) |
|---|---|
| Install gems | `bundle install` (into `gems/`, flags from `.bundle/config`) |
| Rails server | `bundle exec rails server -p 3000 -b 127.0.0.1` (add `API_ACCESS=true`, `-b 0.0.0.0` for phones, `-p 3100` when 3000 is busy) |
| Rails console / runner | `bundle exec rails console`, `bundle exec rails runner path.rb 2>/dev/null \| tail -1` |
| Migrate | `bundle exec rails db:migrate` (dev) · `RAILS_ENV=test DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_test bundle exec rails db:migrate` (test DB by hand) |
| Rails tests | `bundle exec rails test` (or a file) |
| Sidekiq (dev; drain stale `message` jobs first) | `redis-cli LLEN queue:message`; `nohup bundle exec sidekiq -q message -q default &` |
| Queued OTP code | `scripts/show_visitor_otp.sh` |
| Property clone | `bundle exec rake property_clone:…` (see docs/property_clone) |
| Connect dev | `cd pyn-connect-web && npm install && npm run dev` → http://127.0.0.1:3001 (needs `.env.local`) |
| Connect checks | `npm run typecheck`, `npm run build`, `npm test`, `./node_modules/.bin/playwright test` |
| Tour App dev | `cd tour-app && npm install && npm run dev` → http://127.0.0.1:3012 (`VITE_TOUR_API_URL=http://127.0.0.1:3000 npm run dev` to target local Rails) |
| Tour App checks | `npm run typecheck`, `npm test`, `npm run build` |
| Android APK | `npm run build && npx cap sync android && cd android && JAVA_HOME=$HOME/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home ./gradlew assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk` |
| Install on the phone | `~/Library/Android/sdk/platform-tools/adb install -r tour-app/android/app/build/outputs/apk/debug/app-debug.apk`; logs `adb logcat -s IgloohomeBle` |
| iOS | `cd tour-app && npm run cap:ios` (opens Xcode) or the `xcodebuild` line in XCODE_SETUP_AND_RECOVERY.md |
| App icons | `cd tour-app && npm run assets` |
| Deploy to Heroku | `./deploy_production.sh` (checks `main == origin/main`, pushes to both apps, sets `PYN_CONNECT_WRITES`) |
| Heroku ops | `heroku logs -t -a pyn-system`, `heroku config -a pyn-system`, `heroku run rails db:migrate -a pyn-system` (production DB — manual mode) |
| Prod read query | `psql "$(cat ~/.pynwheel_ro_url)" -c '…'` |
| Local DB clone | `createdb -T pynwheel_prod pynwheel_audit_clone` (then migrate it) |
| Secret scan before a push | `gitleaks git --log-opts='origin/main..HEAD'`; `gitleaks dir .` |
| Recovery checks | `scripts/recovery/check_environment.sh`, `scripts/recovery/verify_pynwheel_setup.sh` |

Dev-server configurations the Claude desktop app used (ports 3000/3001/3005/3012/3013/3022/3100/3105/3200)
are in `launch.json.example`; copy it to `.claude/launch.json` and fix the absolute paths.
