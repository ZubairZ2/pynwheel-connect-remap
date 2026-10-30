#!/usr/bin/env bash
# dump_local_databases.sh — OPTIONAL. pg_dump the local PostgreSQL databases into the backup folder.
# Only run it if company policy allows copies of the (production-derived) data to leave the machine.
# Read-only on the databases. Needs free disk: the dumps are compressed but pynwheel_development is 11 GB.
#   usage: scripts/recovery/dump_local_databases.sh <backup-folder> [db ...]
set -euo pipefail
DEST="${1:?backup folder}/06_databases"; shift || true
DBS=("$@"); [ ${#DBS[@]} -gt 0 ] || DBS=(pynwheel_development pynwheel_audit_clone autoplot_dev)
mkdir -p "$DEST"
for db in "${DBS[@]}"; do
  echo "dumping $db ..."
  pg_dump -Fc -d "$db" -f "$DEST/$db.dump"
  ls -lh "$DEST/$db.dump"
done
echo "restore after the wipe:  createdb <name> && pg_restore --no-owner -d <name> <file>.dump"
