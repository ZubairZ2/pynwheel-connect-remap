Open the PR here: https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/legacy-visitor-auth-flow?expand=1

# Visitor sign-in and visits on the Tour App API; the Visitors tab reads them

## What this is

The new Tour App had no visitor identity (CMS Super Admins only) and recorded no visit, so its tours never appeared in
Connect › Visitors. This branch brings the legacy app's visitor flow (a phone number proven by a one-time code) onto the new
stack, server-enforced, and makes the app record what the legacy app recorded, on the same tables.

Three documents came first and are in the branch: `LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md` (how the legacy React Native app
created, authenticated and recorded visitors), `VISITOR_MANAGEMENT_ARCHITECTURE_PLAN.md` (current state, gaps, design,
threat model, phases) and `VISITOR_AUTH_IMPLEMENTATION_REPORT.md` (what was built and how it was tested).

## Finding that shaped it

Visitors do not log in to Connect. The Visitors tab is a staff tool behind the Devise session, CSRF token and property
scoping; that flow was verified end to end and left as it is. The visitor identity lives in the Tour App.

## Backend (Rails, additive)

- **Two principals in `Api::TourApp::V1`.** A staff Doorkeeper token (as before) or a visitor session token (`vst_…`). Every
  request resolves exactly one; a visitor context has no `user`, reaches only their own rows, and is refused by every
  Devise-protected page and by Connect's own API route.
- **Visitor sign-in.** `POST /visitor/otp` (six digits by SMS through the existing `TwilioSmsWorker`; the same answer whether the
  phone is known or not), `POST /visitor/otp/verify` (constant-time compare, five tries, ten minutes; a new phone answers
  `profile_required` and is created through the legacy dedupe `TourUserSearcherService`), `GET/PUT /visitor/me`,
  `POST /visitor/logout`, `DELETE /visitor/me`. Codes and tokens are stored only as digests on two new tables
  (`visitor_otps`, `visitor_sessions`); the legacy `tour_users.pin_code` flow is untouched. Sessions last 30 days, slide on use,
  and are revoked on sign-out and by Connect's "remove personal data".
- **Visits.** `POST /properties/:id/visits` (check-in with the legacy `user_tour_status` rules: visiting hours, booking window,
  optional 1 km radius, verification state), `POST …/visits/:id/events` (arrived, skipped, note, photo, issue, unlocked,
  unlock_failed, heartbeat; one savepoint per item, duplicates acknowledged by `client_event_id`), `POST …/visits/:id/end`.
  They write `tour_histories`, `visited_stops` and `lock_histories` as the legacy `save_tour_history` did, plus additive columns
  (`source`, `schedual_tour_id`, `client_visit_id`, `kind`, `occurred_at`, …), so Connect's Visitors and the legacy pages show a
  Tour App tour with no reader change.
- **Bookings.** A signed-in visitor books as themselves (identity fields ignored); `GET` list, `PUT` reschedule and `DELETE`
  cancel of their own bookings through the shared services. `Bookings::Cancel` is new and also what Connect's cancel calls.
  `Bookings::Create` now runs the slot check inside the transaction under a per-property advisory lock (closes a race the
  widget, Connect and the app all had).
- **Locks.** Issuance takes `visit_id`; the `igloohome_guests` row now names the visitor, the visit and the issuing staff user.
- **Hardening.** Rack::Attack throttles on staff login, OTP send and verify (per phone and per address), bookings, locks and
  visit events; PaperTrail audit versions with the principal on every write (`visitor_login`, `visit_started`, `visit_ended`,
  `booking_*`); `filter_parameters` extended (`otp`, `code`, `phone`, `email`, `guest_pin`, digests, …); two switches,
  `PYN_TOUR_VISITS` and `PYN_TOUR_VISITOR_AUTH` (production off), advertised as `capabilities` so either side rolls back alone.
- **Migrations** (3, additive; the index one concurrent): `20261023100000`, `20261023100001`, `20261023100002`.
  `db/schema.rb` also now includes the three upstream migrations pulled on October 22 that were unapplied locally.
- No legacy controller, model or view changed. `Visitors::Profile` labels skipped stops and reported issues and reports the
  session's `source`; Connect's generator and strings follow.

## Tour App (Capacitor)

"Sign in with your phone" shown only when the server offers it (staff sign-in collapsed under it); phone, code and profile
steps; a two-kind session restored through `/auth/me` or `/visitor/me`; a persisted outbox (`visitQueue.ts`, `visitSync.ts`)
that posts check-in, stops, notes, photos, issues, unlocks and the end, idempotently and with retries; a heartbeat while
checked in; cancel through the server; lock requests carrying the visit. Demo scenarios never call the visit endpoints.
One bug found in the browser run and fixed with a test: the shell forced the landing step before sign-in.

## How it was tested

| Check | Result |
|---|---|
| Rails suite (controllers, services, models): 327 runs, 2,048 assertions | pass with 1 pre-existing failure (`PartnerConfigurationsControllerTest`) |
| New Rails tests: visitor auth 11, visits 9, visitor bookings 4, throttles 3, booking concurrency 1 | pass |
| Tour App: typecheck, 133 vitest, production build; bundle grep for secrets | pass |
| Connect: typecheck, 26 vitest | pass |
| API journey on the audit clone: OTP → `profile_required` → sign-in → property → visit → events with a duplicate → end → logout → 401 | pass |
| App journey in the browser against the clone API: phone → code → profile → signed in → properties → reload restores the session | pass |
| Connect staff flow on the clone: sign-in → Oeuvre › Visitors lists the Tour App visit → profile with stop, code, note, timeline → reload → anonymous API 401 → sign-out redirects | pass |
| Legacy All Visitors, visitor detail, Scheduled Tours and the legacy self-tour API after the new rows | pass |
| Cross-visitor, cross-property, staff/visitor confusion, expired/revoked/bogus tokens, switches off | pass (tests) |
| In-app check-in by browser click, `bundle-audit`, iOS build, hardware, real SMS or lock calls | not run (see the report) |

No production data was read or written; everything ran on `pynwheel_test` and the local audit clone, where no Sidekiq
worker runs (the OTP SMS job was read from the local queue and deleted).

## Testing without Twilio (two later commits on the branch)

`PYN_TOUR_OTP_DEBUG=on` makes the "code sent" answer carry the code and the app shows it on the Enter your code step
(tap to fill); the switch is ignored in production whatever its value, and the app shows the field only when the server
sends it (tests on both sides). `scripts/show_visitor_otp.sh` prints the newest queued code on a Mac where no Sidekiq worker
runs. Neither changes the production flow.

## Deploy and rollback

Deploy, run the three migrations, keep both switches off (the production default), then turn `PYN_TOUR_VISITS=on` and later
`PYN_TOUR_VISITOR_AUTH=on`. Rollback is the switch, then the revert; rows already written stay valid for Connect.

## Still open (owner decisions from the plan)

Device token storage is Capacitor Preferences (Keychain / Keystore needs a plugin); selfie and ID images stay on a public S3
bucket; Doorkeeper staff tokens stay plaintext with a 5-day life; no retention jobs yet; the legacy request logger
(`impressions`) still records the legacy API's parameters; ID verification in the new app is a server-side flag with no
provider; Connect carries three pre-existing npm advisories. This is not a claim of a passed security review.
