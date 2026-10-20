# Connect Locks: provider accounts on the real legacy integrations

Branch `feature/connect-locks-real-integrations` → `main`. Report: `LOCKS_PAGE_INTEGRATION_QA.md`.

## What changes

The Locks tab of Pynwheel Connect configures every lock provider the legacy CMS supports, with the legacy tabs'
real fields, on the same rows and rules:

- **Igloohome**: version `v1` / `igloohome` / `iglooworks` (one per community); API mode with home name and
  either OAuth client credentials or the code-grant status; Iglooworks API key + department; v1 locks typed in or
  imported from the legacy CSV.
- **Pynwheel Access (Zerv)**: username, password, facility ID 0–255, badge ID 0–65535, the ten card formats.
- **Dwelo**: API URL, Dwelo community ID, client ID and secret.
- **RemoteLock (EdgeState)**: client credentials, or the RemoteLock sign-in status with "Remove authorization".
- **Latch**: the building name, with the legacy default instructions and images.
- **Visitor instructions** (unit-door and amenity text plus images) for every vendor.

Secrets are write-only (blank keeps the stored value; the API only says whether one is stored). Saving appends the
vendor to `communities.multiple_locks_provider` as the legacy controllers do. Cards show access method, which app
opens the lock, and the health source from the CMS instead of fixed text.

The unconnected providers follow the design's "Connect a lock provider" grid (three columns, note, full-width
Connect), with the Dormakaba card opening an honest "not connected to the CMS yet" notice (no connector exists)
and the Launch-only vendors (Schlage, Yale, Other) as chips highlighted when the property has their rows.

The connected card follows the design too: an Igloo "Connection" select, Re-authorize when a token lapsed, and
Disconnect (typed confirmation) which deletes the vendor's imported locks and takes the vendor off the property
while keeping the account. The inventory has the "Delete all imported locks" footer and a "Last sync" column;
Issued codes have status filters and the recent-failures banner.

## Backend

New `Locks::Accounts` service and six write actions on `Connect::LocksController` (`locks/account`,
`locks/account/remove_authorization`, `locks/instructions`, `locks/instruction_image`, `locks/devices`,
`locks/import_csv`), all behind CSRF, the writes kill switch and `can_edit_map?`, each audited. `Locks::Inventory`
answers the account details, options, access facts and the new `supports` flags. `Locks::Vendors` counts Latch as
configured by its building name and Zerv by its login. No migration; no legacy controller, view, model or
service changed.

## Frontend

`lockAccounts.generator.ts` (pure form specs, validation, payloads), four dialogs in the Locks tab, the available
providers as Connect rows. Fixes: manual-code "Remove code" sent the old code; Auto-match showed the unmapped
count; "Pick a lock" did nothing; purge ignored `supports.purge`. vitest added to the Connect app (`npm test`).

## Tests

- Rails: `test/controllers/connect` + Tour App locks + upload URL — 79 runs, 583 assertions, 0 failures
  (new `lock_accounts_test.rb`, 10 runs).
- Connect: typecheck and lint clean; vitest 11/11.
- Browser on the development database: Hazel 1618 read; Escaya 818 (Alliance) account create for Zerv, Igloohome
  v1 and Latch, test connection, instructions, typed lock, duplicate refusal, mapping, Tour App resolution; then
  restored.

## Not in this PR

OAuth code-grant sign-ins (igloohome, RemoteLock) still complete on the legacy page; vendor-side checks for
Dwelo / EdgeState / Latch / Iglooworks need real credentials.
