# Pynwheel Connect — Tour Setup modules: QA report (October 17, 2026)

Branch `feature/tour-setup-stops-locks-visitors-booking`. Brief: `stops_LOCKS_SCHDULING.MD`. Design: the Oct 13 Back
Office design (`Pynwheel Admin - Back Office`, `TourModule.dc.html`). Implementation notes: `PYN_CONNECT_PROGRESS.md`
§42, `context.md` §37, `gaps_tour_setup_feature.md` (Oct 17 update).

## Module status

| Module | Status | Notes |
| --- | --- | --- |
| Property Details page | Done (Oct 17, PR #30) | Not changed in this phase; verified against the design in §40. |
| Tour Setup overview | Done | Checklist, six KPIs and the attention list from the tour rows, today's visitors and the lock inventory; live visitors card. |
| Stops | Done | Grouped list, drag-and-drop order, attention filter, drawer (content → record, lock, app preview), Add stops, route preview, shortest-path test on the saved graph. Order / visibility / add / remove still go through the page's Save (`TourSetup::Save`). |
| Locks | Done | Providers, inventory (map / unmap / change / bulk unmap / manual codes / auto-match / purge / sync / test), issued codes, locked stops without a lock, locks on/off. igloohome v1 has no API: no sync / test, said on the card. |
| Visitors | Done | Bookings and visits, Upcoming / In progress / Completed / Missed / Cancelled, search / range / type, CSV export, profile, New booking (existing lifecycle: CRM pushes, mail, SMS), reschedule, cancel, ID review, reset stops, privacy actions (super admin). Legacy-app records only, as agreed. |
| Scheduling | Done | Tour types & slots (widget state and gates, types, slot length, capacity, behaviour), visiting and agent hours with the legacy validation. |
| Booking form | Done | Fields, button appearance, prospect preview on the live availability. |
| Booking link | Done | Signed link, embed code, copy / open, where it appears. Needs the CMS's `HOST_URL`; locally it says none is configured. |
| CRM & Sync | Deferred (by the brief) | Read-only: provider, lead sync, availability feed; the panel says it is managed in the CMS. |

## Real-data validation

Verify pair: Rails on :3100 against `pynwheel_audit_clone` (a production clone, Oct 7) with `PYN_CONNECT_WRITES=on`;
this branch's Connect dev server on :3005; a minted super-admin session. The shared production database was read
only, through the read-only URL, and only to confirm facts; no production row was written.

- **Hazel 1618** (igloohome v1 + Zerv): overview KPIs; 11 stops in one building group with 3 needing attention
  (no image / no directions); drawer content, lock and preview tabs; route preview on "1 · Floor 1" with hallway paths
  and pins; shortest path Fitness Centre → The Lobby: 889 px on the plan, 1 leg, two steps. Locks: igloohome
  "v1 · Home name: Hazel", 4 locks, 4 mapped, hourly PIN / Bluetooth key; Zerv facility 255, 6 locks, 6 mapped,
  device-active health; 10 inventory rows; issued codes listed newest first. Visitors: 277 rows, chips Upcoming 2 /
  In progress 0 / Completed 115 / Missed 160 / Cancelled 0; profile with ID check, contact, bookings, sessions,
  timeline; New booking dialog with Funnel-managed availability (7-day grid, "what happens" rows). Settings: widget
  live (all gates pass), hours for both lanes, form + prospect preview, link (no `HOST_URL` locally).
- **Alliance (company 198)**: 818 Residences at Escaya — 6 stops, 0 elevators, no lock provider; 8005 Cypress Terra —
  0 stops, 0 elevators, no lock provider. The Locks tab shows the "connect a provider" state and the Stops tab the
  empty state; Visitors and Settings read their own rows.
- **Other providers** (Latch, Dwelo / EdgeState): exercised by the Rails tests on fixtures (vendor rows, mapping,
  purge, sync queuing); no clone property with a live account was driven in the browser.

## Backend and database changes

- New controllers under `Connect::` (`locks`, `stops`, `visitors`, `booking`) and services under
  `app/services/{locks,stops,visitors,bookings,scheduling}`; concerns `Connect::ReadsJson`,
  `SchedualTours::{Notifications,Capacity}`.
- **No migrations, no new tables or columns.** Writes use the columns the legacy forms write
  (`igloohome_locks.stop_type/stop_id` etc., `lock_provider` / `access_code`, record content columns,
  `schedual_tours`, `tour_users`, `tour_settings`, `tours`, `communities.scheduler_widget`, `opening_hours`,
  `guided_opening_hours`, `scheduler_widget_settings`), plus PaperTrail audit rows.
- Legacy actions changed only by delegation to the shared service (`TourUsersController` privacy actions,
  `ToursController#flag_id_mismatch`, `SchedualToursController#check_limit`) — same inputs, same rows.
- Every write is behind the CSRF check, `User#can_edit_map?` and the `PYN_CONNECT_WRITES` kill switch; PII removal and
  visitor deletion need a super admin.

## Legacy regression

- The legacy CMS on Heroku runs its own code against the shared database: the new endpoints are additive, so nothing
  it renders or saves changes. The three delegations were kept behaviour-identical (covered by the Connect tests
  and the existing fixtures).
- Full Rails suite: 256 runs, 1314 assertions, 1 failure, 3 errors — all four in
  `PartnerConfigurationsControllerTest`, pre-existing and unchanged from the Oct 17 baseline.

## Test results

- Rails `test/controllers/connect`: 31 runs, 244 assertions, 0 failures, 0 errors.
- Connect `tsc --noEmit`: clean.
- Playwright (`tourModules.spec`, `tourSetup.spec`) against the verify pair: 7 passed; each test asserts that only
  GET requests left the page.
- Browser pass (Chrome, 1440×900) over the states listed above: no page errors from the app.

## Remaining issues and follow-ups

- Order, visibility, add and remove on the Stops tab are saved by the page's Save button (one transaction, version
  checked), not per action — by design, so a half-finished reorder is never stored.
- Distance per stop (T3) and publishing from Connect (T6) are still unavailable; the UI says so.
- `counts.withoutLock` in the lock inventory is property-wide (every record with a lock provider and no device or
  code); the Overview and Stops tab count the tour's stops instead.
- Lock health exists only for Zerv; others show "Not reported".
- Cancelled bookings depend on PaperTrail destroy versions being present for the property.
- The booking link panel needs `HOST_URL` on the Connect-facing Rails instance.

## Update — October 18, 2026 (final platform QA pass)

- **Critical defect found and fixed:** every Connect read and write guard was conditional on the JSON format while the
  routes accept a format suffix, so `GET /communities/<other company's id>/connect/visitors.html` returned another
  tenant's visitor list (names, emails, phones), `locks.html` the device inventory, `visitors/export.html` the CSV and
  `stops.xml` the stops, and the write actions were reachable, for any signed-in user. Reproduced with a company admin
  of company 44 against Hazel. `Connect::BaseController` now forces JSON and the predicates ignore the format; nine
  regression tests in `test/controllers/connect/format_guard_test.rb`.
- Query storms fixed: `GET visitors` (Hazel, 25 rows) 500 → 13 queries; `GET booking/availability?days=7` 1,872 → 25
  (31 days: 49). The availability rewrite matches the legacy per-slot rule on 2,792 slots over 14 days for five
  properties (0 mismatches).
- Hooks fixed: Overview, the booking settings read (Visitors and Settings tabs) and the drawer's lock inventory
  re-requested a failed read forever; now one request and a Retry.
- `Bookings::Create` no longer re-enables SMS for a visitor who opted out when a later booking omits the flag.
- Writes re-verified on the clone: stop content (818), lock map/unmap/manual code and the foreign-target 404 (Hazel),
  booking create/reschedule/closed-day/duplicate reuse/cancel and the cross-property 404 (Jennifer Demo FP), rules,
  hours (overlap and format validation) and form on 818 — each persisted, reloaded, audited and reverted.
- Observed: setting a manual code on a stop whose door holds a vendor device releases the device (documented contract);
  the UI offers it without a confirmation. Remaining findings are listed in the final report §25.
- Alliance in production: 818 has six sitemap-plotted stops and no hallways, locks or bookings; 8005 has three SVG plates,
  333/339 plotted units (October 17), no stops, locks or bookings. Both render the empty / "connect a provider" states.

## Update — October 20, 2026 (Locks: provider accounts on the page)

- The Locks tab now creates and edits the vendor accounts with the legacy tabs' real fields (Igloo version and its
  three modes, Zerv's login + facility/badge/card format, Dwelo's API URL/community/client, EdgeState client
  credentials, Latch building name), the visitor instructions and images, and the igloohome v1 lock entry (typed or
  CSV). Backend `Locks::Accounts`; report `LOCKS_PAGE_INTEGRATION_QA.md`.
- Alliance 818 was exercised with real account creation, test, instructions, a typed lock and a mapping, then
  restored to "no provider". 8005 is not in the development copy.
- Two rules corrected: Latch counts as configured by its building name, Zerv by its login (the legacy page needs
  no more for Test/Import).
- The manual-code "Remove code" bug noted on Oct 18 is fixed; Auto-match no longer shows the unmapped count as a
  proposal count.

## Update — October 20, 2026 (Settings on the October 20 design, branch `feature/tour-settings-scheduling-booking`)

- Scheduling: Tour types & slots gained buffer, minimum notice and booking horizon (new columns, enforced); Visiting hours
  are drawn per weekday with both lanes and gained Holidays & closures (`tour_closures`, `PUT booking/closures`).
- Booking form: the "Schedule screen in the app" card (`tour_settings.app_*`), a prospect preview on the live availability,
  and the fix that a NULL "desired bedrooms / move-in" flag is shown (as the legacy widget shows it).
- Booking link: the full Button appearance card (text colour and icon are new columns); locally the link resolves to the
  legacy widget when `HOST_URL` points at the Rails server, and a visitor booking made through it appears in Visitors.
- CRM & Sync: **UI complete, demo data only** — the design's option cards, credentials, mode rows, flow and stats on local
  state; nothing is sent or saved.
- The legacy widget's submit now checks the slot on the server; the Tour App books through the CMS.
- Results and evidence: `TOUR_SETTINGS_SCHEDULING_BOOKING_QA.md` (§6 tests, §7 matrix on the clone and on development).
