# Tour App: the check-in's ID step follows the server (`verification_required`)

Branch `improvement/fixing_the_schedule_date_chnage` → `main`. October 28, 2026.

## Why

The app decided the ID step locally. `checkinModel` showed "One step before you check in … Verify My ID" before every
check-in, on every property, until the visitor had walked through the simulated Verify Identity flow (agree to terms,
Simulate scan, Simulate selfie, card on file, Done). On October 28, 2026 two headless runs on John Pynwheel Demo 1411
(`tours.visual_id_verification = false`, visit answers `verification_required: false`) each had to pass the simulated scan
and card before the sheet offered Start In-Person Tour. The design intends the step only where the property requires it.

Only the visit answers (`POST /visits`) and the lock refusals (422 `verification_required`) carried the server's rule; the
property detail did not. So the change is one additive server field plus the app reading it.

## Server (additive, one key)

- `GET /properties/{id}` now carries **`verification_required`** (`TourApi::Properties.detail(…, auth:)`):
  - visitor session: `Visits::Rules.verification_required?` — the same answer the visits and lock endpoints give (true only
    on a `visual_id_verification` property whose visitor has no verification within 30 days);
  - staff session: whether the property asks at all (`tours.visual_id_verification`; the lock endpoints never gate staff).
- The detail is not cached server-side (only the list is), so the per-visitor answer is safe.
- `test/controllers/api/tour_app/v1/properties_test.rb`: the key is in the detail; a visitor on a plain property → false;
  on a verified-ID property → true, and false again once verified within 30 days (`is_checkpoint_verified`); staff → the
  property's flag.

## App (`tour-app/`)

- `Property.verificationRequired: boolean | null` (`apiTypes.ts`, `parsers.ts`, `property.model.ts`): null when an older
  server does not send it, never a silent false.
- `AppState.verificationRequired` (`appState.ts`): property-scoped (cleared on a property switch), persisted. Set by the
  new `verificationRequired` action (`reducer.ts`; an answer for another property is dropped) from the property detail on
  load (`AppProvider.tsx`) and from every visit answer (`useAppActions.ts` check-in, `visitSync.ts` offline resend).
- `needsIdVerification(state)` in `src/store/scenarios.ts` = `verificationRequired !== false && !isVerified(state)`. The
  check-in sheet asks on it: a `false` from the server goes straight to `ready` (Start In-Person Tour) in the at-property,
  uncertain-location and away variants; `true`, or nothing said yet (demo data), asks as the design shows; the simulated
  flow (`state.verified`) and the demo switch `demo.idVerified` still clear the ask. `isVerified` keeps its meaning for the
  profile badge and the Apply sheet. The pending request's step 2 reads "ID check · Not needed here" instead of "ID
  verified" when the server does not ask.
- Nothing changes for demo data or the dummy repository: their properties carry no flag, so the sheet asks as before.

## Tests

- Rails: `properties_test.rb` 8 runs / 51 assertions green; `visits_test.rb` + `locks_test.rb` unchanged and green (34 runs
  across the three files).
- `npm run typecheck` clean; `npm test` 20 files / 147 tests green, including the new cases in `scenarios.test.ts`
  (false → ready, true → verify, local flow and demo switch still force ready, null → verify, pending step text),
  `parsers.test.ts` (null / false / true parsing) and `qaFixes.test.ts` (reducer scope and property switch).

## Headless run against the dev stack (worktree Rails :3106 + Vite :3023, dev DB, Playwright, `America/Denver`, geolocation 39.7603,-104.9861)

1. **1411, booked slot, real location (main has no real geolocation yet):** a new visitor signed in with the on-screen OTP,
   booked the next slot (5:30 PM), waited for the Home card's Start Tour, tapped it. The property detail answered
   `verification_required = false`; the Verify Identity screen never appeared; the sheet was the "away" variant
   ("Start your tour once you arrive … 0.3 mi") because on `main` a real visitor is never "at property" without the
   location-proximity branch, and its options no longer carry "Verify your ID on the way".
2. **1411, at the property:** same sign-in and booking (the first slot was 9:00 AM; 1411 was closed when this ran, 01:30
   MDT), then the demo switches "Tour status: today" + "Location: At property". Start Tour → the check-in sheet read
   "You're at John Pynwheel Demo. Your 6:00 PM tour is ready. Check in to unlock doors for 45 minutes." with
   **Start In-Person Tour** as the primary; tapping it checked in ("Checked in · Door access active for 45 min"). The walker
   watched every screen for "Verify My ID / Verify Identity / One step before you check in / I agree to the self-tour
   terms": `verify step seen during the run: false`.
3. **Arbour Place 1601 (`visual_id_verification` on), at the property, the contrast:** same route (its bookings are paused,
   so no slot was booked; the demo "today" tour stood in). The property detail answered `verification_required = true`;
   Start Tour → the sheet asked ("One step before you check in", primary **Verify My ID**): `verify step seen during the
   run: true`. The simulated flow is unchanged for such properties.
4. A booked-slot run at the property with the real window open was not possible at this hour (1411 opens 04:00 MDT); the
   walker script is in the session scratchpad (`pw/run_1411b.sh`, select the demo location before the wait).

Residue: visitors `loc.*@example.test` (phones 30355xxxxx) with bookings at 1411 on the dev DB, as in earlier runs.
