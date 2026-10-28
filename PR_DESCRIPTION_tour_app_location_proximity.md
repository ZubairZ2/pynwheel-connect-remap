# Tour App: the phone's real location, the server's proximity verdict, presence during the tour, and the properties near you

Branch `feature/tour-app-location-proximity` → `main`. Compare: https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/tour-app-location-proximity

## Why

The legacy React Native app gated an in-person self-tour on a GPS fix that Rails compared with the property inside a 1 km circle, and emailed the property when a later fix fell beyond it. The new Capacitor app reproduced those screens without the mechanics: no geolocation plugin, a 1.5 s timer as "permission", "at the property" meant the visitor tapped Allow, the simulated QR code and "Use my location" started a tour from anywhere, and `POST /visits` never carried coordinates. The server's own rule only refused `only_scheduled_tour` properties and a missing fix never blocked anything. Audit and plan: `~/.claude/plans/pasted-content-id-7bc4-plan-modular-bonbon.md` (owner decisions of October 28, 2026 inside).

## What changed

**Server (`Api::TourApp::V1`, additive, flag-gated)**
- `Visits::Rules.proximity`: the phone's fix judged against the property with its error circle → `verified` / `outside` / `unverified_no_fix` / `unverified_poor_accuracy` / `unverified_no_property_coords` (150 m accuracy gate, 1 km radius kept). Nothing missing ever counts as presence; the legacy helper's `rescue true` is not repeated.
- `Visits::Start`: an in-person (self / guided) check-in by a visitor is refused 422 `outside_property` when `outside`, on every property (the legacy client's rule, now server-side), and 422 `location_unverified` for any `unverified_*` state while `PYN_TOUR_LOCATION_REQUIRED` is on (`capabilities.location_required`; production default off). Staff and virtual visits are never refused. New params `accuracy_m`, `fix_at`; new columns `tour_histories.accuracy_m`, `fix_at`, `proximity`; a reused visit answers the new fix's verdict but keeps the check-in's on the row.
- `visit_json`: `proximity` (never nil), `distance_m`, `accuracy_m`, `fix_at`, `presence`, `server_time` (also on `GET /health`).
- The arrival email ("A tour has begun") goes out for a `verified` in-person check-in and for a virtual one, not for an unverified in-person one (the legacy app emailed within 1 km only).
- `Visits::Presence` + the `location` event kind (`payload {lat, lng, accuracy_m}`): a compact presence state on the visit (no sample stored); a departure is confirmed after three readings beyond 1 km + 250 m over at least five minutes and emails "Visitor has departed" once per visit; a reading inside resets the count and marks a return; stale, out-of-order, repeated and too-coarse readings change nothing. `PYN_TOUR_PRESENCE` (`capabilities.presence`).
- `GET /properties?near=lat,lng&radius_km=&limit=`: the properties with coordinates within reach (≤ `PYN_TOUR_NEAR_RADIUS_KM`, 25), nearest first, each with `distance_m`; coordinates never leave the server; the plain list is unchanged.
- `latitude` / `longitude` / `lat` / `lng` / `accuracy_m` / `near` are filtered from the request log.
- Migrations `20261028100000` (proximity columns) and `20261028100001` (presence columns).

**App (`tour-app/`)**
- `@capacitor/geolocation` 8.2.4 behind `src/services/location.ts`: permission state (prompt / granted / coarse / denied / denied_forever / services_off / unavailable), one accuracy-aware wait for a reading (first within 50 m, else the best within 200 m after 12 s, else `poor_accuracy` with the best effort), a shared watch for samples, a browser fallback. iOS usage strings; Android coarse + fine while in use, never background.
- The check-in sends the reading and reads the server's verdict: `verified` starts the tour; `outside_property` / `location_unverified` keep the visitor on the sheet with the reason, Refresh location, Call leasing, Reschedule and the virtual tour. The sheet asks to turn on location only when the server needs it. The simulated QR and "Use my location" now only select the property. A check-in kept on the phone while offline cannot ask for a door code until the property confirmed it; a late refusal ends that phone-side session. A phone clock more than five minutes off the server's gets a toast.
- Presence samples: every two minutes in the foreground the freshest accurate reading goes as a `location` event instead of a bare heartbeat; the outbox keeps the newest ten per visit.
- Home "Near you" row from `GET /properties?near=` with real distances on the real provider (demo listings only on dummy data); a tap selects.

## Verified

- Minitest: `test/services/visits/rules_test.rb` (4), the check-in matrix and presence cases in `visits_test.rb` (+11), the near query in `properties_test.rb` (+1); the Tour App API suite: 143 runs, 1147 assertions, only the two pre-existing `maps_test.rb` SVG failures (they fail on `main` too).
- vitest: 156 cases green (`location.test.ts`, scenarios, reducer refusals, repository body/parse, outbox prune); `npm run typecheck` clean; `npx cap sync` done.
- Real data, dev stack (Rails :3105 on `pynwheel_development`, all four flags on): a real visitor against John Pynwheel Demo 1411 — no fix → 422 `location_unverified` (`unverified_no_fix`); 3 km → 422 `outside_property` (`distance_m` 3002); 800 m with a 400 m circle → 422 `unverified_poor_accuracy`; 300 m → 201 `verified`, visit 21698, one "A tour has begun"; reuse with a 3 km fix → `outside` in the answer, `verified` kept on the row; location events on_site → leaving → on_site → leaving ×2 → departed (one "Visitor has departed") → away → returned. Near Burnaby: Hazel 1618 and 2000 at 1 m, Arbour Place at 45 m; near Denver: 1411 at 6 m. Hazel 1618's dev-only coordinates were corrected from Lahore to its Burnaby address (49.2289979, -122.9973885) first.
- The app itself, headless Chrome (`timezoneId America/Denver`, `context.setGeolocation`), two fresh visitors: sign-in by OTP → `GET /properties?near=` fires from the first quiet fix → John Pynwheel Demo → book the next slot → the Home card turns into Start Tour inside the grace window → the simulated ID step → Start In-Person Tour. **Inside** (300 m, accuracy 15 m): the app posted `latitude, longitude, accuracy_m, fix_at`, the server answered 201 `verified` (visit 21699) and the app moved to "Before You Start · Checked in · Door access active for 45 min". **Outside** (3 km): 422 `outside_property` (`distance_m` 2997); the sheet reads "Start your tour once you arrive — You're about 1.9 mi from John Pynwheel Demo. When you're at the property, try again…" with Try Again, Refresh location, Call leasing, Reschedule and the virtual tour; Try Again posted again and was refused again. No console errors.

## Not in this PR (found on the way)

- The app still asks for its local simulated ID verification before every check-in (`state.verified`), whatever the server's `verification_required`.
- The Schedule screen takes "today" from the phone's zone: a browser in Asia/Karachi booked Oct 28 for a Denver property whose today was Oct 27 (the booking was posted with `tour_date 2026-10-28`).
- `config.lograge.formattter` (a typo) is left as is on purpose: `lib/lograge/formatters/json_custom.rb` reads an undefined `data` and logs an error on every request once wired in. Fix the formatter before fixing the typo.
- 39 communities share one Lahore coordinate pair and 38 have none; with the strict gate they answer `unverified_no_property_coords` until their coordinates are set.
- Production flags to set when ready: `PYN_TOUR_LOCATION_REQUIRED=on`, `PYN_TOUR_PRESENCE=on` (`heroku config:set` on `pyn-system`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
