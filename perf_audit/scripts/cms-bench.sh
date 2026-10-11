#!/bin/bash
# Times every Connect JSON read the Map, Inventory and Unit Detail screens make,
# against the local CMS on :3100 (pynwheel_audit_clone, development mode), with the
# minted super-admin session. Reports: wall time (curl), raw and gzip bytes, and
# the Rails "Completed" line (total / views / ActiveRecord / query count) from the
# development log for that request. Each endpoint is hit twice (cold, warm).
S=${PERF_SCRATCH:?set PERF_SCRATCH to the folder holding session.json}
LOG=/Users/zubairzulifqar/pynwheel-staging/log/development.log
COOKIE=$(node -e 'console.log(require(process.argv[1]).rails_cookie)' $S/session.json)
BASE=http://127.0.0.1:3100
IDS=${IDS:-"8005 1412 1411 1618 4397 1105"}
printf "%-6s %-44s %-5s %9s %9s %8s %8s %8s %8s %6s\n" prop endpoint run raw_bytes gz_bytes curl_ms rails_ms views_ms db_ms sql
for id in $IDS; do
  for ep in "communities/$id/floorplates.json" "communities/$id/floorplans.json" "communities/$id/amenities.json" "communities/$id/units.json" "communities/$id/units.json?page=1&per_page=25" "automate_plotting.json?community_id=$id" "communities/$id/edit.json"; do
    for run in cold warm; do
      before=$(stat -f%z "$LOG")
      t0=$(python3 -c 'import time;print(int(time.time()*1000))')
      raw=$(curl -s -o /dev/null -w "%{size_download}" -H "Accept: application/json" -H "Cookie: $COOKIE" "$BASE/$ep")
      t1=$(python3 -c 'import time;print(int(time.time()*1000))')
      sleep 0.3
      gz=$(curl -s -o /dev/null -w "%{size_download}" -H "Accept: application/json" -H "Accept-Encoding: gzip" -H "Cookie: $COOKIE" "$BASE/$ep")
      sleep 0.3
      line=$(tail -c +$((before+1)) "$LOG" | grep -E "^Completed" | head -1)
      rails=$(echo "$line" | sed -nE 's/.*in ([0-9]+)ms.*/\1/p')
      views=$(echo "$line" | sed -nE 's/.*Views: ([0-9.]+)ms.*/\1/p')
      db=$(echo "$line" | sed -nE 's/.*ActiveRecord: ([0-9.]+)ms.*/\1/p')
      sql=$(tail -c +$((before+1)) "$LOG" | awk '/^Started GET/{n=0;s=1} s && /(SELECT|INSERT|UPDATE|DELETE|WITH) /{n++} /^Completed/{print n; exit}')
      printf "%-6s %-44s %-5s %9s %9s %8s %8s %8s %8s %6s\n" "$id" "$ep" "$run" "$raw" "$gz" "$((t1-t0))" "$rails" "$views" "$db" "$sql"
    done
  done
done
