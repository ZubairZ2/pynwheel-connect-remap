# Credentials and environment variables (names only — no values anywhere in git)

"Backup" below means the encrypted local backup folder (`LOCAL_BACKUP_INVENTORY.md`), path relative to
its `01_secrets/`. Heroku values are read with `heroku config -a <app>` once the CLI is logged in.

## 1. Secret files on this Mac (all in the backup, none in git)

| File | Variables / content | Used by | Authoritative source | Recovery |
|---|---|---|---|---|
| `~/pynwheel-staging/credentails.md` (sic) | `check_point_domain_id`, `CHECKPOINT_TOKEN`; `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE_NUMBER` | Rails (CheckpointID DVS verification, Twilio OTP SMS) | CheckpointID account (no Heroku copy); Twilio console (Heroku pyn-system has the Twilio vars) | `repo/credentails.md`; export into the shell or figaro when needed. Rotate at CheckpointID/Twilio if the backup is ever exposed |
| `config/application.yml` (figaro) | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `IGLOOHOME_API_BASE_URL`, `IGLOOHOME_API_KEY`, `IGLOOHOME_AUTH_BASE_URL`, `IGLOOHOME_IGLOOWORKS_API_BASE_URL`, `IGLOOHOME_REDIRECT_URI`, `PYNWHEEL_IGLOOHOME_CLIENT_ID`, `PYNWHEEL_IGLOOHOME_CLIENT_SECRET` | Rails locally (S3 uploads, igloohome lock integrations) | Heroku pyn-system (`AWS_*`); igloohome developer portal (client id/secret, API key) | `repo/config/application.yml` → copy back to `config/` |
| `config/database.yml` | local `postgres` user password | Rails | tracked in git (local-only password) | nothing to do; `DATABASE_URL` overrides it |
| `pyn-connect-web/.env.local` | `PYNWHEEL_CMS_URL`, `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL` | Connect dev server | `.env.example` + your local Rails URL | `repo/pyn-connect-web/.env.local`, or `cp .env.example .env.local` and set the URL |
| `tour-app/.env.production.local` | `VITE_TOUR_API_URL` | native Tour App builds | your choice (LAN Rails or Heroku) | `repo/tour-app/.env.production.local`; rewrite the LAN IP each time |
| `.claude/settings.local.json` | Claude Code permission allowlist; one entry embeds a test-visitor bearer token | Claude desktop | regenerable | `repo/.claude/settings.local.json` (optional) |
| `pyn-tour-old/.env` | legacy app runtime config | legacy RN app | backup only | `repo/pyn-tour-old/.env` |
| `pyn-tour-old/android/local.properties` | `sdk.dir` | legacy Gradle | regenerable (`sdk.dir=/Users/<you>/Library/Android/sdk`) | rewrite |
| `pyn-tour-old/android/app/selftour-key.keystore` | the legacy app's **release signing key** | Play Store updates of the legacy app | backup only — **irreplaceable** | `repo/pyn-tour-old/android/app/` |
| `~/.pynwheel_ro_url` | read-only production `DATABASE_URL` | prod read queries (`psql "$(cat ~/.pynwheel_ro_url)"`) | Heroku (`heroku pg:credentials`) | `home/.pynwheel_ro_url` |
| `~/.igloohome_sdk_token`, `~/.igloohome_ios_sdk_token` | igloohome SDK access tokens (Android GitLab Maven, iOS GitLab SPM) | plugin builds | igloohome developer portal → SDK Access | `home/` |
| `~/.netrc` | `machine gitlab.com login oauth2 password <ios sdk token>` | Xcode / SPM for the iOS SDK | same token | `home/.netrc` (chmod 600) |
| `~/.gradle/gradle.properties` | `iglooGitlabToken` | Android plugin build | same as Android SDK token | `home/.gradle/gradle.properties` |
| `~/.config/gh/hosts.yml` + keyring | `gh` OAuth token for ZubairZulfiqarZ2 | gh CLI | regenerable (`gh auth login`) | re-login |
| `~/.android/adbkey`, `adbkey.pub` | ADB client key (phone authorisation) | adb | regenerable (re-accept on the phone) | `home/.android/` |
| `~/.android/debug.keystore` | debug signing key | debug APKs | regenerable (new key → uninstall old app first) | `home/.android/` |
| `~/.ssh/id_ed25519_work`, `id_ed25519`, `id_ed25519_toptal` | SSH private keys | GitHub, Toptal | policy-dependent | `ssh/` if kept, else new keys (GIT_AND_GITHUB_RECOVERY.md) |
| `~/.claude.json` | Claude Code app state (account, project list, MCP registrations) | Claude desktop | regenerable by signing in | `home/.claude.json` (optional) |
| Heroku CLI token | in macOS keychain / netrc | heroku CLI | regenerable | `heroku login` |
| Apple Development certificates | login keychain | Xcode signing | regenerable (Automatic signing) | sign in to Xcode |

## 2. Rails runtime variables (set per command locally; config vars on Heroku pyn-system)

| Variable | Purpose | Required by | Source of value | Recovery |
|---|---|---|---|---|
| `DATABASE_URL` | which PostgreSQL DB Rails uses | every isolated local run; Heroku | local: `postgres://zubairzulifqar@localhost/<db>`; Heroku: add-on | restore the DBs (guide step 6) |
| `REDIS_URL` | Redis for cache/sessions/Sidekiq | Heroku; local default localhost | Heroku add-on | `brew services start redis` |
| `SECRET_KEY_BASE`, `SECRET_KEY_BASE_v2` | cookie/session signing | Heroku | Heroku | none locally (development key in credentials) |
| `HOST_URL` | absolute URLs in mail/links (Heroku value is the dead `pyn-system.herokuapp.com`; the live host is `pyn-system-16a05cad79df.herokuapp.com`) | Heroku | Heroku | none |
| `API_ACCESS=true` | enables the JSON APIs locally | local Tour App / Connect runs | convention | set in the command |
| `PYN_CONNECT_WRITES`, `PYN_CONNECT_WRITES_COMMUNITY_IDS` | Connect write switch + allowlist (prod: `on`, ids in `deploy_production.sh`) | Rails | `deploy_production.sh` | set in the command |
| `PYN_TOUR_VISITS`, `PYN_TOUR_VISITOR_AUTH` | Tour App visitor auth / visits | Rails | Heroku (set Oct 25, 2026) | set `on` locally |
| `PYN_TOUR_OTP_TEST_PHONES`, `PYN_TOUR_OTP_TEST_CODE`, `PYN_TOUR_OTP_DEBUG` | fixed OTP for test phones / disclose code | Rails, QA | Heroku has the test phone + code | `heroku config:get` |
| `AWS_*`, `S3_BUCKET_NAME` | uploads | Rails | Heroku; figaro locally | as above |
| `TWILIO_*`, `STRIPE_*`, `PUSHER_*`, `GOOGLE_MAPS_API_KEY`, `BUGSNAG_API_KEY`, `SMTP_*` | integrations | Rails on Heroku | Heroku | `heroku config -a pyn-system` |
| `PYNWHEEL_PROD_DATABASE_URL`, `HEROKU_POSTGRESQL_WHITE_URL` | second DB handles on Heroku | Heroku | Heroku | none |
| `RAILS_ENV`, `RACK_ENV`, `RAILS_LOG_TO_STDOUT`, `RAILS_SERVE_STATIC_FILES` | Heroku runtime | Heroku | Heroku | none |
| `DISABLE_SPRING=1`, `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES`, `LC_ALL=en_US.UTF-8`, `LAUNCHY_DRY_RUN=true` | local-run hygiene (see TROUBLESHOOTING.md) | local | convention | set in the command |
| `ENTRATA_*`, `YARDI_*`, `REALPAGESVC_*`, `RESMAN_*`, `KNOCK_*`, `REMOTELOCK_*`, `SDK_MAP_BASE_URL`, `PYNWHEEL_ACCESS_BASE_URL`, `PYNWHEEL_LUANCH` | provider integrations named in `context.md` §8; **not present** in pyn-system's config today | Rails code paths | per-provider accounts | only if those features are exercised |

Full Heroku key lists captured October 30 (names only): pyn-system — `AWS_ACCESS_KEY_ID AWS_REGION
AWS_SECRET_ACCESS_KEY BUGSNAG_API_KEY DATABASE_URL GOOGLE_MAPS_API_KEY HEROKU_POSTGRESQL_WHITE_URL HOST_URL
PUSHER_APP_ID PUSHER_CLUSTER PUSHER_KEY PUSHER_SECRET PUSHER_SOCKET_URL PUSHER_URL PYNWHEEL_PROD_DATABASE_URL
PYN_CONNECT_WRITES PYN_CONNECT_WRITES_COMMUNITY_IDS PYN_TOUR_OTP_TEST_CODE PYN_TOUR_OTP_TEST_PHONES
PYN_TOUR_VISITOR_AUTH PYN_TOUR_VISITS RACK_ENV RAILS_ENV RAILS_LOG_TO_STDOUT RAILS_SERVE_STATIC_FILES REDIS_URL
S3_BUCKET_NAME SECRET_KEY_BASE SECRET_KEY_BASE_v2 SMTP_PASSWORD SMTP_USER_NAME STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM_PHONE_NUMBER`; pyn-system-connect —
`APP_BASE NEXT_PUBLIC_CMS_URL NEXT_PUBLIC_ENV_LABEL PYNWHEEL_CMS_URL`.

## 3. Frontend / mobile variables

| Variable | Purpose | Required by | Source | Recovery |
|---|---|---|---|---|
| `PYNWHEEL_CMS_URL` | Rails base URL (server side) | Connect | `.env.local` / Heroku | copy / set |
| `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL` | legacy links, header chip (build time) | Connect | same | same |
| `PYN_CONNECT_COOKIE_SECURE`, `PYN_CONNECT_REACT_FLOW`, `NEXT_PUBLIC_SCREEN_HARNESS` | http dev builds, legacy fallback, e2e harness | Connect | README | set when needed |
| `VITE_TOUR_API_URL` | Tour API base URL baked into the bundle | Tour App | `.env.*` (tracked) + `.env.production.local` | set per build |
| `VITE_TOUR_DATA_SOURCE` (`api`/`dummy`), `VITE_TOUR_API_TIMEOUT` | data source switch, timeout | Tour App | tracked env files | tracked |
| `IGLOO_GITLAB_TOKEN` / Gradle `iglooGitlabToken` | igloohome Android SDK download | plugin build | portal | backup |

## 4. Test credentials that exist (values deliberately not written here)

- Tour App **test visitor**: the phone number and fixed code in Heroku `PYN_TOUR_OTP_TEST_PHONES` /
  `PYN_TOUR_OTP_TEST_CODE` (`heroku config:get`), also usable locally by setting the same two variables.
- Tour App built-in reviewer phone and code: shown on screen by the app (PR #46 description).
- Connect sign-in without a password: mint a Devise session with `rails runner` (PYN_CONNECT_PROGRESS.md §7,
  `db_compat_audit/scripts/mint.rb`).
- Property-clone test admin (clone 8044 on `pynwheel_audit_clone`): `rake property_clone:*` output.

## 5. Rotation advice

Nothing in the recovery package is a new exposure. Two things were noticed and are worth acting on
independently of the wipe: `origin` is a public GitHub repository (rotate the AWS key that was once in its
history if not already done), and `.claude/settings.local.json` holds a visitor session token for the
staging app (expires on its own; it is not in git).
