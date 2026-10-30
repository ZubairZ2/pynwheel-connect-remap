# Troubleshooting — traps already met on this machine

| Symptom | Cause | Fix |
|---|---|---|
| `bundle exec rails …` → "Your Ruby version is 3.1.4, but your Gemfile specified 3.3.5" | the login shell's first Ruby is RVM's 3.1.4 | use the 3.3.5 toolchain by path (DEVELOPMENT_COMMANDS.md header) |
| `linked to incompatible …/.rvm/rubies/ruby-3.3.5/lib/libruby.3.3.dylib` | rbenv's 3.3.5 loading gems compiled under RVM's 3.3.5 | use RVM's ruby, or `rm -rf gems && bundle install` under the one manager you keep |
| `bin/rails` "Permission denied" / not executable | binstubs regenerated without +x | `chmod +x bin/rails bin/rake` or call `bundle exec rails` |
| `rails runner` prints an objc fork warning and the JSON is lost | macOS fork safety | `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES … 2>/dev/null \| tail -1` |
| Spring hangs or runs stale code | Spring | `DISABLE_SPRING=1` |
| Sucker Punch tests hang | in-process job backend | run the affected tests alone / set the test adapter |
| `pg` gem won't build | wrong libpq | `bundle config build.pg --with-pg-config=/opt/homebrew/opt/libpq/bin/pg_config` (already in `.bundle/config`) |
| `rmagick` won't build | ImageMagick path | `bundle config build.rmagick --with-opt-dir=/opt/homebrew/opt/imagemagick` |
| `scout_apm` won't build on clang | incompatible function pointer types | `--with-cflags=-Wno-error=incompatible-function-pointer-types` |
| Connect shows sign-in after setting cookies in the app browser pane | the pane cannot take the minted session | drive with headless Playwright + `context.addCookies`, or sign in through the form |
| Page never hydrates | stale `.next` from a `next build` | stop `next dev`, `rm -rf pyn-connect-web/.next`, restart |
| `npx playwright` "two different versions" | another global Playwright | `./node_modules/.bin/playwright test` from `pyn-connect-web` |
| `npx vite` from a worktree installed a global vite | npx resolution | `./node_modules/.bin/vite` |
| Minted Devise cookie answers 401 | puma runs on `pynwheel_prod` (database.yml) while the cookie was minted on `pynwheel_development` | mint against the DB the server uses (`DATABASE_URL`) |
| Port 3000/3002 taken | other local apps (ezofficeinventory, another Next server) | Rails `-p 3100`, Connect `PYNWHEEL_CMS_URL=http://127.0.0.1:3100`, Tour App stays on 3012 |
| Tour App `/api/tour/v1/properties/*` 500 on Heroku | database behind the code's migrations | `heroku run rails db:migrate -a pyn-system` (manual mode) |
| Legacy `/api/v1/properties` conflicts with the Tour API | route precedence | Tour App API lives at `/api/tour/v1` |
| Test DB missing tables | `pynwheel_test` is not migrated automatically | migrate it by hand with `RAILS_ENV=test` |
| Starting Sidekiq locally texts real phones | stale `TwilioSmsWorker` jobs in the dev Redis `message` queue (Oct 29 incident) | `redis-cli LLEN queue:message`, drain/delete before any Sidekiq with live Twilio creds; prefer `PYN_TOUR_OTP_DEBUG=on` |
| OTP requests throttled | 10 per hour per phone | wait, or use the test phone |
| APK cannot reach the API | the Mac's LAN IP moved | `ipconfig getifaddr en0`, update `tour-app/.env.production.local`, rebuild |
| `co.igloo.home:sdk` will not resolve | no `iglooGitlabToken` | restore `~/.gradle/gradle.properties` |
| Xcode cannot resolve `iglooaccess-ios-sdk` | no GitLab credential | Xcode → Accounts → GitLab, or `~/.netrc` |
| Gradle fails under JBR 25 / JDK 17 | wrong Gradle JDK | JDK 21 (`JAVA_HOME=…/jbr-21.0.11/Contents/Home`) |
| Legacy RN app Metro errors | Watchman missing / JDK | `brew install watchman`; JDK 17 for that project |
| `gh pr create` fails on origin | gh is ZubairZulfiqarZ2 (pull-only) | push the branch, open the compare link in the browser as ZubairZ2 |
| GitHub push protection blocks a push | a secret in a commit | remove it from the commit (amend/rebase the unpushed commit), never bypass; rotate the secret |
| Claude desktop refuses a 6th dev server | 5 servers per folder | stop one, or run Rails from a background shell |
| Scratchpad paths in `launch.json` are dead | they belong to old sessions | rewrite them before `preview_start` |
| `zsh: no matches found` in scripts | zsh glob | quote the pattern or `setopt nullglob` / run with bash |
