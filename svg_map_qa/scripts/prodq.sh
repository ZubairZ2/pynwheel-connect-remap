#!/bin/bash
# Runs one SQL file against the read-only production database.
# The connection URL is read from ~/.pynwheel_ro_url and is never echoed;
# any URL-looking text in the output is redacted as a safety net.
set -u
URL="$(tr -d '[:space:]' < "$HOME/.pynwheel_ro_url")"
psql "$URL" -X -q -v ON_ERROR_STOP=1 -P footer=off -A -F ' | ' -f "$1" 2>&1 \
  | sed -E 's#postgres(ql)?://[^[:space:]]+#<url redacted>#g'
