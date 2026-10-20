# Connect Locks page: provider accounts on the real legacy integrations (October 20, 2026)

Branch `feature/connect-locks-real-integrations` (from `main` at `b60cccab`). Brief: the Locks page of Pynwheel
Connect must configure every lock integration the legacy CMS supports with its real fields and backend behaviour,
not placeholder forms. Design reference: the Oct 13 Back Office design (`Pynwheel Admin - Back Office.dc.html`;
the standalone export says lock providers, inventory, mapping and issued codes live under each property's
Tours → Locks, with a per-vendor card and a "Connect vendor" dialog). Functional reference: the legacy Locks page
`/communities/:id/dwelos/new` and its controllers, models and services.

## Executive summary

Before this work the Connect Locks tab already ran the inventory, mapping, manual codes, auto-match, sync, test
and purge flows on the real rows (PYN_CONNECT_PROGRESS.md §42). What it could not do was the account itself: the
provider cards punted to "Open in the CMS" for every credential, instruction and igloohome v1 lock, and two of
their facts ("Visitor gets", "Health data") were fixed i18n text.

Now every provider the legacy CMS supports has its own account dialog with the legacy tab's fields, validated the
way the legacy page and services need them, saved on the same rows (`igloohomes`, `zervs`, `dwelos`,
`edge_states`, `latches`) with the same "one account per community, append the vendor to
`communities.multiple_locks_provider`" rule. Visitor instructions (unit-door and amenity text plus the two
images) and the igloohome v1 lock entry (one at a time, or the legacy CSV) are on the page too. The card facts
now come from the CMS answer. The page is operational end to end on the development database: an account
created in Connect is read back by the legacy models exactly, and a lock mapped from the page resolves in the
Tour App API as a supported lock.

No schema change, no migration, no change to a legacy controller, view, model or service. Production was not
written to; the read-only production connection was not needed.

## Provider inventory (verified in the legacy code)

| Provider / mode | Legacy tab and rows | Real configuration fields | Service behind Test / Import | Visitor access | Tour App |
|---|---|---|---|---|---|
| Igloohome **v1** | Igloo tab, `igloohomes.version='v1'`; locks in `igloohome_locks` | none per property (Pynwheel's partner key `IGLOOHOME_API_KEY`); locks typed in (Device Name, Device ID) or imported from a CSV (header row; name, id) | no vendor API | Bluetooth guest key (90 min) + backup PIN | **supported** (Android plugin, SDK 3.5.0) |
| Igloohome **igloohome** (API v2) | Igloo tab, `version='igloohome'` | Home Name; OAuth Client Credentials (Client ID, Client Secret) **or** Authorization Code Grant (browser sign-in at auth.igloohome.co) | `IgloohomeLockService#get_properties` / `#get_property_devices`, upsert by `deviceId` | hourly algoPIN | **supported** |
| Igloohome **iglooworks** | Igloo tab, `version='iglooworks'` | API Key, Department ID | `IgloohomeIglooworksService#get_locks`, upsert by `lockId` | hourly PIN through the department | **supported** |
| Pynwheel Access / **Zerv** | Pynwheel Access tab, `zervs`; locks in `zerv_locks` | Username, Password, Facility ID (0–255), Badge ID (0–65535), Card Format (10 HID formats, `ApplicationHelper#cards_formats`) | `ZervServices::ImportLockService` (login + `/clientdevice`), `InsertZervLocksJob` | mobile key (Zerv SDK) | legacy app only |
| **Dwelo** | Dwelo tab, `dwelos`; locks in `remote_locks` (`dwelo_id`) | API URL (default `https://api.dwelo.com`), Dwelo Community ID, Client ID, Client Secret | `DweloDevicesHelper` (`/v3/oauth/access_token`, `/v4/integrations/pynwheel/devices`), `update_deivces_in_db` | remote unlock | legacy app only |
| **EdgeState** / RemoteLock | Edge State tab, `edge_states`; locks in `remote_locks` (`edge_state_id`) | OAuth Client Credentials (Client ID, Client Secret) **or** Authorization Code Grant (RemoteLock sign-in, `refresh_token`) | `RemoteLockService#get_all_deivces` / `#update_deivces_in_db` | keypad PIN | legacy app only |
| **Latch** | Latch tab, `latches`; locks in `latch_locks` | Building Name (`latch_property_name`); the OpenKit credentials are ENV, never the row's `client_id`/`client_secret` | `LatchOpenkit::LatchLocksService#test_connection`, `ImportLatchLocksWorker` | Latch digital key | legacy app only |
| Manual | no account; `lock_provider='Manual'` + `access_code` on the holder | code `[0-9#*]{1,10}` | — | code shown | not shown by the new app (pre-existing gap) |

Every account row also carries `lock_instruction_text` / `lock_image` (unit doors) and
`amenity_lock_instruction_text` / `amenity_lock_image` (amenities): rich text plus a base64 image through
`AvatarUploader`. Only the legacy Pynwheel Tour app displays them (`start_tour.community_locks_info`).

Found dead or unused in the legacy code (not reproduced): `RemoteLocksController`, `PynwheelAccessesController`,
`latches.client_id/client_secret/passwordless_*`, `igloohomes.username/password/email/file` (placeholders),
Schlage / Yale / Remote / Other rows written only by the Launch API.

## What was built

### Rails (Connect module only)

- `app/services/locks/accounts.rb` (new): `describe` (never a secret, only whether one is stored; image URLs
  through `Connect::UploadUrl`), `options` (card formats, Igloo versions, ranges), `save!` with per-vendor
  attribute builders and field errors, `remove_authorization!` (EdgeState: forget the token; Igloohome: forget
  the token and fall back to v1, as `remove_igloohome_auth_account` does), `instructions!`, `image!` (PNG/JPEG
  data URL, 5 MB), `add_device!` and `import_csv!` (the v1 CSV rules: header row, name then id, known ids
  skipped, nothing deleted). Latch gets the two bundled default images and the two default texts on first save,
  as `LatchAccountsController` does.
- `Connect::LocksController`: `account`, `remove_authorization`, `instructions`, `instruction_image`,
  `add_device`, `import_csv`, all write actions (CSRF, kill switch, `can_edit_map?`), one PaperTrail audit row
  each. Routes under `communities/:id/connect/locks/...`.
- `Locks::Inventory#providers`: `details`, `options`, `access` (`method`, `tour_app`, `legacy_app`) and four new
  `supports` flags (`account`, `instructions`, `add_device`, `remove_authorization`); takes `base_url` for the
  image URLs.
- `Locks::Vendors.account_state`: Latch is configured by `latch_property_name` (the legacy Test/Import need
  only that), Zerv by username + password (facility, badge and card format have defaults in the guest
  services); an igloohome code grant without a token is `needs_authorization`.
- `config/initializers/filter_parameter_logging.rb`: `client_secret`, `iglooworks_api_key`, `image`, `csv`
  added to the log filter.

### Connect (Next.js)

- `lockAccounts.generator.ts` (new, pure): the form of each vendor under the current draft (the Igloo version
  and auth mode change the sections), the draft from the stored account, the problems as `Locks::Accounts`
  would refuse them, the payload (blank secrets left out), the card's account summary, access and health labels,
  the rich-text-to-plain-text helpers.
- `useTourLocks.ts`: dialogs `account`, `removeAuth`, `instructions`, `devices`; actions for save, remove
  authorization, instructions, image upload (read as a data URL in the browser, uploaded on choice as the legacy
  page does), add device, pick and import CSV. Field errors from the CMS land under the field.
- `LocksTab.tsx`: the available providers are "Connect" rows; every card has Edit account / Visitor
  instructions / Add locks (v1) / Test / Sync / Remove authorization (code-grant modes) / Delete all imported
  locks (only when `supports.purge` and there are rows). The account dialog has Save and "Save and test" (Igloo
  excluded: its test needs a mode-specific account). Four quirks fixed: the manual-code "Remove code" button sent
  the old code; the Auto-match button showed the unmapped count as if it were a proposal count; "Pick a lock"
  was a no-op (it now filters the inventory to unmapped); purge ignored `supports.purge`.
- Gateway allow-list (`tour/[...path]/route.ts`) extended for the six new writes; types extended
  (`LockAccountDetails`, `LockProviderAccess`, `supports`).
- vitest added to the Connect app (`npm test`, `vitest.config.ts`); the Playwright e2e stays.

### The "Connect a lock provider" grid (October 20, later the same day)

The owner compared the page with the live design project (newer than any downloaded export): the unconnected
providers are a three-column card grid, each card a title, a one-line note and a full-width Connect button, with a
**Dormakaba · NEW** card and a footer "Connected through the Launch onboarding API only: Schlage, Yale, Other
vendors". Rebuilt as `generateConnectCards` / `.bo-lp` in `LocksTab`. Two honesty rules apply:

- **Dormakaba** has no account record, service or import in the CMS. Its Connect opens a notice saying so
  instead of a form; nothing is fabricated.
- **Schlage, Yale, Other** are rows only the Launch onboarding API writes (`Api::V2::SecureLocksController`).
  `Locks::Inventory#launch_only` reports each with `present` (the property has the row or the provider string),
  and the chip is highlighted when present (Hazel has an `other_locks` row). No account form exists for them.

### The connected card, inventory footer and issued-code filters (same day)

The design page (decompressed from the `(2)` export's pako bundle; the grid is in there, my first text search
missed it) also defines the connected card and the other sub-tabs. Aligned: the Igloo card's "Connection" select
(switching opens the account dialog with that version preselected; locks stay, as the legacy page keeps them),
"Re-authorize" when a code-grant token lapsed, and **Disconnect** with a typed DISCONNECT confirmation. Disconnect
is a real operation: `PUT locks/disconnect` runs `Locks::Purge` (the vendor's rows go, the stops they opened are
cleared) and removes the vendor from `multiple_locks_provider`; the account row stays and Connect reopens it
pre-filled. "Delete all imported locks" moved to the inventory footer; the inventory's column is "Last sync" (the
rows' `updated_at`); Issued codes gained the All / Issued / Failed / Expired / Revoked filters and the
"failed in the last 7 days" banner. The connect dialog's primary action is "Test & connect" where the vendor can
be tested. The design's connect fields for Dwelo, Latch and Zerv ("API key" + "Site ID") are the placeholders the
brief rules out; the real legacy fields stay.

### The v1 developer client (same day, owner's request)

A v1 account may carry the property's own igloohome developer client (`igloohomes.client_id` /
`client_secret`): with both set, `TourApi::Locks#developer_client?` asks that client's eKey endpoint for the
Bluetooth guest key instead of Pynwheel's partner key. The legacy v1 tab never showed these columns, so Hazel's
stored client was invisible in Connect. The v1 form now has a "Developer client (optional)" section (Client ID,
Client secret with blank-keeps, and a clear checkbox); `Locks::Accounts` enforces both-or-neither; the card's
"Visitor gets" names the key source (`access.source`: `developer_client` / `partner_key`). Verified on Hazel
through the API: source `developer_client`, client ID shown, secret reported only as present.

## Field-parity matrix

| Provider / mode | Legacy fields verified | New form complete | Validation | Persistence | Result |
|---|---|---|---|---|---|
| Igloo v1 | PASS (no credentials; Device Name + Device ID; CSV) | PASS (version select, v1 note, Add locks dialog) | PASS (required, duplicate id, CSV shape) | PASS (`igloohomes.version`, `igloohome_locks`) | PASS: browser on 818, Rails tests |
| Igloohome (API) | PASS (Home Name, auth radio, Client ID/Secret, Authorize link) | PASS (code grant shows status + legacy link; credentials fields otherwise) | PASS (required per mode; saving credentials ends the grant) | PASS | PASS: Rails tests; browser form reviewed on 1618 without saving |
| Iglooworks | PASS (API Key, Department ID) | PASS | PASS (both required) | PASS | PASS: Rails tests |
| Pynwheel Access / Zerv | PASS (5 fields, ranges, 10 card formats verbatim) | PASS | PASS (ranges client + server, format list) | PASS | PASS: browser on 818, legacy model read-back, Rails tests |
| Edge State / RemoteLock | PASS (client credentials; code grant on legacy page) | PASS (credentials; grant status; remove authorization) | PASS | PASS | PASS: Rails tests (browser create not exercised) |
| Dwelo | PASS (API URL, Community ID, Client ID/Secret) | PASS | PASS (URL format, defaults) | PASS | PASS: Rails tests (browser create not exercised) |
| Latch | PASS (Building Name; defaults) | PASS | PASS (required) | PASS (default texts + images) | PASS: browser on 818, Rails tests |

## Functional workflows

| Workflow | Result | Evidence |
|---|---|---|
| Account create / edit | PASS | 818: Zerv created (range error shown client-side first, no request), Latch created; 1618 cards read the stored Igloohome and Zerv rows; secrets masked (`password_present`, `client_secret_present`) |
| Connection test | PASS (honest) | 818 Zerv "Test connection" → live login refused → "Zerv refused the credentials."; v1 / missing account refused with `no_api` / `no_account` (tests) |
| Lock import / sync | PASS where an API exists | unchanged `Locks::Sync`; v1 import by device form and CSV (tests: 2 created, 1 existing, 2 blank rows skipped; empty and malformed CSV refused, nothing written) |
| Instructions and images | PASS | 818 Zerv texts saved and shown on the card; images through the uploader in tests (PNG accepted, text refused) |
| Manual codes | PASS | existing flow; "Remove code" fixed |
| Lock inventory | PASS | 818 showed the typed lock (All 1 / Unmapped 1), 1618 its 11 rows |
| Map / change / unmap | PASS | 818 Pool lock → Pool amenity; `amenities.lock_provider='Igloohome'`, `access_code='ESC-TEST-1'`, row `stop_type='Amenity'` |
| Auto-match | PASS | existing flow; button label fixed |
| Tour App stop metadata | PASS | `TourApi::Locks.describe` for the mapped Pool stop → `{provider: Igloohome, mode: v1, method: bluetooth, device_id: ESC-TEST-1, supported: true}` |
| Remove authorization | PASS | tests: EdgeState forgets the token; Igloohome forgets it and falls back to v1 (warned in the dialog) |

## Real properties tested

| Property | Provider setup found | What was done | Outcome |
|---|---|---|---|
| Hazel (1618, dev copy) | `igloohomes` 62 (v1, developer client credentials, home "pynwheel home", 5 locks, 5 mapped), `zervs` 71 (6 locks mapped, facility 255, badge 10001, HID Prox 26-bit H10301), `other_locks` 18 | page read; Igloohome, Zerv, instructions and Add locks dialogs opened; nothing saved | cards and dialogs show the stored values; igloohome section switches by version |
| Residences at Escaya (818, Alliance, dev copy) | no lock account (as production) | Zerv, Igloohome v1 and Latch accounts created; Zerv tested and given instructions; one v1 lock typed, duplicate refused, mapped to the Pool amenity | all passed; then removed through `Locks::Purge` and the models, `multiple_locks_provider` reset to `[]`, Pool cleared (PaperTrail rows: 3 × lock_account_created, lock_instructions, lock_device_added, lock_map) |
| Alliance 8005 | not in the development copy (company 198 has only 818 locally) | — | not testable locally |
| Dwelo / EdgeState / Latch / Iglooworks properties | rows exist locally (38 / 23 / 53 / 3 accounts) but their vendor credentials are not usable from this machine | account forms and services covered by Rails tests; no live vendor call | vendor-side verification blocked |

## Automated tests

| Command | Result |
|---|---|
| `RAILS_ENV=test DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_test DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES bundle exec rails test test/controllers/connect test/controllers/api/tour_app/v1/locks_test.rb test/serializers/connect/upload_url_test.rb` | 79 runs, 583 assertions, 0 failures (new `test/controllers/connect/lock_accounts_test.rb`: 10 runs) |
| `cd pyn-connect-web && npm run typecheck` | clean |
| `cd pyn-connect-web && npm run lint` | clean |
| `cd pyn-connect-web && npm test` (vitest) | 11 tests passed (`lockAccounts.generator.test.ts`) |
| Playwright `tests/e2e/tourModules.spec.ts` | not run (needs the e2e cookie env); it only asserts reads on the Locks tab and is unaffected |

The Rails test stubs `AvatarUploader` to file storage under `tmp/test_uploads` (the uploader stores on S3 outside
development).

## Legacy regression

- No legacy file changed. The legacy account controllers, views, `MapLocksJob`, `AssignLocksHelper` and the
  self-tour JSON are untouched.
- Read-back: `Community.find(818).zerv.as_json` after the Connect save →
  `{"id"=>257, "username"=>"escaya-selftour", "facility_id"=>"12", "badge_id"=>"4321", "card_format"=>"HID Prox 37-bit H10304"}`,
  `multiple_locks_provider=["Zerv"]`; `EdgeState.active_client_credential_edgestate` answers as before.
- Two Connect rules now match the legacy page better: Latch counted as configured only with `client_id`/`client_secret`
  (which the legacy form never sets) and Zerv required `facility_id`; both corrected.
- The Tour App locks suite (17 runs) is green; its contract did not change.

## Production safety

Mutations ran only against `pynwheel_development` (Rails on `:3000` with `DATABASE_URL=…/pynwheel_development`,
Next on `:3006`) and `pynwheel_test`. `pynwheel_prod` (the local copy) and the read-only production URL were not
touched. The one live vendor call was a Zerv portal login with made-up credentials from the Test button; no key,
PIN or import was requested from any vendor.

## Remaining issues

- OAuth code grants (igloohome, RemoteLock) still complete on the legacy page: the callback lands on the legacy
  `HomeController` and decides by referer and session. The dialogs show the grant status and say so.
- Vendor-side checks for Dwelo, EdgeState, Latch, Iglooworks and the igloohome API need real credentials; only
  the services' refusal paths were exercised.
- Browser coverage of the image upload and CSV file pickers is Rails-test only (the browser pane cannot feed a
  file input); the read-as-data-URL path is the same one the legacy page uses.
- Manual codes are still not surfaced by the new Tour App (pre-existing; `TourApi::Locks.describe`).
- Rich-text instructions are edited as plain text; HTML saved by the legacy editor is flattened when re-saved
  from Connect.
- A legacy data trap stays: an igloohome row with client credentials and `is_authorized_with_pynwheel=true` but
  no token (Hazel 62 is one) runs on the credentials; Connect reports it as client credentials, the legacy radio
  shows the grant.
- The Next dev server double-fetches `locks` on a fresh mount in development (React strict mode); one request in
  production builds.

## Files changed

- Rails: `app/services/locks/accounts.rb` (new), `app/services/locks/inventory.rb`, `app/services/locks/vendors.rb`,
  `app/controllers/connect/locks_controller.rb`, `config/routes.rb`, `config/initializers/filter_parameter_logging.rb`,
  `test/controllers/connect/lock_accounts_test.rb` (new).
- Connect: `src/core/utils/generator/tour/lockAccounts.generator.ts` (+ test, new), `tourLocks.generator.ts`,
  `src/core/hooks/tour/useTourLocks.ts`, `src/core/screens/properties/tour/LocksTab.tsx`,
  `src/core/models/data/tourModules.data.ts`, `src/app/api/properties/[propId]/tour/[...path]/route.ts`,
  `src/config/app/strings.ts`, `src/resources/i18n/index.ts`, `vitest.config.ts` (new), `package.json`.
- Docs: this report, `PYN_CONNECT_PROGRESS.md` §44, `TOUR_SETUP_MODULES_QA_17_oct.md`, `gaps_tour_setup_feature.md`,
  `tour-app-igloo-integration.md`, `tour-app-backend-api.md`, `.claude/launch.json` (`connect-locks-verify`).
