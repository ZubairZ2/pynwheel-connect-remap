#!/bin/zsh
# Local testing only: this Mac has no Twilio credentials, so the Tour App's
# sign-in code is never sent. The SMS job waits in the local Sidekiq queue
# (no worker runs); this prints the code of the newest job, for one phone
# when given, and removes that job so nothing is ever sent later.
#   scripts/show_visitor_otp.sh            # newest code
#   scripts/show_visitor_otp.sh 3035550100 # the code for that number
want=$(echo "${1:-}" | tr -dc '0-9')
n=$(redis-cli llen queue:message)
for ((i=0; i<n; i++)); do
  job=$(redis-cli lindex queue:message $i)
  printf "%s" "$job" | python3 -c '
import sys, json, re
want = sys.argv[1]
j = json.loads(sys.stdin.read(), strict=False)
if j.get("class") != "TwilioSmsWorker": sys.exit(1)
to = re.sub(r"\D", "", j["args"][1]); body = j["args"][0]
if want and not to.endswith(want): sys.exit(1)
m = re.search(r"sign-in code is (\d{6})", body)
if not m: sys.exit(1)
print(f"phone +{to}  code {m.group(1)}")
' "$want" && { redis-cli lrem queue:message 1 "$job" >/dev/null; exit 0; }
done
echo "no sign-in code queued${want:+ for $want} (ask for a code in the app first)"; exit 1
