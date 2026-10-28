# Tour App: the Schedule Self-Tour day is the property's calendar day, whatever the phone's zone

Branch `fix/tour-app-schedule-property-day` → `main`.

## The bug (October 28, 2026)

A phone in Asia/Karachi, where it was already 02:36 on Oct 28, scheduled a self-tour at John Pynwheel Demo 1411 (America/Denver, still 15:36 on Oct 27). The date row said "Today 27 Oct" (the week has started on the property's today since October 25), but the draft's day was the phone's Oct 28: the confirmation read "Today, Oct 28 3:45 PM" and `POST /properties/1411/bookings` carried `tour_date: 2026-10-28`, while the availability request before it asked for `date=2026-10-27`.

Cause: the Schedule draft was born with the phone's day (`initialSchedule` → `dayKey(0)`), `prefilledSchedule` clamped it to the phone's today, and `openSchedule` only moved a day that was *behind* the property's today, never one ahead of it. The confirmation label (`dayLabel`) counted "Today" from the phone's calendar too.

## What changes (Tour App only)

- `ScheduleDraft.date` starts empty and is anchored to the property's calendar: `scheduleDay` (views.ts) makes it the property's today when none is chosen or the chosen day has passed there, and leaves it alone while the property's zone is not known yet. `openSchedule`, the reducer's `prefilledSchedule` (property switch, sign-in gate) and `bookingLoaded` (the moment the rules and their zone arrive) all go through it. A day the visitor picked is kept; a booked tour still opens on its own day.
- `propertyZone` (views.ts): the loaded rules' zone, only when they belong to the property the visitor is on.
- `bookingRequestFor` (views.ts): the booking payload the hook sends (`date` = the property's day, `time` = the slot's `HH:MM`), extracted so the payload is tested as sent.
- `dayLabelInZone` (scenarios.ts): "Today, Oct 27" / "Tomorrow, Oct 28" relative to the property's today; `tourDayLabel` now uses it. The Schedule confirmation, the Book-a-Live-Tour day list (App.tsx) and the Upcoming sheet's "Today" pill (FlowSheets.tsx) use it instead of the phone-calendar `dayLabel`.
- Small fixes of the same kind: "Schedule a second visit" opens on the property's tomorrow, the live-tour sheet's fallback day and a synced booking without a date use the property's today, the move-in date floor is the property's today.
- Nothing else of the October 25 semantics moves: the grace window, `booked_at`, `zonedSlotMs`, the week strip, the slot filtering and the CMS-side validation are unchanged; the phone's calendar is still the fallback when no zone is known (demo data).

## Tests

- New `tour-app/src/store/scheduleDay.test.ts` (6): `Date` pinned to 2026-10-28T02:36:00+05:00 with `process.env.TZ=Asia/Karachi`, Denver rules and availability; the Schedule opens on 2026-10-27 at 3:45 PM on both the cold path (rules arrive after the screen) and the warm path (rules already loaded), keeps a picked day, moves a day that has passed at the property, labels "Today, Oct 27" / "Tomorrow, Oct 28", and the repository posts `tour_date: 2026-10-27`, `tour_time: 15:45`. The reducer test failed on the unfixed code with `2026-10-28`.
- `npm run typecheck` clean; `npm test` 21 files, 151 tests green.

## Headless verification (dev stack, Playwright Chrome, `timezoneId: Asia/Karachi`)

Real time, phone 04:39 Oct 28 PKT = property 17:39 Oct 27 MDT: the date row read `["Today 27 Oct [selected]", "Wed 28 Oct", …]`, the first slot was 6:00 PM, and the POST was
`{"tour_type":"self_tour","property_tour_type":"scheduled_tour","tour_date":"2026-10-27","tour_time":"18:00","length_minutes":45,"party_size":1}` (the dev Rails was being restarted at that moment, so that POST got no answer).

Page clock pinned with Playwright's clock API to 2026-10-29T00:36+05:00 (property 13:36 Oct 28, open hours) against the real server: date row `["Today 28 Oct [selected]", "Thu 29 Oct", …]`, slot 1:45 PM, confirmation "Today, Oct 28 1:45 PM · 45 min", POST `tour_date: 2026-10-28, tour_time: 13:45`, answered 201 with booking 24173 (`booked_at 2026-10-28T13:45:00-06:00`, `time_zone America/Denver`) for visitor `sched.3035595627@example.test` on the development database.

Dev residue: visitors `sched.30355xxxxx@example.test` at 1411, booking 24173.
