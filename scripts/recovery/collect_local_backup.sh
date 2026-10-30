#!/usr/bin/env bash
# collect_local_backup.sh — gather every LOCAL-ONLY file the recovery documents name
# (secrets, ignored design exports, keystores, Claude memory, dotfiles, IDE settings, git bundles)
# into ONE folder that is NOT in git. Sources are only read; nothing is moved, deleted or modified.
#
#   usage: scripts/recovery/collect_local_backup.sh [destination-folder]
#   default destination: ~/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_<today>
#
# Afterwards: run scripts/recovery/encrypt_local_backup.sh <destination-folder> and copy the
# resulting .tar.gpg to an approved destination (external drive / company storage). The plain
# folder stays on this disk and is wiped with it.
set -uo pipefail

REPO="${REPO:-$HOME/pynwheel-staging}"
DEST="${1:-$HOME/Desktop/PYNWHEEL_PRE_WIPE_BACKUP_$(date +%F)}"
mkdir -p "$DEST"
LOG="$DEST/collect.log"
: > "$LOG"

say() { printf '%s\n' "$*" | tee -a "$LOG"; }
# take <source path> <destination subfolder>  — copies if the source exists, records if it does not
take() {
  local src="$1" sub="$2"
  if [ -e "$src" ]; then
    mkdir -p "$DEST/$sub"
    rsync -a --exclude '.DS_Store' "$src" "$DEST/$sub/" && say "copied   $src -> $sub/"
  else
    say "MISSING  $src (not present on this machine)"
  fi
}

say "== Pynwheel pre-wipe local backup — $(date) =="
say "repo: $REPO"
say "dest: $DEST"

# ---------------------------------------------------------------- 01 secrets (never in git)
take "$REPO/credentails.md"                              01_secrets/repo
take "$REPO/config/application.yml"                      01_secrets/repo/config
take "$REPO/pyn-connect-web/.env.local"                  01_secrets/repo/pyn-connect-web
take "$REPO/tour-app/.env.production.local"              01_secrets/repo/tour-app
take "$REPO/.claude/settings.local.json"                 01_secrets/repo/.claude
take "$REPO/pyn-tour-old/.env"                           01_secrets/repo/pyn-tour-old
take "$REPO/pyn-tour-old/android/local.properties"       01_secrets/repo/pyn-tour-old/android
take "$REPO/pyn-tour-old/android/app/selftour-key.keystore" 01_secrets/repo/pyn-tour-old/android/app
take "$HOME/.pynwheel_ro_url"                            01_secrets/home
take "$HOME/.igloohome_sdk_token"                        01_secrets/home
take "$HOME/.igloohome_ios_sdk_token"                    01_secrets/home
take "$HOME/.netrc"                                      01_secrets/home
take "$HOME/.gradle/gradle.properties"                   01_secrets/home/.gradle
take "$HOME/.config/gh"                                  01_secrets/home/.config
take "$HOME/.android/adbkey"                             01_secrets/home/.android
take "$HOME/.android/adbkey.pub"                         01_secrets/home/.android
take "$HOME/.android/debug.keystore"                     01_secrets/home/.android
take "$HOME/.claude.json"                                01_secrets/home
# SSH private keys: keep this subfolder ONLY if company policy allows an encrypted key backup.
# Otherwise delete 01_secrets/ssh before encrypting and create new keys after the wipe
# (docs/recovery/GIT_AND_GITHUB_RECOVERY.md has the steps). The public keys and config are harmless.
take "$HOME/.ssh"                                        01_secrets/ssh

# ---------------------------------------------------------------- 02 local-only docs, design exports, native blobs
for f in feature1.md feature-whole-ui-next.md properties_inventory_main_improvment.md \
         data-serialization-architecture.md ploting_mappping_and_auto_plot_UI.md \
         tour-app.html wayfinding-tour-app.html "Oct_27_Pynwheel Admin - Back Office.html" \
         pyn-connect-new.html pyn-connect-22-sep-new.html pyn-system-stack-proposal.html \
         toc.list .ruby-version; do
  take "$REPO/$f" 02_local_docs_and_design
done
take "$REPO/critical_issues_pictures"                    02_local_docs_and_design
take "$REPO/.claude/launch.json"                         02_local_docs_and_design/.claude
take "$REPO/pyn-tour-old/ios/Zerv_SDK_Library.framework" 02_local_docs_and_design/pyn-tour-old/ios
take "$REPO/artifacts"                                   02_local_docs_and_design   # built APKs (regenerable, kept as history)

# ---------------------------------------------------------------- 03 Claude Code state (memory, plans, transcripts)
mkdir -p "$DEST/03_claude_home"
rsync -a --exclude 'cache' --exclude 'paste-cache' --exclude 'downloads' --exclude 'shell-snapshots' \
      --exclude 'telemetry' --exclude 'file-history' --exclude '.DS_Store' \
      "$HOME/.claude/" "$DEST/03_claude_home/.claude/" && say "copied   ~/.claude (memory, plans, projects, settings) -> 03_claude_home/"

# ---------------------------------------------------------------- 04 dotfiles and IDE / app settings
for f in .zshrc .zshrc.backup .zshrc.pre-oh-my-zsh .zprofile .zlogin .zshenv .p10k.zsh .gitconfig \
         .bash_profile .bashrc .profile .mkshrc .yarnrc .irbrc .pryrc .gemrc .npmrc; do
  take "$HOME/$f" 04_dotfiles/home
done
mkdir -p "$DEST/04_dotfiles/oh-my-zsh-custom"
rsync -a --exclude '.git' "$HOME/.oh-my-zsh/custom/" "$DEST/04_dotfiles/oh-my-zsh-custom/" && say "copied   ~/.oh-my-zsh/custom (plugins, themes) -> 04_dotfiles/"
take "$HOME/Library/Preferences/com.googlecode.iterm2.plist"        04_dotfiles/iterm2
take "$HOME/Library/Preferences/com.google.android.studio.plist"    04_dotfiles/android-studio
take "$HOME/Library/Application Support/Google/AndroidStudio2026.2.1/options" 04_dotfiles/android-studio
# Cursor (the editor in use) and the leftover VS Code profile (VS Code itself is not installed today)
take "$HOME/Library/Application Support/Cursor/User/settings.json"  04_dotfiles/cursor
take "$HOME/Library/Application Support/Cursor/User/keybindings.json" 04_dotfiles/cursor
take "$HOME/Library/Application Support/Cursor/User/snippets"       04_dotfiles/cursor
take "$HOME/Library/Application Support/Cursor/User/mcp.json"       04_dotfiles/cursor
mkdir -p "$DEST/04_dotfiles/cursor" "$DEST/04_dotfiles/vscode"
"/Applications/Cursor.app/Contents/Resources/app/bin/cursor" --list-extensions --show-versions > "$DEST/04_dotfiles/cursor/extensions-installed.txt" 2>/dev/null && say "listed   Cursor extensions -> 04_dotfiles/cursor/extensions-installed.txt"
take "$HOME/Library/Application Support/Code/User/settings.json"    04_dotfiles/vscode
take "$HOME/Library/Application Support/Code/User/keybindings.json" 04_dotfiles/vscode
take "$HOME/Library/Application Support/Code/User/snippets"         04_dotfiles/vscode
take "$HOME/Library/Application Support/Code/User/mcp.json"         04_dotfiles/vscode
ls "$HOME/.vscode/extensions" 2>/dev/null | grep -v '^extensions.json$' | sed -E 's/-[0-9]+\.[0-9]+.*$//' | sort -u > "$DEST/04_dotfiles/vscode/extensions-previously-installed.txt" && say "listed   VS Code extensions (from ~/.vscode/extensions) -> 04_dotfiles/vscode/"
# Raycast: its data store is an encrypted SQLite file tied to the app; the supported backup is the in-app
# export (Raycast > Settings > Advanced > Export Settings & Data -> a .rayconfig file). Put that file in this
# folder by hand. The plist below keeps hotkeys/preferences only.
take "$HOME/Library/Preferences/com.raycast.macos.plist"            04_dotfiles/raycast
mkdir -p "$DEST/04_dotfiles/xcode"
rsync -a --exclude 'Previews' "$HOME/Library/Developer/Xcode/UserData/" "$DEST/04_dotfiles/xcode/UserData/" && say "copied   Xcode UserData (key bindings, settings, provisioning profiles) -> 04_dotfiles/xcode/"
take "$HOME/.android/avd"                                04_dotfiles/android-avd

# ---------------------------------------------------------------- 05 git bundles (independent of GitHub)
mkdir -p "$DEST/05_git_bundles"
( cd "$REPO" && git bundle create "$DEST/05_git_bundles/pynwheel-staging-all-refs.bundle" --all >/dev/null 2>&1 \
  && say "bundled  pynwheel-staging (every local branch, incl. the stash branch) -> 05_git_bundles/pynwheel-staging-all-refs.bundle" )
# Other repositories on this Mac: only what is NOT on their remotes (unpushed commits, uncommitted edits, untracked files)
for r in "$HOME/ezofficeinventory" "$HOME/zubair-portfolio" "$HOME/sample_pyn_wheel_map" "$HOME/OpenDocuments" \
         "$HOME/FatimaFoundationPortfolio" "$HOME/smartprep-ai" "$HOME/Jira_EZO_Integration" "$HOME/pyn-system" \
         "$HOME/aw-watcher-web" "$HOME/Zubair-zulifqar" "$HOME/Downloads/foodie"; do
  [ -d "$r/.git" ] || continue
  n="$(basename "$r")"; out="$DEST/05_git_bundles/$n"; mkdir -p "$out"
  if [ -z "$(git -C "$r" remote 2>/dev/null)" ]; then
    git -C "$r" bundle create "$out/$n-all-refs.bundle" --all >/dev/null 2>&1 && say "bundled  $n (no remote: every ref) -> 05_git_bundles/$n/"
  elif [ "$(git -C "$r" rev-list --all --not --remotes 2>/dev/null | wc -l | tr -d ' ')" != "0" ]; then
    git -C "$r" bundle create "$out/$n-unpushed-commits.bundle" --branches --not --remotes >/dev/null 2>&1 && say "bundled  $n (commits not on its remote) -> 05_git_bundles/$n/"
  else
    say "skipped  $n bundle (every commit is on its remote)"
  fi
  if ! git -C "$r" diff --quiet HEAD 2>/dev/null; then
    git -C "$r" diff --binary HEAD > "$out/$n-uncommitted.patch" 2>/dev/null && say "patched  $n uncommitted edits -> 05_git_bundles/$n/$n-uncommitted.patch"
  fi
  if [ -n "$(git -C "$r" ls-files --others --exclude-standard 2>/dev/null | head -1)" ]; then
    ( cd "$r" && git ls-files --others --exclude-standard -z | tar --null -T - -czf "$out/$n-untracked.tar.gz" 2>/dev/null ) && say "tarred   $n untracked files -> 05_git_bundles/$n/"
  fi
  git -C "$r" remote -v > "$out/remotes.txt" 2>/dev/null; git -C "$r" branch -avv > "$out/branches.txt" 2>/dev/null
done

# ---------------------------------------------------------------- 06 databases: instructions only, no dump is taken here
mkdir -p "$DEST/06_databases"
cat > "$DEST/06_databases/README.md" <<'EOT'
Local PostgreSQL databases were NOT dumped by collect_local_backup.sh (they are copies of the
production database and company policy decides whether they may leave the machine).
Run scripts/recovery/dump_local_databases.sh <this folder> if you are authorised to keep them;
otherwise recreate them after the wipe from a Heroku backup (docs/recovery/POST_WIPE_RECOVERY_GUIDE.md, step 6).
EOT
psql -At -d postgres -c "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database where not datistemplate order by 1" > "$DEST/06_databases/local-databases-before-wipe.txt" 2>/dev/null && say "listed   local PostgreSQL databases -> 06_databases/"

# ---------------------------------------------------------------- manifest + checksums
( cd "$DEST" && find . -type f -not -name 'MANIFEST.txt' -not -name 'SHA256SUMS' -print0 | xargs -0 ls -l | awk '{print $5"\t"$NF}' | sort -k2 > MANIFEST.txt \
  && find . -type f -not -name 'MANIFEST.txt' -not -name 'SHA256SUMS' -print0 | xargs -0 shasum -a 256 > SHA256SUMS )
say ""
say "== done: $(find "$DEST" -type f | wc -l | tr -d ' ') files, $(du -sh "$DEST" | cut -f1) in $DEST =="
say "next: scripts/recovery/encrypt_local_backup.sh \"$DEST\"   (then copy the .tar.gpg off this Mac)"
