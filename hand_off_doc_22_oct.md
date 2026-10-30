# Hand-off: Pynwheel work from October 18 to October 22, 2026

Written October 22, 2026 (02:45 PKT) for a new Claude account picking up this repository. Everything below was
confirmed against git, GitHub and the files on disk at that moment. Earlier history (September 17 to October 17)
is already recorded in `PYN_CONNECT_PROGRESS.md` §1–§42, `context.md` §1–§37 and the memory notes listed in §9.

Repository: `/Users/zubairzulifqar/pynwheel-staging` (GitHub `ZubairZ2/pynwheel-connect-remap`, default branch `main`).
Owner: Zubair Zulfiqar (git author `ZubairZulfiqarZ2`, PRs opened as `ZubairZ2`).

---

## 1. Read this first: the state at hand-over

| Item | Value |
|---|---|
| Checked-out branch | `feature/self-tour-start-tour-experience` |
| HEAD | `7675a79e4` "Brief: the Self Tour App Start Tour experience (October 21, 2026)" |
| Pushed? | Yes, `origin/feature/self-tour-start-tour-experience` = `7675a79e4` |
| Open PR | [#38](https://github.com/ZubairZ2/pynwheel-connect-remap/pull/38) Self Tour App: the Start Tour experience on the live design (base `main`) |
| `main` | `4d0351a2d` (merge of PR #37), equal to `origin/main` |
| Worktrees | None left (`.claude/worktrees/` is empty); all work is in the main checkout |

Uncommitted in the checkout (all pre-existing, none produced by the October 18–22 work):

- `tour-app/ios/App/App.xcodeproj/project.pbxproj`, `tour-app/ios/App/App/Info.plist`, the untracked
  `project.xcworkspace/xcshareddata/swiftpm/` — the owner's own Xcode 27 changes (bundle id `com.pynwheel.SelfTourDev`,
  team ids, `ITSAppUsesNonExemptEncryption`, deployment target). Never revert or commit these without the owner.
- `app/.DS_Store` — noise.
- Untracked docs at the root: `PR_DESCRIPTION_igloohome_sdk3.md`, `PR_DESCRIPTION_tour_setup_modules.md`,
  `PR_DESCRIPTION_visitors_module.md` (PR texts, the owner's convention: untracked), `app_ui_redesign_17_oct.md` and
  `new_app_design_17_oct.md` (the October 17 briefs), `tour-app.html` and `wayfinding-tour-app.html` (Claude Design
  bundle exports), `db_compat_audit/` (October 7 audit evidence).

Nothing is in flight: no background server, no partially applied change. The next step is the owner's review and merge
of PR #38.

---

## 2. What landed on `main`, in order (October 18–21)

All five PRs were opened by the owner's `ZubairZ2` account from branches Claude pushed. Times are Pakistan time (+05:00).

### PR #33 — Platform QA pass over the October 14–17 work (merged Oct 20, 20:08)
Branch `improvements/platform-qa-fixes-2026-10-18` (started Oct 17 as `qa/final-platform-regression-2026-10-17`).
Report `FINAL_PLATFORM_QA_REPORT_2026-10-17.md` (§25 blockers, §29 resolution round, §30 booking-rule parity on
1,026 cases, §31 owner decision). Progress §43, context §38/§38a.

- Fixed the two critical defects of the Oct 14–17 work: every Connect Tour Setup guard was keyed on
  `request.format.json?` while routes keep `(.:format)` (any signed-in user could read other tenants' visitors through
  `.html`), and the redesigned Stop screen hid the door code once issued.
- 82 files; adds the index-only migration `20261018090000` (two `tour_histories` indexes, concurrent).
- **Owner decision Oct 18 (§31): the legacy HTML/ERB application stays as it is.** Every legacy-side fix was reverted
  before the merge; the branch touches the legacy side only through shared code (`SchedualTours::Capacity`, the
  `unknown_start` wayfinding message, the two indexes). The three pre-existing legacy 500s (photo-less elevators on
  1618/1411, visitor view on 1412) remain on `main` on purpose.
- Legacy views cannot render under the test environment (Sass `rgba` arity error only there); legacy pages are proven
  with the in-process Warden harness instead.

### PR #34 — igloohome SDK 3.5.0 Bluetooth plugin (merged Oct 20, 20:08, into the PR #33 branch)
Branch `feature/igloohome-sdk3-bluetooth-plugin`. Text `PR_DESCRIPTION_igloohome_sdk3.md`; doc
`tour-app-igloo-bluetooth.md` §11–§12.

- Backend: a v1 igloohome account that holds its own API client gets the Bluetooth guest key from the developer API's
  `POST /devices/:id/ekey` (scope `create-ekey-access`) instead of Pynwheel's partner key. Dates must be
  `YYYY-MM-DDTHH:mm:00+hh:mm`. No production v1 account holds client credentials, so production is unchanged.
  `guest_bluetooth_key` is filtered from logs.
- Hardware finding (owner's Smart Keybox 3E, Galaxy A02s): the developer eKey carries a **32-byte** AES key; the legacy
  `ble-sdk-release.aar` accepts 16 bytes only and reports "ran out of connection IDs". The Android plugin was rewritten in
  Kotlin (`IgloohomeBlePlugin.kt`) on `co.igloo.home:sdk:3.5.0`, which accepts both sizes. Same JavaScript contract; the
  SDK has no connect step (`unlock` connects and unlocks).
- SDK comes from igloohome's GitLab Maven registry; token lives in `~/.gradle/gradle.properties` as `iglooGitlabToken`
  (copy at `~/.igloohome_sdk_token`). Never commit it.
- Tests: `locks_test.rb` 17 runs green, tour-app vitest 78 green, debug APK built and installed.
- **Still unreported:** the hardware result with SDK 3.5.0 on the owner's keybox. iOS still uses the legacy
  `IgloohomeSDK.xcframework` (SDK 3.x iOS is `gitlab.com/igloohome/iglooaccess-ios-sdk.git` ≥ 3.5.0, Swift 6, target 15).

### PR #35 — Connect Locks: configure the real lock providers from the page (merged Oct 21, 01:13)
Branch `feature/connect-locks-real-integrations`. Report `LOCKS_PAGE_INTEGRATION_QA.md`. Progress §44.

- `Locks::Accounts` + six write actions on `Connect::LocksController` (account create/edit, remove authorization,
  instructions, instruction image, v1 devices, CSV import). Every legacy vendor account form (igloohome in its three
  versions, Pynwheel Access/Zerv, Dwelo, RemoteLock/EdgeState, Latch) on the same rows, one account per community.
  No migration; no legacy controller/view/model touched. Secrets are write-only.
- Frontend: `lockAccounts.generator` (form specs, validation, payloads), the dialogs, provider grid, connected card,
  inventory footer, issued-code filters. **vitest added to Connect** (`npm test` in `pyn-connect-web`).
- Added same day at the owner's request: the optional developer client on a v1 Igloo account.
- Verified on Hazel 1618 and Alliance 818 against `pynwheel_development`; Rails 79 runs / 583 assertions; vitest 11.
- Remaining (report §"Remaining issues"): igloohome/RemoteLock OAuth code grants still complete on the legacy page;
  vendor-side checks for Dwelo/EdgeState/Latch/Iglooworks need real credentials; manual codes are still not surfaced by
  the new Tour App; rich-text instructions are flattened to plain text when re-saved from Connect.

### PR #36 — Tour Setup › Settings on the October 20 design (merged Oct 21, 02:55)
Branch `feature/tour-settings-scheduling-booking`. Report `TOUR_SETTINGS_SCHEDULING_BOOKING_QA.md` (§9 remaining,
§10 Oct 21 parity follow-up). Progress §45/§45a, context §39.

- Owner decisions: additive columns + enforcement for the design's new controls (buffer, notice, horizon,
  `tour_closures`, `tour_settings.app_*`, button text colour/icon); real Tour App booking
  (`/api/tour/v1/properties/:id/booking/*`, `POST …/bookings`, `created_by` "Tour App"); a server-side slot check in the
  legacy widget submit (skipped for CRM-managed properties). CRM & sync is demo UI only.
- Every booking rule lives in `Bookings::Availability#day` (+ `SchedualTours::Capacity`); Connect, the Tour App and the
  legacy submit all read it. `stepping` is the widget's `end_time` (interval − 1); never fold the buffer into it.
  `tour_settings.show_desired_bedroom` / `show_desired_move_in_date` NULL = shown.
- Oct 21 follow-ups: per-card saves, number steppers, fixed phone preview, booking link built as the legacy page does
  (`HOST_URL` or the CMS host answering the request), one signing key for the property code (falls back to the app secret
  when `SECRET_KEY_BASE_v2` is unset locally), only the widget's actions skip sign-in, move-in date is a calendar.
- **Prerequisite still open:** `HOST_URL` is not set on the Heroku CMS (`pyn-system`); the Booking link stays empty there.

### PR #37 — Visitors module: every source, abandoned status, access codes, booking history, feedback, timeline (merged Oct 21, 04:40)
Branch `feature/complete-visitors-module`. Text `PR_DESCRIPTION_visitors_module.md`; report `VISITORS_MODULE_FULL_QA.md`
(§12 remaining); evidence `visitors_module_qa/evidence/`. Progress §46, context §40.

- `Visitors::Status` (abandoned as its own row status, counted under Completed as the design does; remote_tour = virtual;
  verified/lapsed ID check), `Visitors::Query`, `Visitors::Profile` (booking slot history from PaperTrail,
  `Visitors::Access` vendor rows matched by time, codes only for editors), `Visitors::Export`.
- Fix: `Visitors::Cancelled` read PaperTrail's serialized time column as nil, so cancelled rows showed "unscheduled".
- Six booking sources exercised end to end on the clone (widget, legacy walk-in, new Tour App, Connect, PERQ, Salesforce).
- **Production has the PaperTrail history, local dumps do not** (918k versions in prod vs 164 locally): Cancelled and
  reschedule history look empty locally except for Connect-made changes.
- Follow-up commit `7962ba8a0`: clicking the Visitors tab while a profile is open returns to the list.
- **Open product gap (gaps doc, Oct 21):** the new Tour App books but records no visit / stop / unlock rows and its
  igloohome codes have `tour_user_id` NULL, so its tours never appear as sessions in Connect › Visitors. It needs to post
  arrival / stops / end (legacy does it through `/api/v1/save_tour_history`) or new `Api::TourApp::V1` endpoints.

---

## 3. The open PR #38 and the two commits after it (October 21–22)

Branch `feature/self-tour-start-tour-experience` from `main` `4d0351a2d`. Brief `pynwheel_tour_app_screens.md`
(committed Oct 22 as `7675a79e4`); PR text `PR_DESCRIPTION_self_tour_start_tour.md`; report
`SELF_TOUR_START_EXPERIENCE_QA.md`. Docs: `tour-app-implementation.md` §22, `tour-app-backend-api.md` §20, context §41,
progress §47. Branch diff vs `main`: 57 files, +4661 / −434.

`8e1b3271f` (Oct 21) — the Start Tour experience on the live Claude Design:
- Build Your Tour: All floors, bigger map, locate + zoom, CMS thumbnails, unplotted stops named and left out of the route,
  building chips, honest "Available now" filter, backend route time as the estimate.
- Guided Navigation: replay icon, audio guide with real pause/resume (`services/audioGuide.ts`), secured-floor note on
  elevators with a lock vendor, "Rerouting…" for Avoid stairs.
- Stop screen rewritten on CMS inventory data (facts, generated "About this space", real floor plan, photos, the visitor's
  own camera shots, 360° links, published lease terms, move-in estimate from published figures only).
- Unlock: the design's shared frame with the four `Demo · Method` variants (`screens/UnlockPanel.tsx`). Real locks follow
  the backend's lock (PIN via igloohome API / Iglooworks, BLE via the plugin for v1, or an honest unsupported note).
  Remote and Gate exist on demo data only. The access method (`store/access.ts#accessMethodOf`) comes from the backend's
  `lock` only.
- Booking: Schedule asks the Booking Form's optional fields; Book a Live Tour uses the real agent-guided calendar and
  reports when the CMS moved an earlier booking (the CMS keeps one upcoming booking per visitor).
- Backend (additive): `GET …/stops` unit facts and `media`, `GET …/properties/{id}` `phone`/`email`, `POST …/tour-route`
  skips unplotted stops as `skipped` instead of refusing.
- Verified: tsc, vitest 103/103, `vite build`, Rails Tour App suite 95 runs / 0 failures, Android debug APK, headless
  Playwright on the audit clone (Hazel, John Demo, Jennifer Demo FP, Cypress Terra, Oeuvre, dummy). Not run: live vendor
  PIN issuance, Bluetooth hardware, iOS build.

`20f1fa120` (Oct 22, 02:24) — igloohome Bluetooth: ask the system to turn Bluetooth on from the app. The plugin gains
`enableBluetooth()` (Android `ACTION_REQUEST_ENABLE`; iOS answers the radio state; web false); the unlock flow requests the
permission, then asks to enable the radio; a refusal is `bluetooth_off` and the Unlock panel offers "Turn on Bluetooth".
13 files, tests updated (`iglooBle.test.ts`).

`7675a79e4` (Oct 22, 02:41) — the brief `pynwheel_tour_app_screens.md` committed to the branch.

Remaining work listed in the report (§"Remaining work"): live vendor checks need hardware or the owner's go-ahead to issue a
real PIN on Hazel 1604/1508; Cypress Terra 8005 has no graph on the clone; remote-unlock and gate integrations do not exist
in the backend; Report an issue has no endpoint; the 45-minute door-access window and check-in remain local simulations.

---

## 4. Owner actions still open (consolidated)

1. Review and merge PR #38.
2. Production deploy of everything merged since Oct 18, then run the index migration `20261018090000` on production.
3. Set `HOST_URL` on the Heroku CMS `pyn-system` so the booking link can be built.
4. Report the hardware result of the SDK 3.5.0 plugin on the owner's keybox (and whether the Oct 22 "Turn on Bluetooth" flow
   behaves on the A02s). The SDK adds about 10 MB and WAKE_LOCK / FOREGROUND_SERVICE / RECEIVE_BOOT_COMPLETED /
   ACCESS_NETWORK_STATE to the merged manifest; flagged, not yet acknowledged.
5. iOS: the plugin is not wired into `ios/App/CapApp-SPM/Package.swift`; `Info.plist` lacks
   `NSBluetoothAlwaysUsageDescription`; iOS is still on the legacy xcframework. Both files carry the owner's uncommitted
   changes, so wiring them needs the owner's go-ahead.
6. Product decision: make the new Tour App record visits (arrival / stops / end) so Visitors can show them (§2, PR #37 gap).
7. Product decision: Tour App auth admits Super Admins only; prospects cannot sign in.
8. Bluetooth hardware validation against a partner-enrolled lock remains impossible without a device.

---

## 5. Working rules that the owner has set (unchanged, restated for the new account)

- **Never push to `main`.** "Commit and push" means push the branch and open a PR.
- **No AI attribution** in commits or PRs (no Co-Authored-By trailers, no "Generated with" lines).
- **`gh` on this Mac is logged in as `ZubairZulfiqarZ2`, which cannot open PRs** on `ZubairZ2/pynwheel-connect-remap`
  (pull-only). Push the branch, save the PR text as `PR_DESCRIPTION_<topic>.md` at the repo root (untracked), and hand
  over `https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...<branch>?expand=1`. Always pass
  `--repo ZubairZ2/pynwheel-connect-remap`; `gh` otherwise guesses `Pynwheel/pynwheel-staging` from the folder name.
- **Legacy HTML CMS stays as it is** (Oct 18 decision). New behaviour goes under `Connect::` JSON controllers and
  `Api::TourApp::V1`; no legacy controller, view, model or callback changes; migrations only additive and agreed first.
- **Production database:** read-only through `~/.pynwheel_ro_url` (role `readonly-debug`), wrapped in
  `BEGIN READ ONLY … ROLLBACK`; run prod queries alone, never batched with other reads; when a classifier blocks, switch
  to manual mode and ask. Alliance in prod = company 198 → 818 Residences at Escaya and 8005 Cypress Terra.
- Real vendor calls (igloohome eKeys/PINs on Hazel's keyboxes) create real 90-minute guest keys on customer doors: never
  casually; the live tap must come from the owner.
- The session scratchpad is wiped when the Claude process dies: keep restore statements in the report, re-run evidence
  after a restart.

---

## 6. Environment and recipes that worked this week

**Databases (local Postgres, user `zubairzulifqar`):** `pynwheel_development` (dev copy; Alliance = 818 only, no 8005),
`pynwheel_audit_clone` (prod rows synced Oct 17 + test residue), `pynwheel_prod` (local prod copy), `pynwheel_test`.

**Rails runs from a login shell** with the rvm Ruby 3.3.5 env, `DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
LC_ALL=en_US.UTF-8`, plus `PYN_CONNECT_WRITES=on API_ACCESS=true` for Connect writes and the mobile API, and
`SECRET_KEY_BASE_v2=local-dev-only-widget-code HOST_URL=http://127.0.0.1:<port>` for widget / booking links. Tests:
`RAILS_ENV=test DATABASE_URL=…pynwheel_test`, run files separately with an alarm (a whole-directory run once hung 24 min
after a legacy flow enqueued `ScheduledTourMailerJob`; stub `ScheduledTourMailerJob.perform_async`).

**Launch entries in `.claude/launch.json` added since Oct 18** (use `preview_start {name}`; never run servers with Bash):

| Name | Port | Purpose |
|---|---|---|
| `connect-locks-verify` | 3006 | Next → Rails :3000 (LAN config, dev DB), Locks page |
| `rails-settings-dev` / `rails-settings-clone` | 3101 / 3102 | Rails on dev DB / clone with widget keys and `HOST_URL` |
| `connect-settings-verify` | 3007 | Next → :3102 |
| `tour-app-settings` | 3016 | Vite → :3102 |
| `rails-start-tour-clone` | 3104 | Rails on the clone for the Start Tour work |
| `tour-app-start-tour` | 3018 | Vite → :3104 (real API) |
| `tour-app-start-tour-dummy` | 3019 | Vite with `VITE_TOUR_DATA_SOURCE=dummy` |

Older ones still valid: `rails-cms` :3000, `rails-cms-lan` :3000 (0.0.0.0, for the phone), `connect-web` :3001,
`rails-cms-verify` :3100, `tour-app` :3012, `tour-app-igloo` :3013.

**Sign-in for headless checks:** mint a Devise session right before each Playwright run (a 1-hour-old one 401s); against a
server started from a different checkout the minted session fails, so use the form sign-in with a throwaway password set
by `rails runner` on clone Super admin 2181 (user 2050 is dev-only). Connect's `pyn_connect_rails_session` cookie is a
URL-encoded `name=value`; writes need the read's `Set-Cookie` plus `X-CSRF-Token` from the read meta. Tour App token:
inject into `CapacitorStorage.pynwheel_tour_session_v1`. Playwright runs from `pyn-connect-web/node_modules`
(`channel: 'chrome'`); start Vite as `./node_modules/.bin/vite` (an `npx vite` from a worktree installed a global vite).

**Browser pane traps:** `read_page` returns empty on the Connect app (use `find` + `form_input`); screenshots go stale while
`document.hidden` is true (verify through the DOM); the pane cannot feed a file input (image upload / CSV pickers are
Rails-test only). The live Claude Design file is readable once the owner signs in inside the pane: `javascript_tool` →
`POST /design/anthropic.omelette.api.v1alpha.OmeletteService/GetFile` with `{projectId, path}`; gzip+base64 the content
and pull it in ≤ 80k slices. The design export `(2)` stores sub-pages gzip-compressed inside `__bundler/manifest`;
decode before grepping.

**Android / phone:** the Mac's LAN address moves between networks (192.168.8.100 on Oct 19, 192.168.0.227 on Oct 20).
Before every APK build run `ipconfig getifaddr en0` and fix `tour-app/.env.production.local`. Build with
`VITE_DEMO_SCENARIOS=on`. Latest APK `artifacts/pynwheel-tour-igloo-sdk3-2026-10-20b.apk` (predates the Oct 22
Bluetooth-enable commit). USB debugging on the A02s is authorised; `adb logcat -s IgloohomeBle`.

**Test properties:** Hazel 1618 (igloohome `v1` on the clone → BLE panel; four keyboxes enrolled; Funnel-managed, so the
legacy CRM push raises locally), John Demo 1411, Jennifer Demo FP 1412 (SVG plate without vertical link), Oeuvre 229
(non-CRM, widget-live; use it for bookings; slots at :01/:16/:31/:46), Escaya 818 (no provider state, gated on the clone),
Cypress Terra 8005 (plates but no graph on the clone; not in the dev DB).

**Clone residue to know about (`pynwheel_audit_clone`):** user 2181 on a throwaway password (original hash lost);
visitors 16262–16268; bookings 25514, 25519–25525; Doorkeeper tokens for 2181 (3340 revoked); PaperTrail rows from the
QA writes; Hazel/John Demo carry the Oct 4–5 local Connect rows. Dev DB: booking 24153 (229), a Doorkeeper token for 1854.

---

## 7. Where to read more (file map)

| Topic | File |
|---|---|
| Running progress log | `PYN_CONNECT_PROGRESS.md` §43–§47 |
| Implementation knowledge | `context.md` §38–§41 |
| Gaps needing backend / product work | `gaps_tour_setup_feature.md` (Oct 18, 20, 21 updates) |
| Platform QA | `FINAL_PLATFORM_QA_REPORT_2026-10-17.md` |
| Locks page | `LOCKS_PAGE_INTEGRATION_QA.md` |
| Settings | `TOUR_SETTINGS_SCHEDULING_BOOKING_QA.md` |
| Visitors | `VISITORS_MODULE_FULL_QA.md`, `visitors_module_qa/evidence/` |
| Start Tour | `SELF_TOUR_START_EXPERIENCE_QA.md`, brief `pynwheel_tour_app_screens.md` |
| Bluetooth / igloohome | `tour-app-igloo-bluetooth.md` §11–§13, `tour-app-igloo-integration.md` |
| Tour App API contract | `tour-app-backend-api.md` (§20 latest) |
| Tour App internals | `tour-app-implementation.md` (§22 latest), `tour-app-design-refresh-report.md` |
| Briefs (Oct 17) | `app_ui_redesign_17_oct.md`, `new_app_design_17_oct.md` |

---

## 8. Sessions that did this work (Claude desktop app, old account)

If the old account's sidebar is still visible, these hold the full transcripts. If not, this document plus the reports
above are the record.

| Session | What it did |
|---|---|
| Pynwheel platform QA and production readiness | PR #33 (Oct 17–18) |
| Android build testing for Pynwheel | hardware runs, Oct 19–20 |
| Igloohome SDK3 Bluetooth plugin | PR #34, then Connect Locks PR #35 (Oct 20) |
| Pynwheel Connect settings implementation | PR #36 (Oct 20–21) |
| Visitors module implementation | PR #37 (Oct 21) |
| Cypress testing with tour app screens | PR #38 + the Oct 22 Bluetooth-enable commit |

---

## 9. Memory notes (Claude's persistent memory for this folder)

Location: `/Users/zubairzulifqar/.claude/projects/-Users-zubairzulifqar-pynwheel-staging/memory/` (index `MEMORY.md`).
It is keyed to this folder on this Mac, not to the account, so the new account should load it automatically. If it
does not, the notes written or updated since Oct 18 are these; their content is summarised in §2–§6 above:

- `final-platform-qa-oct-2026.md` — PR #33 findings, clone state, blockers, Oct 18 resolution round
- `scratchpad-lost-on-session-death.md` — the scratchpad is wiped on a crash
- `gh-account-cannot-open-prs.md` — gh is pull-only; PR_DESCRIPTION convention
- `igloo-bluetooth-plugin.md` — SDK facts, 32-byte key finding, SDK 3.5.0 rewrite, LAN trap, token location
- `connect-locks-accounts-oct-2026.md` — Locks::Accounts, legacy field facts, verify recipe
- `tour-settings-scheduling-booking-oct-2026.md` — booking engine location, design-export trap, test hang
- `visitors-module-oct-2026.md` — visitor data graph, prod-only PaperTrail history, six source recipes
- `self-tour-start-tour-oct-2026.md` — reading the live design, access-method rule, clone facts, Playwright recipe

Standing rules from earlier notes that still apply: `no-ai-attribution-in-git.md`, `never-push-to-main.md`,
`prod-ro-db-allowed-ask-on-block.md`, `auto-mode-batched-reads-denial.md`, `connect-json-branch-exception.md`,
`connect-local-verification-recipe.md`, `rails-tests-gitignored.md`.

Two small corrections to those notes, found while writing this: `connect-locks-accounts-oct-2026.md` says the Locks PR
was "not yet opened" and `self-tour-start-tour-oct-2026.md` says the Start Tour branch was "not pushed"; both are stale
(PR #35 merged Oct 21, PR #38 open and pushed).



