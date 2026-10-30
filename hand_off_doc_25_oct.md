# Hand-off: Pynwheel work from October 22 to October 25, 2026, and the next brief

Written October 25, 2026 (00:56 PKT) for a new Claude chat picking up this repository. Everything below was confirmed
against git, GitHub, Heroku and the files on disk at that moment. Earlier history is in `hand_off_doc_22_oct.md`
(October 18 to 22), `PYN_CONNECT_PROGRESS.md` §1–§48 and `context.md` §1–§42.

Repository: `/Users/zubairzulifqar/pynwheel-staging` (GitHub `ZubairZ2/pynwheel-connect-remap`, default branch `main`;
`upstream` is `Pynwheel/pynwheel-staging`). Owner: Zubair Zulfiqar (git author `ZubairZulfiqarZ2 <zubair.zulfiqar@7vals.com>`
in this checkout; the GitHub account that opens and merges PRs is `ZubairZ2 <zubair@pynwheel.com>`).

---

## 1. Read this first: the state at hand-over

| Item | Value |
|---|---|
| Checked-out branch | `feature/otp-test-phones-staging` at `0ce40c075` (one commit on top of `main`), pushed; **PR not opened yet** |
| `main` | `15471c463` = merge of PR #39 (visitor sign-in and visits), equal to `origin/main`; **deployed to Heroku `pyn-system` by the owner** (`git push heroku main:main`, release v24) |
| Uncommitted | only the owner's Xcode files (`tour-app/ios/App/App.xcodeproj/project.pbxproj`, `Info.plist`) and `app/.DS_Store`; never revert or commit them |
| Untracked root files | `PR_DESCRIPTION_*.md` (owner's convention), `hand_off_doc_*.md`, `HANDOFF_*.md`, the October 17 briefs, `db_compat_audit/`, the two design exports |
| Local servers (may be dead after a restart) | `rails-visitor-lan` → Rails on **:3020**, bound 0.0.0.0, DB `pynwheel_prod` (the local prod copy), `PYN_TOUR_VISITS=on PYN_TOUR_VISITOR_AUTH=on PYN_TOUR_OTP_DEBUG=on API_ACCESS=true PYN_CONNECT_WRITES=on HOST_URL=http://192.168.0.106:3020`; `connect-visitor-verify` → Next.js on **:3007**, bound 0.0.0.0, CMS URL `http://192.168.0.106:3020` |
| Mac LAN address | `192.168.0.106` on the owner's Tenda Wi-Fi (it was `.102` on Oct 23 and `.101`/`.227` before: **re-check `ipconfig getifaddr en0` before every APK**) |
| APK on the phone | `artifacts/pynwheel-tour-visitor-2026-10-24-tenda.apk` (API `http://192.168.0.106:3020`, demo scenarios on, code shown on the Enter your code step). Also built: `…-2026-10-24-heroku.apk` (API `https://pyn-system-16a05cad79df.herokuapp.com`) and `…-2026-10-23-lan.apk` (`.102:3020`, stale) |
| Databases migrated to `20261023100002` | `pynwheel_development`, `pynwheel_test`, `pynwheel_audit_clone`, `pynwheel_prod` (local copy). **Heroku `pyn-system` is NOT migrated** (its last is `20261022120000`) |
| Heroku `pyn-system` config | has `TWILIO_*`, `HOST_URL`, `PYN_CONNECT_WRITES`, `SECRET_KEY_BASE_v2`; **does not** have `PYN_TOUR_VISITS`, `PYN_TOUR_VISITOR_AUTH`, `PYN_TOUR_OTP_TEST_PHONES`, `PYN_TOUR_OTP_TEST_CODE` (the classifier refused `heroku config:set`; the owner must run it) |

Nothing is in flight: no partially applied change. The owner interrupted the start of the next brief (§7) to ask for this document.

---

## 2. What landed on `main` since October 22

### PR #39 — Visitor sign-in and visits on the Tour App API; the Visitors tab reads them (merged Oct 23, 00:20 UTC, `15471c463`)
Branch `feature/legacy-visitor-auth-flow` (renamed from `docs/legacy-visitor-auth-flow`). Five commits. Docs:
`LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md` (how the legacy RN app did it), `VISITOR_MANAGEMENT_ARCHITECTURE_PLAN.md` (plan, threat
model, decisions D1–D15), `VISITOR_AUTH_IMPLEMENTATION_REPORT.md` (what was built, test matrix), `PR_DESCRIPTION_visitor_auth.md`;
contract `tour-app-backend-api.md` §21; `context.md` §42; `PYN_CONNECT_PROGRESS.md` §48; `gaps_tour_setup_feature.md` Oct 23 update.

- **Finding that shaped it:** visitors never log in to Connect (the Visitors tab is staff-only behind Devise/CSRF/property scoping).
  The visitor identity lives in the Tour App: phone number + six-digit one-time code (`Visitors::Otp`, table `visitor_otps`),
  then a `vst_…` session token stored as a SHA-256 digest (`Visitors::Session`, table `visitor_sessions`, 30 days sliding).
  `TourApi::Auth.authenticate` answers a staff `Context` (Doorkeeper, Super Admin) or a `VisitorContext`; `require_staff!` /
  `require_visitor!` in `Api::TourApp::V1::BaseController`; a visitor sees tour-enabled properties minus `restrict_access` ones.
- **Endpoints:** `POST /visitor/otp`, `POST /visitor/otp/verify` (422 `profile_required` for a new phone → created through the
  legacy dedupe `TourUserSearcherService`), `GET/PUT/DELETE /visitor/me`, `POST /visitor/logout`; `GET/PUT/DELETE
  /properties/:id/bookings[/:id]` (visitor's own; `Bookings::Cancel` is shared with Connect's cancel); `POST /properties/:id/visits`
  (check-in, `Visits::Start`: visiting hours, booking window ± grace, optional 1 km radius, verification state; idempotent on
  `client_visit_id` and on an open visit), `POST …/visits/:id/events` (`Visits::Record`: arrived/skipped/note/photo/issue/unlocked/
  unlock_failed/heartbeat, per-item savepoints, duplicates acknowledged), `POST …/visits/:id/end` (`Visits::End`, completes the
  linked booking). Locks take `visit_id`; `igloohome_guests` now names visitor, visit and issuer.
- **Tables (additive):** `tour_histories.schedual_tour_id/source/client_visit_id/ended_reason/location_received`;
  `visited_stops.kind/occurred_at/tour_history_id/client_event_id/payload`; `lock_histories.provider/method/success/error_code/client_event_id`;
  `igloohome_guests.tour_history_id/issued_by_user_id`; new `visitor_sessions`, `visitor_otps`. Migrations `20261023100000..02`.
- **Hardening:** Rack::Attack on staff login, OTP send/verify, bookings, locks, visit events (off in test unless a test enables it);
  PaperTrail audit versions with the principal; `filter_parameters` extended; `Bookings::Create` slot check under
  `pg_advisory_xact_lock(7312026, community_id)`; switches `PYN_TOUR_VISITS` / `PYN_TOUR_VISITOR_AUTH` (production off) advertised
  as `capabilities` by health, login, me and property.
- **Tour App:** "Sign in with your phone" (shown only when the server offers it; staff sign-in collapsed under it), code and profile
  steps, two-kind session (`staff`/`visitor`) in Capacitor Preferences (Keychain is a follow-up), persisted visit outbox
  (`src/services/visitQueue.ts`, `src/store/visitSync.ts`), heartbeat while checked in, cancel through the server. Fixed in the
  browser run: `App.tsx` forced the landing step before sign-in (`authStepShown` + test).
- **Connect:** `Visitors::Profile` labels skipped stops and reported issues and reports the session `source`; generator + strings.
- **Verified:** Rails 327 runs / 1 pre-existing failure (`PartnerConfigurationsControllerTest`); Tour App typecheck + 134 vitest +
  build; Connect 26 vitest; API journey and app journey on the clone; Connect staff flow by Playwright; legacy pages in-process.
- **Later commits on the same branch (merged with it):** the "code sent" answer carries `debug_code` when `PYN_TOUR_OTP_DEBUG=on`
  (non-production only) and the app shows it on the Enter your code step (tap to fill); `scripts/show_visitor_otp.sh` prints the
  newest queued code from Redis `queue:message` (no Sidekiq worker runs locally, so no SMS is ever sent).

### Not merged: `feature/otp-test-phones-staging` (`0ce40c075`, pushed)
`PYN_TOUR_OTP_TEST_PHONES` / `PYN_TOUR_OTP_TEST_CODE` now apply in every environment including production mode: the listed
numbers take the fixed code, get no SMS and see the code; every other phone keeps the real SMS and no disclosure.
Needed because Heroku `pyn-system` runs `RAILS_ENV=production` (and, per memory, on the production database), where
`PYN_TOUR_OTP_DEBUG` is ignored by design. Text: `PR_DESCRIPTION_otp_test_phones.md`. Compare link:
`https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/otp-test-phones-staging?expand=1`.
Tests: `visitor_auth_test.rb` 12 runs green.

---

## 3. Owner actions still open

1. Open and merge the PR for `feature/otp-test-phones-staging` (or drop it if Heroku testing is abandoned).
2. Heroku `pyn-system`, only if the Heroku APK is to be used: deploy `main` after that merge, then
   `heroku config:set -a pyn-system PYN_TOUR_VISITS=on PYN_TOUR_VISITOR_AUTH=on PYN_TOUR_OTP_TEST_PHONES=+1111111111 PYN_TOUR_OTP_TEST_CODE=123456`,
   then `heroku run -a pyn-system rails db:migrate` (three additive migrations; the app is on the production database, so this was
   left to the owner). Until then the visitor endpoints 500 there.
3. Git identity: the owner asked for commits as `zubair@pynwheel.com`. The classifier refused `git config` and the author rewrite
   in auto mode. To do by hand: `git config user.email zubair@pynwheel.com && git config user.name ZubairZ2`. The five PR #39
   commits keep the 7vals author (merged; rewriting them is moot).
4. The plan's open decisions D5 (ID verification in the new app), D7 (`fog_public` images), D9 (Doorkeeper token hashing/TTL),
   D10 (retention jobs), D11 (CI), D13 done (self-delete), device Keychain storage.
5. From the previous hand-off, still open: production deploy + `20261018090000` index migration (now superseded by the Heroku
   deploy of `main`, which also needs the three new migrations), `HOST_URL` on `pyn-system` (now set), SDK 3.5.0 hardware result,
   iOS plugin wiring, Tour App auth product decision (now answered: prospects sign in by phone).

---

## 4. Working rules (unchanged, restated)

- **Never push to `main`**; "commit and push" = push the branch + `PR_DESCRIPTION_<topic>.md` + compare link. `gh` on this Mac
  (`ZubairZulfiqarZ2`) is pull-only on the remap repo; always pass `--repo ZubairZ2/pynwheel-connect-remap`.
- **No AI attribution** in commits or PRs.
- **Legacy HTML CMS stays as it is**; new behaviour under `Connect::` JSON controllers and `Api::TourApp::V1`; migrations additive.
- **Production database:** read-only via `~/.pynwheel_ro_url`, queries alone; the local `pynwheel_prod` copy is a copy, but it holds
  real visitor rows (signing in with a real visitor's number opens their bookings; use made-up numbers).
- **Auto-mode classifier:** batched reads with a `pynwheel_prod` psql query get denied (run it alone); `git config`, author
  rewrites, `heroku config:set` were refused this week ("Git Destructive" / "Security Weaken") — switch to manual mode or hand the
  command to the owner. A `db:migrate` against any non-dev database re-dumps `db/schema.rb`: restore it (`git restore db/schema.rb`)
  or re-dump from `pynwheel_development`.
- **Never send real SMS or issue real lock credentials during QA.** Locally no Twilio creds exist; Heroku has them.
- Preserve the owner's uncommitted Xcode files; do not create worktrees unless asked.

---

## 5. Environment and recipes that worked this week

- **Rails toolchain:** `~/.rvm/rubies/ruby-3.3.5` by PATH; a runner script pattern: `DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
  LC_ALL=en_US.UTF-8 RAILS_ENV=test DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_test bundle exec rails test <files>`, files
  one at a time with a timeout; filter `objc\[|fog_provider|No valid API key|bathrooms`.
- **Test DB:** the harness refuses to run with pending migrations instead of loading `schema.rb` → `RAILS_ENV=test rails db:migrate`
  by hand after adding migrations.
- **Test traps:** a non-transactional test must restore every fixture column it touches and delete its rows (one leftover
  `TourSetting` made 14 unrelated tests fail); `versions` has no primary key (`.last` needs an order); a `TourUser` with an empty
  phone only via `update_column`; Rack::Attack stays off in test (throttle tests enable it with a MemoryStore).
- **Launch entries (`.claude/launch.json`, git-ignored):** `rails-visitor-lan` (:3020, 0.0.0.0, `pynwheel_prod`), `connect-visitor-verify`
  (:3007 → :3020), `rails-visitor-clone` (:3102, audit clone), `tour-app-visitor` (Vite :3019 → :3102). Port 3000 was held by another
  session's Rails; do not kill it. PID paths must be in the live session's scratchpad or the entry dies at boot.
- **APK:** `tour-app/.env.production.local` → `VITE_TOUR_API_URL=http://<ip>:3020`; `VITE_DEMO_SCENARIOS=on npm run build && npx cap sync android`;
  `cd android && JAVA_HOME=~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home ./gradlew assembleDebug`; copy
  `android/app/build/outputs/apk/debug/app-debug.apk` to `artifacts/`; verify the baked URL with `unzip -p … 'assets/public/assets/*.js' | grep -o 'http://…'`.
- **Sign-in codes locally:** the server returns `debug_code` and the app shows it; or `scripts/show_visitor_otp.sh [digits]`.
- **Connect staff flow headless:** Playwright from `pyn-connect-web/node_modules` (`channel: 'chrome'`), sign-in form
  `input[name=email]` / `input[name=password]` at `/sign-in`, password read from a scratchpad file (never typed into the transcript);
  the Visitors list prints names as "Last, First"; the Visitors tab is a button named "Visitors" on `/properties/:id/tour-setup`.
- **Browser pane traps:** tab-bar clicks in the Tour App do not reach React (use `javascript_tool` to click, `get_page_text` to read);
  screenshots are 800×600 frame vs 1024×768 viewport; the pane cannot take a password.
- **Phone:** USB debugging on the A02s is authorised (`adb devices`); install with `adb install -r <apk>`; `adb logcat -s IgloohomeBle`
  for Bluetooth.
- **Test data:** Oeuvre 229 (widget-live bookings, slots :01/:16/:31/:46), Hazel 1618 (igloohome v1, Funnel-managed), John Demo 1411,
  Floor-Level 3539; dev DB lacks Cypress Terra 8005. Residue on the audit clone: visitors 16269/16270, visit 22685, user 2181 on a
  throwaway password; on `pynwheel_prod` (local copy): OTP rows for +13035559884 and whatever the owner tested from the phone.

---

## 6. Where to read more

| Topic | File |
|---|---|
| Legacy visitor flow | `LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md` |
| Visitor architecture plan, threat model, decisions | `VISITOR_MANAGEMENT_ARCHITECTURE_PLAN.md` |
| Implementation report and test matrix | `VISITOR_AUTH_IMPLEMENTATION_REPORT.md` |
| API contract | `tour-app-backend-api.md` §21 (earlier §19–§20 for booking and stops) |
| Implementation knowledge | `context.md` §42 (§39–§41 for Settings, Visitors, Start Tour) |
| Progress log | `PYN_CONNECT_PROGRESS.md` §48 |
| Gaps | `gaps_tour_setup_feature.md` (Oct 23 update; T5 "Publish to Touch App" is still a dialog that says publishing from Connect is unavailable) |
| Previous hand-off | `hand_off_doc_22_oct.md` |
| Memory notes (auto-loaded) | `~/.claude/projects/-Users-zubairzulifqar-pynwheel-staging/memory/`, see `visitor-auth-visits-oct-2026.md` |

---

## 7. The next brief (not started)

The owner pasted the brief below on October 25 and interrupted before any investigation ran. Facts already known that bear on it:

- **Publish:** Connect's "Publish to Touch App" button is a dialog saying publishing from Connect is not available (gap T5 / M2);
  the Touch and Tour apps read the live tables, so **Save is the real publish**. The Tour App API caches built graphs per property
  (`TourApi::Engine`, versioned ETags on `/graph`, `/map`, `/stops`); the app persists its state (`tourOrder`, `selected`, bundle) in
  Preferences (`src/store/appState.ts` PERSISTED_KEYS) and reloads a property on selection. The stale-configuration symptom is
  therefore app-side caching plus server-side engine cache, not a draft/published split.
- **Early completion:** the app can run a tour without a server visit (demo scenario, capability off, or network fallback →
  `visit.status = 'local'`), and a visit started outside a booking's window is a walk-in (`Visits::Start` links a booking only inside
  booked time ± `grace_period`; a named `booking_id` outside the window answers 422 `outside_window`). The booking is completed
  only by `Visits::End` of a linked visit, so the CMS keeps it `Upcoming` while the app shows its local "completed" summary.
- **Timezone:** `schedual_tours.tour_date` (date) + `tour_time` (time, no zone) are combined in the property zone by
  `Visitors::Status.booked_at`; the API sends `tour_date` ISO + `tour_time` HH:MM; `Bookings::Availability` uses
  `community.get_time_zone` (legacy `communities.time_zone`, "UTC" → default). How the app turns those into "today/tomorrow" is the
  thing to trace (`tourFromBooking` in `src/store/useAppActions.ts`, the device clock). The new CMS Settings tab shows the property
  time zone read-only from the legacy column (check `Scheduling::Settings#as_json` `time_zone_effective`).
- **Scheduler widget:** legacy ERB (`app/views/scheduler_widget/widgets/test_widget.html.erb`, ~1,100 lines, jQuery), reached by
  `GET /scheduler_widget/test_widget?community_id&community_code&direct=true`; Connect embeds it by URL only.
- **Property filter:** `TourApi::Properties.list(context, tour_only:)`: the app passes `?tour_enabled=true` when it wants only
  tour-enabled properties (check `src/repositories/pynwheelApi/pynwheelApiTourRepository.ts` `listProperties`); a visitor's list is
  already filtered server-side to tour-enabled, non-restricted properties.
- **Prefill:** the visitor profile (`state.user` for a visitor session) feeds `profileOf`; the Schedule screen collects first, last,
  phone (`ScheduleScreen.tsx`); for a visitor the server ignores identity fields anyway.
- **Marketing source required:** `tour_settings.marketing_source_required`; the Settings tab enables it only for
  `community.data_provider == 'realpagesvc'` (check `Scheduling::Settings` and `tourScheduling.generator.ts`); Hazel's `data_provider`
  is Funnel-managed per memory, so "disabled" is probably expected: verify against `communities.data_provider` on `pynwheel_prod`.
- **Grace / length limits:** `tours.grace_period` (default 10) and `tour_settings.length_stay_limit` (default 45); the Settings tab
  steppers and `Connect::BookingController` validation are where to look (`test/controllers/connect/booking_controller_test.rb`).

The brief, verbatim:

```
# Pynwheel CMS & Self Tour App — Bug Verification, Publishing Architecture, Scheduling and End-to-End QA

Act as a senior full-stack engineer, software architect, and QA engineer. Investigate the reported issues across the new Next.js
CMS, Capacitor Self Tour App, backend, database, and legacy scheduling components.

The app is installed on a connected physical phone. Use the available device to reproduce and verify the reported issues where
possible.

## Critical Working Rule: Discuss Approaches With Me Before Making Changes

Do not immediately start fixing bugs or implementing your preferred solution. I want to participate in the architectural decisions.

Follow this approval process:
1. Investigate first: Read the relevant documentation and code, trace each flow end to end, and reproduce the reported behavior.
2. Report verified findings: Classify each issue as CONFIRMED BUG, EXPECTED BEHAVIOR, NOT REPRODUCED, or BLOCKED. Include evidence
   and the likely root cause.
3. Recommend solutions: For each confirmed bug or architectural gap, explain the recommended approach, viable alternatives,
   trade-offs, security implications, and performance impact.
4. Request my approval: Present a prioritized implementation plan and ask me to approve it before changing application code,
   database schemas, APIs, or business logic.
5. Implement approved changes: Work in small, testable stages. Discuss any newly discovered architectural decision with me before
   taking a materially different approach.

Do not bypass this approval process just because a proposed fix appears straightforward. You may perform read-only investigation
and non-destructive reproduction before approval. Do not make product or architecture decisions on my behalf.

## 1. Understand the Existing Architecture
Before investigating individual bugs, inspect the actual repository and relevant documentation, including context.md,
PYN_CONNECT_PROGRESS.md, tour-app-implementation.md, tour-app-backend-api.md, and relevant scheduling, booking, visitor, and CMS
documentation. Trace the current implementation across: the Next.js CMS and its API integrations; the Capacitor app and its
authentication, navigation, data fetching, and caching; backend controllers, services, validation, and business rules; database
models, relationships, persisted tour configurations, bookings, and visitor records; legacy CMS scheduling and timezone mechanisms;
the scheduler widget and property-specific configuration. Identify the actual source of truth for each type of data. Do not assume
the old and new applications use the same APIs, settings, data models, or caching behavior. Preserve existing functionality,
uncommitted changes, and other active development work. Inspect the Git state before selecting or changing branches. Do not create
a new worktree, reset user changes, or modify production data.

## 2. Publish to Tour App — Design the Correct Solution First
Current problem: When I modify tour configuration in the CMS, such as the number or order of stops or scheduling settings, save
the changes, and publish them, the Capacitor app can still display the old configuration. Currently, I sometimes have to switch to
another property in the mobile app and return to the original property before the new changes appear.
Required behavior: the Publish to Tour App button must have a clear, reliable publishing contract: CMS edits are persisted before
they can be published; publishing makes the approved configuration available to all applicable users and app installations for
that property; updated tour stops, stop order, scheduling settings, and other explicitly publishable configuration are reflected
when the app next loads or refreshes the property; reopening or resuming the app must not leave users indefinitely on stale
published data; visitors remain authenticated during configuration refreshes (refreshing tour data must not unnecessarily log users
out or reset unrelated user state); publishing must not accidentally overwrite unsaved CMS edits or publish an incomplete
configuration; repeated publish requests must behave safely and predictably; failures must be visible and recoverable (the CMS must
not show success if publishing did not complete).
Investigate and recommend an architecture: trace CMS Edit → Save → Publish → Backend Persistence → Published Configuration → App
Fetch/Cache → Updated UI. Determine whether the current system separates draft, saved, and published data, or whether saved
configuration is already directly available to clients. Evaluate: explicit published versions or revision numbers; a property-level
published configuration version; server-side publication state and cache invalidation; conditional refresh using version checks,
ETags, or equivalent existing mechanisms; refresh on app launch, resume, property selection, or an explicit reload action;
appropriate cache-control policies and targeted background refreshes. These are candidate approaches, not instructions to implement
all of them. Recommend the simplest architecture compatible with the current system. Explain how it will: guarantee that published
changes become visible to app users; avoid stale caches across multiple devices and active sessions; minimize API calls and avoid
slowing down CMS requests or mobile interactions; handle publishing failures, concurrent edits, retries, and duplicate requests;
distinguish publishable configuration from visitor-specific state, active tours, and other data that must not be overwritten;
preserve authentication while refreshing data. Ask for my approval of the proposed publishing and refresh architecture before
implementation.

## 3. Prevent Tours From Starting or Completing Too Early
Reproduction: I booked a tour from the app for a future date and time. The app still allowed me to complete the tour, while the CMS
Visitors tab continued to show the booking as Upcoming.
Investigate: trace tour booking time validation and status transitions across the app, backend, database, and CMS Visitors tab.
Determine whether the app permits a tour to start or complete before its scheduled time; whether grace-period rules are enforced
consistently; whether the mobile app and CMS use different definitions of Upcoming, Active, and Completed; whether completion
updates are persisted successfully and reflected in the Visitors tab; whether offline state or stale visitor data causes the
discrepancy.
Expected outcome: propose a consistent server-authoritative lifecycle that prevents invalid early transitions while respecting the
property's configured scheduling and grace-period rules. The app must not display a completed tour when the backend still considers
it upcoming. The CMS and app should reflect the same persisted status. Recommend how the backend should validate transitions, how
the app should handle rejected actions, and how the CMS should refresh visitor status. Do not invent status transitions or time
restrictions that conflict with existing business requirements. Show me the proposed rules before implementing them.

## 4. Investigate and Standardize Timezone Handling
Reproduction: On October 25, the app displayed a booked tour as today at 10:00 AM, while the CMS Visitors tab displayed it as
tomorrow at 10:00 AM.
Requirements: trace how dates and times are created, stored, transmitted, and displayed in both applications. Inspect the legacy
CMS timezone mechanism and determine whether the new CMS reuses it. Establish whether the database stores scheduled timestamps in
UTC or another representation; whether the API transmits unambiguous timestamps or timezone-less values; which timezone the CMS
uses for the Visitors tab and scheduling pages; which timezone the Capacitor app uses to display bookings; whether daylight-saving
transitions, date-only fields, or duplicated timezone conversions cause errors.
Preferred direction to evaluate: use UTC consistently for persisted timestamps and API representations where supported; convert to
the correct timezone only when displaying dates or applying business rules. For scheduled tours, evaluate the property's configured
IANA timezone as the authoritative timezone, unless the existing product requirements establish another rule. Do not silently use
the visitor's phone timezone or geolocation when that would change the property's scheduled appointment time. Determine how the
legacy CMS handles timezone configuration and whether the new CMS has an equivalent setting.
Important approval requirement: if the new CMS does not have a suitable timezone setting, stop and ask me which policy we should
adopt before introducing a new setting or choosing a permanent timezone rule. Present the alternatives and their consequences. Do
not perform a broad timestamp migration or reinterpret existing database values without an approved migration and backfill plan.

## 5. Fix the Scheduling Page's "No Tour Type Is Active" Message
Reported: when both tour types are disabled, the scheduling page displays `Prospect sees "No Tour Type is Active"` outside its
intended card/container. Reproduce the layout with both tour types disabled; verify the layout when one or more tour types are
active; identify whether the issue comes from component structure, conditional rendering, CSS, or the legacy/new design integration;
confirm that active booking types and booking rules remain unchanged. Propose the smallest UI fix consistent with the new Next.js
design system, including responsive behavior and empty states. Do not simply hide the message or change booking logic to conceal
the layout issue.

## 6. Fix the "Book Another Tour" Navigation Loop
Reproduction: after booking a tour, tapping Book Another Tour takes me to the property-selection page. Selecting the same property
takes me back to a page with the same button, and I cannot successfully book another tour for the same company.
Investigate: trace the post-booking navigation, route parameters, existing booking state, property selection, authentication, and
booking creation flow. Determine why the current booking state prevents the intended journey and whether the cause is frontend
navigation, stale state, backend restrictions, or an incorrect redirect.
Desired behavior: the visitor can begin another legitimate booking for the same company; the visitor can select the same property
again when the property's business rules permit another booking; a new, intentional booking creates the correct independent booking
record; refreshing or retrying a request does not accidentally create duplicate bookings; existing restrictions on overlapping
bookings, duplicate active tours, or booking eligibility remain enforced. Recommend the correct navigation and booking-state reset
strategy before making changes.

## 7. Filter Properties by Self Tour Availability
The property list in the Capacitor Self Tour App must show only properties that have Self Tour enabled. Inspect the actual backend
field or configuration that determines this eligibility. Do not rely exclusively on frontend filtering if the backend can expose an
authoritative eligible-properties endpoint or filter. Verify that disabled properties never appear as selectable Self Tour
properties; direct navigation to a disabled property's tour is rejected appropriately; company and property associations remain
correct; loading, pagination, search, and refresh do not reintroduce ineligible properties; existing authorization rules remain
intact. Recommend the appropriate server-side and client-side changes, and request approval before implementation.

## 8. Prefill Visitor Details on the Self Tour Scheduling Page
On the app's scheduling page, the visitor's details should be prefilled using the information already captured during signup. The
visitor must be able to edit the supported fields before booking. Investigate the existing signup data, visitor record, form state,
validation, and booking API. Reuse established data rather than duplicating or inventing fields. Verify that available saved
information prepopulates the appropriate fields; missing information remains editable; user edits are preserved correctly while
navigating the form; the final submitted values are validated and persisted according to existing rules; sensitive information is
not exposed to another visitor or property; validation errors are clear and do not erase valid input.
Numeric field limits: the CMS scheduling settings include Grace period 10–60 minutes and Length of tour 1–600 minutes. The
increment/decrement controls and manual keyboard input must enforce these limits consistently. Investigate client-side validation
and server-side validation. Values outside the permitted range must not be accepted through direct API calls merely because the UI
prevents them. Do not apply these limits to unrelated fields or different business rules.

## 9. "Make 'How Did You Hear About Us?' Required" — Disabled on Hazel
The CMS displays a setting along the lines of Make "How did you hear about us?" required. Only RealPage properties are eligible to
require a marketing source, but the setting is disabled for Hazel. Determine whether the disabled state is correct or a bug. Inspect
Hazel's actual integration/provider configuration, relevant property settings, feature flags, and frontend/backend eligibility
checks. Report which condition disables the setting; whether Hazel meets the actual eligibility requirements; whether the UI behavior
agrees with the backend and legacy CMS; whether the control should be enabled or remain disabled. If it is expected behavior for a
non-RealPage property, explain why and do not change it. If it is a confirmed bug, recommend the fix and request approval before
implementing it. Do not weaken integration-specific restrictions just to enable the control.

## 10. Update the Scheduler Widget to Match the New Next.js Design
Review the existing scheduler widget test page, using its existing community parameters and valid access context. Current route:
/scheduler_widget/test_widget?community_id=1618&community_code=...&direct=true. Inspect the page's actual rendering stack before
choosing an implementation approach. Determine whether it is legacy-rendered, embedded, or already integrated with the new Next.js
design. Bring the page in line with the new CMS visual design system while preserving its real functionality. Review typography,
spacing, forms, buttons, cards, colors, and responsive behavior; active and inactive tour types; booking-form validation and
conditional fields; visiting hours, slots, and scheduling rules; loading, empty, success, and error states; property context and
relevant authentication or booking tokens; compatibility with any public or embedded booking flow that depends on this page. Avoid
a full rewrite if the current architecture supports a focused styling and integration solution. Do not break public booking links
or change booking behavior as a side effect of visual work. Recommend the least disruptive approach before implementation.

## 11. Connected-Phone and Real-Data QA
The Capacitor app is installed on the connected physical phone. Use it to reproduce the issues, inspect the actual app behavior,
and validate approved fixes. First confirm which app build, backend environment, and property data the phone is using. Do not
assume it is connected to local, staging, or production. Use Hazel as a key test property and verify other relevant properties with
actual Self Tour configuration. Test the appropriate flows through the new CMS, backend, and installed app. Scenarios: (1) edit stop
count/order in the CMS, save, publish, and reopen or resume the app; verify the new stops appear without switching properties;
(2) change scheduling settings, publish, and verify the app uses the updated settings; (3) test publishing again, publication
failure, and refresh recovery; (4) book future and eligible current tours, then verify start/completion restrictions and visitor
status consistency; (5) compare the booking time displayed by the app, API, database, and CMS; (6) book another tour for the same
company and same property where permitted; (7) confirm disabled Self Tour properties are excluded; (8) verify signup details are
prefilled and editable on the scheduling page; (9) test the grace-period and tour-length boundaries, including manual input and API
validation; (10) verify the marketing-source setting for Hazel based on its actual integration; (11) test the scheduling page with
both tour types off and with at least one type on; (12) verify the scheduler widget on the provided test route and representative
mobile/desktop viewports. Use actual persisted data and API responses for integration tests. Do not report a feature as verified
based only on mocked responses or screenshots. Use safe, authorized test data. Keep production data read-only, avoid destructive
database changes, and do not trigger physical lock operations or real access-code delivery during QA.

## 12. Performance, Reliability, and Security
Any approved solution must preserve the responsiveness of both the CMS and mobile app. Evaluate API request count and latency;
database query efficiency and indexing where relevant; cache behavior and invalidation correctness; payload sizes and unnecessary
full reloads; idempotency, retries, race conditions, and partial failures; property-level authorization and visitor data isolation;
authentication persistence and session expiration; auditability of save, publish, booking, and status transitions; safe database
migrations and rollback. Do not introduce aggressive polling, unconditional full-page reloads, unnecessary background requests, or a
new service when an existing mechanism can solve the problem more simply. For publication refresh, prefer targeted configuration
revalidation while leaving authentication and unrelated state intact. Explain any expected trade-offs and measurable performance
implications.

## 13. Required First Response: Findings and Approval Plan
Before editing code, return a concise but evidence-based report with these sections:
A. Architecture findings: summarize the relevant data flows and identify where the source of truth lives for published tour
   configuration, bookings, timezone handling, visitor status, and property eligibility.
B. Bug verification matrix: for every issue above, a table | Issue | Status | Evidence/root cause | Recommended approach | using only
   CONFIRMED BUG, EXPECTED BEHAVIOR, NOT REPRODUCED, or BLOCKED; reference relevant files, functions, endpoints, database fields, and
   actual test observations.
C. Architecture options: for material decisions (publishing/versioning/cache invalidation, app refresh behavior, timezone policy,
   booking state) present the recommended option and viable alternatives with advantages, disadvantages, security implications and
   performance impact.
D. Prioritized implementation plan: group changes by dependency and risk; define acceptance criteria and tests for each phase;
   identify which issues can share a fix and which require separate changes.
E. Questions requiring my decision: the smallest number of specific questions needed to resolve genuine product-policy ambiguities.
   In particular, tell me whether the new CMS has an appropriate timezone setting. If it does not, present the options and ask me how
   to proceed before implementing a timezone solution.
Stop after presenting this report and wait for my approval. Do not start implementing the fixes until I approve the proposed plan.

## 14. After I Approve
Implement only the approved scope in small stages. After each stage: run relevant automated tests; verify the actual behavior in the
CMS and connected phone where applicable; check for regressions in existing scheduling, booking, authentication, and tour flows;
report the changed files, test results, and any newly discovered decisions that require my approval. If implementation reveals that
the approved approach will not work, stop at that decision point, explain the evidence, and ask me to approve an alternative. At
completion, update the relevant project documentation and provide a final report with PASS, FAIL, BLOCKED, or NOT RUN for each
acceptance criterion. Include actual build/test results, screenshots or reproducible evidence where useful, and any unresolved risks.
Success means the approved changes work end to end, published configuration reliably reaches app users, booking and scheduling
states are consistent across the system, timezone behavior is unambiguous, and both CMS and mobile performance remain acceptable.
```
