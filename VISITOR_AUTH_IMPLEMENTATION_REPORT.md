# Visitor authentication and management: implementation report (October 23, 2026)

Branch `feature/legacy-visitor-auth-flow` (renamed from `docs/legacy-visitor-auth-flow`, which already carried the legacy study
and the architecture plan). Plan: [VISITOR_MANAGEMENT_ARCHITECTURE_PLAN.md](VISITOR_MANAGEMENT_ARCHITECTURE_PLAN.md).
Contract: [tour-app-backend-api.md](tour-app-backend-api.md) §21. Knowledge: [context.md](context.md) §42. Progress:
[PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) §48.

## 1. What was found before changing anything

- **The CMS Visitors tab has no visitor login.** It is a staff tool: Devise session, X-CSRF-Token on writes,
  `can_access_community?` for reads, `can_edit_map?` for writes, Super Admin for the privacy actions
  (`Connect::BaseController`, `Connect::VisitorsController`). "A visitor logged in through the Visitors tab" therefore means a
  staff member signed in to Connect resolving visitor records. That flow was traced and verified end to end (§5) and needed no
  authentication change.
- **The source of truth for visitor identity** is the `tour_users` row, deduped by phone and email through
  `TourUserSearcherService` by every writer (widget, legacy app, Connect, CRM webhooks, Tour App bookings). Bookings are
  `schedual_tours`; visits are `tour_histories` + `visited_stops`; Connect derives every status from those tables.
- **The legacy visitor flow** (phone + 4-digit OTP + non-expiring JWT in a query parameter, `/api/self_tour/v1`) is documented in
  [LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md](LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md). It was left exactly as it is.
- **The new Tour App** had no visitor identity (Super Admin login only) and recorded no visit; its lock issuances carried no
  visitor. Those were the gaps the plan's phases 0 to 3 close.

## 2. How visitor authentication now works

1. The app asks `GET /api/tour/v1/health` and shows "Sign in with your phone" only when `capabilities.visitor_auth` is true.
2. `POST /visitor/otp {phone}`: the server stores an HMAC digest of a six-digit code on `visitor_otps` (keyed by phone, whether or
   not a visitor exists) and queues the SMS through the CMS's `TwilioSmsWorker`. The answer is the same for any valid phone.
   Limits: ten minutes, five wrong tries per code, one send a minute and five a day per phone, ten an hour per address.
3. `POST /visitor/otp/verify {phone, code}`: constant-time compare; the newest `tour_users` row with that phone is the visitor;
   a new phone answers `profile_required`, and the app's profile step re-sends the code with first name, last name and email,
   which creates the row through the legacy dedupe (an earlier widget booking with the same email is reused).
4. The server issues a `vst_` session token (256-bit random, stored as a SHA-256 digest on `visitor_sessions`, 30 days, sliding
   on use). The app keeps `{kind: 'visitor', accessToken, visitor, capabilities}` in Capacitor Preferences and restores it with
   `GET /visitor/me`; a 401 (`invalid_token`, `token_revoked`, `token_expired`) clears it and returns to sign-in.
5. Every request resolves exactly one principal (`TourApi::Auth`): staff (Doorkeeper token, CMS Super Admin) or visitor. A
   visitor context has no `user`; `require_staff!` / `require_visitor!` guard the endpoints meant for one of them; a `vst_` token is
   refused by every Devise-protected page and by Connect's own API route (401). Sign-out revokes the session row; Connect's
   "remove personal data" revokes every session of the visitor; the visitor may delete their own account (`DELETE /visitor/me`,
   the legacy app's `delete_account` through the model's `dependent: :destroy` chain).

## 3. How the app integrates with the CMS

- **Bookings.** A signed-in visitor books as themselves (`Bookings::Create` with `visitor:`; the form's identity fields are ignored),
  lists, moves and cancels their own bookings only. Cancel is the shared `Bookings::Cancel` (row destroy, CRM callbacks, destroy
  version for Connect's Cancelled tab, `booking_cancelled` audit version); Connect's cancel calls the same service. The slot check
  now runs inside the transaction under a per-property advisory lock.
- **Visits.** Check-in (`POST /properties/:id/visits`) writes the `tour_histories` row the legacy app wrote, with the visiting-hours,
  booking-window and radius rules of `user_tour_status` re-expressed in `Visits::Rules`; the app's stop, skip, note, photo, issue,
  unlock and heartbeat events are a batch (`/events`) written to `visited_stops` and `lock_histories`, each item its own
  savepoint, duplicates acknowledged by `client_event_id`; the end (`/end`) sets `left` / `tour_state` and completes the linked
  booking. Lock issuance takes `visit_id` and the `igloohome_guests` row names the visitor, the visit and the issuing staff user.
- **Connect.** Nothing in the Visitors tab had to change to list a Tour App visit (status, type, source, on-site stop, sessions,
  timeline all derive from the same rows). The profile now labels a skipped stop and lists reported issues apart from the notes,
  and reports the session's `source`.
- **Flags.** `PYN_TOUR_VISITS` and `PYN_TOUR_VISITOR_AUTH` (production off, elsewhere on) are advertised as `capabilities` by
  health, login, me and property; the app hides what the server does not offer, so either side can be rolled back alone.

## 4. Files changed and migrations added

**Migrations (additive, concurrent indexes):** `20261023100000_add_visit_recording_columns`,
`20261023100001_add_visit_recording_indexes`, `20261023100002_create_visitor_sessions_and_otp`. `db/schema.rb` regenerated
(it also now carries the three upstream migrations the owner pulled on October 22, which were unapplied locally).

**Rails, new:** `app/models/visitor_session.rb`, `visitor_otp.rb`; `app/services/visitors/otp.rb`, `session.rb`;
`app/services/visits/rules.rb`, `start.rb`, `record.rb`, `end.rb`; `app/services/tour_api/visits.rb`, `audit.rb`;
`app/services/bookings/cancel.rb`; `app/controllers/api/tour_app/v1/visitor_auth_controller.rb`, `visits_controller.rb`.
**Rails, changed:** `tour_api/auth.rb` (two principals), `tour_api/properties.rb` (visitor access), `tour_api/locks.rb`
(attribution), `bookings/create.rb` (visitor principal, advisory lock), `visitors/privacy.rb` (session revocation),
`visitors/profile.rb` (event kinds, source), `connect/flags.rb`, `connect/visitors_controller.rb` (shared cancel), the Tour App
`base`, `auth`, `bookings`, `locks`, `health`, `properties` controllers, `config/routes.rb`, `config/initializers/rack_attack.rb`,
`config/initializers/filter_parameter_logging.rb`.
**Tests:** `test/controllers/api/tour_app/v1/visitor_auth_test.rb` (11), `visits_test.rb` (9), `visitor_bookings_test.rb` (4),
`throttle_test.rb` (3), `test/services/bookings/create_concurrency_test.rb` (1), `properties_test.rb` (capabilities key),
`test/support/tour_api_test_helper.rb` (job stubs).
**Connect:** `tourModules.data.ts`, `tourVisitors.generator.ts`, `config/app/strings.ts`, `resources/i18n/index.ts`.
**Tour App:** `services/session.ts`, `services/visitQueue.ts` (new), `store/visitSync.ts` (new), `store/appState.ts`,
`store/reducer.ts`, `store/useAppActions.ts`, `store/views.ts`, `store/AppProvider.tsx`, `screens/GetStartedScreen.tsx`,
`App.tsx`, `repositories/tourRepository.ts`, `repositories/pynwheelApi/{apiClient,apiTypes,parsers,pynwheelApiTourRepository}.ts`,
`repositories/dummy/dummyTourRepository.ts`; tests `visitQueue.test.ts`, `session.test.ts`, `visitorSession.test.ts`,
`visitorAuth.test.ts`, `authStepShown.test.ts`.
**Docs:** `tour-app-backend-api.md` §21, `context.md` §42, `PYN_CONNECT_PROGRESS.md` §48, `gaps_tour_setup_feature.md`, this report.
**Local only (not committed):** `.claude/launch.json` entries `rails-visitor-clone` (:3102) and `tour-app-visitor` (:3019).

## 5. Tests executed

| Check | Result |
|---|---|
| Rails full suite (`test/controllers test/services test/models`) | **PASS with 1 pre-existing failure**: 327 runs, 2,048 assertions, 1 failure (`PartnerConfigurationsControllerTest`, failing before this branch per the October 17 baseline), 0 errors, 7 skips |
| New Rails tests (visitor auth 11, visits 9, visitor bookings 4, throttles 3, concurrency 1) | **PASS** (28 runs) |
| Rails Tour App and Connect regression files (auth, bookings, locks, security, properties, Connect visitors, Connect booking) | **PASS** |
| Tour App `npm run typecheck` / `npm test` / `npm run build` | **PASS** (133 vitest in 19 files; build 124 modules) |
| Connect `tsc --noEmit` / vitest | **PASS** (26 tests) |
| API journey on the audit clone (`rails-visitor-clone` :3102): health → OTP (202, same body) → verify without profile (422 `profile_required`) → verify with profile (200, `vst_` token) → `/visitor/me` → `/auth/me` as visitor → property → stops → visit start (201) → start again (same id) → events (arrived + note + duplicate + heartbeat: 2 rows, 1 duplicate) → bogus token 401 → end (completed) → logout → 401 | **PASS** (evidence in the session scratchpad `e2e_api.log`; clone rows: visitor 16269, visit 22685, versions `visitor_login` / `visit_started` / `visit_ended`) |
| App journey in the browser pane (`tour-app-visitor` :3019 → :3102): onboarding → "Sign in with your phone" → phone → code (read from the local Redis queue, never sent) → profile step on `profile_required` → signed in (session kind `visitor`, `vst_` token) → properties → reload restores through `GET /visitor/me` | **PASS** (visitor 16270); found and fixed one bug (the shell forced the landing step before sign-in) with a regression test |
| App sign-out, in-app check-in → events → end | **NOT RUN in the browser** (pane clicks on the tab bar do not reach React); covered by `visitorSession.test.ts`, `visitorAuth.test.ts`, `visitQueue.test.ts` and the API journey |
| Connect staff flow on the clone (:3007 → :3102, Playwright, password read from a scratchpad file): sign-in → Oeuvre › Visitors lists "Visitor, E2E" as a completed walk-in → profile shows the session, "Arrived at Lounge · Code 1234", the note, the timeline → reload keeps the session → anonymous Next API 401 → anonymous Rails Connect JSON 401 → sign-out → protected page redirects to sign-in | **PASS** (screenshots `connect_visitors_list.png`, `connect_visitor_profile.png` in the scratchpad) |
| Legacy parity in-process (Warden, clone Super Admin): `/communities/229/tour_users` (lists the visitor), `/tour_users/16269` (shows the note), `/scheduled_tours`, Connect JSON, legacy `completed_tours` API | **PASS** (all 200) |
| Authorization: another visitor reading / driving a visit (404), another property (404/422), staff on behalf of a stranger (404), visitor on staff-only logout (403), staff on visitor-only routes (403), expired / revoked / bogus tokens (401), switches off (404 / 401) | **PASS** (tests) |
| Throttles (login per IP and email, OTP per phone and IP, verify, bookings, locks) | **PASS** (tests, 429 with `Retry-After`) |
| Concurrency: two threads for the last place in a slot | **PASS** (one `booked`, one `slot_full`) |
| `npm audit --omit=dev` | Tour App: 0 vulnerabilities. Connect: 3 (2 high, 1 critical), **pre-existing**, not addressed here |
| `bundle-audit` | **NOT RUN** (gem not installed; installing it is a toolchain change for the owner) |
| Secrets in the built bundle (`grep` for `vst_`, `TWILIO`, `SECRET_KEY` in `dist/assets/*.js`) | **PASS** (none) |
| iOS build, Bluetooth hardware, real SMS, real lock issuance | **NOT RUN** (no hardware; no SMS or vendor call is made locally by design) |

## 6. Security controls in place and what still needs a reviewer

In place: server-side ownership scoping on every visitor endpoint; two principals that never mix; hashed codes and tokens,
never logged (`filter_parameters` extended); uniform OTP answers; attempt and send limits; Rack::Attack on every sensitive
path; idempotency keys with unique indexes; advisory lock on bookings; PaperTrail audit with the principal on every write; the
legacy request logger (`impressions`) is not in the new controllers' chain; switches default off in production.

Not claimed: an independent security review. Items a reviewer must still look at, with the plan's decision numbers:
device token storage is Capacitor Preferences, not Keychain / Keystore (needs a plugin; D-storage); selfie and ID images remain
on a public S3 bucket (D7); Doorkeeper staff tokens remain plaintext with a 5-day life (D9); no retention jobs yet (D10);
`impressions` still records the legacy API's parameters and bodies (D8); ID verification in the new app is a server-side flag
read from legacy columns, with no provider (D5); `bundle-audit` not run; Connect's three pre-existing npm advisories.

## 7. Migrations, deployment, rollback

Order: deploy, run the three migrations (additive; the index one is concurrent and non-transactional), keep both switches off
(the production default), then turn `PYN_TOUR_VISITS=on` first and `PYN_TOUR_VISITOR_AUTH=on` second. Rollback: switch off
(the app hides the features at once and keeps today's local behaviour), then revert the deploy; rows already written stay
valid for Connect. The migrations are safe to leave in place.

## 8. Remaining risks and follow-ups

- Device storage of the session token (Keychain / Keystore plugin) and of door codes beyond the access window (now cleared on
  rehydrate after the window passes).
- The in-app check-in journey should be click-tested on a device or a Playwright run with a scripted tour before release.
- The app never sends `reason: abandoned`; signing out mid-visit leaves the visit to the 120-minute abandonment rule.
- A server-open visit is not resumed after a reinstall (`open_visit` from `/visitor/me` is returned but not adopted).
- `GET /properties/:id/bookings` and reschedule exist on the server; the app only uses create and cancel today.
- Clone residue: visitors 16269 and 16270, visit 22685, their sessions and versions; user 2181 on a new throwaway password.
