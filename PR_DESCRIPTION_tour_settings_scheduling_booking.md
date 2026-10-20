# Tour Setup › Settings: scheduling rules, closures, booking form and link, Self Tour App booking

Branch `feature/tour-settings-scheduling-booking` → `main`. Report: `TOUR_SETTINGS_SCHEDULING_BOOKING_QA.md`.

## What changes

**Backend (additive, legacy-compatible)**
- Migration `20261020120000`: `tour_settings.buffer_minutes`, `minimum_notice_minutes`, `booking_horizon_days`, the Tour App Schedule-screen options (`app_*`), `scheduler_widget_settings.btn_text_color` / `btn_icon`, and the `tour_closures` table. Defaults reproduce today's behaviour; the legacy pages never read these columns.
- `Bookings::Availability` applies the notice, horizon, closures and buffer; `SchedualTours::Capacity` widens its window by the buffer; `Scheduling::Settings` reads/writes the new settings (`PUT booking/closures` is new) and now reports a NULL "desired bedrooms / move-in" flag as shown, as the legacy widget does.
- Tour App API: `GET properties/:id/booking/settings`, `GET properties/:id/booking/availability`, `POST properties/:id/bookings` (`Bookings::Create`, `created_by` "Tour App").
- Legacy widget: `SchedualToursController#create_tour_user_from` checks the picked slot on the server with the same engine before writing or charging; CRM-managed properties keep the CRM path.
- `Bookings::Create` refuses an empty phone (it used to pass as "+1").

**Connect**
- Settings tab aligned to the October 20 design: grouped rail + pills with `?section=` deep links, the availability header with the scheduler-off confirmation and gate fixes, Tour types & slots (slot length, buffer, notice, horizon, capacity, behaviour), Visiting hours per weekday with both lanes and the Holidays & closures card, Booking form with the "Schedule screen in the app" card and a richer prospect preview, Booking link with the full Button appearance card, and CRM & sync as **demo-only UI** on isolated fixtures.
- `useTourBooking`: stale-answer guard on property change, one write at a time, split form saves, unsaved-changes guard.

**Self Tour App**
- The Schedule screen reads the property's rules and slots from the CMS and books through it; the live-tour sheet books a guided tour the same way; demo mode unchanged.

## October 21 follow-ups (design parity and local widget fixes)
- Per-card Saved / Discard / Save heads on every settings card, the design's − / + steppers with "Allowed a–b.", a fixed-height
  scrolling phone preview.
- Booking link built as the legacy page builds it (`HOST_URL`, else the CMS host answering the request; query
  `community_id`/`community_code`/`direct`); it opens the public widget without sign-in. One signing key for the property code
  (`Community.widget_signing_key`, falling back to the app secret when `SECRET_KEY_BASE_v2` is unset locally).
- Legacy `SchedualToursController`: only the widget's actions skip sign-in; the staff pages redirect instead of raising.
- Widget: the move-in date is a calendar from the first click.
- Merged `origin/main` (Connect Locks, PR #35); the QA evidence folder stays local.

## Tests
Rails: booking 13/131, tour-app bookings 6/55, legacy slot check 5/27, plus the rest of `connect/` and `api/tour_app/` green. Connect: typecheck clean, Playwright `tourSettings.spec.ts` (7) and `tourModules.spec.ts` (5) green on the clone and on development. Tour app: typecheck clean, vitest 84 tests. End-to-end: real bookings through the legacy widget (Oeuvre 229) and the app (Hazel 1618) land in Connect Visitors; refusals verified on all three entry points; legacy pages byte-identical before/after on both databases.

## Owner actions
- Run the migration on `pyn-system` (additive) and restart the legacy app afterwards.
- Set `HOST_URL` on `pyn-system` so the Booking link resolves.
- Decide the prospect auth for the Tour App API (today super admins only).
