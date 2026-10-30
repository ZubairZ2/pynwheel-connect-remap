# Pynwheel development Mac — recovery package (captured October 30, 2026)

This folder is the recovery package for wiping and reinstalling the development MacBook Air
(`Mac16,12`, Apple M4, macOS 27.0.1). Everything in it was captured from the live machine on
October 30, 2026; nothing is copied from older documentation. Where a value could not be verified it
is marked **[VERIFY]**.

Start with [POST_WIPE_RECOVERY_GUIDE.md](POST_WIPE_RECOVERY_GUIDE.md) after the wipe. Before the wipe,
work through [PRE_WIPE_CHECKLIST.md](PRE_WIPE_CHECKLIST.md).

## Where the backup lives

| Piece | Location | What it holds |
|---|---|---|
| Git recovery branch | `origin` (`git@github-work:ZubairZ2/pynwheel-connect-remap.git`), branch `temporary/local_unpushed_code_branch` | `main` as of `b9e861683` plus every untracked document, PR description, audit script, this package, the recovery scripts |
| Stash branch | same remote, branch `temporary/stash-igloohome-ios-plugin-prep-2026-10-30` | the one `git stash` that existed (Xcode project edits for the TestFlight build), also as `patches/stash-2026-10-30-igloohome-ios-plugin-prep-xcode-project.patch` |
| Local-only backup folder | `~/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30/` (must be encrypted and copied off the Mac — see the checklist) | secrets, ignored design exports, keystores, the Claude memory and transcripts, dotfiles, IDE settings, git bundles of every repository on the Mac |

The recovery branch is a snapshot, not a feature branch: do not merge it into `main`. After the
restore, keep working on `main` and the feature branches; the branch stays as the archive of the
untracked material.

## Documents

| File | Content |
|---|---|
| [PRE_WIPE_CHECKLIST.md](PRE_WIPE_CHECKLIST.md) | What must be true before the wipe, and the readiness verdict |
| [POST_WIPE_RECOVERY_GUIDE.md](POST_WIPE_RECOVERY_GUIDE.md) | The sequential rebuild: macOS tools, Homebrew, shell, Git/SSH, Xcode, Android Studio, languages, the repository, configuration, services, verification |
| [MAC_HARDWARE_AND_OS.md](MAC_HARDWARE_AND_OS.md) | Hardware, OS build, disk layout, shell, PATH, Command Line Tools |
| [MACOS_DEVELOPER_CONFIGURATION.md](MACOS_DEVELOPER_CONFIGURATION.md) | zsh / oh-my-zsh / powerlevel10k, Git config, SSH aliases, Homebrew services, Ruby and Node managers, Java, iTerm, Cursor, VS Code, Raycast |
| [PYNWHEEL_PROJECT_ENVIRONMENT_AND_CONFIGURATION.md](PYNWHEEL_PROJECT_ENVIRONMENT_AND_CONFIGURATION.md) | Rails CMS, Connect (Next.js), Tour App (Capacitor), the legacy RN app, ports, databases, Redis, jobs, Heroku, external services |
| [XCODE_SETUP_AND_RECOVERY.md](XCODE_SETUP_AND_RECOVERY.md) | Xcode 27 state, SDKs, simulators, signing teams, SPM credentials, rebuild steps |
| [ANDROID_STUDIO_SETUP_AND_RECOVERY.md](ANDROID_STUDIO_SETUP_AND_RECOVERY.md) | Android Studio 2026.2, SDK components, JDK, Gradle, ADB, the Samsung phone, the APK build |
| [GIT_AND_GITHUB_RECOVERY.md](GIT_AND_GITHUB_RECOVERY.md) | Remotes, the two GitHub identities, SSH keys, how to get the recovery branch back, the public-repository finding |
| [CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md](CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md) | Every variable and secret file by name, who uses it, where its value is kept, how to regenerate it. No values. |
| [LOCAL_BACKUP_INVENTORY.md](LOCAL_BACKUP_INVENTORY.md) | Every local-only file: category, original path, backup destination, restoration |
| [PYNWHEEL_REPOSITORY_STRUCTURE.md](PYNWHEEL_REPOSITORY_STRUCTURE.md) | The repository tree and what each part is |
| [DEVELOPMENT_COMMANDS.md](DEVELOPMENT_COMMANDS.md) | Day-to-day commands: servers, tests, builds, deploy |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | The traps already hit on this machine and their fixes |
| `manifests/` | Machine-readable inventories (Brewfile, formulae, casks, gems, npm, pip, applications, Xcode, Android, Java, system) |
| `patches/` | The stash as a patch |
| `launch.json.example` | The dev-server launch configurations the Claude desktop app used (ignored by git in `.claude/`) |

## Scripts (`scripts/recovery/`)

| Script | Purpose | Destructive? |
|---|---|---|
| `inventory_mac.sh` | Prints the same inventory this package was built from (run it on the new Mac to compare) | no |
| `check_environment.sh` | Checks each tool and version the project needs; names missing environment variables without printing values | no |
| `verify_pynwheel_setup.sh` | Checks the repository, bundle, node modules, databases, Redis, Capacitor platforms, and that Rails and Next can boot | no |
| `collect_local_backup.sh` | Copies every local-only file into the backup folder (what was run on October 30) | no (copies only) |
| `encrypt_local_backup.sh` | Encrypts that folder into one `.tar.gpg` with a passphrase | no |
| `dump_local_databases.sh` | Optional `pg_dump` of the local databases, only if policy allows | no |

Run them from the repository root, for example `scripts/recovery/check_environment.sh`.

## Readiness summary (October 30, 2026)

See the verdict table at the end of [PRE_WIPE_CHECKLIST.md](PRE_WIPE_CHECKLIST.md). In one line: the
code and documents are on GitHub and verified by a fresh clone; the local-only material is collected
in the Desktop folder but is **not off the machine yet**, and that step (encrypt, copy, verify the copy)
is yours to do before the wipe.
