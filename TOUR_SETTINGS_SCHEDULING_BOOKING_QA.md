# Tour Setup › Settings — Scheduling, Booking Form, Booking Link, Self Tour App booking (QA report, October 20, 2026)

## 1. Scope and branch

- Branch `feature/tour-settings-scheduling-booking`, a git worktree at `.claude/worktrees/tour-settings-scheduling-booking`, from `main` @ `b60cccabd` (PRs #31, #33, #34 included).
- The Locks session's uncommitted work in the main checkout (`feature/connect-locks-real-integrations`) was neither touched nor absorbed: no edit to `connect/locks_controller.rb`, `services/locks/*`, the Next proxy's Locks lines, `useTourLocks.ts`, `LocksTab.tsx`, `tourLocks.generator.ts`, the `tourModules.locks` strings or `vitest.config.ts`. The only shared lines changed are the committed `booking/(rules|hours|form)` proxy entry (one token added: `closures`) and additions inside the `tourModules.booking` string blocks.
- Owner decisions taken at planning time (October 20, 2026): additive columns with enforcement for the design's NEW controls; real Tour App booking; a server-side slot check in the legacy widget's submit; verification on both `pynwheel_development` and `pynwheel_audit_clone`.
- Nothing was committed or pushed (brief §2). Files changed: see `git status` of the worktree and the PR description `PR_DESCRIPTION_tour_settings_scheduling_booking.md`.

## 2. What was already there (and reused)

The Settings tab, its five sections and the backend were built by PR #31 and are reused as the base:
`Connect::BookingController` (`GET booking`, `GET booking/availability`, `PUT booking/rules|hours|form`), `Scheduling::Settings` (every legacy column mapped: `tour_settings.allow_*`, `time_intervel`, capacity, `tours.only_scheduled_tour`, `grace_period`, `credit_card_required`, `opening_hours` / `guided_opening_hours`, `scheduler_widget_settings`, `Community#schedule_tour_url`), `Bookings::Availability` (the widget's slot rules: `Community#collect_time_slots`, `collect_disable_days`, `fetch_tour_type_according_to_time`, `SchedualTours::Capacity`), `Bookings::Create` (visitor upsert through `TourUserSearcherService`, one active booking per person through `MaxDateScheduledTourService`, CRM pushes, `SchedualTours::Notifications`). Legacy semantics verified in the code: grace period = `tours.grace_period` minutes (10–60 in the page, default 10) used by `MaxDateScheduledTourService`, `OccupiedTourTimeSlotsService` and the arrival checks; time increments = `tour_settings.time_intervel` ∈ {"15 min","30 min","1 hr","2 hrs"} stepped by `Community#return_time_slots` (closing time exclusive); only-scheduled = `tours.only_scheduled_tour` (hides "Visit at your own convenience" in the widget and gates walk-ins in the app); tour types = `allow_self_tour` / `allow_guided_tour` ("App Guided Tour" / "Person Guided Tour"); booking form = `show_desired_bedroom`, `show_desired_move_in_date` (NULL = shown), `credit_card_required` (Stripe $0.50 hold + refund in the widget).

## 3. Backend changes (additive, legacy-compatible)

| Change | Where | Notes |
|---|---|---|
| Migration `20261020120000_add_booking_window_and_app_options` | `db/migrate`, `db/schema.rb` | `tour_settings.buffer_minutes` (0), `minimum_notice_minutes` (0), `booking_horizon_days` (NULL = unlimited), `app_after_hours_label` (t), `app_allow_shorter_tour` (t), `app_party_size_limit` (6), `app_ask_unit` (t), `app_show_text_booking` (t); `scheduler_widget_settings.btn_text_color` ('#ffffff'), `btn_icon` (NULL); table `tour_closures` (community_id, date, label, closed_all_day, start_time, end_time; unique on community/date/start). Every default reproduces today's behaviour. |
| `TourClosure` model, `Community has_many :tour_closures` | `app/models` | |
| `Bookings::Availability` | `app/services/bookings/availability.rb` | `day(date)` applies the horizon (`beyond_horizon`), closures (all day → closed with `closure`; partial → slots in the window removed), the minimum notice (`slot ≥ now + notice`, property clock) and the buffer (capacity window); new `window(start, days)` answers Connect and the Tour App; `closures_between`, `closure_json`. |
| `SchedualTours::Capacity` | `app/controllers/concerns/schedual_tours/capacity.rb` | counting window = `± (interval + buffer − 1)` (`window_minutes`); `DayCounter` takes `buffer:`; legacy `get_tour_type` inherits it. `stepping` (end_time) unchanged. |
| `Scheduling::Settings` | `app/services/scheduling/settings.rb` | emits `window`, `closures`, `app`, `button.text_color/icon`; `unavailable` is now `[]`; validates + writes buffer {0,5,10,15,30}, notice {0,60,120,240,1440}, horizon {NULL,7,14,30,60,90}, party 1–10, text colour `#rrggbb`, icon ∈ calendar/pin/clock/arrow/home; new `update_closures!`; **fix:** `show_desired_bedroom` / `show_desired_move_in_date` report `!= false` (a NULL is shown, as the legacy page and widget treat it). |
| `Connect::BookingController` | | new params; `PUT booking/closures` (`update_closures`, in `CONNECT_WRITE_ACTIONS`); availability answers `window`. Route added after `booking/form`. |
| `Bookings::Create` | | `created_by:` keyword (default 'Staff'); an empty phone is refused before the country prefix is added (it used to pass as "+1"). `Visitors::Status::SOURCE` gains 'Tour App'. |
| Tour App API | `app/controllers/api/tour_app/v1/bookings_controller.rb`, `app/services/tour_api/booking.rb`, routes | `GET properties/:id/booking/settings`, `GET properties/:id/booking/availability?date&days`, `POST properties/:id/bookings` (created_by 'Tour App'); `Connect::DomainError` → the API envelope (422, `details.slots` on slot errors). Bearer super-admin auth as the rest of the API. |
| Legacy widget submit | `app/controllers/schedual_tours_controller.rb` | `create_tour_user_from` checks the placeholder's slot with `Bookings::Availability` before any write or charge (`scheduled_slot_problem`); refused → redirect to the widget with a message block; CRM-managed properties (Yardi RentCafe, Knock, Funnel) and unscheduled visits keep the old path. Logged through `AccessLogsService#scheduler_widget_logs`. Nothing else in the legacy file changed. |

Assumed semantics the owner approved with the plan: notice filters slots closer than `now + notice`; horizon closes dates after `today + days`; buffer widens the capacity window (so it only bites when "Limit tours per time slot" is on); closures apply to both lanes; app options are read by the Tour App only; the icon is drawn by Connect's preview and the embed carries the text colour.

## 4. Connect (pyn-connect-web)

- `tourModuleTabs.tsx` `SettingsTab`: the design's grouped rail (Scheduling "When tours can be booked" → pills Tour types & slots / Visiting hours; Booking & CRM → Booking form / Booking link / CRM & sync; then Route & navigation and the unavailable groups), `?tab=settings&section=` read by the page and kept with `router.replace`, in-page fix links.
- `AvailabilityHeader.tsx` (new): widget live / not live / Salesforce title, Scheduler switch with the "Turn off the scheduler?" confirmation (its own one-field write), the four gates with Pass / "Prospect sees …" and fix links.
- `BookingPanels.tsx`: Tour types (self/guided; virtual stays in the API and DB, hidden like the legacy page), Time slots (segmented slot length, Buffer, Minimum notice, Booking horizon), Capacity, Booking behaviour (scheduled only + grace period editable, length of tour, built-in rule, time zone); Visiting hours as per-weekday rows with both lanes on the 6 AM–9 PM axis and one editor per day; Holidays & closures card with the Add closure modal and `PUT booking/closures`; Booking form fields + the "Schedule screen in the app" card (`app_*` columns) + the prospect preview (walk-in / scheduled segment, day and time chips from the live availability, auto-selected type, configured fields, "Book tour" only toasts); Booking link with Button appearance (text + counter, button colour, text colour, icon, font, size, width, height), live preview, embed code, direct link, where it appears.
- `CrmSyncDemoPanel.tsx` + `src/data/mock/crmSyncDemo.mock.ts`: **UI only, demo data.** Option cards, Scheduler-source card with per-CRM credential fields, mode rows, flow panel, warnings and source stats on local `useReducer` state; a "Demo — not connected" banner; the real "From the CMS" card shows the stored provider / lead sync / data provider / managed hours (already in the booking read). No CMS request leaves the page (asserted by e2e).
- `useTourBooking.ts`: request id + reset on property change (stale answers dropped), no second write while one is saving, scheduler toggle, closures draft, `saveForm('fields' | 'button')` with split dirty state, `beforeunload` guard while any draft is dirty.
- `tourBooking.generator.ts`, `tourModules.data.ts`, strings/i18n (booking blocks only), `globals.css` (appended block), Next proxy allowlist (`closures`).

## 5. Self Tour App (tour-app)

- Repository contract: `getBookingSettings()`, `getAvailability(from, days)`, `requestBooking()` with the real shape (`date`, `time HH:MM`, `tourType`, visitor fields, app-only `desiredUnit` / `lengthMinutes` / `partySize`). `PynwheelApiTourRepository` implements them on the three endpoints (the "Booking a live tour" `FeatureUnavailableError` is gone); `DummyTourRepository` serves the former fixtures, so demo mode is unchanged.
- Store: `booking` slice (settings, days, status, saving — not persisted), `bookingLoading/Loaded/Failed/Saving/SaveFailed`; the draft moves to the first open day; `confirmSchedule` books through the repository and keeps the CMS booking id; `submitBooking` (Book a Live Tour sheet) posts a `guided_tour` booking.
- `ScheduleScreen`: days and times from the CMS availability (after-hours = self-only times when the app option is on), tour length / unit / party rows follow the `app_*` options, a "Your details" block, the CMS's refusal shown under the button, the confirmation no longer carries the demo marker on the real provider. "Book via" and the leasing phone stay demo copy (no CMS source).
- `App.tsx` loads the booking rules whenever the Schedule screen opens.

## 6. Tests run (all on `pynwheel_test`, the 3.3.5 toolchain)

| Suite | Result |
|---|---|
| `test/controllers/connect/booking_controller_test.rb` | 13 runs, 131 assertions, 0 failures (link with `HOST_URL`, notice + horizon, closures, buffer, scheduler-only write, app options + button colour/icon, NULL-means-shown) |
| `test/controllers/api/tour_app/v1/bookings_test.rb` (new) | 6 runs, 55 assertions, 0 failures |
| `test/controllers/schedual_tours_slot_check_test.rb` (new) | 5 runs, 27 assertions, 0 failures (closed time, full slot, closure + notice, open slot books, unscheduled not checked) |
| Other Connect files (format_guard 9/44, locks 10/69, stops 4/35, visitors 11/86) | 0 failures |
| Other Tour App API files (auth 16/61, locks 17/118, maps 7/80, properties 7/41, routing 14/162, security 7/54, stops 6/52) | 0 failures |
| Connect `npm run typecheck` | clean |
| Connect Playwright `tests/e2e/tourSettings.spec.ts` (new, 4 read tests + 3 write round trips gated on `PYN_CONNECT_E2E_WRITES=1`) | 7 passed on the clone (writes on 818), 7 passed on development (writes on 1618) |
| Connect Playwright `tests/e2e/tourModules.spec.ts` | 5 passed (the settings test now opens the Booking & CRM group before its pills) |
| Tour app `npm run typecheck`, `npm test` (vitest) | clean; 12 files, 84 tests passed (new `src/store/booking.test.ts`) |

A note on the first full-directory Rails run: it hung for 24 minutes "idle in transaction" after a legacy-flow test enqueued a Sucker Punch mail job; the per-file runs above are what was recorded, and the slot-check test now stubs `ScheduledTourMailerJob.perform_async`.

## 7. End-to-end matrix (isolated databases only; evidence under `qa/tour-settings/evidence/`)

| Test | Clone (`pynwheel_audit_clone`, Rails :3102, Connect :3007) | Development (`pynwheel_development`, Rails :3101, Connect :3007) |
|---|---|---|
| A Scheduling: notice + horizon save → reload → persisted; availability reflects them | ✓ e2e (818) and Rails tests | ✓ e2e (1618) |
| B Hours + closures: add closure → save → reload → appears; remove → save → gone; availability closes the day | ✓ e2e (818) | ✓ e2e (1618) |
| C Booking form: bedrooms toggle and button text round trip; prospect preview on live availability | ✓ e2e (818) | ✓ e2e (1618) |
| D Booking link → real widget booking | ✓ Oeuvre 229: the signed link opens the local widget (`HOST_URL`), date/time/type picked, form filled, submit → `SchedualTour` 25514 (2026-11-02 00:01, scheduled_tour, created_by Pynwheel) → Connect Visitors lists "QA339, Widget · upcoming · self · Booking form" (`evidence/widget229/`). Hazel 1618: the booking row is written but the **legacy** Funnel push then raises in this local environment (no Funnel host), a pre-existing legacy behaviour untouched here. | ✓ Tour API path on 229: `POST …/bookings` 201 (24153), repeated bookings answered as `rescheduled: true` (one active booking per person) (`evidence/dev_api/`) |
| E Invalid bookings | ✓ Legacy submit: closed time on 818 → 302 "That time is no longer available."; Saturday on 229 → 302 "App Guided Tour is not offered at that time."; Tour API: `slot_unavailable`, `slot_full`, `tour_type_off`, `invalid_visitor` (Rails tests), closed time 422 with `details.slots` | ✓ Tour API closed time → 422 `slot_unavailable`; legacy submit Saturday on 229 → 302 refusal (`evidence/dev_api/widget_closed_day_refusal.txt`) |
| F Self Tour App | ✓ Headless app on Hazel: sign in → Hazel → Schedule a Self-Tour → real slots (`GET booking/settings`, `GET booking/availability` 200) → details → Confirm → `POST bookings` 201, booking 25519 (2026-10-21 10:00, created_by "Tour App") → "Self-tour confirmed" → Connect Visitors shows "Visitor, App · upcoming · self · Tour App" (`evidence/app/`) | API path proven on dev (above); the app UI run was done on the clone only (the dev super admin keeps the owner's password). |
| G Legacy regression | ✓ `legacy_snapshot.rb` before/after on 1618, 818, 8005 (+229 after): settings page and widget page render 200 with identical fingerprints, identical slot hashes, opening hours, types-at-time and disabled days; only the booking counts moved (the test bookings) | ✓ same on 1618 and 818: all fingerprints identical |

Screens: `evidence/screens/clone_1618_*.png` and `dev_1618_*.png` (rules, hours, form, link, crm).

## 8. Database safety

- Writes went to `pynwheel_audit_clone` and `pynwheel_development` only (local Postgres, `DATABASE_URL` on every server and runner; `HOST_URL` and `SECRET_KEY_BASE_v2` set to local values). `pynwheel_test` for the suites. **No production connection was opened and nothing was deployed.**
- Migration `20261020120000` applied to the clone, development and test databases; `db/schema.rb` carries only this migration's hunks.
- Residue left for the owner to inspect: clone — bookings 25514 (229, widget), 25519 (1618, app), placeholder rows from the widget's `get_tour_type`, user 2181 on a new throwaway password (file in the session scratchpad only); 818's `credit_card_required` flipped off for a test and restored to true, its `show_desired_bedroom` restored to NULL after the e2e toggle. Development — booking 24153 (229, API), placeholder rows, a 2-day Doorkeeper token for user 1854 (scratchpad only). No row of another property was changed.

## 9. Remaining issues and prerequisites

- `HOST_URL` is not set on the Heroku CMS (`pyn-system`): the Booking link stays empty there until it is.
- The Tour App API admits Super Admins only; prospects cannot sign in yet (a separate auth decision).
- CRM-managed properties (Funnel, Knock, Yardi RentCafe): the legacy widget keeps the CRM's slots, so the new server-side check does not run there; Connect staff bookings and the Tour App validate against the Pynwheel hours (the PR #31 behaviour).
- The legacy Funnel/Knock/Yardi pushes need their vendor hosts; locally the Funnel push raises after the row is written (Hazel), as before this work.
- CRM & sync is UI with demo data only — no backend, no persistence, no sync.
- Buffer has an effect only while the capacity limit is on (it widens the capacity window).
- Connect generator unit tests were not added: `vitest.config.ts` is the Locks session's uncommitted file; Playwright covers the behaviour instead.
- The verify servers are still running when this report was written: Rails :3101 (development), :3102 (clone), Next :3007 (→ :3101), Vite :3016 (→ :3102); pid files `rails3101.pid` / `rails3102.pid` in the session scratchpad; launch entries `rails-settings-dev`, `rails-settings-clone`, `connect-settings-verify`, `tour-app-settings`.

## 10. October 21, 2026 follow-up (design parity pass)

- Every settings card now carries the design's head controls (status "Saved" / "Unsaved changes" / "Fix errors", Discard while
  dirty, Save) and saves on its own: Tour types, Time slots, Capacity, Booking behaviour (`saveRules(card)`, one `PUT booking/rules`
  with that card's changed keys), Booking form fields, Schedule screen in the app, Button appearance (`saveForm(part)`). The
  other cards' unsaved edits survive a save. Test ids: `rules-save-<types|slots|capacity|behaviour>`, `form-save-<fields|app>`, `button-save`.
- Number fields are the design's − / + steppers with the "Allowed a–b." hint (capacity 1–10, grace 10–60, length of tour 1–600,
  party size 1–10, font size 8–40, width and height 10–1000). The Capacity card shows the two per-type caps only, as the design;
  `limit_max_tour` stays stored and in the API.
- The prospect preview is a fixed-height phone (580 px) that scrolls inside instead of growing with its content.
- Booking link host: when the CMS has no `HOST_URL`, `Scheduling::Settings#link` uses the environment's Connect host
  (`http://localhost:3001` in development, `https://pyn-system-connect-de8364f794a0.herokuapp.com` in production/staging) and reports
  `host_source: "default"`; the Connect app answers `GET /scheduler_widget/test_widget` with a 302 to the CMS's widget carrying the
  signed query, so the link always resolves. The panel shows an info note instead of the red "no HOST_URL" error.
- Re-verified on the clone: Settings e2e 8 passed (reads + write round trips on 818, module settings test), Rails booking tests
  19 runs green, the redirect answers 302 to the CMS widget; screens in `qa/tour-settings/evidence/screens2/`.
