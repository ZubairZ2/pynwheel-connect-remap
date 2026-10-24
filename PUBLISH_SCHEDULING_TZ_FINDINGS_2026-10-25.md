# Findings and approval plan: publishing, booking lifecycle, time zones, scheduling UI, widget (October 25, 2026)

Branch `improvement/publish-scheduling-timezone-qa-2026-10-25` (from `main` 6a95fc645, which already holds PR #40). No application
code has been changed. Evidence was taken from the code, the local Rails server on :3020 (`pynwheel_prod` local copy, visits and
visitor auth on), the Rails log of the phone's requests, the local database, and the Tour App dev build in the browser pane
(:3021 → :3020) signed in as the owner's made-up test visitor (tour_users 16258, booking 25503 at Hazel 1618).

**Phone:** no device is attached right now (`adb devices` empty; the iPhone is "unavailable"). Every on-device scenario is BLOCKED
until the Samsung is plugged in. The APK on it is `artifacts/pynwheel-tour-visitor-2026-10-24-tenda.apk` (API `http://192.168.0.106:3020`,
demo scenarios on); the log shows its requests from 192.168.0.102 against this very server, so the phone's data is the local prod copy.

---

## A. Architecture findings (where the truth lives)

| Data | Source of truth | Who reads it | Caches on the way |
|---|---|---|---|
| Tour stops, order, visibility, dwell, content | `tour_stops` (+ `tours.tour_setup_version`, bumped by `TourSetup::Save` and `TourStop after_commit`) | Tour App API `GET /properties/:id/stops`, legacy app, Touch app, all live | server: `TourApi::Engine` graph per `Wayfinding::GraphVersion` (moves on any stop/tour/path change, 15 min TTL); app: in-memory bundle + `If-None-Match` on `/graph` only; `/stops` has no ETag and is re-read on every bundle load |
| Scheduling settings (types, interval, grace, length, hours, window, form) | `tours`, `tour_settings`, `opening_hours`, `guided_opening_hours` via `Scheduling::Settings` | Connect Settings, Tour App `GET …/booking/settings`, legacy widget | app: 5-minute memo per property (`loadBooking`); no server cache |
| "Published" configuration | **does not exist.** Connect's Publish button opens a dialog that says publishing from Connect is not available (`tourSetup.screen.tsx:486`, gap T5/M2). Save is live for every consumer. | — | — |
| Bookings | `schedual_tours`: `tour_date` (date) + `tour_time` (time, no zone) = the **property's wall clock**; `user_time_zone` stores the zone string; `is_tour_completed` / `tour_completed_at` | Connect Visitors (`Visitors::Query/Profile`), Tour App (`/visitor/me`, `/properties/:id/bookings`), legacy pages | app: `scheduledTour` persisted in Preferences, adopted only at sign-in and app launch |
| Booking status | derived, never stored: `Visitors::Status.booking_status` = completed (`is_tour_completed`) / upcoming (booked + grace > now) / missed / cancelled | CMS and API use the same function | app recomputes its own scenario from the device clock (`scenarios.ts autoTourScenario`) |
| Visit (tour in progress) | `tour_histories` (+ `visited_stops`), written only by `Visits::Start/Record/End` from the app, or the legacy app | CMS Visitors | app: `visit` state + outbox; `visit.status = 'local'` means phone-only |
| Property time zone | `communities.time_zone`, set **automatically** from latitude/longitude (`Community#set_community_time_zone`, Timezone.lookup); default "UTC" which `get_time_zone` treats as unset. **No editable zone field in the legacy CMS or in Connect** (Connect shows it read-only: `BookingPanels.tsx:263`). Rails `config.time_zone` is unset (UTC). | every server-side rule (`Bookings::Availability`, `Visits::Rules`, `Visitors::Status`) | — |
| Self Tour eligibility | `Connect::ProductState.tour?` = `communities.self_tour` or `product_options.self_tour.is_enabled`; exposed as `tour_enabled` | `TourApi::Properties.list` filters visitor sessions server-side; every per-property endpoint runs `require_tour!` (422 `tour_disabled`), visitors get 404 | server list cache 60 s |
| Marketing-source requirement | `tours.marketing_source_required`, allowed only when `communities.data_provider == 'realpagesvc'` (legacy HAML and Connect agree) | widget shows the field on a *different* condition (`use_realpage_as_lead`, the CRM credential) | — |

---

## B. Bug verification matrix

| # | Issue | Status | Evidence / root cause | Recommended approach |
|---|---|---|---|---|
| 2 | Publish → app still shows old stops/settings | **CONFIRMED BUG** (app-side staleness; Publish itself is a stub) | Publish = informational dialog, Save is live. Server versions move correctly (`GraphVersion` includes `tour_stops` count+max `updated_at` and `tour_setup_version`; Engine keyed by version). The app loads the bundle **only** when the property id changes or at launch (`AppProvider.tsx` effect 4 deps: `[repository, hydrated, reloadKey, signedIn, propertyId]`); on resume it only syncs the visit (`onAppStateChange` → `syncVisit`); `selectProperty` of the *same* property returns early (`reducer.ts:399`) so no reload; a tour in progress keeps the persisted `tourOrder`/`guided.tour` (PERSISTED_KEYS). Booking settings memoised 5 min. Hence "switch property and back" is the only path that reloads. | §C1: version check on resume/focus + explicit, idempotent Publish endpoint that records the publication and moves the version. |
| 3 | Tour completed before its time; CMS stays Upcoming | **CONFIRMED BUG** (reproduced) | Booking 25503 (Oct 25 10:00, Hazel, America/Vancouver) created Oct 24 19:05 UTC from the phone; log shows `POST …/tour-route` at 00:10 PKT and **never** a `POST …/visits` (0 in the whole log for any property); no `tour_histories` row. Reproduced in the pane: Home card "TODAY'S TOUR · Starts in 8:43" → Start Tour → sheet offers **"Take a Virtual Tour — no check-in or ID needed"** → Build Your Tour → 5 stops → "Thank you for visiting" → Home shows **"LAST TOUR · Completed · Book Another Tour"**; local `scheduledTour.status = 'past'` (`reducer.ts:469` sets it on every `finishTour`), server `GET …/bookings` still `upcoming`, `is_tour_completed = f`. Server rules are right (`Visits::Start` refuses `outside_window` ± grace); the app simply never asks it on that path. Secondary cause: the card calls the booking "today" from the **device** date (`autoTourScenario`, `dayOffset(tour.date, now)`), so Start Tour is offered a day early for a remote user. | §C3 lifecycle rules: a virtual/unrecorded tour never changes the booking; "today"/"Start Tour" computed in the property zone and only inside the grace window; re-adopt server status on resume. |
| 4 | App "today 10:00 AM" vs CMS "tomorrow 10:00 AM" | **CONFIRMED BUG** (reproduced) | Stored value is the property wall clock (date + time, no zone). CMS: `Visitors::Status.booked_at` builds the instant in the property zone, `dayLabel(iso, timeZone, now)` compares calendar days **in the property zone** → Oct 24 12:05 PDT sees Oct 25 as "Tomorrow" (correct). App: `tourFromBooking` keeps `date` as a bare `YYYY-MM-DD`, `dayLabel(date, new Date(now))` and `slotTime(date, time)` interpret it in the **device** zone (PKT) → "Today", countdown 8 h 43 min instead of 20 h 43 min, and the card will flip to "Missed" at ~11:30 PKT while Vancouver is still Oct 24 morning. Both show "10:00 AM" (the wall clock), so the time is not wrong, the day and the countdown are. DST: the `time` column is naive, so no DST double-conversion exists server-side. | §C2: property zone is authoritative; API adds `booked_at` (ISO 8601 with offset) + `time_zone` to every booking payload; app computes day labels, countdowns and windows with `Intl` in that zone. **Policy question in §E.** |
| 5 | "Prospect sees 'No Tour Type is Active'" outside its tile | **CONFIRMED BUG** (owner's screenshot; CSS traced) | `.bo-tx__gates` is `grid-template-columns: repeat(4, minmax(0,1fr))` (globals.css:7005); `.bo-pill` is `white-space: nowrap` (globals.css:141-149) in a `flex-start` column, so the 36-character pill cannot shrink or wrap and spills past the tile. Only the longest of the four fail labels does it; passing tiles show "Pass". Booking logic is untouched by any fix. | Scoped override: `.bo-tx__gate .bo-pill { white-space: normal; max-width: 100%; line-height: 1.3 } .bo-tx__gate .bo-pill__dot { flex-shrink: 0 }` (pattern already used at globals.css:2852, :4500). Check at ≥1100 px (4 columns) and <1100 px (2 columns). |
| 6 | "Book Another Tour" loop | **CONFIRMED BUG** (code; UI reproduced to the "past" card) | The button is the Home card's `past`/`cancelled` CTA (`scenarios.ts:213/247`), handler `App.tsx:337` `case 'book': goTab('search')`; picking the current property dispatches `navigate home` (`App.tsx:409`), and `selectProperty` of the same id never clears `scheduledTour`. Nothing resets the local `past` booking, and the app never re-reads `GET /properties/:id/bookings`. Backend is not the cause: `Bookings::Create` reuses an upcoming booking (moves it, `rescheduled: true`) and creates a new row after a completed/missed/cancelled one. | `case 'book'` → `actions.openSchedule()` (the Upcoming sheet already does this), plus the §C3 rule that a finished tour only marks the booking `past` when the server completed it; `openSchedule` should also ignore `missed`. Duplicate protection stays server-side (advisory lock + one-upcoming-per-visitor). |
| 7 | Only Self-Tour properties in the list | **EXPECTED BEHAVIOUR** for visitors; staff see all by design | Live check with the visitor token: `GET /properties` → 167 rows, 0 with `tour_enabled=false` (`TourApi::Properties.list` filters visitor sessions server-side, plus the restricted-email allowlist). Every per-property endpoint refuses a disabled property (`require_tour!` 422, visitors 404). Staff (Super Admin) sessions get the full list because the app sends no `?tour_enabled=true`; non-tourable rows are labelled "No Self-Guided Tour" and `selectProperty` blocks them. No pagination/search server-side (client filter over the cached list; list cache 60 s). | Optional hardening only: send `tour_enabled=true` from the app for visitor sessions too, and add a visitor test for the list. Nothing to fix for visitors. |
| 8a | Prefill on the Schedule screen | **CONFIRMED BUG** (partial prefill) | `openSchedule` prefills first/last/phone from `profileOf` (`useAppActions.ts:192-206`), but two entry paths bypass it and leave the fields empty: Explore → Schedule on another property (`selectProperty(..., 'schedule')`, `reducer.ts:398`) and the guest gate → sign-in → schedule (`reducer.ts:366`). The visitor's real `first_name`/`last_name` from the API are dropped in `visitorUser` and re-derived by splitting `user.name` on the first space. Edits made on the form go only to local `profileEdits` (never `PUT /visitor/me`); the server ignores identity fields for a visitor booking (`own_visitor!`). Email is read-only on the form. | Route both paths through `openSchedule`; keep first/last from the API; decide whether form edits update the visitor (§E Q4). |
| 8b | Grace 10–60, length 1–600 enforced | **EXPECTED BEHAVIOUR** (both layers enforce), one small gap | Client `BOUNDS` (`tourBooking.generator.ts:43`): +/- clamp; typed values are validated by `rulesProblems` (Save disabled, "Allowed 10–60"). Server `Scheduling::Settings#update_rules!` rejects out-of-range with 422 (`GRACE = 10..60`, length 1..600), tested for grace=5 (`booking_controller_test.rb:100`). Gaps: no test for length bounds / grace 999; clearing Grace while "Scheduled tours only" is off passes the client and 422s on the server. **Legacy CMS used length 10–300 and grace step 5**; the brief's 1–600 is what Connect implements. | Add the two tests; treat an empty grace as "unchanged"; no limit change. |
| 9 | Marketing-source switch disabled on Hazel | **EXPECTED BEHAVIOUR** | `communities.data_provider` for Hazel 1618 = `yardirentcafe` (local prod copy). Connect and the legacy HAML both gate on `data_provider == 'realpagesvc'` (`settings.rb:124, 350-356`; `tours/settings.html.haml:429`). Note for later: the public widget shows the field on a different condition (`use_realpage_as_lead`, the CRM credential), so a RealPage data-provider property can have the switch on while the widget never asks. | No change. Optionally align the widget condition in a separate, product-approved change. |
| 10 | Scheduler widget restyle | **CONFIRMED** legacy-rendered; approach proposed | `app/views/scheduler_widget/widgets/test_widget.html.erb`: 1,434 lines / ~418 KB, `layout: false`, Bootstrap 3.3.7 + the whole staff `application` bundle, 174 lines of inline CSS with `!important`, 790 lines of inline JS, 354 KB of inlined cleave/libphonenumber. Reached by every public booking link (property websites, emails, the legacy RN WebView, staff Schedule-Tour buttons, Connect's link/embed). `community_code` is an HS256 JWT checked only when `direct` is present. **Security finding:** `?message=` is rendered `.html_safe` (reflected XSS on a frameable page) — separate fix. | Gated layered stylesheet (`theme=connect` param or community flag): new `scheduler_widget_connect.css` with the `--bo-*` tokens and Manrope, body class on 2–3 views, no markup/JS change, ids and classes preserved; ~250–400 lines. Full state matrix to verify (scheduled vs convenience, card, Knock/Funnel/RentCafe, RealPage, reschedule, not-allowed, restricted, success). |
| 11 | Connected-phone QA | **BLOCKED** | No device attached. | Plug the Samsung in; scenarios 1–12 then run against :3020 with the tenda APK. |

---

## C. Architecture options

### C1. Publishing and app refresh (issue 2)

**Recommended — "Save is live, Publish is an explicit, audited refresh signal; the app revalidates on resume."**
1. Backend (additive): `POST /communities/:id/connect/tour/publish.json` → inside one transaction bump `tours.tour_setup_version` (+ `updated_at`, the same statement `TourSetup::Save` uses), set new nullable `tours.tour_published_at` / `tour_published_by`, write a PaperTrail audit version `tour_published` with the resulting `config_version`; clear `TourApi::Properties` list cache. Idempotent: if nothing changed since `tour_published_at` answer 200 `{already_published: true}` without bumping. `GET /properties/:id` (Tour App) and the Connect tour JSON gain `config_version` = `GraphVersion` ⊕ `tours.updated_at` ⊕ `tour_settings.updated_at` ⊕ hours' max `updated_at` (one aggregate, ~ms). `/stops` and `/booking/settings` get an ETag = `config_version`.
2. Connect: Publish button is disabled while any card is dirty ("Save your edits first"), posts, shows "Published · <time> · v<n>" or the error; repeated clicks are safe.
3. App: on app resume, on `online`, and when Home/Build-Your-Tour mounts (throttled to once per 60 s), call `GET /properties/:id` and compare `config_version` with the loaded bundle's; if moved, reload the bundle (`reloadKey`) and clear the booking memo. Stale persisted `tourOrder`/`selected`/`guided.tour` are dropped unless a visit is in progress (then kept, nodes no longer on the list are pruned). Auth, visitor profile, visit outbox and photos/notes are never touched by a reload.
- Cost: one ~40 ms, <1 KB request per resume; no polling; no new service. Multi-device: every device revalidates on its own resume. Concurrency: `TourSetup::Save` already refuses stale base versions (`Wayfinding::StaleVersion`).
- Security: Publish is a Connect write (`CONNECT_WRITE_ACTIONS`, `PYN_CONNECT_WRITES`, property authorization as today).

**Alternative B — true draft/published snapshot.** New `tour_publications` table holding the serialized stops/order/settings; the Tour App API serves the latest snapshot; Touch app and legacy keep reading live tables. Gives "unsaved edits cannot be published" and rollback, but the Tour App and Touch would diverge after a Save, and every API reader (stops, graph, booking settings) needs a snapshot path. Larger, riskier, and the owner's rule is that legacy stays as it is.

**Alternative C — push (FCM/WebSocket).** Instant, but a new service and token handling for a signal the app can get for free on resume. Not justified.

**Alternative D — short TTL polling in the app.** Simplest to code, wastes battery and requests; the brief forbids aggressive polling.

### C2. Time zone policy (issue 4) — **needs your decision (§E Q1)**

Facts: the property zone exists (`communities.time_zone`, auto-derived from coordinates, read-only everywhere, "UTC" = unset); bookings are stored as the property's wall clock; every server rule already uses the property zone. The only offender is the app's labelling and countdown.

**Recommended — property IANA zone is authoritative; the API says so explicitly.**
- API: every booking payload (`/visitor/me`, `/properties/:id/bookings`, `POST …/bookings`, Connect Visitors) adds `booked_at` (ISO 8601 with offset, from `Visitors::Status.booked_at`) and `time_zone`; the existing `tour_date`/`tour_time` stay for compatibility. `/booking/availability` already returns `time_zone` and `now`.
- App: `ScheduledTour` keeps `date`/`time` as property-local strings for display and adds `bookedAtMs` + `timeZone`; day labels ("Today/Tomorrow"), countdowns and the start/missed windows use the instant and `Intl.DateTimeFormat(…, {timeZone})`; the Schedule screen's day strip uses the server's `now`/`time_zone` rather than `dayKey(0)` of the device.
- No database change, no backfill.

**Alternatives:** (b) add an editable IANA zone field to Connect Settings (additive column or reuse `time_zone`, falls back to auto-derivation) for properties whose coordinates are wrong or missing — can be combined with the recommendation; (c) show in the visitor's device zone with the property zone as a hint — rejected by the brief; (d) store a UTC `booked_at` column — a migration/backfill of 25k rows with no functional gain while the legacy widget keeps writing wall clocks.

### C3. Booking/visit lifecycle (issues 3 and 6) — proposed rules (no new states)

Server (already true, unchanged): a booking becomes *completed* only through `Visits::End` of a visit linked to it; a visit links to a booking only inside booked time ± `grace_period`; outside it the check-in is refused (`outside_window`) when the booking is named, or becomes a walk-in when not.

App (to change):
1. The booking's scenario is computed from the property-zone instant: *upcoming* until `start − grace`; *today/ready* inside `[start − grace, start + grace]` (the server's window) — "Start Tour" only then; after `start + grace` without a visit → *missed* (as the CMS says).
2. A virtual tour, a demo tour, or a `visit.status = 'local'` tour never changes `scheduledTour`; `finishTour` sets `past` only when the ended visit was linked to that booking (or the server reports it completed).
3. `checkInLocally` for a real property with the visits capability on is used only for the offline-queued case (as now) — never as a silent fallback after a refusal; a refusal shows the reason with the booked time.
4. On resume and on Home mount (same throttle as C1) the app re-reads `/visitor/me` and adopts the server's booking status (cancelled/rescheduled/completed by staff).
5. "Book Another Tour" / "Book a New Time" open the Schedule screen for the current property; the server keeps one-upcoming-per-visitor (a second booking moves the first, the app already says so).
CMS Visitors: no status logic change; optionally refetch the list when the tab regains focus (it is server-derived on every load already).

---

## D. Prioritized implementation plan

| Phase | Scope | Shares a fix with | Acceptance / tests |
|---|---|---|---|
| 0 | Branch, phone attached, baseline run of `test/controllers/api/tour_app` + `test/controllers/connect` + `npm test` (tour-app, pyn-connect-web) | — | green baseline recorded |
| 1 (low risk, UI) | #5 pill CSS; #6 `case 'book'` → `openSchedule` + ignore `missed`; #8a route the two paths through `openSchedule`, keep API first/last; #8b two tests + empty-grace handling | — | pane screenshots at 2 widths; vitest for scenarios/openSchedule; Rails tests |
| 2 (API additive) | `booked_at` + `time_zone` on booking payloads; `config_version` on property detail + ETags on `/stops`, `/booking/settings`; Publish endpoint + columns + audit | C1, C2 | `tour-app-backend-api.md` §22; Rails tests for the endpoint, idempotency, ETag 304; parity: no existing key removed |
| 3 (app) | property-zone labels/windows (C2), lifecycle rules 1–5 (C3), revalidate-on-resume (C1), Publish-aware reload | 2 | vitest for `autoTourScenario` with zone fixtures (PKT device vs Vancouver property, DST edge Nov 1); pane E2E: future booking → no Start Tour, virtual tour → booking stays upcoming, CMS Visitors still Upcoming; phone: scenarios 1–6 |
| 4 (Connect) | Publish dialog wired to the endpoint, dirty-guard, status line | 2 | vitest; pane: publish → app resume shows new stop order without switching property (scenario 1–3) |
| 5 (widget) | gated Connect stylesheet; **separate** small fix for the `message` XSS (escape) | — | state matrix on mobile/desktop viewports; public links without the flag unchanged byte-for-byte |
| 6 | docs (`context.md`, `PYN_CONNECT_PROGRESS.md`, API doc), final PASS/FAIL matrix | — | — |

Phases 1 and 5 are independent of the decisions below; 2–4 wait for them.

---

## E. Questions that need your decision

1. **Time zone policy.** Connect has **no** editable time-zone setting; the property zone is auto-derived from coordinates and shown read-only. Adopt the property IANA zone as authoritative for the app (recommended, no setting added), or also add an editable zone field in Connect Settings as a fallback?
2. **Publish contract.** Option C1 (Save stays live for Touch/legacy/Tour; Publish = audited version bump + "refresh now" signal, app revalidates on resume), or Option B (a real draft/published snapshot for the Tour App only, with the divergence from Touch/legacy it implies)?
3. **Start-Tour window.** Use the existing grace period on both sides (start − grace … start + grace) as the only window in which "Start Tour" is offered, with "Upcoming" before and "Missed" after — or should the app offer check-in from an earlier point (e.g. 60 min) while the server keeps refusing until the grace window?
4. **Schedule-form edits.** Should name/phone edits on the Schedule screen update the visitor record (`PUT /visitor/me`, phone excluded), or stay booking-local as the legacy behaviour (server ignores identity for a signed-in visitor)?
5. **Widget XSS.** Fix the reflected `?message=` rendering in the same branch (one-line escape, behaviour-neutral) or leave it for a separate security PR?

Residue from this investigation on the local prod copy: OTP rows for +1111122222 and +11111122222, one visitor session for tour_users 16258; no booking or visit was created; booking 25503 is unchanged. The browser pane's app state holds the reproduced "past" card (local only).

---

## F. Implementation and final results (October 25, 2026, after approval)

Owner's decisions: property IANA zone authoritative (no new setting) · Publish = option C1 · Start Tour only inside the grace window ·
Schedule edits booking-local · widget `?message=` escaped in this branch.

| # | Acceptance criterion | Result | Evidence |
|---|---|---|---|
| 2a | Publish records the version, is idempotent, refuses read-only roles, audits | PASS | `tour_controller_test.rb` (3 runs); Connect dialog: first click → "Last published Oct 25, 2026, 2:19 AM by QA Publish. Up to date.", second click → "Already published"; `tours.tour_published_*` set on Hazel's tour 1089 |
| 2b | A CMS edit reaches the app on resume without switching property | PASS | stop order swapped (The Lobby ↔ Fitness Centre); tab switch in the pane → `GET /properties/1618`, then graph/stops/map reloaded; Build Your Tour listed Fitness Centre first; order restored afterwards |
| 2c | Unsaved CMS edits cannot be published; failures visible | PASS (code + dialog) | Publish button disabled while `unsaved > 0` with the "Save your changes first" box; write errors toast through `writeErrorText` |
| 2d | No polling, auth untouched by a refresh | PASS | one `GET /properties/:id` + one `GET /visitor/me` per resume, 60 s throttle; session, profile, outbox untouched (`AppProvider.revalidate`) |
| 3a | App never completes a booking the CMS holds as upcoming | PASS | full virtual tour in the pane → Home still "Upcoming tour", local status `scheduled`, server booking 25503 still `is_tour_completed = f` |
| 3b | Start Tour only inside booked time ± grace; Upcoming before, Missed after | PASS | `zone.test.ts` window cases; pane card for the Oct 25 10:00 PDT booking at 02:16 PKT: "Upcoming tour · View Tour Details" |
| 3c | CMS status reaches the app (cancel / reschedule / complete by staff) | PASS (unit + resume read) | `syncBookings` cases in `qaFixes.test.ts`; `/visitor/me` read on every resume (network log) |
| 4a | Day label and countdown in the property zone | PASS | "Tomorrow, Oct 25 · 10:00 AM · Starts in 19:42:46" (was "Today · Starts in 8:43:15"); CMS says Tomorrow too |
| 4b | DST and other zones | PASS | `zone.test.ts`: Nov 1 PST, Karachi vs Vancouver day keys |
| 4c | No timestamp migration | PASS | `tour_date` / `tour_time` untouched; API adds `booked_at` + `time_zone` |
| 5 | Long readiness pill stays inside its tile, 4- and 2-column layouts | PASS | Playwright measurement at 1400 px and 1000 px: every pill `inside: true`; screenshot `qa/shots/11-gates-desktop.png` |
| 6 | Book Another Tour opens Schedule on the same property; no duplicate bookings | PASS (code) / server rule unchanged | `App.tsx case 'book' → openSchedule`; `Bookings::Create` still reuses an upcoming booking under the advisory lock |
| 7 | Only Self-Tour properties for visitors | PASS (unchanged) | live visitor list: 167 rows, 0 disabled |
| 8a | Prefill on every Schedule path, CMS first/last kept | PASS | `qaFixes.test.ts` (4 cases); `visitorSession.test.ts` |
| 8b | Grace 10–60 / length 1–600 enforced on direct API calls; blank grace ignored | PASS | `booking_controller_test.rb` (new cases: 0, 1000, 'abc', 999, blank, 600) |
| 9 | Marketing-source switch on Hazel | EXPECTED, unchanged | `data_provider = yardirentcafe` |
| 10a | Widget themed behind a gate; plain output unchanged | PASS | `?theme=connect` → 200 with the stylesheet link and `body.pw-connect`; plain fetch byte-identical (513,149 B); pane: Manrope, primary button, modal auto-open, no horizontal scroll at 375 px |
| 10b | `?message=` no longer reflected raw | PASS | `sanitize(..., tags: div p b strong br img a span, attributes: style class src width height align border alt data-title href target)` |
| 11 | Connected-phone scenarios | PASS (run at 02:48–02:55 PKT on the Samsung A02s, APK `artifacts/pynwheel-tour-publish-tz-2026-10-25-tenda.apk` → :3020) | (1) stop order swapped in the CMS, app backgrounded and resumed → `GET /properties/1618` + `/visitor/me`, graph/stops/map reloaded, Build Your Tour listed Fitness Centre first without switching property (`phone/05-build-your-tour.png`); (2) length of tour 33→40, resume, Schedule screen offered "30 min / 40 min" and the availability window started on the property's today (Oct 24 Vancouver, not the phone's Oct 25); (3) publish/again/failure covered on Connect (§2a, 2c); (4) the Oct 25 booking's sheet reads "Your tour is on Tomorrow, Oct 25 · Check-in opens 60 minutes before your 10:00 AM tour" with no Start option; a full virtual tour ends with the card still "Upcoming tour" (`phone/01-launch.png`, `02-checkin-sheet.png`, `06-sheet-grace.png`); (5) app "Tomorrow, Oct 25 · 10:00 AM · Starts in 19:11" = CMS "Tomorrow 10:00 AM" = DB `2026-10-25 10:00` = API `booked_at 2026-10-25T10:00:00-07:00`; (6) Book Another Tour verified in the pane and by code (no past booking was created on the phone to avoid touching booking 25503); (7) the visitor's property list: 0 rows without a Self Tour; (8) Schedule prefilled (the owner's earlier local edits win over the CMS names, per decision 4); (9) server bounds tested; (10) Hazel `yardirentcafe`; (11)/(12) Connect and widget verified in the pane. One gap found and fixed during the run: the sheet said "10 minutes" until the Schedule screen had loaded the rules; the app now reads the booking rules as soon as a live booking exists (commit f7a77671d, APK rebuilt and re-verified) |
| 12 | Tests | PASS | Rails: 204 runs / 1,639 assertions across the touched suites (one transient failure in `visitors_controller_test.rb` on a parallel run; green when rerun alone); Tour App: 145 vitest, tsc; Connect: 28 vitest, tsc |

Residue on the local prod copy (`pynwheel_prod`, local only): QA user 2444 (`qa-publish-2026-10-25@pynwheel.local`), OTP rows for
+1111122222 and +11111122222, a visitor session for 16258, Hazel's tour published once (`tour_published_*` on tour 1089; the stop
order and tour types were restored, so "changed since the last publish" shows until the owner publishes again). Booking 25503 is
unchanged. Heroku `pyn-system` needs the new migration (`20261025100000`) before this branch is deployed there.
