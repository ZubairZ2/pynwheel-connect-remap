# Publish to Tour App, booking lifecycle in the property's zone, scheduling tiles, scheduler widget theme

Branch `improvement/publish-scheduling-timezone-qa-2026-10-25` → `main`. Compare link:
https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...improvement/publish-scheduling-timezone-qa-2026-10-25

Findings, the five product decisions and the PASS/FAIL matrix: `PUBLISH_SCHEDULING_TZ_FINDINGS_2026-10-25.md`. Contract:
`tour-app-backend-api.md` §22. Knowledge: `context.md` §43. Progress: `PYN_CONNECT_PROGRESS.md` §49.

## What was wrong
- **Publish → stale app.** Connect's Publish was a dialog stub; Save was already live and the server's versions moved correctly,
  but the app reloaded a property only on property change or launch (resume only synced the visit), so "switch property and back"
  was the only way to see a change.
- **Tour completed before its time.** The check-in sheet's "Take a Virtual Tour" (and any phone-only tour) ran without a server
  visit and the app marked the booking completed locally, while the CMS rightly kept it Upcoming.
- **Today vs Tomorrow.** Bookings are the property's wall clock; the CMS labels days in the property zone, the app read them in the
  phone's (Karachi vs Vancouver), with a countdown twelve hours short.
- **Pill overflow, Book Another Tour loop, missing prefill on two paths.**

## What changed
**Rails (additive)**
- `TourApi::ConfigVersion`: one version for the graph, stops and booking rules; `config_version` + `published_at` on
  `GET /properties/{id}`; ETag/304 on `/stops` and `/booking/settings`.
- `Connect::TourController` + `TourSetup::Publish`: `GET connect/tour/publication`, `POST connect/tour/publish` — records the
  published version on the tour (`tours.tour_published_at / _by_id / _version`, migration `20261025100000`), audits
  `tour_published`, clears the list cache, idempotent. Saving stays live for every reader (owner's option C1).
- `booked_at` (ISO with offset) + `time_zone` on every booking payload.
- `Scheduling::Settings`: a blank grace period is left alone; bound tests (length 1..600, grace 10..60).
- Scheduler widget: `scheduler_widget_connect.scss` + Manrope behind `?theme=connect` / `SCHEDULER_WIDGET_THEME=connect`
  (plain page byte-identical); the reflected `?message=` is rendered through `sanitize`.

**Tour App**
- `store/zone.ts`; `ScheduledTour.bookedAtMs / timeZone`; day labels, countdown, Schedule day strip and slot filters in the
  property's zone.
- Start Tour only inside booked time ± grace (the CMS's `Visits::Start` rule), Upcoming before, Missed after.
- `finishTour` completes a booking only when the recorded visit was linked to it; `syncBookings` lets the CMS's status win.
- Revalidation on resume / online (one small request, 60 s throttle): reload when `config_version` moved, re-read the
  visitor's bookings, prune a persisted tour naming removed stops.
- Book Another Tour opens Schedule; Schedule prefilled on every path with the CMS's first/last names.

**Connect**
- Publish dialog wired (dirty guard, status line, idempotent), checklist step, header renamed "Publish to Tour App".
- Readiness tiles: the long fail pill wraps inside its tile.

## Verification
- Rails: 204 runs / 1,639 assertions on the touched suites (new: `tour_controller_test`, `config_version_test`, ETag and
  `booked_at` cases). Tour App: 145 vitest + tsc. Connect: 28 vitest + tsc.
- Local prod copy in the browser pane: the Oct 25 10:00 (Vancouver) booking shows "Upcoming tour · Tomorrow, Oct 25 · 10:00 AM ·
  Starts in 19:42" (was "Today · 8:43"); a full virtual tour leaves it Upcoming; a CMS stop-order change reached Build Your Tour
  after a resume without switching property; Connect published Hazel (second click "already published"); the readiness pill sits
  inside its tile at 1400 and 1000 px; the themed widget renders, the plain one is unchanged.
- **Not run:** the connected-phone scenarios (no device was attached). Rebuild the tenda APK from this branch to run them.

## Deploy notes
- Run the migration on Heroku (`20261025100000`, three nullable columns on `tours`).
- The widget theme is opt-in; set `SCHEDULER_WIDGET_THEME=connect` to make it the default, or append `theme=connect` to links.
