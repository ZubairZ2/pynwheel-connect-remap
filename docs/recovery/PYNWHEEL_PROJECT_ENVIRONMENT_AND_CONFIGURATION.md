# Pynwheel project environment and configuration (verified October 30, 2026)

One repository, `~/pynwheel-staging`, holds four applications. Ports, databases and commands below
are the ones in use on this Mac (`.claude/launch.json`, copied as `launch.json.example`, is the record
of every server configuration that was run).

```
                 ┌──────────────── Rails 7.2.2 CMS ("pyn-system") ───────────────┐
                 │ legacy HAML UI · Connect JSON (/communities/:id/connect/*)     │
                 │ Tour App API (/api/tour/v1) · partner/self_tour/touch/v1/v2 APIs│
                 │ PostgreSQL 16 · Redis · Sidekiq (prod) / Resque · S3 via fog    │
                 └──────────────▲──────────────────────────▲──────────────────────┘
         Devise session cookie │                           │ Bearer vst_ visitor token / OTP
   pyn-connect-web (Next 15, React 19, :3001)       tour-app (Vite 8 + React 19 + Capacitor 8, :3012)
   "Pynwheel Connect" back office                   "Pynwheel Tour" iOS/Android self-tour app
                                                     plugins/igloohome-ble (Kotlin + Swift, igloohome SDK 3.5)
   pyn-tour-old (React Native 0.63) — the legacy tour app, kept for reference, not developed
```

## A. Rails CMS (repository root)

| Item | Value |
|---|---|
| Ruby | **3.3.5** (`Gemfile` `ruby '3.3.5'`; `.ruby-version` is git-ignored and says 3.3.5). The working interpreter is **RVM's** `~/.rvm/rubies/ruby-3.3.5` (rbenv's copy cannot load the vendored gems) |
| Bundler | **2.5.16** (`BUNDLED WITH`); RubyGems 3.5.16 |
| Rails | **7.2.2** (`Gemfile` says `~> 7.1`, lock resolves 7.2.2); Rack 2.2 |
| Gem install location | vendored into the repository: `.bundle/config` sets `BUNDLE_PATH: gems` plus build flags `pg → --with-pg-config=/opt/homebrew/opt/libpq/bin/pg_config`, `rmagick → --with-opt-dir=/opt/homebrew/opt/imagemagick`, `scout_apm → --with-cflags=-Wno-error=incompatible-function-pointer-types`. `gems/`, `cache/`, `bundler/`, `extensions/`, `build_info/`, `specifications/` are ignored (970 MB) |
| Server | Puma (`Procfile`: `web: bundle exec rails server -p $PORT`, `worker: bundle exec sidekiq -e production`); local: `rails server -p 3000 -b 127.0.0.1` (3100 when 3000 is taken by another project) |
| Database | PostgreSQL. `config/database.yml` is **tracked** and points `development` at the local **`pynwheel_prod`** copy (host localhost, user `postgres`, a local password). Every isolated run overrides it with `DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_development` (or `…/pynwheel_audit_clone`) |
| Local databases (Oct 30) | `pynwheel_development` 11 GB, `pynwheel_prod` 6.3 GB, `pynwheel_audit_clone` 6.3 GB (migrated production clone used for QA, John Demo 1411 / Jennifer Demo 1412 / Hazel 1618 → clone 8044 / Cypress Terra 8005), `pynwheel_test` 23 MB, `autoplot_dev` 8 MB. All derive from Heroku production backups |
| Redis | Homebrew `redis` 8.10.1 on `localhost:6379`; `config/initializers/redis.rb` reads `REDIS_URL` (unset locally → default); `redis-rails` session/cache store, Sidekiq 6 (`config/initializers/sidekiq.rb`), Resque + resque-scheduler also in the Gemfile; the `message` queue carries `TwilioSmsWorker` |
| Background jobs | Sidekiq (production worker dyno), Resque, `sucker_punch`, `delayed_job_active_record` all present; `Sidekiq::Web` mounted at `/sidekiq` |
| Auth | Devise (+ invitable), Doorkeeper (`/api/v2/auth`), CanCanCan; Connect reuses the Devise session cookie; Tour App visitors use `visitor_otps` + `vst_` bearer sessions (`PYN_TOUR_VISITOR_AUTH`) |
| Storage | CarrierWave + fog-aws on S3 (`S3_BUCKET_NAME`, staging bucket `staging-pynwheel`, files actually on `images-pynwheel-cms-v2`); `public/uploads/` local |
| Feature flags (env) | `PYN_CONNECT_WRITES` (+ `PYN_CONNECT_WRITES_COMMUNITY_IDS`), `PYN_TOUR_VISITS`, `PYN_TOUR_VISITOR_AUTH`, `PYN_TOUR_OTP_TEST_PHONES`, `PYN_TOUR_OTP_TEST_CODE`, `PYN_TOUR_OTP_DEBUG`, `API_ACCESS` |
| Figaro | `config/application.yml` (**ignored, in the backup**) — the AWS and igloohome keys (names in CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md) |
| Tests | Minitest, `test/` (102 files; was git-ignored until October 5, 2026). `bin/rails test` with the RVM ruby; the test DB `pynwheel_test` must be migrated by hand first |
| Migrations | latest `20261029120000_add_file_source_id_for_shared_uploads`; `db/schema.rb` tracked |
| Staging/production | Heroku app **pyn-system** (RAILS_ENV=production, Heroku Postgres = **the production database**, `HOST_URL`, S3, Twilio, Stripe, Pusher, Bugsnag, SMTP config vars). Deployed by `./deploy_production.sh` (pushes local `main` to both Heroku remotes and keeps `PYN_CONNECT_WRITES` set) |
| Native dependencies | PostgreSQL client (`libpq`), ImageMagick (`rmagick`, `mini_magick`), libyaml, openssl@3, ffmpeg (video thumbnails) |

### Rails local run (the exact command that works)

```bash
cd ~/pynwheel-staging
export PATH="$HOME/.rvm/gems/ruby-3.3.5/bin:$HOME/.rvm/gems/ruby-3.3.5@global/bin:$HOME/.rvm/rubies/ruby-3.3.5/bin:$PATH"
export GEM_HOME="$HOME/.rvm/gems/ruby-3.3.5" GEM_PATH="$HOME/.rvm/gems/ruby-3.3.5:$HOME/.rvm/gems/ruby-3.3.5@global"
export DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES LC_ALL=en_US.UTF-8
export DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_development
bundle exec rails server -p 3000 -b 127.0.0.1
```

Add `API_ACCESS=true` for the JSON APIs, `-b 0.0.0.0` for a phone on the LAN, `PYN_CONNECT_WRITES=on`
for Connect writes, `PYN_TOUR_VISITS=on PYN_TOUR_VISITOR_AUTH=on PYN_TOUR_OTP_DEBUG=on` for the Tour App
visitor flow, `LAUNCHY_DRY_RUN=true` so letter_opener does not open windows.

## B. Pynwheel Connect — `pyn-connect-web/` (Next.js)

| Item | Value |
|---|---|
| Node | `.nvmrc` 22, engines `22.x` (machine: Node 26.8.2, npm 11.19.1); lockfile `package-lock.json` (npm) |
| Stack | Next **15.5**, React **19.1**, Redux Toolkit 2.12, react-redux 9.3, TypeScript 5.7, Vitest 3.2 (`npm test`), Playwright 1.63 (`npm run test:e2e`, Chrome channel) |
| Scripts | `npm run dev` (port **3001**), `npm run build`, `npm start`, `npm run typecheck` |
| Env | `.env.example` (tracked) → `.env.local` (**ignored, in the backup**): `PYNWHEEL_CMS_URL` (server-side Rails base URL), `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL`; also honoured: `PYN_CONNECT_COOKIE_SECURE`, `PYN_CONNECT_REACT_FLOW`, `NEXT_PUBLIC_SCREEN_HARNESS` |
| Deploy | Heroku app **pyn-system-connect** (config vars `APP_BASE`, `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL`, `PYNWHEEL_CMS_URL`); `Dockerfile` + `DEPLOYMENT.md` for other hosts |
| Tests need | a running Rails on the URL in `.env.local`; signed-in checks use a Devise session minted with `rails runner` (PYN_CONNECT_PROGRESS.md §7) |

## C. Pynwheel Tour — `tour-app/` (Vite + React + Capacitor)

| Item | Value |
|---|---|
| Node | `.nvmrc` 22, engines `>=22`; lockfile `package-lock.json` |
| Stack | Vite **8**, React **19.2**, TypeScript 5.9, Vitest 4, Capacitor **8.5** (`core`, `cli`, `android` 8.5.2, `ios` 8.5.0, plugins app/geolocation/haptics/keyboard/preferences/splash-screen/status-bar, `@capacitor/assets`), local plugin `@pynwheel/igloohome-ble` (`file:plugins/igloohome-ble`) |
| Scripts | `npm run dev` (port **3012**, host 127.0.0.1), `build`, `preview` (3003), `typecheck`, `test`, `cap:sync`, `cap:ios`, `cap:android`, `assets` |
| Env (tracked) | `.env.development` (`VITE_TOUR_API_URL`, `VITE_TOUR_DATA_SOURCE`), `.env.staging`, `.env.production`, `.env.example` (+ `VITE_TOUR_API_TIMEOUT`) |
| Env (ignored, backed up) | `.env.production.local` — the API URL baked into a native build (LAN IP for a local Rails, or the Heroku URL) |
| Capacitor | `capacitor.config.ts`: appId `com.pynwheel.tour`, appName "Pynwheel Tour", webDir `dist`, `loggingBehavior: 'none'`, Android `allowMixedContent` only for `http://` API URLs |
| iOS | `ios/App` — Xcode project, SPM (`CapApp-SPM`), deployment target 15 (XCODE_SETUP_AND_RECOVERY.md) |
| Android | `android/` — Gradle 8.14.3, AGP 8.13, JDK 21, SDK 36 (ANDROID_STUDIO_SETUP_AND_RECOVERY.md) |
| Bluetooth plugin | `plugins/igloohome-ble`: Android `co.igloo.home:sdk:3.5.0` from the igloohome GitLab Maven (token), iOS `iglooaccess-ios-sdk` ≥ 3.5.0 from GitLab (SPM credential) |

## D. Legacy tour app — `pyn-tour-old/` (React Native 0.63)

Tracked on `main` since PR #28 (742 files). Not developed; used to read the original flows (CheckpointID
DVS calls, Zerv/Latch/igloohome v1 SDK usage). Local-only pieces are in the backup (see Android doc).
Needs `yarn`, Watchman, JDK 17, CocoaPods (never installed here).

## E. Other tooling in the repository

- `script/property_clone/` + `lib/tasks/property_clone.rake`: the property clone (`rake property_clone:*`).
- `script/tour_api_parity.rb`, `script/tour_api_measure.rb`: Tour API parity / timing against two bases.
- `script/svg_background_optimizer.rb`, `lib/tasks/svg_optimizer.rake`: SVG floor-plate optimisation.
- `scripts/show_visitor_otp.sh`: prints a queued Tour App sign-in code from Redis.
- `wayfinding_rnd/`: hallway-detection research (scripts, metrics, evidence).
- `db_compat_audit/` (untracked, now on the recovery branch): the legacy/production DB coexistence audit.
- `qa/`, `visitors_module_qa/`, `svg_map_qa/`: QA evidence.
- `deploy_production.sh` (untracked, on the recovery branch): the two-app Heroku deploy.

## F. External services (what the code integrates with)

| Service | Used by | Credential location (names only) | Restore |
|---|---|---|---|
| AWS S3 (`staging-pynwheel`, `images-pynwheel-cms-v2`) | CarrierWave/fog uploads, Textract | `config/application.yml` (`AWS_*`) locally; Heroku `AWS_*`, `S3_BUCKET_NAME` | restore `application.yml` from the backup; values also in Heroku |
| Heroku Postgres | pyn-system `DATABASE_URL` = production DB; `~/.pynwheel_ro_url` = read-only URL used for prod reads | Heroku; `~/.pynwheel_ro_url` in backup | `heroku config -a pyn-system`; `heroku pg:backups` to rebuild local copies |
| Redis (Heroku add-on) | queues/cache | Heroku `REDIS_URL` | automatic |
| Twilio | OTP SMS (`TwilioSmsWorker`) | `credentails.md` (local) and Heroku `TWILIO_*` | backup / Heroku / Twilio console |
| CheckpointID (DVS) | Tour App real-ID verification | `credentails.md` (`check_point_domain_id`, `CHECKPOINT_TOKEN`); **not on Heroku** | backup only; otherwise re-request from CheckpointID |
| igloohome (API + Iglooworks + Bluetooth SDKs) | locks: door codes, Bluetooth keys | `application.yml` (`IGLOOHOME_*`, `PYNWHEEL_IGLOOHOME_CLIENT_*`), `~/.gradle/gradle.properties` (`iglooGitlabToken`), `~/.igloohome_sdk_token`, `~/.igloohome_ios_sdk_token`, `~/.netrc` | backup; igloohome developer portal re-issues SDK tokens |
| Stripe | billing | Heroku `STRIPE_*` | Heroku / Stripe dashboard |
| Google Maps / Places | maps, geocoding | Heroku `GOOGLE_MAPS_API_KEY` | Heroku / Google Cloud console |
| Pusher | realtime | Heroku `PUSHER_*` | Heroku |
| Bugsnag | errors | Heroku `BUGSNAG_API_KEY` | Heroku |
| SMTP | mail | Heroku `SMTP_*`; local uses letter_opener | Heroku |
| CRM/data providers (Entrata, Yardi, RealPage, ResMan, Knock, RemoteLock) | sync rake tasks | Heroku / per-community records | Heroku |
| Latch, Zerv | lock providers (legacy) | per-community records in the DB; Zerv iOS framework file (backup) | DB / backup |

No business data, database contents or customer records are part of the recovery package.
