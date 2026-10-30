# Pre-wipe checklist and readiness verdict (October 30, 2026)

## Done by the recovery session (verified)

- [x] Git audit: working tree had **no modified or staged tracked files**; 27 untracked items; 1 stash;
      1 local branch with a commit missing from origin (`fix/integration_btw_locks_visitors_settings_mobile_app`,
      a duplicate of a change already on main); no submodules, LFS, hooks or extra worktrees.
- [x] Recovery branch `temporary/local_unpushed_code_branch` created from `main` (`b9e861683`) with every
      untracked document/script/audit folder except the secret file and the 20 MB design exports; committed
      and pushed to `origin`; fetched back by a fresh clone and compared.
- [x] Stash preserved twice: branch `temporary/stash-igloohome-ios-plugin-prep-2026-10-30` on origin, and
      `docs/recovery/patches/…xcode-project.patch` in the recovery branch.
- [x] The unpushed local branch pushed to origin.
- [x] Secret scan: gitleaks + pattern review over every file added to the branch; `credentails.md`,
      `config/application.yml`, `.env.local`, `.env.production.local`, tokens and keystores excluded.
- [x] Full inventory of the Mac captured into `docs/recovery/` + `manifests/`.
- [x] Local-only backup folder collected: `~/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30/` (3,247 files, 1.4 GB,
      checksummed), git bundles of all 12 repositories' unpushed work included.

## Still yours to do before the wipe (in this order)

1. **Raycast export** (manual, 1 minute): Raycast → Settings → Advanced → Export Settings & Data → save into
   `~/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30/04_dotfiles/raycast/`.
2. **Decide about the SSH private keys**: keep `01_secrets/ssh/` in the backup only if policy allows an
   encrypted private-key backup; otherwise delete that folder now (new keys are a 5-minute job after the wipe).
   Same decision for `06_databases/`: run `scripts/recovery/dump_local_databases.sh <folder>` only if a copy of
   the production-derived data may leave the machine (needs ~5 GB free; the disk has 6 GB).
3. **Encrypt and move it off the Mac**:
   ```bash
   cd ~/pynwheel-staging && scripts/recovery/encrypt_local_backup.sh ~/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30
   ```
   Copy `PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30.tar.gpg` **and** `.tar.gpg.sha256` to the approved destination
   (external drive and/or company storage — not a public paste/gist service), then on that destination run
   `shasum -a 256 -c PYNWHEEL_PRE_WIPE_BACKUP_2026-10-30.tar.gpg.sha256`. Store the passphrase in your password manager.
   **Until this is done, every secret, the legacy release keystore, the design exports and the Claude memory exist only on the disk that will be wiped.**
4. **Push the ezofficeinventory commits** (2 commits on `feature/improving_the_time_base_logic`, made today)
   with `git -C ~/ezofficeinventory push -u origin feature/improving_the_time_base_logic` — simpler than the bundle.
   The other repositories' uncommitted edits are in the bundle folder; push or discard as you see fit.
5. Optional but recommended: make `ZubairZ2/pynwheel-connect-remap` **private** (it is public today) and
   confirm the AWS key once committed there was rotated.
6. Sign out of Cursor, Claude, Slack, Postman, Raycast, Xcode accounts, iCloud (Find My off) — the usual
   pre-wipe hygiene; nothing in this package depends on it.
7. Re-read `LOCAL_BACKUP_INVENTORY.md` once; if anything else on the Mac matters (Downloads, Documents,
   browser profiles), add it to the backup folder before step 3.

## Readiness verdict

| Requirement | Status | Evidence |
|---|---|---|
| All Pynwheel source code (main + every feature branch) | **BACKED UP** | all 60 local branch tips on origin; fresh clone verified; bundle in the backup folder |
| Local unpushed commits | **BACKED UP** | `fix/integration_btw_locks_visitors_settings_mobile_app` pushed (and already on main as `823238275`) |
| Staged / unstaged changes | **BACKED UP** (there were none) | `git status` clean of tracked changes |
| Untracked documents, PR descriptions, scripts, audit | **BACKED UP** | on `temporary/local_unpushed_code_branch`, verified by fresh clone |
| The stash | **BACKED UP** | branch + patch on origin |
| Recovery branch on the remote | **BACKED UP** | `git ls-remote origin refs/heads/temporary/local_unpushed_code_branch` |
| Secrets (CheckpointID, Twilio, AWS, igloohome, prod RO URL, tokens) | **REQUIRES MANUAL RESTORATION** → collected in the backup folder; **BLOCKED until encrypted and copied off the Mac** (checklist step 3) | `01_secrets/` |
| Legacy app release keystore, Zerv framework | same as above (irreplaceable) | `01_secrets/repo/pyn-tour-old/`, `02_local_docs_and_design/` |
| Claude Code memory and transcripts | same as above | `03_claude_home/` |
| Design exports and ignored briefs | same as above | `02_local_docs_and_design/` |
| Xcode reinstall + configuration | **DOCUMENTED** (+ settings/profiles backed up; certificates regenerable; GitLab SPM credential in backup) | XCODE_SETUP_AND_RECOVERY.md |
| Android Studio + SDK + JDK + APK build | **DOCUMENTED** (+ tokens/keystores/options backed up) | ANDROID_STUDIO_SETUP_AND_RECOVERY.md |
| Rails environment (Ruby 3.3.5, Bundler 2.5.16, Rails 7.2.2, gems) | **DOCUMENTED** | guide steps 4, 7; manifests |
| Next.js / Vite environments (Node 22, lockfiles) | **DOCUMENTED** | guide step 7 |
| Python | **DOCUMENTED** (nothing project-specific) | — |
| Git / GitHub / Heroku access | **REQUIRES MANUAL RESTORATION** (sign-ins; keys per policy) | GIT_AND_GITHUB_RECOVERY.md |
| Local databases | **REQUIRES MANUAL RESTORATION** (from Heroku backups, or optional dump) | guide step 6 |
| Raycast settings | **BLOCKED** until you run the in-app export (step 1) | — |
| Apple signing certificates | **REQUIRES MANUAL RESTORATION** (regenerated by Xcode) | — |
| Phone USB-debug authorisation | **REQUIRES MANUAL RESTORATION** (restorable via `adbkey`) | — |
| Other repositories' unpushed work | **BACKED UP** in bundles/patches; push recommended (step 4) | `05_git_bundles/` |

**Is the laptop ready to wipe? Not yet.** The code is safe on GitHub, but the laptop becomes safe to wipe
only after checklist steps 1–3: the Raycast export, the policy decisions, and the encrypted archive
verified on a destination other than this Mac. Those steps are yours and take about fifteen minutes plus
the copy time.
