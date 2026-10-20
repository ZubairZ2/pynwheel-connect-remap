# Pynwheel Connect — Visitors module: implementation and QA report (October 21, 2026)

Branch `feature/complete-visitors-module` (worktree `.claude/worktrees/complete-visitors-module`, from `main` `d0f6d9235`).
Brief: "Complete Visitors module, all visitor types, full lifecycle, legacy backend integration" (pasted October 21, 2026).
Design: the October 20 Back Office export (`Pynwheel Back Office (standalone) (2).html`, sub-page `TourModule.dc.html`,
uuid `16fa05e2…`, decoded from the gzip manifest). Builds on the Visitors tab of PR #30/#31 (`PYN_CONNECT_PROGRESS.md` §42)
and the October 18 QA fixes (§43). Knowledge: `context.md` §40, progress §46.

## 1. Executive summary

The Visitors tab already listed bookings and visits and opened a profile (October 17). This pass traced every way a visitor
reaches the database, compared the tab with the October 20 design section by section, and closed the gaps on the real rows:

- **Six creation sources exercised end to end on the production clone** (public scheduler widget, legacy Pynwheel Tour app
  walk-in through the app API, the new Tour App booking API, Connect staff booking, the PERQ webhook, the Salesforce webhook).
  Each row then appeared in the list with its real source and status, and each profile showed the rows that source wrote.
  The Apartments.com partner API (`POST /api/v1/schedule_tour`) was inventoried but not executed (vendor key only).
- **Abandoned visits are a status of their own** (`abandoned`): the row says "Abandoned", the Completed chip counts it as the
  design does, `status=abandoned` filters it alone, and the CSV writes "Abandoned". Before, an abandoned visit was folded into
  "completed" and only flagged when the app had reported a stop.
- **Access codes issued** (new section): every guest access the vendors recorded for the visitor at the property —
  igloohome PIN / Bluetooth key, Latch key with its reservation window, Zerv mobile key (with the vendor's errors as a
  failure), RemoteLock / Dwelo guest, the old Igloo keypad code — matched to the visit by time, codes masked until a user who
  may edit the property reveals them, never a computed validity window. A "Code failed" flag on the list.
- **Visit sessions**: stops grouped per stop (the app writes one row per event, photo and note), with the photos and notes
  taken there, the code shown at the stop, the next stop's arrival as the only honest "left" bound, and the stop's instant
  rebuilt from the stored date + time-of-day columns (a stop no longer shows a time before the tour started).
- **Booking history**: slot changes read back from the booking's PaperTrail versions (who moved it: staff, or the visitor
  through the booking form), CRM appointment ids, cancellation time and actor, per-booking bedrooms / move-in.
- **ID check**: verified / lapsed (30 days) / mismatch / never, with provider and dates; the property code the legacy app asks
  for under restricted access, with its expiry.
- **Timeline**: recorded events only — bookings, reschedules, CRM appointments, cancellations, missed, tour start / lengthy
  stay / end / abandon, arrivals at stops, door events, access issuance (grouped per minute), ID verification, feedback,
  guest cards sent to the PMS, and the Connect privacy / review audit rows. Reminders stay booleans on the booking (no time
  is stored); legacy cancellations and privacy actions leave no event.
- **Feedback** and **guest cards** (`feedbacks`, `prospects`) on the profile.
- **Fix found on the way:** the booked time of every cancelled booking read as nil from its PaperTrail version (a serialized
  `ActiveRecord::Type::Time::Value` cast to nil), so the Cancelled rows showed "unscheduled"; now cast through its UTC instant.

Not done / limits: see §12. **Status: READY FOR REVIEW** (not a production-readiness statement; see §13).

## 2. Visitor data model (as the database and legacy code have it)

| Entity | Table | Notes |
|---|---|---|
| Visitor identity | `tour_users` | One row per person; matched by phone **and** email (`TourUserSearcherService`); name, contact, SMS opt-in (`is_sms_enabled`), `desired_bedroom`, selfie (`image`) and ID photo (`id_card`), ID flags (`id_selfie_mismatch`, `is_authentiq_verified` / `authentiq_verified_at`, `is_checkpoint_verified` / `checkpoint_verified_at`, `verified_by`), the restricted-access property code (`property_access_code`, `_generated_at`), the app's `tour_key`. A visitor is "of a property" when a booking or a visit of that property names them. |
| Booking | `schedual_tours` | Date, time, `tour_type` (`self_tour` / `guided_tour` / `virtual_tour`, legacy variants), `property_tour_type` (`scheduled_tour` / `unscheduled_self_tour` / `remote_tour`), `created_by` (source), reminder flags, `is_tour_completed` / `tour_completed_at`, CRM ids (Yardi, Knock, Funnel, Salesforce), per-booking `desired_bedroom` / `desired_move_in_date`, `stops_list` (customized route). **No status column.** A cancellation **destroys the row**; the only trace is the PaperTrail destroy version (production has recorded them since November 2020: 15,717 destroys, 24,801 updates on this table; the local dumps carry only the Connect-era versions, 164 rows). |
| Visit session | `tour_histories` | `arrived`, `left`, `tour_state` (`abandoned` by default, `completed` when the app posts an end), `active_app`, `abandoned_tour_at_stop`, `tour_site` (onsite / offsite), `tour_status` (type), `verified_by`, `lengthy_stay` / `_email_sent`, `history` (hidden by a privacy action), counters, `tour_key`, `community_id`. One booking can have many; a walk-in has one with no booking. |
| Stop events | `visited_stops` | One row per event the app reported (arrival, photo, note) keyed by `tour_key`; `event_date` + `event_time` (two columns), `stop_pin` (the code the app showed), `image`, `description`. No departure is ever recorded. |
| Door events | `lock_histories` | Written only by the RemoteLock / Dwelo event import (`tour_history_id`, `event`, `occured_at`); production holds 4 rows in total. igloohome, Latch and Zerv record no unlock. |
| Access issued | `igloohome_guests`, `latch_guests` (window `start_time`/`end_time`, `status`), `zerv_guests` (`status`, `res_errors`), `as_guests` (RemoteLock guest / EdgeState PIN, Dwelo), `igloo_guests` | Per visitor and property, no link to a session; clone counts 690 / 5,229 / 3,720 / 406 / 37. The new Tour App writes `igloohome_guests` with `tour_user_id` NULL (its user is a CMS user). |
| Feedback | `feedbacks` | Rating / comment per visitor and tour, `is_cancelled` when dismissed (354 in the clone). |
| Guest cards | `prospects` | The PMS / CRM push at tour end (`data_provider` realpagesvc / psi, `crm_provider` salesforce). |
| Chat | `chatrooms` / `chats` | The in-app support chat. |
| Audit | `versions` | PaperTrail rows: `SchedualTour` create / update / destroy (legacy), plus Connect's own events (`booking_created`, `booking_rescheduled`, `booking_cancelled`, `visitor_*`). |

**List semantics (confirmed):** one row per visitor at the property, as the design says ("One row per visitor, matched by
phone and email"); the row's status / time is the visitor's most relevant state (an active visit, else the next upcoming
booking, else the latest booking or visit), bookings and visits are listed on the profile. Counts and chips use the same rows.

## 3. Visitor sources

| Source | Entry point | Creates / updates | Service | List shows | Test |
|---|---|---|---|---|---|
| Public scheduler widget | `GET /scheduler_widget/test_widget?community_id&community_code` → `GET /schedual_tours/get_tour_type` (placeholder row) → `POST /create_tour_user_from` | `tour_users` (matched by phone + email), `schedual_tours` with `created_by` "Pynwheel" (column default) | `SchedualToursController#create_tour_user_from`, `MaxDateScheduledTourService` | source "Booking form", upcoming | **PASS** — Oeuvre 229: booking 25524 (2026-11-04 10:01, scheduled, bedrooms 2, move-in 2026-01-12), widget answered "Your reservation is confirmed"; list row upcoming / App Guided Tour / Booking form |
| Legacy Pynwheel Tour app (walk-in) | `POST /api/v1/tours/tour_user_login` → `POST /api/v1/save_tour_history` (arrival, stops `id\|time\|type\|pin`, end) | `tour_users`, `tour_histories`, `visited_stops`; no booking | `Api::V1::ToursController`, `TourHistoriesController` | type Walk-in, source "Walk-in", in progress → completed / abandoned | **PASS** — 229: visitor 16262, history 22684; on site "last at Game Room 3:59 PM" while in progress; after the end: completed, 5 min, Lounge 22:54 → Game Room 22:59, timeline Tour started / Arrived ×2 / Tour ended |
| Pynwheel Tour app (new, Capacitor) | `POST /api/tour/v1/auth/login` → `POST /api/tour/v1/properties/:id/bookings` | `schedual_tours` with `created_by` "Tour App" through `Bookings::Create` | `Api::TourApp::V1::BookingsController` | source "Tour App", upcoming | **PASS** — 229: booking 25522 (visitor 16265). The new app writes **no** visit, stop or unlock rows (see §12). |
| Connect (CMS staff) | Visitors tab › New Booking → `POST /communities/:id/connect/visitors/bookings` | `schedual_tours` `created_by` "Staff", visitor upsert, CRM pushes, notifications | `Bookings::Create` | source "Staff" | **PASS** — 229: booking 25523 (visitor 16266), notifications email/sms/web true; rescheduled, then cancelled (§8) |
| PERQ | `POST /api/v1/perq_tour_webhook` (ClientID = `credentials.perq_property_id`) | `tour_users`, `schedual_tours` `created_by` "PERQ" | `Api::V1::PerqWebhooksController` | source "PERQ" | **PASS** — Paperbox Lofts 1778: booking 25520 (visitor 16263), upcoming |
| Salesforce | `POST /api/v1/salesforce_tour_webhook` (by `neighborhoodId` or `neighborhoodName`) | `tour_users`, `schedual_tours` `created_by` "salesforce" (no `property_tour_type`) | `Api::V1::SalesforceWebhooksController` | source "Salesforce" | **PASS** — by name "Mansion Grove" the legacy lookup picked community 8008 (a second property with that name; legacy behaviour): booking 25521 (visitor 16264), upcoming |
| Apartments.com partner API | `POST /api/v1/schedule_tour` (vendor token, `authorize_vendor`) | `schedual_tours` `created_by` "Appartments.com" | `Api::V1::ScheduleToursController` | source "Apartments.com" | **NOT EXECUTED** — needs the vendor key; production has no such row today (created_by in production: Pynwheel 5,967, salesforce 649, PERQ 86) |
| Legacy CMS Scheduled Tours page | `SchedualToursController#create` / `#update` (signed-in staff) | `schedual_tours` (`created_by` stays "Pynwheel") | legacy | source "Booking form" | Not exercised (the page is unchanged; its rows are indistinguishable from widget rows by design of the column) |

Visitor matching is the legacy `TourUserSearcherService` (phone **and** email) in every source; Connect reuses it through
`Bookings::Create`. Distinct people are never merged by one field alone.

## 4. Types, statuses, sources

- **Tour type** (`Visitors::Status.tour_type_key`): `self` (App Guided Tour), `guided` (Person Guided Tour), `virtual`
  (Virtual Tour — `tour_type` virtual variants **or** `property_tour_type` `remote_tour`, as `SchedualTour#scheduled_tour_type`
  labels them), `walkin` (a visitor with visits and no booking). A blank / unknown `tour_type` (353 production rows) is the
  column's default, self-guided.
- **Row status**: `upcoming`, `in_progress`, `completed`, `abandoned`, `missed`, `cancelled` (rules in `Visitors::Status`).
  Chips: the design's All / Upcoming / In progress / Completed / Missed / Cancelled; `counts.completed` includes the abandoned
  rows (the design's `vStat` does the same and labels the row "Abandoned"), `counts.abandoned` says how many.
- **Visit status**: `in_progress` (arrived, no end, app active, within the app's 2-hour window), `completed` (`left`),
  `abandoned` (`abandoned_tour_at_stop`, app inactive, or no end ever posted — `tour_state` stays "abandoned").
- **Booking status**: completed (`is_tour_completed`), upcoming (booked time + grace in the future, or unscheduled),
  missed (past), cancelled (destroy version).
- **Source** (`created_by` → label): Pynwheel → Booking form, Staff, Tour App, PERQ, salesforce → Salesforce,
  Appartments.com → Apartments.com; a visitor without a booking → Walk-in.
- **ID check**: `verified` (within 30 days, provider + dates), `expired` ("Verification lapsed", the app asks again),
  `mismatch`, `never`; "ID verification is off for this property" when `visual_id_verification` is off.
- **Flags**: Lengthy stay, Tour abandoned, Code failed (new), ID mismatch, Customized tour, Removed at consumer request.
- **Access status** (stored facts): `active` / `deleted` (Zerv, Latch), `expired` (Latch window passed), `issued` (a
  credential was written), `failed` (none, or Zerv `res_errors`).

## 5. Visitors list

- Search by name, email or phone (digits match the stored number ignoring formatting); date range; tour type; status chips
  with counts; 25 per page with total; CSV export with the status / type / range filters.
- On site now: the visitor, type, **last recorded stop and its time** ("last at Game Room 3:59 PM", or "no stop reported yet"),
  start time, elapsed minutes, lengthy flag — no live position is implied.
- Coming today, stay limit, property time zone.
- CSV columns: Date, Time, Last name, First name, Email, Phone, Tour type, Status, ID check, Source, Flags, Visits, Bookings.
  No code, selfie or ID photo.
- New Booking: unchanged (slot grid from `booking/availability`, `Bookings::Create`, reuse of an upcoming booking for the same
  person). Reschedule / cancel from the profile.

## 6. Visitor detail

| Section | Data | Notes |
|---|---|---|
| Header | name, status pill (incl. Abandoned), flags, contact, Chat log, Reset tour stops, Cancel / Reschedule | |
| ID check | selfie / ID photo URLs (lazy `<img>`), state sentence with provider and dates, Review ID match, Reset verification (super admin) | |
| Contact | email, phone, SMS opt-in, desired bedrooms (visitor), desired move-in (latest booking that has one) | Read-only, as the legacy page; the widget's reschedule form edits them |
| Bookings | date / time, status, type, source, reminders (booleans), per-booking bedrooms / move-in, **slot changes** ("Rescheduled from Nov 5 · 11:01 AM · … · by staff / through the booking form"), **CRM appointment** ("Booked in Funnel · appointment 3476652"), cancellation ("Cancelled … · by staff"), customized | History from `Visitors::Changes` (PaperTrail `update` versions) |
| Visitor feedback / Guest cards | rating, comment, dismissed; `prospects` pushes with time and status | |
| Privacy (super admin) | Remove personal data (fields), Delete visitor | Unchanged semantics (`Visitors::Privacy`) |
| Visit sessions | one chip per session; status, started / ended / minutes / on site or remote, lengthy, "Abandoned at …", "ID verified by …", **property code** with expiry (editors see the code), **stops grouped per stop** with "Arrived 1:54 PM · next stop 1:57 PM" (the stored wall clock in the property's zone), the code shown (masked for non-editors) or the vendor instruction, notes, photos, door events | |
| Access codes issued | This visit (matched by time to the session) / All; stop, provider · method, code (masked, Show codes for editors; "Key in the app" for Latch / Zerv), valid window (Latch) or "Not recorded", status pill, issued time, vendor error | `Visitors::Access` |
| Timeline | recorded events with a note on what is not recorded | up to 80 events |

## 7. Real properties tested (production clone `pynwheel_audit_clone`, Rails :3103 from the worktree, Connect :3008)

| Property | List | Profile(s) |
|---|---|---|
| Hazel 1618 (company 596, America/Vancouver) | 280 visitors: upcoming 5, in progress 0, completed 115 (45 abandoned), missed 160, cancelled 0; list 0.17 s / 11 queries; sources Booking form + 1 Tour App (clone residue) | Rob Nugent 13024: 22 sessions, 2 missed bookings (one with a Funnel appointment), Authenteq verification lapsed (May 2023), 115 accesses (Zerv 5 active / 106 deleted, igloohome 4 issued with PINs), feedback 1/5, timeline 80 events (0.39 s). Chang Liu 16212: 1 completed session with 7 stops (Zerv instructions at Lobby / Fitness Centre / Elevator 2, 1:54 PM → 2:26 PM with next-stop times), 8 accesses during the visit, dismissed feedback, Funnel appointment. |
| John Demo 1411 (company 44) | 12 visitors, 10 walk-ins, 8 abandoned | John Hall 14793: 34 sessions, 15 bookings, 39 accesses incl. 3 Latch (deleted, with windows), feedback 5/5, ID verification off |
| Oeuvre 229 (company 44) | 34 visitors before the flows (18 walk-ins, 17 abandoned, 3 lapsed verifications, 1 removed), then the six QA visitors | walk-in 16262 in progress → completed → PII removed; 16265 (Tour App) ID review; 16266 (Staff) rescheduled → cancelled; 16267 (widget) deleted |
| Jennifer Demo FP 1412 | 1 walk-in (abandoned) | — |
| Residences at Escaya 818, Cypress Terra 8005 (Alliance, company 198) | 0 visitors, empty states, 0 queries beyond the property | 13024 through 818 → 404 |
| Paperbox Lofts 1778 / "Mansion Grove" 8008 | the PERQ and Salesforce rows | — |

Screenshots and logs: `visitors_module_qa/evidence/` (list pages, search, Rob Nugent with all 115 accesses, John Hall,
Chang Liu with codes revealed, the walk-in on site / in progress / redacted, the Tour App booking, the New Booking dialog;
`shots_log*.json` with the per-step counts; `flows_*.txt` with the flow outputs).

## 8. Lifecycle scenarios

| Scenario | Property / rows | Result |
|---|---|---|
| New scheduled visitor from the public widget | 229, 25524 / 16267 | PASS |
| Existing visitor books again (reuse of the upcoming booking) | Rails test (`Bookings::Create`), October 17 behaviour unchanged | PASS (test) |
| Legacy app walk-in: in progress → on site → completed | 229, 16262 / 22684 | PASS |
| New Tour App booking | 229, 25522 | PASS |
| CMS (Connect) booking | 229, 25523 | PASS |
| PERQ / Salesforce rows | 1778 / 8008 | PASS |
| Apartments.com row | — | NOT EXECUTED |
| Upcoming / missed / completed bookings | Hazel, 1411 (real rows) | PASS |
| Active tour with last recorded stop | 229 walk-in | PASS |
| Completed tour with stops, codes, timeline | Hazel 16212 | PASS |
| Abandoned tour as its own status, under the Completed chip, in the CSV | Hazel (45), 1411, Rails test | PASS |
| Cancelled booking from its version with the booked time | 229, 25523 (cancelled by staff; Cancelled chip 1) | PASS |
| Reschedule read back as history + timeline | 229, 25523 (Nov 5 11:01 → Nov 6 14:01, by staff) | PASS |
| Multiple bookings / multiple sessions | John Hall (15 / 34), Rob Nugent (2 / 22) | PASS |
| ID verified / lapsed / mismatch / off / never | Rob Nugent (lapsed), 16265 (mismatch → match → reset), 1411 (off), tests | PASS |
| Access history, failed code flag, masking for non-editors | Rob Nugent, John Hall, Rails tests (Latch window, igloohome PIN, Zerv error) | PASS |
| Visitor without optional data | 818 / 8005 empty states; walk-in without codes ("No access codes were issued…") | PASS |
| Removed personal data | 16262 after Remove personal data: "Removed at Consumer Request", sessions hidden, flag, audit event | PASS |
| Delete visitor | 16267: data gone, list empty, profile 404 | PASS |
| Cross-property access | 818 → 13024: 404; Rails tests (other company) | PASS |
| Property code (restricted access) | Rails test (active to editors, masked otherwise); no clone visitor had an active code | PASS (test) |
| Feedback, guest cards | Rob Nugent, John Hall, Chang Liu; `prospects` none on these visitors (the rows exist on RealPage / Entrata properties) | PASS / partial |
| Door-unlock events | Production has 4 `lock_histories` rows (RemoteLock); none on the tested visitors; rendered from fixtures in tests | PASS (test) |

## 9. Backend / API changes (Rails, Connect module only; no migration, no legacy file)

- `app/services/visitors/status.rb` — `abandoned` row status, `STATUS_LABEL`, `tour_type_key` (remote_tour → virtual),
  `id_check` with `verified_at` / `valid_until` / `expired`, `stop_instant` (date + time columns), source map.
- `app/services/visitors/query.rb` — status filter semantics (`completed` = completed + abandoned; `abandoned` alone),
  `counts.abandoned`, phone-digit search, Code failed flag (`Visitors::Access.failed_visitor_ids`, four queries per list),
  `visits` / `bookings` / `last_visit_at` on rows, on-site `last_stop_at`, per-visitor narrowing of the cancelled read.
- `app/services/visitors/profile.rb` — `include_codes:`; verification fields, property code, booking `history` and
  `crm_pushes`, grouped stops (photos, notes, pins, `next_at`, `events`), session `access_ids`, `access`, `feedback`,
  `crm_pushes`, richer timeline (`kind`), 80-event cap, stops read once per session.
- `app/services/visitors/access.rb` (new) — the vendor guest rows as access rows; `during(history)`; `failed_visitor_ids`.
- `app/services/visitors/changes.rb` (new) — reschedules from PaperTrail `update` versions.
- `app/services/visitors/cancelled.rb` — `tour_user_id:` narrowing; **fix** `plain_time` for the serialized time column.
- `app/services/visitors/export.rb` — Abandoned label, Visits and Bookings columns.
- `app/controllers/connect/visitors_controller.rb` — `codes_visible?` (`User#can_edit_map?`) passed to the profile.
- Endpoints unchanged (`GET visitors`, `GET visitors/:id`, `GET visitors/export`, the eight writes); the JSON is extended,
  nothing removed. Legacy controllers, models, views and callbacks untouched.

Connect: `tourModules.data.ts` (types), `tourVisitors.generator.ts` (+ `generateAccessRows`, `idCheckText`,
`propertyCodeText`, `feedbackText`, abandoned / expired pills, grouped stops), `useTourVisitors.ts` (reveal codes, access
scope), `VisitorsTab.tsx` (ID sentence, booking lines, feedback / guest cards card, session stops with photos, property code,
Access codes card, timeline note), `strings.ts` / `i18n/index.ts` (54 strings); `tourSetup.screen.tsx` — clicking the Visitors tab
while a profile is open returns to the list (`listSignal`), found by the owner on October 21.

## 10. Tests

| Suite | Command | Result |
|---|---|---|
| Rails `Connect::VisitorsControllerTest` (6 new tests: abandoned status / counts / CSV, access rows + Code failed + masking, grouped stops, reschedule history, remote → virtual + lapsed ID + property code, feedback + privacy audit) | `rails test test/controllers/connect/visitors_controller_test.rb` | 17 runs, 150 assertions, 0 failures |
| Rails Connect: format guard, booking, locks, lock accounts, stops | one file at a time | 9 / 13 / 10 / 13 / 4 runs, 0 failures |
| Rails Tour API services | `rails test test/services/tour_api` | 13 runs, 0 failures |
| Rails full suite | `rails test` | see §10a |
| Connect vitest (new `tourVisitors.generator.test.ts`, 12 tests) | `npm test` | see §10a |
| Connect `tsc --noEmit` | | clean |
| Playwright real data `tourModules.spec.ts` (overview + visitors) against :3008 / :3103 | `PLAYWRIGHT_BASE_URL=… playwright test tests/e2e/tourModules.spec.ts -g visitors` | 2 passed |
| Headless browser pass (six lists, chips, search, two real profiles, codes revealed, access "All", the walk-in on site, in progress and redacted, the New Booking dialog) | `shots.mjs` / `shots3.mjs` | 0 page errors, 0 non-GET requests |
| Legacy pages in-process on the clone with this branch (12 pages: visitors index and details on 1618 / 1411 / 229 / 1778 / 8008 / 818, scheduled tours, ID matching page, visited-stops JSON) | `legacy_smoke.rb` | all 200, no exception, no row written |

Test-environment notes: the guest rows are saved with `validate: false` in the tests (the models declare a required
`pynwheel_access_user` the legacy writers never set); Sidekiq fake, `ScheduledTourMailerJob` stubbed as before.

### 10a. Full-suite results

- Rails `rails test` (worktree, `pynwheel_test`): **308 runs, 1,840 assertions, 1 failure, 0 errors, 7 skips** — the failure
  is `PartnerConfigurationsControllerTest#test_a_super_admin_can_reach_the_screen` (a 500 of the legacy partner screen in the
  test environment, pre-existing since the October 17 baseline and unrelated to this branch).
- Connect `npm test` (vitest): **26 passed** (14 lock accounts + 12 visitors generator). `tsc --noEmit` clean.

## 11. Legacy compatibility and database safety

- Production was read **only** through the read-only URL, in one query, alone: version history (917,935 rows since
  2020-11-06; SchedualTour destroy 15,717), `created_by` values, data freshness (bookings to 2026-10-20, visits to
  2026-10-07), the test properties' counts, `lock_histories` = 4. No production row was written.
- Every write went to `pynwheel_audit_clone` (worktree Rails :3103, `PYN_CONNECT_WRITES=on`, `API_ACCESS=true` for the legacy
  app bypass, `HOST_URL` / `SECRET_KEY_BASE_v2` for the widget). **Clone residue** (QA rows, for the owner to inspect or drop):
  visitors 16262 (walk-in, PII removed), 16263 (PERQ), 16264 (Salesforce), 16265 (Tour App), 16266 (Staff); bookings 25520
  (1778), 25521 (8008), 25522, 25524 (229), placeholder rows from `get_tour_type`; history 22684 (hidden); visitor 16267 and
  booking 25523 deleted / cancelled by the flows; a Doorkeeper token for user 2181; user 2181 on a new throwaway password
  (scratchpad only); letter_opener mails in `tmp/letter_opener`.
- Legacy pages re-rendered in-process after all writes (12 × 200, no exceptions, no rows changed by a read). Legacy actions
  were not modified; the only shared code is the Connect service layer the legacy privacy / ID-review actions already
  delegate to (unchanged this round).

## 12. Remaining issues and limitations

1. **The new Tour App records no visits.** It books (`created_by` "Tour App") and issues igloohome codes with
   `tour_user_id` NULL, but writes no `tour_histories`, `visited_stops` or unlock rows; a visit made with the new app is
   invisible here and its codes cannot be attributed to a visitor. Needs the app to call the arrival / stop / end endpoints
   (or new ones) — out of scope for this pass.
2. **Reminder times are not stored** (`daily_email_sent` / `hourly_email_sent` booleans): shown as Sent / Pending on the
   booking, not on the timeline.
3. **Validity windows** exist only for Latch; igloohome / RemoteLock / Zerv rows carry no window ("Not recorded").
4. **Door-unlock events** come only from the RemoteLock / Dwelo import (4 rows in production); "Door unlocked" per stop
   is not available for igloohome / Latch / Zerv.
5. **Legacy cancellations and privacy actions leave no event**; the cancellation itself is read from the destroy version
   (time and `whodunnit`). Local dumps lack the production version history, so Cancelled is empty locally except for
   Connect-made cancellations.
6. **Timeline** is capped at 80 events (busy visitors have more); sessions and bookings list everything.
7. **Salesforce by name** picks the last community with that name (two "Mansion Grove" rows) — legacy webhook behaviour,
   not changed.
8. **Apartments.com** partner bookings were not executed (no vendor key locally).
9. **Arrival-time columns**: the legacy app stores a stop's date and time-of-day separately, as the **device's wall clock**
   (on site, the property's; a remote tour's device may be elsewhere — Rob Nugent's remote visit shows 9:20 for a 13:20 UTC
   start). The instant is rebuilt in the property's zone, which prints the stored digits exactly as the legacy page does.
   Rows written without a date fall back to the row's creation time; the QA walk-in posted UTC digits, so its stop times read
   22:54 / 22:59 on the Denver clock (an artefact of the hand-made request, not of real devices).
10. **`stop_pin` is not always a code**: Zerv stops store the instruction text ("Tap the unlock button…"); it is shown as an
    instruction, and only code-shaped values are masked / shown as codes.
11. Minted Devise sessions did not authenticate against a Rails server started from the worktree (each checkout has its own
    `tmp/local_secret.txt`); the form sign-in with a throwaway password on clone user 2181 was used instead.

## 13. Final status

**READY FOR REVIEW.** Production readiness is not asserted here: the broader platform review (`FINAL_PLATFORM_QA_REPORT_2026-10-17.md`)
still owns that call, and item 1 above is a product gap for the new app.

## 14. Files changed

Rails: `app/services/visitors/{status,query,profile,access,changes,cancelled,export}.rb`,
`app/controllers/connect/visitors_controller.rb`, `test/controllers/connect/visitors_controller_test.rb`.
Connect: `src/core/models/data/tourModules.data.ts`, `src/core/utils/generator/tour/tourVisitors.generator.ts` (+ `.test.ts`),
`src/core/hooks/tour/useTourVisitors.ts`, `src/core/screens/properties/tour/VisitorsTab.tsx`, `src/config/app/strings.ts`,
`src/resources/i18n/index.ts`.
Docs: this report, `context.md` §40, `PYN_CONNECT_PROGRESS.md` §46, `TOUR_SETUP_MODULES_QA_17_oct.md`,
`gaps_tour_setup_feature.md`, `tour-app-backend-api.md`, `tour-app-implementation.md`, `visitors_module_qa/evidence/`.
