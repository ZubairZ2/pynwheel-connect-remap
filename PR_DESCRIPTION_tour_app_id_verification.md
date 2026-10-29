# Tour App: the real ID check — CheckpointID through Rails, the card on file, and a check-in that waits for both

Branch `feature/tour-app-real-id-verification` → `main`. October 28, 2026.

## Why

The Capacitor Tour App's Verify Identity was the design's mock: agree, "Simulate scan", "Simulate selfie", a fake card form, Done —
and a phone-local `state.verified` that nothing ever checked. The server only *reported* `verification_required` on a visit and
refused door codes; a visitor could check in unverified at a property that requires ID.

## What the audit found (and corrects in the brief)

- Rails has **no** CheckpointID code: the routes `tour_users#checkpoint_verification` (hosted onboarding page) and
  `tours#checkpoint_verification_response` (callback) have no actions behind them, in the tree or in history; no host, key or
  webhook exists; Heroku has no `CHECKPOINT*` config.
- The legacy app's live flow is not the hosted onboarding (that WebView is dead code) but its own camera capture
  (`CheckPointScreen/screens/*`): the phone posts the document and selfie to `https://dvs.checkpointid.com/api/verify` with the
  account's `sk_…` key embedded in the bundle, decides from `code` / `antiSpoofing ≥ 80` / `confidence ≥ 55`, then tells the API
  `initialize_tour?verfied_by_provider=check_point_id&verified_at=…`, which writes `is_checkpoint_verified` on the app's word.
- The legacy app never asked for a card before a CheckpointID tour; its card screen belonged to Authenteq's verification fee. The
  public widget collects a card at booking when `credit_card_required` (which defaulted to **true** on every `tours` row; this
  branch changes the column default to **false** for new rows with `20261029100000_change_credit_card_required_default_to_false`,
  existing rows keep their value).

## Server (additive endpoints, one behaviour change)

- `Verification::Checkpoint`: the same DVS request the legacy app sent, from Rails, key in `CHECKPOINT_DVS_API_KEY` (host
  `CHECKPOINT_DVS_URL`); the same three fields, thresholds and reasons; an unknown error code or a missing face result is never a pass.
- `GET /properties/{id}/verification` (`Verification::Status`): required / state / validity / attempts left / document types /
  card{required, on_file, needed, available, publishable_key}; the same rules the visits and lock endpoints apply.
- `POST /properties/{id}/verification` (`Verification::Attempt`): the pictures in, the provider's answer as the server read it out;
  a pass writes `is_checkpoint_verified` / `checkpoint_verified_at` / `verified_by`; a failure queues the legacy
  `mis_match_verification` mail (same subject, text, reason) once per visitor and property a day; five attempts an hour; 503 when
  the provider is down or unconfigured; `mismatch_flagged` / `not_required` / `provider_unsupported` (Authenteq stays retired).
  Audit rows carry the outcome and code only; no picture is stored or logged.
- `POST /properties/{id}/verification/card` (`Verification::Card`): a Stripe.js `tok_…` → the CMS's own `create_customer` →
  `strip_customer_id`, `card_last_digits`. Card numbers are refused.
- **`Visits::Start` now refuses** a visitor's on-site check-in: 422 `verification_required` while the property's rule holds, 422
  `card_required` while `Verification::Status.card_needed?` holds (a verified-ID property whose form asks for a card, no card on
  file). Staff and virtual tours are not gated. The card gate is deliberately scoped to verified-ID properties: on the raw flag it
  would block walk-ins everywhere.
- Rack::Attack throttle on the two POSTs. Config to set on Heroku: `CHECKPOINT_DVS_API_KEY`. The key in the legacy bundle should be rotated.

## App (`tour-app/`)

- `state.verified` / `requireCard` and the simulated actions are gone. `state.verification` is the server's status, written only
  from server answers; `isVerified` / `needsIdVerification` read it (the Demo scenarios switch still stands in on demo data).
- The flow: intro (consent; the server's word: loading, unreachable, provider down, mismatch flagged, attempts exhausted, not
  required) → document type → camera for front / back / selfie (`getUserMedia`, photo-picker fallback, 1600 px JPEG) → pending →
  result (reason, attempts left, Scan again / Try again / Check status, Call leasing) or card (Stripe.js Element, token only,
  honest unavailable state) → Done with the server's `valid_until`.
- `POST /visits` refusals (`verification_required`, `card_required`) open the flow and continue the check-in after it. A lost
  request re-reads the status before showing a retry. Native camera permissions added (iOS `NSCameraUsageDescription`, Android `CAMERA`).

## Tests

- Rails: `test/services/verification/checkpoint_test.rb` (5), `test/controllers/api/tour_app/v1/verification_test.rb` (9),
  `visits_test.rb` updated; Tour API files green. Whole suite 373 runs / 4 failures, all pre-existing and unrelated (`maps_test` ×2,
  `partner_configurations_controller_test`, `visitor_auth_test` debug-code case when run after other files).
- App: `tsc` clean; vitest 24 files / 169 tests (new `verifyFlow.test.ts`, `verification.test.ts`, `idCapture.test.ts`);
  `npm run build` and `cap sync` clean.

## Headless QA (dev DB, a local stand-in for the DVS endpoint — stubbed provider answers, not sandbox ones)

Hazel 1618: new visitor → status `required, never` → `POST /visits` 422 `verification_required` → passport + selfie through the
fake camera → pending → server row written → Done "Valid for 30 days · until Nov 27, 2026 · CheckpointID" → `POST /visits` 201
→ profile "Verified · valid until Nov 27, 2026". Face mismatch: the server's reason, "4 attempts left this hour", the leasing mail
job queued once with the legacy subject, Scan again → Done. Provider down: "Verification is unavailable right now", Try again
re-sent the kept pictures → Done. Arbour Place 1601 (card required): the card step's unavailable state (no Stripe keys here),
`POST /visits` 422 `card_required`. Details in `tour-app-implementation.md` §24 and `tour-app-backend-api.md` §24.

## Not exercised

A real CheckpointID answer (no server-side key configured; the legacy bundle's key was not used), a real Stripe token (no keys
here), the camera on a physical iPhone / Android, and the design file (sign-in required in the browser pane; the screens keep
§19's design-derived layout and tokens).

Dev residue: visitors `idv.71xx@example.test` (phones +1303555710x) on `pynwheel_development`, verified rows and two ended visits at
Hazel, one verified row at Arbour Place; Hazel's `communities.email` was set to `leasing.hazel@example.test` for the mail test and
cleared again.
