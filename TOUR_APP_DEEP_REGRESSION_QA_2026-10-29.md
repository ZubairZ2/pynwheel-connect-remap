# Tour App deep regression QA and Android delivery — October 29, 2026

Scope: every change merged to `main` since October 23, 2026 (commits `0ce40c075` … `bbc18f03c`), exercised on the connected
Samsung phone against a local Rails stack on the audit clone of the production database, with Cypress Terra (property 8005)
as the test property. Report sections: A change audit · B regression results · C Samsung device results · D external
integrations · E APK delivery · F remaining issues. Evidence files live in the session scratchpad
`/private/tmp/claude-501/-Users-zubairzulifqar-pynwheel-staging/57ca1526-1c02-4a58-b8bd-fe7effa44dde/scratchpad/` (`evidence/`, `qa/`).

## A. Change audit

**Repository state at the start:** branch `main` at `bbc18f03c` (PR #53 merged), clean tracked tree; untracked hand-off,
PR-description and design files only. Rails 7.2 CMS + `Api::TourApp::V1` (`/api/tour/v1`), Capacitor 8 app in `tour-app/`
(Vite + React 19, vitest), Android minSdk 24 / target 36, `applicationId com.pynwheel.tour` versionCode 1 versionName 1.0.

**Changes since October 23 (244 files, 20,012 insertions):**

| Commit(s) | Area | User flows affected |
|---|---|---|
| 0ce40c075 (Oct 24, PR #40) | OTP test phones in every environment | visitor sign-in with `PYN_TOUR_OTP_TEST_PHONES` |
| 8b88ed7bd … 60b32efeb (Oct 25, PR #41) | configuration version, publication record, property-zone bookings, grace window, resume revalidation, Connect Publish, widget theme | booking calendar, Start Tour timing, Publish |
| 5755cf274, 2e9bd4996 (Oct 25, PR #42) | Beans street/hallway detection, SVG-space networks, graph builder | map loading, route generation (SVG-only plates) |
| 7c679716d, 2de24262a, d095396a5 (Oct 25, PR #50) | igloohome iOS plugin on SDK 3.5.0 | iOS only (not testable here) |
| de629155f (Oct 27, PR #43) | OTP queued through TwilioSmsWorker like legacy; built-in reviewer phone +123456789 / 123456 | visitor sign-in, SMS delivery |
| b3fe0e59f (Oct 27, PR #44) | Tour Setup scheduler fixes (Connect) | Connect only; booking settings read by the app |
| 5d51514e3 … 00ad3f65a (Oct 28, PR #45) | real geolocation, server proximity verdict, strict radius gate, presence/departure, near-you | location permission, check-in, presence, property pick |
| aa5cd1240 (Oct 28, PR #46) | booked day = property calendar day | Schedule screen |
| b8353bf43 (Oct 28, PR #47) | check-in ID step follows the server | check-in |
| b2fdc7a53, 341b7b65d (Oct 28–29, PR #48) | CheckpointID DVS through Rails, card on file (Stripe token), check-in waits for both; `credit_card_required` defaults to false on new rows | ID verification, card, check-in |
| d697e62a6 … ac6f6d768 (Oct 28–29, PRs #49, #51, #52) | property clone script, shared upload folders (`file_source_id`, `SharedSourceStorage`) | CMS/rake only; uploader store_dir on every model |
| 375b0a2bb (Oct 29, PR #53) | no dark ring on a unit plotted on a floor SVG polygon | Connect Map & Plotting |

Android-specific changes: `CAMERA`, `ACCESS_FINE/COARSE_LOCATION` permissions added, background location and
`POST_NOTIFICATIONS` removed from the igloohome SDK manifests, `@capacitor/geolocation` added, `allowMixedContent` only for an
`http://` API.

**Files modified by this QA task (uncommitted):**
- `test/controllers/api/tour_app/v1/maps_test.rb` — two expectations updated to the October 25 SVG-plate contract (see B).
- `.claude/launch.json` — three launch entries added (`dvs-fake-qa`, `rails-qa-phone`, `tour-app-qa-phone`).
- `tour-app/.env.production.local` (git-ignored) — now `VITE_TOUR_API_URL=http://192.168.0.106:3108` (was `…:3020`; backup in the scratchpad).
- `db/schema.rb` unchanged (the dev-DB migration's dump was reverted).

## Environment used for the QA

| Item | Value |
|---|---|
| Backend | Local Rails 7.2 (`rails-qa-phone`, port 3108, bound to the LAN) on **`pynwheel_audit_clone`** (a copy of the production database restored for audits; never the live DB). Flags `PYN_TOUR_VISITS/VISITOR_AUTH/LOCATION_REQUIRED/PRESENCE=on`, `PYN_TOUR_OTP_DEBUG=on` (the code is shown on screen, no SMS), `LAUNCHY_DRY_RUN` (mail to `tmp/letter_opener`). |
| CheckpointID | Rails pointed at a local fake DVS (`:3198`, answers chosen per test) with a `real` mode that forwards to `dvs.checkpointid.com` with the key from `credentails.md`. The key never left the Mac; it is not in the APK, the launch config, or this report. |
| Twilio | Credentials from `credentails.md` were tested read-only and with Twilio's magic test number only (nothing deliverable). See D. |
| Stripe | No keys (as stated in the task). `Verification::Card.configured?` is false → the server answers `card_unavailable`. |
| Test property | **Cypress Terra 8005** (company Alliance), plus its clones 8045 (same spot) and 8047 (moved 2 km north). Changes made on the clone for the QA (originals saved in the scratchpad `qa/audit_clone_originals_8005.json`): coordinates → the phone's fix (31.479343, 74.292685, Johar Town), leasing e-mail → `qa-leasing-8005@example.test`, **Knock push switched off** (`crm_credentials.knock_community_id` NULL; the clone carries the production Knock ids and `Bookings::Create` / `TourHistory` push to Knock synchronously), two QA amenities + eight tour stops on tour 5926, the tour's start point (`tours.x_plot/y_plot/starting_floor`), `credit_card_required` toggled during the tests and left `true`. RealPage pushes only reach Sidekiq queues (no worker runs here). |
| Test visitors | Device: +13035557002 "QA Phone" (tour_user 16273). API matrix: +13035557101…7104 and one random +1303555xxxx per run. OTP codes came from the server's debug answer. |
| Side effects possible | Mail → letter_opener files only; SMS → `queue:message` in Redis, never sent; CRM → Knock off, RealPage jobs queued only; visits/bookings written to the clone only. |
| Phone | Samsung **SM-A025F (Galaxy A02s)**, Android **12**, API **31**, security patch 2024-08-01, WebView Chrome 155.0.8059.43, Wi-Fi 192.168.0.105 (same network as the Mac 192.168.0.106), USB-debugging authorised, `adb devices` state `device`. Pattern lock (the owner unlocked it); GPS, camera and BLE present. |

## B. Regression results

Legend: **PASS/FAIL/BLOCKED/NOT RUN**; "API" = scripted against the QA server with simulated coordinates (`scratchpad/qa/api_matrix.py`,
results in `qa/api_matrix_results.md` + `qa/api_matrix_fix_results.json`); "device" = on the Samsung phone with its real GPS/camera.

### B.1 Automated suites

| Suite | Command | Result |
|---|---|---|
| Rails, in-scope (API controllers, visits, verification, tour_api, wayfinding, Connect booking/tour, widget, property clone, uploaders) | `RAILS_ENV=test bundle exec rails test test/controllers/api/tour_app test/services/{visits,verification,tour_api,wayfinding,property_clone} test/controllers/connect/{booking,tour}_controller_test.rb test/controllers/schedular_widget/widget_controller_test.rb test/uploaders test/integration/property_clone_access_test.rb` | first run **183 runs, 2 failures** (maps_test); after the fix and the background feature: **249 runs, 2,714 assertions, 0 failures** |
| tour-app typecheck | `npm run typecheck` | PASS (before and after the change) |
| tour-app unit tests (vitest) | `npx vitest run` | **25 files, 180 tests PASS** before; **183 tests PASS** after (3 new `backgroundPlacement` tests) |

**Regression found and fixed (test-side):** `maps_test.rb` asserted the pre-October-25 contract (an SVG-only plate "has no raster frame"; a plate
with an SVG but no image counted as raster). Commit 5755cf274 (Beans street networks) frames an SVG-only plate by its viewBox and routes SVG-space
rows only — by design (`graph_builder_svg_level_test.rb`). The two expectations were updated; the graph builder is unchanged. A read-only check
on production found **0** plates with an SVG, no image and a raster frame, so the new heuristic strands no real property.

### B.2 Visitor sign-in (OTP)

| ID | Scenario | Where | Result | Evidence |
|---|---|---|---|---|
| A1 | request a code | API + device | PASS | 202 `sent`, debug code shown on the phone's code step ("Test server · your code is …") |
| A2 | wrong code | API | PASS | 401 `invalid_code` |
| A3 | right code, new phone, no profile | API | PASS | 422 `profile_required`, code not consumed |
| A4 | right code + profile | API + device | PASS | 200 token, capabilities `visits/visitor_auth/location_required/presence` all true; device reached "Does everything look good?" then Home |
| A5 | second request inside 60 s | API | PASS | 429 `rate_limit_exceeded`, retry_after 60 (Rack::Attack per phone); the app shows "ask for a new code in 58 s" |
| A6 | garbage bearer | API | PASS | 401 |
| A7 | replay a consumed code | API | PASS | 401 `invalid_code` |
| A8 | `/visitor/me` | API | PASS | 200 visitor + bookings |
| A9 | 10 OTPs per IP per hour | API | PASS (observed) | 429 hit the first matrix run from 127.0.0.1 |
| A10 | built-in reviewer phone +123456789 / 123456 | — | NOT RUN (code read, not exercised) |

### B.3 Near-you and property pick

| ID | Scenario | Where | Result | Evidence |
|---|---|---|---|---|
| N1 | `?near=lat,lng&radius_km=5` | API | PASS | 8005 and 8045 at 0 m, 8047 at 1,998 m, 2204 at 3,376 m, nearest first |
| N2 | malformed `near` | API | PASS | 422 |
| N3 | radius 0.5 km | API | PASS | the 2 km clone excluded |
| N4 | two properties at the same spot (8005/8045) | API | PASS | both listed; the app never auto-selects (manual pick, by design) |
| N5 | property pick on the device | device | PASS | Properties list → Cypress Terra → property screen; `Cypress Terra [SCRIPT TESTING 2]` picked via Search for the outside test |

### B.4 Location permission and GPS (device, real sensors unless noted)

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| L-D1 | first ask → Android prompt → "While using the app" (precise) | PASS | `ACCESS_FINE_LOCATION granted=true`, app line changed from "Location not turned on" to a fix; `getCurrentPosition` from the WebView: 31.4791992, 74.2924282, accuracy 93 m, fresh timestamp (`phone_05_location_prompt.png`) |
| L-D2 | permission revoked (`pm revoke`) → relaunch | PASS | Home shows "Location not turned on · Turn on"; the ask sheet reappears |
| L-D3 | "Don't allow" on the system prompt | PASS | Home shows "Location is off · Fix"; sheet "Location is turned off … choose While Using the App" with Open Settings (`phone_23_location_denied.png`) |
| L-D4 | permanently denied (`USER_FIXED`) | PASS | same copy (denied_forever); no in-person check-in possible |
| L-D5 | re-grant + relaunch | PASS | the line recovers ("0.3 mi from Cypress Terra") |
| L-D6 | Location Services off (`location_mode 0`), Refresh Location | **PASS with a finding** | Google's "Location Accuracy" resolution dialog appeared; the app settled on "~ Near 11305 Grant Rd · Approximate" (timeout/poor-accuracy copy) instead of the services-off sheet (`phone_21_location_services_off.png`). No tour was authorised. Setting restored to 3. |
| L-D7 | check-in with the real fix at the property (card gate off) | PASS | `POST /visits` → 201, server verdict **verified**, fix 31.47928, 74.29262, accuracy 49 m, `tour_site onsite`, booking 25528 linked (`tour_histories` 22687) |
| L-D8 | check-in from 2 km away (clone 8047 moved 2 km north, booking 25531, real fix) | PASS | server 422 `outside_property`; the sheet reads "Start your tour once you arrive · You're about 1.2 mi from Cypress Terra [SCRIPT TESTING 2]" with Try Again / Take a Virtual Tour / Refresh location / Call leasing / Reschedule / Cancel; no visit row created (`phone_25_outside_property.png`) |
| L-D9 | background (HOME) then relaunch | PASS | same process, state intact |
| L-D10 | force-stop then cold start | PASS | session, booking and the checked-in state restored; no crash in logcat |
| L-D11 | server unreachable while loading a property | PASS | "The property could not be loaded · You seem to be offline · Try again / Choose another property"; recovered once the server was back |

### B.5 Proximity rules (API, simulated coordinates; property at P = 31.479343, 74.292685)

| ID | Fix (distance, accuracy) | Expected | Result |
|---|---|---|---|
| L1 | none | 422 `location_unverified` / `unverified_no_fix` | PASS |
| L2 | at P, 15 m | 201 verified | PASS |
| L3 | 2,000 m, 20 m | 422 `outside_property` (distance 1,998) | PASS |
| L4 | 500 m, 800 m | 422 `unverified_poor_accuracy` | PASS |
| L5 | 950 m, 100 m | verified (centre inside) | PASS |
| L6 | 1,050 m, 100 m | outside | PASS |
| L7 | 990 m, 20 m | verified | PASS |
| L8 | 1,005 m, 20 m | outside | PASS |
| L9 | 900 m, 300 m (circle straddles, coarse) | `unverified_poor_accuracy` | PASS |
| L10 | 1,400 m, 300 m (whole circle outside) | outside | PASS |
| L11/L12 | latitude "abc" / negative accuracy | 422 validation | PASS |
| L13 | virtual tour, no fix | 201 `tour_site offsite`, no gate | PASS |
| L14 | same `client_visit_id` twice (double tap) | 201 then 200, same visit | PASS |
| L15 | new check-in while a visit is open, even from outside | 200 reuse, never refused | PASS |
| Q1 | property without coordinates | 422 `unverified_no_property_coords` | PASS |
| — | missing location never authorises a physical tour | the four `unverified_*` states all refuse while `PYN_TOUR_LOCATION_REQUIRED=on`; with it off they are recorded, `outside` still refuses | PASS (code + L1/L4/L9/Q1) |

### B.6 Presence during a visit (API)

P1 on_site → P2/P4 leaving (2 far fixes) → P8 **departed** after ≥5 min and one departure e-mail (letter_opener +1) → P9 away (no second mail)
→ P10 returned → P13 the visit shows `presence {state on_site, departed_at, returned_at}`: all PASS. Duplicate event id → `duplicate`; 900 m
accuracy → `unverified`; 20-minute-old fix → `ignored`; event without lat → 207 with that event rejected (per-event validation, by design).
On the device the presence samples flowed during the real tour (`last_fix_distance_m 1`, state on_site).

### B.7 ID verification (CheckpointID through Rails)

| ID | Scenario | Where | Result | Evidence |
|---|---|---|---|---|
| V1 | status before any attempt | API | PASS | required, state `never`, 5 attempts, card needed, provider available |
| V2 | check-in before verification | API + device | PASS | 422 `verification_required`; the device opened the Verify flow from Start Tour |
| V3–V5 | bad document type / missing selfie / non-base64 | API | PASS | 422 validation |
| V6 | no token | API | PASS | 401 |
| V7 | provider 500 / HTML / 401-key | API | PASS | 503 `provider_unavailable`, attempts not consumed |
| V9 | provider `ValidationError` | API + device | PASS | `face_mismatch`, state stays never, 4 attempts left, leasing mail job queued once (`notified: true` in the audit row); device screen "We couldn't match your selfie to your ID · 4 attempts left" (`phone_09_idv_result_facefail.png`) |
| V10–V13 | MRZ error / other code / no face result / antiSpoofing 60 | API | PASS | `document_unreadable` / `rejected` / `rejected` / `face_mismatch` |
| V14 | 6th attempt in the hour | API | PASS | 422 `attempt_limit`, never verified |
| V16/V18 | visitor row written by the server only | API (DB) | PASS | `is_checkpoint_verified` false after failures; `t | check_point_id` after a pass |
| V17 | provider passes | API + device | PASS | state verified, valid 30 days; on the device the camera flow (front, back, selfie) → "Verifying your ID…" → the card step; DB row for 16273 set by Rails (`phone_10_idv_pass_card.png`) |
| V19 | attempt while verified | API | PASS | `already_verified`, provider not called |
| V20 | reading another visitor's status | API | PASS | own status only |
| V-D1 | camera permission prompt + live preview | device | PASS | CAMERA granted on the prompt; `<video>` 1080×1920 for the back and front cameras |
| V-D2 | app refresh observes the server status | device | PASS | Home pill "Verified" after the pass; after a restart still verified |
| V-D3 | client cannot mark itself verified | code + API | PASS | only `Verification::Attempt` writes the row; a replayed result has no endpoint |
| V-R1 | **real** DVS, synthetic pictures (no real document) | API via proxy | **PARTIAL** | two calls (PNG, then JPEG) answered HTTP 500 with an empty body → Rails 503 `provider_unavailable`. The key was not rejected (a 401/403 is a distinct branch), but no verification result was obtained. A real document was deliberately not submitted. |
| V-D4 | cancel mid-flow / interruption | device | PASS | Back from the card step keeps the verified state; force-stop + relaunch keeps it |

### B.8 Card on file (Stripe keys absent)

| ID | Scenario | Where | Result |
|---|---|---|---|
| C1 | verified visitor, card required, none on file → check-in | API + device | PASS: 422 `card_required`; the device went from "Start In-Person Tour" straight to the card step (`phone_13_checkin_card_required.png`) |
| C2 | raw card number as token | API | PASS: 422 validation (only `tok_…` accepted; the PAN never reaches Stripe code) |
| C3 | well-formed token, no keys | API + device | PASS: 503 `card_unavailable`; device copy "Card collection is not available right now … card service is not configured on the server" |
| C4 | card before ID verified | API | PASS: refused (`card_not_required`/503), never saved |
| C5/C6 | property stops asking (`credit_card_required=false`) | API + device | PASS: `card.needed false`; check-in 201 verified — an optional card never blocks |
| C7 | card UI validation, loading, Stripe Element | device | NOT RUN: Stripe.js is only loaded when the server advertises a publishable key; with no keys the step shows the unavailable state. UI tests with a mocked key were not added (they would not prove provider acceptance). |
| C8 | no PAN/CVC in logs/storage | code | PASS: the app never holds card data (Stripe Element iframe → token); Rails `filter_parameter_logging` + no card fields in the API |

### B.9 Booking, check-in window, tour, completion

| ID | Scenario | Where | Result |
|---|---|---|---|
| B1 | availability in the property zone (America/Chicago) | API + device | PASS: days start on the property's today; past slots hidden (first slot 10:30 at 10:23 CDT) |
| B2 | book a slot | API + device | PASS: 201; device booking 25528 (Oct 29 10:45, self_tour, created_by "Tour App"); two confirmation mails in letter_opener, SMS job queued |
| B3 | list bookings | API | PASS |
| B4 | check-in naming the booking inside the grace window | API + device | PASS: linked (`booking_id` on the visit) |
| B5/B6 | cancel upcoming / cancel completed | API | PASS: 200 / 422 `completed` |
| B-D1 | early sheet ("Check-in opens 10 minutes before") | device | PASS |
| B-D2 | Start Tour appears at T−10 min, "Ready for Cypress Terra" sheet with virtual / running-late / reschedule options | device | PASS |
| T1 | Before You Start → I'm at Main Entrance → Build Your Tour (8 stops) → Let's go! | device | PASS after adding the tour start point (see C) |
| T2 | route calculation through 8 stops (2 amenities + 6 units, floor 1) | API + device | PASS: 6,197 px, Play Route animation on the floor plan (`phone_17_play_route.png`) |
| T3 | arrive at 7 stops, skip one with a reason | device | PASS: `visited_stops` 7 × arrived + 1 × skipped `{"reason":"find"}` |
| T4 | finish at the start, summary, survey | device | PASS: visit ended `completed`, booking `is_tour_completed=true`, audit rows `visit_started/visit_ended`; Home card "LAST TOUR · Completed" |
| T5 | distances in px (no `scale_ft_per_px` on the plates) | device | PASS (as the backend reports) |
| T6 | Find Shortest Path, floor pills 1/2/3 | device | PASS |

### B.10 Map rendering — Beans two-layer property (new work in this task)

Before: the phone showed only the per-floor `*_noBG.svg` (unit plotting) for Cypress Terra. After the change the API lists
`background.svg_path` for `is_beans_svg` properties and serves `GET /properties/8005/map/background/svg` (380 KB, viewBox `0 0 1412 932`,
ETag/304), and the app draws it under the floor document on every floor (`<image data-plan="background">` 1412×932 under `data-plan="svg"`
on floors 1, 2 and 3; `phone_20_map_background.png`). Non-Beans properties get `background: null` and nothing changes for them.

**Script-made clones.** The older clone 8045 (`[SCRIPT TESTING]`) and a fresh clone 8048 (`[SCRIPT TESTING 3]`, `rake property_clone:execute[8005]`
on the audit clone, 2,291 rows, files shared through `file_source_id`, verifier 14/14 PASS, 8 stops / 2 amenities / tour start copied) both list the
background, serve it and their three floor files from the source's S3 folders (`uploads/floorplate/svg_image/460x`, `uploads/community/background_svg_image/8005`),
and show both layers on the phone on every floor (`phone_26_clone_8048_map.png`). A tour-route through the clone's stops resolves (6,197 px, 9 legs). **End-to-end on the clone from the phone:** booking 25532 (11:30) → Start Tour → check-in
**verified** with the real fix (visit 22697, `tour_site onsite`, booking linked) → Before You Start → Let's go! → route playback on the two-layer map
(`phone_27_clone_8048_route.png`) → 8 arrivals → finish: visit `completed`, booking `is_tour_completed=true`. The clone's start point is named "Tour start"
(the cloned tour has no name), so the finish button reads "I'm Back at Tour start".

## C. Samsung physical-device results

| Item | Value |
|---|---|
| Device | Samsung SM-A025F (Galaxy A02s), Android 12, API 31, WebView Chrome 155 |
| ADB | detected as `device` (authorised, online); `adb install -r` succeeded three times (USB-bridged build, LAN build, LAN build with the background layer) |
| Package | `com.pynwheel.tour`, versionCode 1, versionName 1.0, minSdk 24, targetSdk 36, debug-signed |
| Launch | clean start every time; no `AndroidRuntime` fatal, no WebView error in logcat; only a Samsung Wi-Fi category lookup warning unrelated to the app |
| Permissions | INTERNET, CAMERA, ACCESS_FINE/COARSE_LOCATION, BLUETOOTH_SCAN/CONNECT (igloohome); no background location, no notifications. Location and camera were granted through the real Android prompts; revoke/deny/re-grant exercised (B.4). |
| Smoke test (final APK, SHA below) | onboarding → phone sign-in (debug code) → profile → Properties → Cypress Terra → schedule → Home card → location prompt → Verify (camera ×3 → fake provider) → card step → Start Tour → check-in verified by the server with the real fix → Before You Start → Build Your Tour → route playback → 8 stops → finish → summary → Find Shortest Path with the two-layer map. Backgrounding, cold restart and the offline screen also exercised. |
| Location outcomes | B.4 (L-D1…L-D11). Real fixes seen: 31.479199/74.292428 ±93 m (WebView), 31.47928/74.29262 ±49 m (check-in), ~1 m from the configured property point during the tour. |
| CheckpointID | fake provider: failure and pass paths on the device; real provider: 500 on synthetic pictures (API only). |
| Twilio | not exercisable (invalid credentials); the OTP code reached the phone through the debug answer. |
| Card | required-card refusal and the "not configured" state shown on the device; no Stripe. |
| Runtime errors | none in the app; the only server-side error was the legacy mailer's blank From (dev-only, see F). |
| Not completed on the device | igloohome Bluetooth unlock (no lock on the QA stops); AR; real SMS; real Stripe; a real ID document. |

Evidence screenshots (scratchpad `evidence/`): `phone_01_launch`, `phone_02_property`, `phone_03_booked`, `phone_04_home_booked`,
`phone_05_location_prompt`, `phone_06_verify_intro`, `phone_08_capture`, `phone_09_idv_result_facefail`, `phone_10_idv_pass_card`,
`phone_11_tour_details`, `phone_12_checkin_sheet`, `phone_13_checkin_card_required`, `phone_14_checked_in`, `phone_15_tour_overview`,
`phone_16_route`, `phone_17_play_route`, `phone_18_arrived_stop1`, `phone_19_tour_done`, `phone_20_map_background`,
`phone_21_location_services_off`, `phone_23_location_denied`, `phone_25_outside_property`.

## D. External integration limitations

| Provider | How it was exercised | Status |
|---|---|---|
| CheckpointID DVS | Rails → local fake DVS for every outcome (pass, face/MRZ/other errors, no face result, 500, HTML, bad key, hang not run); **two real calls** to `dvs.checkpointid.com` with synthetic pictures through the proxy → HTTP 500 empty body → Rails 503. The key in `credentails.md` is a DVS `sk_` key (the `Bearer` prefix must be stripped for `CHECKPOINT_DVS_API_KEY`); `check_point_domain_id` belongs to the hosted-onboarding API Rails does not use. | real sandbox: PARTIAL (reachable, not rejected, no result on synthetic input); mocks: full |
| Twilio | account lookup (`GET /Accounts/{sid}`) and `TwilioSmsWorker` inline against the magic number +15005550001: **20003 "Authentication Error – invalid username"**. The SID in the file is 36 characters and contains a non-hex letter (a valid SID is `AC` + 32 hex), the token 34 characters. No SMS could be sent; the Rails OTP path still queues the job and answers `sent` (by design). | BLOCKED — credentials invalid as supplied |
| Stripe | no keys; `card_unavailable` path and token-format validation only | BLOCKED for provider acceptance (as expected) |
| Knock / RealPage CRM | deliberately not called (Knock id nulled on the clone; RealPage jobs queued only) | not tested, by design |
| Heroku `pyn-system` | `/api/tour/v1/health` lacks `location_required`/`presence` → it runs pre-October-28 code; not a valid target for this QA | not used |

## E. APK delivery

| Item | Value |
|---|---|
| Path | `artifacts/pynwheel-tour-igloo-20261029.apk` (repo root; `artifacts/` is git-ignored) |
| Package / version | `com.pynwheel.tour` · versionCode 1 · versionName 1.0 |
| Size | 22,576,301 bytes |
| SHA-256 | `8333006502d4e38d91e9859c4c2f81eb3d821fcc051a7c69b34fbd0b735bc525` |
| Build type / signing | debug build (`assembleDebug`), signed with the Android debug certificate (`CN=Android Debug`) — not a release signature |
| API baked in | `http://192.168.0.106:3108` (the QA Rails on this Mac, LAN) — cleartext allowed for this development build only |
| Secrets | none: the bundle contains no `sk_`/`AC…`/Twilio/Checkpoint/Stripe values (grep over the built JS = 0 hits) |
| Installed = delivered | the APK pulled back from the phone (`pm path`) has the same SHA-256 |
| Tested on the phone | yes — every device result in B/C after the background-layer change was taken on this build; the earlier flows (sign-in, booking, ID check, check-in, tour) ran on the previous build of the same source minus the map change and were re-smoked on this build (Home, map floors 1–3, outside-property check-in) |

## F. Remaining issues

1. **Twilio credentials invalid** (D). Nothing SMS-related can be verified until a valid SID/token pair is supplied.
2. **Real CheckpointID verification not proven**: the provider answers 500 to synthetic pictures; a run with a real document (owner's choice) or CheckpointID's own test images is needed. Also `CHECKPOINT_DVS_API_KEY` is still unset on Heroku.
3. **Stripe**: no keys; the card step can only show "not configured".
4. **Booking's chosen unit is not persisted** — the app sends no stops with `POST /bookings` (`BOOKING_PARAMS` has none), so after a restart the card reads "No preference" and the CMS booking has `stops_list {}`. Pre-October-23 behaviour; worth a follow-up.
5. **Home distance line is a placeholder** ("0.3 mi from … *" — `scenarios.ts#locationModel`); the property JSON carries no coordinates, so the real distance cannot be shown yet.
6. **"Open Settings" only toasts** (`locOpenSettings`); opening the OS app-settings page needs a native plugin.
7. **Location Services off** → the app shows "Approximate" (timeout) rather than the services-off sheet, and Google's Location Accuracy dialog pops over it. The server still refuses the check-in, so no false authorisation.
8. **Transient SVG fetch failure is cached for the session** (`useLevelBase` caches non-network errors per level) → "Map unavailable" until a restart; seen once on floor 2 after a reinstall.
9. **Sign-in confirmation shows the demo tour card** ("TODAY'S TOUR · Luxe Mile High *") for a visitor with no booking on a real-API build.
10. **Legacy ID-mismatch mail has a blank From** (`DelayedSchedulerMailerJob`): letter_opener refuses it in development; production SMTP behaviour unverified.
11. **Verification pill per property**: after booking the second property the Home card said "Verify now →" although the visitor is verified (status is property-scoped in the app until read).
12. **Cypress Terra data**: the QA fixtures (stops, amenities, start point, coordinates, Knock off, leasing e-mail) stay on the audit clone; the originals are in `scratchpad/qa/audit_clone_originals_8005.json`. The real property on production is untouched.
13. **Not device-tested**: igloohome unlock on a real lock, AR, a real SMS, the hang (60 s read timeout) provider case, iOS.
14. **Uncommitted**: all code changes (A) are in the working tree; nothing was committed or pushed.
