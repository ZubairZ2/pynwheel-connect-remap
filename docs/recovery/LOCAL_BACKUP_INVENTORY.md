# Local backup inventory (what is NOT in git, and where it went)

Collected on October 30, 2026 by `scripts/recovery/collect_local_backup.sh` into
`~/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30/` — 3,247 files, 1.4 GB, with `MANIFEST.txt` and `SHA256SUMS`.
**Status at hand-over: collected on the Mac only. It is encrypted and off the machine only after you run
`scripts/recovery/encrypt_local_backup.sh` and copy the `.tar.gpg` (checklist step 3).** Until then every
"Backed up" below means "in that folder".

## Category A — safe in git (on `temporary/local_unpushed_code_branch`)

| Item | Original location | Note |
|---|---|---|
| `main` at `b9e861683` (PR #55) | repository | base of the branch |
| 16 `PR_DESCRIPTION_*.md`, `HANDOFF_2026-10-18_to_2026-10-22.md`, `hand_off_doc_22_oct.md`, `hand_off_doc_25_oct.md`, `TOUR_APP_DEEP_REGRESSION_QA_2026-10-29.md`, `app_ui_redesign_17_oct.md`, `new_app_design_17_oct.md` | repo root, were untracked | scanned (gitleaks + pattern review): no secrets |
| `deploy_production.sh` | repo root, untracked | contains the Connect-writes community id list, no secret |
| `db_compat_audit/` (scripts + evidence, 1.6 MB) | repo root, untracked | request-timing evidence and audit scripts; two internal staff e-mails appear as login identities in the scripts |
| `docs/recovery/**`, `scripts/recovery/*.sh`, `docs/recovery/patches/*.patch`, `docs/recovery/launch.json.example` | new | this package |
| The stash | `git stash@{0}` | branch `temporary/stash-igloohome-ios-plugin-prep-2026-10-30` on origin + the patch |
| `fix/integration_btw_locks_visitors_settings_mobile_app` | local branch, 1 commit not on origin (duplicate of `823238275` on main) | pushed to origin |

## Category B — local-only, needs the encrypted backup

| Item | Original location | Backup path | Encrypted? | Restore | Manual re-auth? |
|---|---|---|---|---|---|
| CheckpointID + Twilio credentials | `credentails.md` | `01_secrets/repo/credentails.md` | after step 3 | copy back; or set as env/figaro | no |
| figaro secrets | `config/application.yml` | `01_secrets/repo/config/application.yml` | after step 3 | `cp` to `config/` | no |
| Connect local env | `pyn-connect-web/.env.local` | `01_secrets/repo/pyn-connect-web/.env.local` | after step 3 | `cp` | no |
| Tour App build env | `tour-app/.env.production.local` | `01_secrets/repo/tour-app/.env.production.local` | after step 3 | `cp`, fix the LAN IP | no |
| Claude allowlist | `.claude/settings.local.json` | `01_secrets/repo/.claude/` | after step 3 | optional `cp` | no |
| Legacy app env, SDK path, **release keystore** | `pyn-tour-old/.env`, `android/local.properties`, `android/app/selftour-key.keystore` | `01_secrets/repo/pyn-tour-old/…` | after step 3 | `cp` (rewrite `sdk.dir`) | no |
| Zerv iOS SDK framework | `pyn-tour-old/ios/Zerv_SDK_Library.framework/` | `02_local_docs_and_design/pyn-tour-old/ios/` | after step 3 | `cp -R` | no |
| Prod read-only DB URL | `~/.pynwheel_ro_url` | `01_secrets/home/.pynwheel_ro_url` | after step 3 | `cp`, `chmod 600` | no |
| igloohome SDK tokens | `~/.igloohome_sdk_token`, `~/.igloohome_ios_sdk_token`, `~/.netrc`, `~/.gradle/gradle.properties` | `01_secrets/home/…` | after step 3 | `cp` | no |
| gh token | `~/.config/gh/hosts.yml` | `01_secrets/home/.config/gh/` | after step 3 | prefer `gh auth login` | yes |
| ADB key + debug keystore | `~/.android/adbkey*`, `debug.keystore` | `01_secrets/home/.android/` | after step 3 | `cp` | phone prompt if not restored |
| Claude app state | `~/.claude.json` | `01_secrets/home/.claude.json` | after step 3 | optional | sign in |
| SSH keys (+config, known_hosts) | `~/.ssh/` | `01_secrets/ssh/.ssh/` | after step 3 | GIT_AND_GITHUB_RECOVERY.md A | GitHub if new keys |
| Claude Code memory, plans, transcripts, settings, plugins, skills | `~/.claude/` (minus caches) | `03_claude_home/.claude/` (702 MB; `projects/-Users-zubairzulifqar-pynwheel-staging/memory/` = 37 memory files) | after step 3 | `rsync -a "$BK/03_claude_home/.claude/" ~/.claude/` **before** opening the project in the Claude app | sign in to Claude |
| Design exports (bundled HTML) | `tour-app.html` 18 MB, `wayfinding-tour-app.html` 21 MB, `Oct_27_Pynwheel Admin - Back Office.html` 21 MB, `pyn-connect-new.html` 20 MB, `pyn-connect-22-sep-new.html` 21 MB, `pyn-system-stack-proposal.html` | `02_local_docs_and_design/` | after step 3 | `cp` to repo root (they stay ignored/untracked by convention) | no |
| Ignored task briefs | `feature1.md`, `feature-whole-ui-next.md`, `properties_inventory_main_improvment.md`, `data-serialization-architecture.md`, `ploting_mappping_and_auto_plot_UI.md` | `02_local_docs_and_design/` | after step 3 | `cp` | no |
| `critical_issues_pictures/`, `toc.list`, `.ruby-version` | repo root | `02_local_docs_and_design/` | after step 3 | `cp` | no |
| Dev-server launch configs | `.claude/launch.json` | `02_local_docs_and_design/.claude/launch.json` (also `docs/recovery/launch.json.example` in git) | after step 3 | `cp` into `.claude/` | no |
| Built APK history (14 files, 232 MB) | `artifacts/` | `02_local_docs_and_design/artifacts/` | after step 3 | optional | no |
| Shell + git dotfiles | `~/.zshrc`, `.zprofile`, `.zlogin`, `.profile`, `.bash_profile`, `.bashrc`, `.mkshrc`, `.p10k.zsh`, `.gitconfig`, `.yarnrc`, `~/.oh-my-zsh/custom/` | `04_dotfiles/home/`, `04_dotfiles/oh-my-zsh-custom/` | after step 3 | MACOS_DEVELOPER_CONFIGURATION.md | no |
| iTerm2, Android Studio, Cursor, VS Code, Raycast, Xcode settings | see MACOS_DEVELOPER_CONFIGURATION.md | `04_dotfiles/{iterm2,android-studio,cursor,vscode,raycast,xcode}/` | after step 3 | per app | sign-ins |
| Git bundles | every repository on the Mac | `05_git_bundles/` | after step 3 | GIT_AND_GITHUB_RECOVERY.md | no |
| **Raycast settings export** | in-app only | `04_dotfiles/raycast/*.rayconfig` — **not created yet, manual** | — | Raycast → Import | yes |
| **Apple signing certificates (.p12)** | login keychain | **not exported** (regenerable through Automatic signing) | — | Xcode sign-in | yes |

## Category C — regenerate or obtain again (not backed up on purpose)

| Item | Why not backed up | How to get it back |
|---|---|---|
| Local PostgreSQL databases (`pynwheel_development` 11 GB, `pynwheel_prod`, `pynwheel_audit_clone`, `pynwheel_test`, `autoplot_dev`; `voicedeal_manager` is another project's) | copies of the production database; policy decides. `06_databases/README.md` + `dump_local_databases.sh` if allowed | `heroku pg:backups:capture/download -a pyn-system` → `pg_restore` (guide step 6); clone properties with `rake property_clone:*` |
| Redis contents | queues only (and a known stale `message` backlog that must be drained, not restored) | empty Redis |
| `gems/`, `node_modules/`, `.next/`, `dist/`, `tour-app/android/build`, `~/.gradle/caches`, DerivedData, SPM caches, Playwright browsers | regenerable | `bundle install`, `npm ci`, builds |
| Homebrew packages, Xcode, Android Studio, SDKs, JBR | installers | `brew bundle`, App Store, Google |
| `gh` / `heroku` / Cursor / Claude / Slack / Postman / Raycast sign-ins | tokens are per machine | sign in |
| Apple Development certificates, provisioning profiles | Automatic signing | sign in to Xcode |
| Phone USB-debugging authorisation | per ADB key (restorable from the backup) | accept on the phone |
| Bitdefender, AssetSonarAgent | employer-managed | IT |
| `public/uploads/` | empty | — |
