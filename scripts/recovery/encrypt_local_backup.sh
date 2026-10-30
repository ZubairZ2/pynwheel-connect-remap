#!/usr/bin/env bash
# encrypt_local_backup.sh — turn the folder made by collect_local_backup.sh into ONE AES-256
# encrypted archive (<folder>.tar.gpg) with a passphrase you type. gpg is installed by Homebrew (gnupg).
# The archive is what leaves the Mac. Nothing is deleted.
#
#   usage: scripts/recovery/encrypt_local_backup.sh <backup-folder>
#   restore: gpg --decrypt <folder>.tar.gpg | tar -x -C <where>
set -euo pipefail
SRC="${1:?backup folder}"
[ -d "$SRC" ] || { echo "no such folder: $SRC" >&2; exit 1; }
OUT="${SRC%/}.tar.gpg"
echo "Encrypting $SRC -> $OUT (you will be asked for a passphrase twice; keep it in your password manager)"
tar -C "$(dirname "$SRC")" -cf - "$(basename "$SRC")" | gpg --symmetric --cipher-algo AES256 --output "$OUT"
echo "verifying the archive lists cleanly..."
gpg --decrypt "$OUT" 2>/dev/null | tar -t | wc -l | xargs printf 'entries in archive: %s\n'
shasum -a 256 "$OUT" | tee "$OUT.sha256"
echo "copy BOTH $OUT and $OUT.sha256 to the approved destination, then check the checksum there."
