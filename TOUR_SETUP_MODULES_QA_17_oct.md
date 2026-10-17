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
