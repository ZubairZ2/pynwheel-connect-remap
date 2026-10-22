# Visitor Management: architecture and implementation plan

Written October 23, 2026. Investigation and planning only; nothing in the repository was changed by this work
except this file and its companion [LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md](LEGACY_VISITOR_SIGNUP_AUTH_FLOW.md).

Every statement is tagged. **[V]** = verified in the code or schema at the cited location on `main` (`1fe226def`).
**[A]** = assumption or inference, to be confirmed. **[D]** = a decision the owner must make. Nothing below was
run against production; the production facts quoted come from the October 21 Visitors QA report.

---

## 1. Current state

### 1.1 The three clients and what each one writes

| Client | Auth | Visitor identity | Writes | Reads visitors |
|---|---|---|---|---|
| **Public scheduler widget** (website iframe, and the legacy app's WebView) | none; community-code JWT only proves the property [V `scheduler_widget/widgets_controller.rb:48`] | form fields, deduped by phone + email | `tour_users`, `schedual_tours` (`created_by` "Pynwheel"), Stripe, CRM, email/SMS [V `schedual_tours_controller.rb:54`] | — |
| **Legacy RN app** (`pyn-tour-old`) | phone + 4-digit OTP, then a non-expiring HS256 JWT in a query param [V `application_helper.rb:63-88`] | the `TourUser` | bookings via the widget WebView; visits via `POST /api/v1/save_tour_history` → `tour_histories`, `visited_stops`; locks via the legacy lock tables [V `tour_histories_controller.rb`] | own upcoming / completed |
| **New Capacitor Tour App** (`tour-app/`) + `Api::TourApp::V1` | Doorkeeper password grant, **Super Admins only**, 5-day plaintext bearer token, no refresh [V `tour_api/auth.rb:74-84`, `doorkeeper.rb:104`] | none on the device; the "visitor" is the profile form the admin fills, sent with the booking [V `store/views.ts:103-113`, `GetStartedScreen.tsx:114`] | `tour_users` + `schedual_tours` (`created_by` "Tour App") through `Bookings::Create`; `igloohome_guests` with `tour_user_id: nil` [V `tour_api/locks.rb:190-197`]. **No** `tour_histories`, `visited_stops` or `lock_histories` [V grep of `app/services/tour_api`, `app/controllers/api/tour_app`] | nothing |
| **Connect (Next.js CMS)** | Devise session cookie carried server-side by Next, X-CSRF-Token on writes, `can_access_community?` for reads, `can_edit_map?` for writes, Super Admin for PII actions [V `connect/base_controller.rb`, `concerns/connect/*`, `user.rb:172-201`] | — | bookings (`created_by` "Staff"), reschedule, cancel (row destroy), reset stops, ID review, reset verification, remove PII, delete visit data [V `connect/visitors_controller.rb`] | `Visitors::Query` / `Profile` over `tour_users` ⋈ `schedual_tours` ⋈ `tour_histories` ⋈ `visited_stops` ⋈ guest tables ⋈ PaperTrail [V `app/services/visitors/*`] |

The two apps and the widget share one Rails backend and one database; the Connect module is the only reader that
derives statuses (`upcoming`, `in_progress`, `completed`, `abandoned`, `missed`, `cancelled`) and it derives them from
the legacy tables, not from a status column [V `visitors/status.rb:45-62`].

### 1.2 The data model as it exists (no visitors table)

```
tour_users (identity + per-tour scratch; global, no community_id)
  ├─ schedual_tours      booking: date/time/type, created_by (source), CRM ids, is_tour_completed, stops_list
  │                      cancellation = row destroy; history in PaperTrail `versions`          [V schedual_tour.rb:2]
  ├─ tour_histories      visit: arrived, left, tour_state (abandoned|completed), active_app, tour_key, community_id
  ├─ visited_stops       stop event: tour_stop_id, event_date + event_time (device clock), stop_pin, image, description
  ├─ lock_histories      door events (RemoteLock/Dwelo import only; 4 rows in production)
  ├─ igloohome_guests / latch_guests / zerv_guests / as_guests / igloo_guests   credentials issued
  ├─ prospects, feedbacks, chatrooms, user_stripes, latch_auth_token
versions (PaperTrail)   SchedualTour create/update/destroy + Connect audit events (item_type Community)
```

The dedupe key is phone + email through `TourUserSearcherService` in every writer [V `tour_user_searcher_service.rb`];
there is no unique index on either column [V schema]. A visit is matched to a booking by time, not by a foreign key
[V `visitors/query.rb:205-225`]. Stop times are stored as two columns in the device's wall clock [V Visitors QA §12.9].

### 1.3 Verified gaps

| # | Gap | Evidence |
|---|---|---|
| G1 | The new app records no visit: no check-in, arrival, stop, unlock, skip, end or issue reaches the server. `checkIn`, `arrive`, `finish`, `reportIssue`, `cancelTour` are local reducers. | [V `store/useAppActions.ts:150-156, 289-292, 455, 661-665`] |
| G2 | The new app has no visitor identity. The signed-in principal is a CMS Super Admin; the booking's visitor is a form. Prospects cannot sign in. | [V `tour_api/auth.rb:81`] |
| G3 | Lock credentials issued by the new app are unattributed (`tour_user_id: nil`, no issuer, no visit). | [V `tour_api/locks.rb:192`] |
| G4 | The capacity and slot check in `Bookings::Create` runs before and outside the transaction; nothing locks the community. Two concurrent bookings can both pass. | [V `bookings/create.rb:50-56`] |
| G5 | The app sends `unit`, `length_minutes`, `party_size`; the server drops them silently (not in `BOOKING_PARAMS`). | [V `bookings_controller.rb:17-18`] |
| G6 | No cancellation or reschedule endpoint in the Tour App API; `Bookings::Reschedule` exists but is only routed for Connect. | [V `routes.rb:1106-1126`] |
| G7 | Rate limiting covers one endpoint (`/api/notify-email`). Login, OTP, booking and lock issuance are unthrottled. | [V `config/initializers/rack_attack.rb`] |
| G8 | Selfie and ID-card images are stored with `fog_public = true` at predictable paths `uploads/tour_user/<column>/<id>`; the Profile JSON returns the public URL. | [V `carrierwave.rb:48`, `avatar_uploader.rb:65-66`] |
| G9 | Every legacy API request persists its full params and response body to `impressions` (includes `token`, `pin_code`, `phone_number`, guest PINs and Bluetooth keys), unfiltered. A rake task purges rows older than a month; whether it is scheduled is unknown. | [V `lib/log/impression.rb:40-62`, `api/v1/base_controller.rb`, `lib/tasks/destroy_old_impressions.rake`] [A on scheduling] |
| G10 | Doorkeeper tokens are stored in plaintext (`hash_token_secrets` off); no refresh tokens; every login mints a new 5-day token. The device keeps the token and the issued door codes (`lockPins`) in unencrypted Preferences. | [V `doorkeeper.rb:104,182,227`, `services/session.ts:9-11`, `store/appState.ts:428-468`] |
| G11 | Tour App login/logout are not audited beyond `Rails.logger`; the automatic PaperTrail version of a Tour App booking has a nil `whodunnit` because `ActionController::API` does not set it. | [V `auth_controller.rb:26,33`, `application_controller.rb:2`] |
| G12 | Super Admin scope in the Tour App API is every community; `can_access_community?` is not applied. Fine for the current role, wrong the day another role is admitted. | [V `tour_api/properties.rb:37`] |
| G13 | PII removal acts on the global `tour_users` row (every property) and `delete_visit_data!` uses `delete_all` (no callbacks, no CRM cancel, S3 files kept, guest tables partly kept, no session revocation). | [V `visitors/privacy.rb:17-54, 102-122`] |
| G14 | No retention or purge job for visitor data, photos or guest credentials. No CI pipeline in the repository. | [V `lib/tasks`, no `.github`] |
| G15 | Check-in, the 45-minute access window, ID verification and location are simulated on the device (`ACCESS_MINUTES`, `simulateCapture`, "no geolocation plugin"). | [V `content/demoFixtures.ts:88-90`, `useAppActions.ts:338-366`] |

---

## 2. Proposed architecture

### 2.1 Principles

1. **One backend, one visitor model.** The visitor stays a `TourUser`; bookings stay `schedual_tours`; visits stay
   `tour_histories` + `visited_stops`. The Connect Visitors module, the legacy CMS pages, the CRM pushes and the
   reports already read these tables, so writing them from the new app makes a Tour App visit appear everywhere
   with no reader change. All schema changes are **additive columns and new tables**.
2. **Two principals, one API.** `Api::TourApp::V1` keeps the staff principal (Doorkeeper, CMS `User`) and gains a
   **visitor principal** (`TourUser` with an opaque session token). Each request resolves exactly one. A visitor can
   touch only its own rows; staff act on a property they can access.
3. **Services own the rules; controllers are thin.** Booking rules stay in `Bookings::Availability` / `Create` /
   `Reschedule`; visit recording gets one new service namespace (`Visits::`) used by the Tour App API now and by Connect
   walk-in entry later. No second booking engine, no second status derivation.
4. **Feature-flagged, reversible.** Server flags in the `Connect::Flags` style (`PYN_TOUR_VISITS`,
   `PYN_TOUR_VISITOR_AUTH`), advertised to the app in the settings payload so the app degrades to today's behaviour
   when a flag is off.
5. **The legacy app and its endpoints are untouched** (owner decision of October 18). The new endpoints never share
   the legacy base controllers, so nothing new lands in `impressions`.

### 2.2 Visitor lifecycle

```
                 widget / Connect / Tour App / CRM webhooks
                                 │  Bookings::Create (dedupe, slot check, CRM, notify)
                                 ▼
   ┌──────────┐  reschedule  ┌──────────┐   cancel (destroy + version)   ┌───────────┐
   │ (none)   │─────────────►│ UPCOMING │──────────────────────────────►│ CANCELLED │
   └──────────┘              └────┬─────┘                               └───────────┘
        walk-in                   │ booked time + grace passes, no visit
        (no booking)              ├──────────────────────────────────────► MISSED
                                  │
                                  │ POST /visits  (check-in: window, hours, [geofence], verification)
                                  ▼
                          ┌─────────────┐  events: arrived · skipped · unlock_issued · unlocked ·
                          │ IN_PROGRESS │          unlock_failed · photo · note · issue · heartbeat
                          └──────┬──────┘
                                 │ POST /visits/:id/end            │ no end within 120 min, or
                                 ▼                                 │ abandoned_at_stop
                           ┌───────────┐                           ▼
                           │ COMPLETED │                      ┌───────────┐
                           └───────────┘                      │ ABANDONED │
                                                              └───────────┘
```

The states are exactly the ones `Visitors::Status` already derives [V `status.rb:45-62`]; the plan adds the writes
that make the new app produce them, not a new state machine. `is_tour_completed` on the booking is set by the end
call through the existing `TourHistory#complete_scheduled_tour` [V `tour_history.rb:105`].

### 2.3 Sequence: a prospect's self-tour on the new app (target state, phases 1 to 3)

```
Tour App                         Rails Api::TourApp::V1                      Tables
  │ POST /visitor/otp {phone}        │ Visitors::Otp.send  (hash, 10 min, Twilio)  tour_users.otp_* 
  │ POST /visitor/otp/verify         │ Visitors::Otp.verify → Visitors::Session.issue  visitor_sessions
  │◄── token, visitor, bookings ─────│
  │ GET  /properties/:id/booking/*   │ Scheduling::Settings, Bookings::Availability  (exists)
  │ POST /properties/:id/bookings    │ Bookings::Create (visitor from session)      schedual_tours, versions
  │ POST /properties/:id/visits      │ Visits::Start   (window, hours, booking link) tour_histories
  │ POST /locks/pin {visit_id}       │ TourApi::Locks  (+ attribution)              igloohome_guests
  │ POST /visits/:id/events [batch]  │ Visits::Record  (idempotent)                 visited_stops, lock_histories
  │ POST /visits/:id/end             │ Visits::End     (completes booking, CRM)     tour_histories, schedual_tours
  │                                  │ after_create/after_update mail hooks fire as for the legacy app
Connect › Visitors reads the same rows: the visit shows as in progress, then completed, with stops and codes.
```

### 2.4 Components to add or change

| Layer | New | Changed | Untouched |
|---|---|---|---|
| Rails controllers | `Api::TourApp::V1::VisitorAuthController` (otp, verify, me, logout), `VisitsController` (create, events, end), bookings `cancel` / `reschedule` actions | `BaseController#authenticate!` resolves staff **or** visitor; `BookingsController#create` takes the visitor from the session when present; `LocksController` accepts `visit_id` | every legacy controller; Connect controllers (read new columns only) |
| Services | `Visitors::Otp`, `Visitors::Session`, `Visits::Start`, `Visits::Record`, `Visits::End`, `Bookings::Cancel` (extracts the Connect cancel path so both callers share it) | `Bookings::Create` (advisory lock; accept `visitor:`), `TourApi::Locks#record_issue!` (attribution), `Visitors::Privacy` (revoke sessions, cover new tables), `Visitors::Profile` (read `kind`/`occurred_at`) | `Bookings::Availability`, `SchedualTours::Capacity`, `Visitors::Status`, `Visitors::Query` |
| Schema | `visitor_sessions`; columns on `tour_users`, `tour_histories`, `visited_stops`, `igloohome_guests`, `lock_histories` (§3) | — | all existing columns and defaults |
| Config | rack-attack rules; flags `PYN_TOUR_VISITS`, `PYN_TOUR_VISITOR_AUTH`; `filter_parameters` additions | `doorkeeper.rb` (`hash_token_secrets`) [D] | — |
| Tour App | `VisitorAuth` screens (phone, code), `visits` repository methods, event queue with retry | `useAppActions` hooks post events; session store moves to secure storage; `lockPins` not persisted past the window | map, routing, unlock UI |
| Connect | nothing required for phase 1; later: "Tour App" source label for visits, visitor sessions card | `Visitors::Profile` renders `kind` / `occurred_at` when present | — |

---

## 3. Data model

All additive. Column names follow the tables' existing style. Indexes are created `algorithm: :concurrently`
with `disable_ddl_transaction!`, as `20261018090000` does [V].

### 3.1 `visitor_sessions` (new)

| column | type | notes |
|---|---|---|
| `tour_user_id` | integer, FK, indexed | owner |
| `token_digest` | string, unique index | SHA-256 of a 32-byte random token; the plaintext is returned once |
| `expires_at` | timestamptz | 30 days, sliding on use [D length] |
| `revoked_at` | timestamptz, nullable | logout, PII removal, admin revoke |
| `last_used_at` | timestamptz | audit; sliding expiry |
| `created_ip`, `user_agent`, `device_name` | string | audit only |
| `community_id` | integer, nullable | the property the session was opened for; informational |

Why not Doorkeeper: its `resource_owner_id` is one integer column mapped to `User` by `TourApi::Auth.authenticate`
[V `auth.rb:62`]; putting `TourUser` ids in the same column invites id collisions and makes revocation-by-owner
ambiguous. A 60-line service over a dedicated table is simpler than teaching Doorkeeper two owner types. [A: owner may
prefer Doorkeeper with a polymorphic owner; listed in §8.]

### 3.2 `tour_users` (add)

`otp_digest` (string), `otp_expires_at` (timestamptz), `otp_attempts` (integer, default 0),
`otp_last_sent_at` (timestamptz), `otp_sends_today` (integer, default 0). The legacy `pin_code` column and
`ExpireOtpJob` stay as they are for the legacy app [V `tour_users_controller.rb:97-101`]; the new flow never reads or
writes `pin_code`.

### 3.3 `tour_histories` (add)

`schedual_tour_id` (integer, nullable, indexed): the booking the visit was checked in against, replacing the
time-based match for new rows. `source` (string, default `'legacy'`; `'tour_app'` for the new app). `client_visit_id`
(uuid, partial unique index where not null) for idempotent start. `ended_reason` (string: `completed`, `abandoned`,
`timeout`, `staff_closed`). `device_time_zone` is the existing `my_time_zone` [V]. `arrived` / `left` keep their
meaning so `Visitors::Status` needs no change.

### 3.4 `visited_stops` (add)

`kind` (string: `arrived`, `skipped`, `photo`, `note`, `issue`, default `'arrived'` so legacy rows read correctly),
`occurred_at` (timestamptz, the instant; the legacy `event_date` + `event_time` pair is also written for the legacy
page), `tour_history_id` (integer, indexed; legacy rows stay keyed by `tour_key`), `client_event_id` (uuid, partial
unique index with `tour_history_id`), `payload` (jsonb: issue text, skip reason, photo caption).

### 3.5 `lock_histories` (add) and `igloohome_guests` (add)

`lock_histories`: `stop_type`, `stop_id`, `provider`, `method` (`pin` / `bluetooth`), `success` (boolean),
`error_code`, `client_event_id`; the table already has `tour_history_id`, `event`, `occured_at` [V].
`igloohome_guests`: `tour_history_id` (integer, nullable), `issued_by_user_id` (integer, nullable, the staff user
when staff-issued), and the new API **sets `tour_user_id`** from the visitor or the booking (closes G3).

### 3.6 Bookings

No status column. Cancellation keeps the **row destroy + PaperTrail destroy version** semantics because the legacy
CMS, the CRM cancellation callbacks (`before_destroy :cancel_tour`) and `Visitors::Cancelled` all depend on it
[V `schedual_tour.rb:7-8`, `visitors/cancelled.rb`]. Add `cancelled_by` is not possible on a destroyed row; the
Connect audit version (`booking_cancelled`, `whodunnit`) already records who [V `visitors_controller.rb:158-165`] and
the visitor path writes the same kind of version with `whodunnit: "visitor:<id>"`. Add the three dropped fields
`party_size`, `preferred_unit_id`, `length_minutes` as nullable columns on `schedual_tours` only if the owner wants them
stored [D, G5]; otherwise the app stops sending them.

---

## 4. API design (`/api/tour/v1`, JSON, additive)

Error envelope, validation shape and `TourApi::ApiError` are reused as they are [V `base_controller.rb:37-48`].

### 4.1 Visitor authentication

| Method & path | Auth | Body | Response | Rules |
|---|---|---|---|---|
| `POST /visitor/otp` | none | `phone` (E.164), `country_code` | `202 {sent: true, resend_after: 60}` **always**, even for unknown phones | per-phone 1/min and 5/day, per-IP 10/h (rack-attack); code = 6 digits from `SecureRandom.random_number`, stored as SHA-256 with a server pepper, 10-minute TTL, attempts reset; SMS via `TwilioSmsWorker` [V exists] |
| `POST /visitor/otp/verify` | none | `phone`, `code`, optional `first_name`, `last_name`, `email` | `200 {token, expires_at, visitor{id,first_name,last_name,email,phone_masked}, bookings[...]}`; `422 profile_required` when the phone has no row and no profile was sent; `401 invalid_code` (uniform for wrong, expired, locked) | max 5 attempts then the code is void; constant-time compare; on success the OTP columns are cleared; a new row is created through the **same dedupe** (`TourUserSearcherService`) so a widget booking made earlier with this phone is found [V] |
| `GET /visitor/me` | visitor | — | profile + upcoming / past bookings (via `get_filtered_tours` logic moved into `Visitors::Query`-style service, not the legacy controller) | |
| `PUT /visitor/me` | visitor | `first_name`, `last_name`, `email` | profile | email change re-runs dedupe conflict check; phone is **not** editable here (needs a new OTP) |
| `POST /visitor/logout` | visitor | — | `204` | revokes the session row |

The Apple-reviewer bypass (`+10123456789`) is **not** carried over; a reviewer account gets a fixed test property
with `PYN_TOUR_OTP_TEST_PHONES` allowing a stored code in non-production only [D].

### 4.2 Bookings (existing endpoint, two principals)

| Method & path | Auth | Change |
|---|---|---|
| `POST /properties/:id/bookings` | staff **or** visitor | with a visitor session the `first_name`/`last_name`/`email`/`phone_number` fields are **ignored** and the session's `TourUser` is passed as `visitor:` to `Bookings::Create` (no dedupe, no overwrite of identity); `created_by` stays `"Tour App"`; the audit version's `whodunnit` becomes `visitor:<id>` |
| `GET /properties/:id/bookings` | visitor | own bookings at this property |
| `PUT /properties/:id/bookings/:booking_id` | visitor / staff | `tour_date`, `tour_time` → `Bookings::Reschedule` [V exists]; ownership check `booking.tour_user_id == visitor.id` |
| `DELETE /properties/:id/bookings/:booking_id` | visitor / staff | `Bookings::Cancel` (extracted from `Connect::VisitorsController#cancel`: destroy + audit version + notifications); ownership check |

`Bookings::Create` gains `SELECT pg_advisory_xact_lock(hashtext('booking'), community_id)` at the top of its
transaction and moves `slot!` inside it (closes G4 for the widget, Connect and the app at once; the lock is per
community so it does not serialise unrelated properties).

### 4.3 Visits

| Method & path | Auth | Body | Effect |
|---|---|---|---|
| `POST /properties/:id/visits` | visitor (phase 2) / staff on behalf of a `tour_user_id` (phase 1) | `client_visit_id`, `booking_id?`, `tour_type`, `started_at`, `lat?`, `lng?`, `device_time_zone`, `app_version` | `Visits::Start`: validates check-in (§4.4), creates `tour_histories` (`arrived`, `community_id`, `tour_id`, `tour_key = SecureRandom.hex`, `source: tour_app`, `schedual_tour_id`), updates the visitor's `tour_type` / `tour_key` / coordinates as `initialize_tour` does [V `communities_controller.rb initialize_tour`]; idempotent on `client_visit_id`; returns `{visit_id, tour_key, access_window{starts_at, ends_at}, verification{...}}` |
| `POST /properties/:id/visits/:visit_id/events` | owner of the visit | `events: [{client_event_id, kind, stop_id, occurred_at, payload?}]` (1..100) | `Visits::Record`: one `visited_stops` row per `arrived` / `skipped` / `photo` / `note` / `issue`; one `lock_histories` row per `unlocked` / `unlock_failed`; `heartbeat` updates `active_app` + `updated_at` only; duplicates by `client_event_id` are acknowledged, not re-inserted; returns `{accepted: [...], rejected: [{client_event_id, code}]}` |
| `POST /properties/:id/visits/:visit_id/end` | owner | `ended_at`, `reason` (`completed` / `abandoned`), `abandoned_at_stop?` | `Visits::End`: sets `left`, `tour_state`, `ended_reason`; completes the booking (`is_tour_completed`, `tour_completed_at`) through the existing model method; `after_update` notifications fire as for the legacy app [V `tour_history.rb:11`] |
| `POST /properties/:id/locks/pin` and `/bluetooth-key` | visitor / staff | add `visit_id` | `record_issue!` writes `tour_user_id`, `tour_history_id`, `issued_by_user_id` (closes G3); the issuance also produces an `unlock_issued` `lock_histories` row |
| `POST /properties/:id/visits/:visit_id/issues` | owner | `stop_id?`, `category`, `text` | shortcut for an `issue` event that also emails the property (`TourHistory` mail helpers) [D whether to notify] |

Photos: the app uploads through the same base64 path `visited_stops.image` the legacy app uses (`save_user_data`
semantics) but through `events` with `kind: photo` and a `payload.image` (base64, capped at 5 MB). [A: direct S3
upload via `carrierwave_direct` is available in the Gemfile and would avoid base64 through Rails; decide in phase 3.]

### 4.4 Check-in validation (server side, `Visits::Start`)

Mirror of the legacy `user_tour_status` rules [V `communities_controller.rb user_tour_status`], re-expressed:

1. Property tour enabled (`require_tour!` [V]).
2. Visiting hours: inside `opening_hours` for the property's zone → `self_tour` / `guided_tour`, else `virtual_tour`
   (a remote visit is still recorded, `tour_site: offsite`).
3. Booking: if `booking_id` given, it must belong to the visitor and the property; window = booked time ± `grace_period`
   (default 10 min [V `status.rb`]); outside the window the server answers `422 outside_window` with the next slot, and
   the app may still start an unscheduled self-tour if the property allows it (`only_scheduled_tour` false).
4. Geofence: if coordinates are sent, the 1 km rule; if absent, **no geofence** and `location_received: false` is
   stored. The app has no geolocation plugin today [V]; adding `@capacitor/geolocation` is phase 3 [D].
5. Verification: if `visual_id_verification` is on and the visitor's `id_check` is not `verified` within 30 days
   [V `status.rb:103-118`], the response says `verification_required` and the app must run the (currently simulated)
   ID flow before `events` are accepted for lock issuance. The server **does not** trust a client-side "verified"
   flag; until a real provider is wired, the property setting decides whether locks are issuable [D].
6. Capacity: one open visit per visitor per property; a second start returns the open visit (idempotent).

### 4.5 Permissions matrix

| Action | Visitor (own) | Staff Super Admin (today) | Staff other roles (future) | Anonymous |
|---|---|---|---|---|
| OTP send / verify | ✓ | — | — | ✓ (throttled) |
| Read own profile, bookings, visits | ✓ | via Connect | via Connect | ✗ |
| Create / reschedule / cancel booking | own only | any property they can access | `can_access_community?` + `can_edit_map?` as Connect [V] | ✗ |
| Start visit, post events, end | own only | on behalf of a visitor at a property they can access (phase 1 bridge) | same | ✗ |
| Issue lock credential | own open visit, lock gates [V `locks.rb:91-95`] | any property (today) | `can_edit_map?` | ✗ |
| Read other visitors | ✗ | Connect only | Connect only | ✗ |
| PII removal, delete | ✗ (self-service deletion is a [D]) | Connect, Super Admin [V] | ✗ | ✗ |

Staff scoping: `TourApi::Properties.list` should apply `current_user.can_access_community?` now (no behaviour change
for Super Admins, closes G12 before any other role is admitted).

---

## 5. Security

### 5.1 Threat model

| Threat | Vector | Control | Evidence to show a reviewer |
|---|---|---|---|
| OTP brute force | 6 digits, online guessing | 5 attempts per code, 10-min TTL, per-phone and per-IP throttles, uniform error, constant-time compare, code hashed with a pepper (`SECRET_KEY_BASE` derived) | Minitest for attempts and TTL; rack-attack test; log sample |
| SMS pumping / toll fraud | OTP endpoint abused to send SMS to premium numbers | per-phone 1/min 5/day, per-IP 10/h, global 1,000/h circuit breaker, E.164 validation, optional country allowlist per company [D], Twilio alerting on spend | throttle rules in `rack_attack.rb`; Bugsnag/notice on breaker |
| Phone enumeration | different responses for known / unknown phones | identical `202` and timing (always enqueue a no-op job) | controller test asserts identical bodies |
| Session token theft | token on device, in transit, in logs | 256-bit random, stored hashed, `Authorization: Bearer`, never in URLs; TLS only (Heroku); `filter_parameters` already masks `token` [V]; device storage moved to Keychain / Keystore (`@capacitor-community/secure-storage` or equivalent) [D plugin]; sliding 30-day expiry; revoke on logout and PII removal; `last_used_at` for anomaly review | code review of `Visitors::Session`; filtered-log sample; app build inspection |
| Cross-visitor / cross-property access | ids in URLs | every lookup scoped `community.tour_histories.where(tour_user_id: current_visitor.id)`; bookings via `community.schedual_tours`; 404 not 403 for non-owned ids (as Connect does [V `visitors_controller.rb:118-132`]) | `security_test.rb` extended with cross-visitor and cross-property cases |
| Replay / duplicate events | retries from a flaky network | `client_event_id` / `client_visit_id` unique indexes; batch endpoint returns per-item results | DB constraint + test |
| Booking race | two clients, last slot | advisory lock per community inside the transaction | concurrency test with two threads on `pynwheel_test` |
| Fake unlock / fake verification | client claims success | the server records what **it** issued (`unlock_issued`) separately from what the client reports (`unlocked`); verification state is server-side only; lock issuance requires an open visit at the property | profile shows both rows; test that a client `unlocked` without an issuance is stored but flagged |
| PII exposure in storage | public S3 for selfies / IDs (G8); impressions (G9) | `fog_public = false` + signed URLs with short expiry for `tour_user` and `visited_stops` uploaders [D: affects legacy views that print the URL]; `impressions`: filter `token`, `pin_code`, `phone_number`, `guest_pin`, `guest_bluetooth_key` before save, confirm the monthly purge is scheduled, or disable `logging_trail` on the self-tour namespace [D] | bucket policy screenshot; purge schedule; filtered row sample |
| PII in logs | Rails logs on Heroku | add `pin_code`, `otp_digest`, `phone_number`, `email`, `guest_pin`, `guest_key` to `filter_parameters` (today only `password, token, guest_bluetooth_key, client_secret, iglooworks_api_key, image, csv` [V]) | initializer diff; log sample |
| Staff token misuse | 5-day plaintext Doorkeeper tokens (G10) | `hash_token_secrets` on (new tokens only; existing legacy `api/v2` tokens keep working until expiry) [D], shorter TTL for the Tour App grant via `custom_access_token_expires_in` (e.g. 12 h) + refresh token [D], login throttle per email and IP | doorkeeper initializer diff; `auth_test.rb` |
| Privilege widening | admitting non-Super-Admin staff later | `can_access_community?` in `Properties.list` and `find!` now | test with a Company admin fixture |
| CSRF | none for Bearer APIs; Connect writes keep X-CSRF-Token [V] | unchanged; CORS `origins '*'` [V `application.rb:33`] is acceptable for a Bearer API but should list the Connect origin for cookie endpoints [D, out of scope] | — |
| Secrets | Twilio, Stripe, igloohome, `SECRET_KEY_BASE` in Heroku config; GitLab Maven token in `~/.gradle` | unchanged; nothing added to the APK; the OTP pepper is derived, not a new secret | config var list without values |
| Abuse of visits | bots creating visits / events | visitor session required; per-session event rate (e.g. 600/h); payload size caps | throttle rule + test |

### 5.2 Audit logging

- **Who did what:** every visitor write produces a PaperTrail version in the Connect style (`item_type: 'Community'`,
  `event: visitor_login | visitor_logout | booking_created | booking_cancelled | visit_started | visit_ended |
  lock_issued`, `whodunnit: "visitor:<id>"` or the staff user id, `community_id`, `company_id`, JSON payload)
  [V pattern in `visitors_controller.rb:158-165`, `bookings/create.rb:203-211`]. Events (`arrived`, `photo`, …) are
  their own rows and are not duplicated into `versions`.
- `set_paper_trail_whodunnit` is added to the Tour App base controller so automatic `SchedualTour` versions carry the
  principal (closes G11).
- Access-code issuance also writes `AccessLog` through the existing `AccessLogsService#create_access_log` [V] with the
  payload redacted (no PIN), so the legacy "access logs" page sees Tour App issuances too.

### 5.3 Privacy and retention [D for every period]

| Data | Proposed retention | Mechanism |
|---|---|---|
| OTP columns | cleared on verify; `otp_expires_at` ≤ 10 min | in-row |
| `visitor_sessions` | expired/revoked rows deleted after 90 days | nightly Sidekiq job |
| Visit photos / notes (`visited_stops.image`, `description`) | 12 months after `left` | nightly job removes files (S3) then rows; the existing `remove_pii` continues to work |
| Selfie / ID images | 30 days after verification (matches the 30-day `VERIFIED_FOR` rule [V]) | job; legacy page shows "expired" |
| Guest credentials (`igloohome_guests` etc.) | PIN / key values nulled 7 days after the window; rows kept for the audit trail | job |
| `impressions` | 30 days (exists as a rake task [V]; schedule it) | Heroku Scheduler |
| Bookings and PaperTrail | as today (business record); `remove_pii` masks the person | unchanged |

`Visitors::Privacy.remove!` must also revoke the visitor's sessions and null the OTP columns; `delete_visit_data!`
must delete the new rows for that property (sessions are global and stay). The fact that `tour_users` is global means a
"remove PII" at one property removes it at all; that is existing behaviour [V], documented, not changed.

### 5.4 Security review checklist (controls and evidence, not a guarantee)

- [ ] Threat model (§5.1) reviewed with the owner; each **[D]** closed.
- [ ] rack-attack rules present for `/api/tour/v1/auth/login`, `/visitor/otp`, `/visitor/otp/verify`,
      `/properties/*/bookings`, `/properties/*/locks/*`, `/properties/*/visits/*`; tests prove 429.
- [ ] OTP: hashed, 10-min TTL, 5 attempts, uniform responses; tests.
- [ ] Session: 256-bit, hashed at rest, Bearer only, sliding expiry, revocation on logout / PII removal; tests.
- [ ] Ownership scoping on every visitor endpoint; `security_test.rb` covers cross-visitor, cross-property,
      staff-vs-visitor confusion, and expired / revoked tokens.
- [ ] `filter_parameters` covers the new columns; a staging log sample shows `[FILTERED]`.
- [ ] `impressions` filtered or disabled for the self-tour namespace; purge scheduled.
- [ ] `fog_public` decision implemented or explicitly deferred with the legacy impact noted.
- [ ] Doorkeeper `hash_token_secrets` decision implemented or deferred.
- [ ] Device: token in secure storage; `lockPins` not persisted beyond `accessEndsAt`; no secrets in the APK
      (`strings`/`grep` of the built bundle).
- [ ] Audit versions written for every write; sample rows attached.
- [ ] Retention jobs scheduled; dry-run output attached.
- [ ] Dependency check (`bundle audit`, `npm audit`) output attached.
- [ ] Legacy regression: the four legacy API flows and the legacy Visitors / Scheduled Tours pages re-run in the
      in-process Warden harness after the migrations (as in the October QA passes).

---

## 6. Implementation plan

Each phase is independently shippable behind its flag and leaves the previous behaviour intact when the flag is off.

### Phase 0: hardening that needs no product decision (1 week)

- rack-attack rules for login, bookings, locks; `filter_parameters` additions; `set_paper_trail_whodunnit` in the
  Tour App base; `can_access_community?` in `TourApi::Properties`; advisory lock in `Bookings::Create`;
  `record_issue!` fills `tour_user_id` from the booking's visitor when the stop belongs to a booked visitor
  (partial fix for G3) and `issued_by_user_id`.
- Migrations: `igloohome_guests.issued_by_user_id`, `igloohome_guests.tour_history_id` (nullable, unused yet).
- **Acceptance:** all existing Rails tests green (`test/controllers/api/tour_app/v1/*`, `test/controllers/connect/*`
  [V exist]); new tests: 429 on each throttled path, concurrency test for the last slot, whodunnit populated.
- **Dependencies:** none. **Rollback:** revert the deploy; the two columns are harmless.

### Phase 1: visits recorded by the new app, staff principal (2 weeks)

- Migrations §3.3 to §3.5 (`tour_histories`, `visited_stops`, `lock_histories` columns + indexes).
- `Visits::Start` / `Record` / `End`, `VisitsController`, flag `PYN_TOUR_VISITS` exposed in `GET /properties/:id`
  as `capabilities.visits`.
- Tour App: `visits` repository; `checkIn` → start; `arrive` / `skipStop` / unlock results / `finish` / `reportIssue`
  → events and end; an offline queue (persisted, replayed with the same `client_event_id`); the 45-minute window
  comes from the server response instead of `ACCESS_MINUTES`.
- Phase-1 identity bridge: the staff user starts the visit "on behalf of" the visitor returned by the booking
  (`visitor.id` from `TourApi::Booking.created` [V], stored on the device for the session only).
- **Acceptance:** a Tour App tour on the audit clone appears in Connect › Visitors as in progress with the last stop,
  then completed with stops, photos and the issued code, within one page refresh; the legacy "All Visitors" page lists
  the same visitor; `Visitors::Status` unchanged; vitest for the event queue (dedupe, retry, order); Rails tests for
  idempotency and ownership.
- **Dependencies:** Phase 0. **Rollback:** flag off → the app returns to local-only behaviour; rows already written stay
  and remain valid for Connect.

### Phase 2: visitor identity (3 weeks)

- Migrations §3.1, §3.2. `Visitors::Otp`, `Visitors::Session`, `VisitorAuthController`; `authenticate!` resolves two
  principals; bookings / visits / locks accept the visitor principal; flag `PYN_TOUR_VISITOR_AUTH`, advertised as
  `capabilities.visitor_auth`.
- Tour App: phone + code screens; secure token storage; the Super Admin login remains available as "Staff mode"
  (settings), so demos keep working.
- `Visitors::Privacy` revokes sessions; Connect profile shows "Signed in on the Tour App" from `visitor_sessions`
  (read only).
- **Acceptance:** a prospect who booked on the widget signs in with the same phone and sees the booking; a new phone
  is asked for a profile and ends up as one `tour_users` row; OTP tests (TTL, attempts, uniform errors, throttles);
  session tests (expiry, revocation, hashed storage); ownership tests; the legacy app's OTP on the same visitor still
  works (`pin_code` untouched).
- **Dependencies:** Phase 1; **[D1]** (prospect sign-in) and **[D2]** (register on verify). **Rollback:** flag off →
  visitor endpoints return 404; staff mode continues.

### Phase 3: booking self-service and check-in rules (2 weeks)

- `Bookings::Cancel` extracted and shared with Connect; visitor cancel / reschedule endpoints; app cancel and
  reschedule wired to the server (today `cancelTour` is local [V]).
- Check-in rules §4.4 incl. `outside_window` and `verification_required`; optional geolocation plugin [D4];
  decision on ID verification in the new app [D5].
- `party_size` / `preferred_unit_id` / `length_minutes` columns if wanted [D6].
- **Acceptance:** cancelling in the app produces the same destroy version, CRM cancellation and property email as a
  Connect cancel; Connect shows Cancelled; reschedule moves CRM appointments; tests for every window case.
- **Dependencies:** Phase 2 for visitor-owned cancels (staff cancels can ship with Phase 1).

### Phase 4: privacy, retention and storage (2 weeks, can run in parallel with 3)

- `fog_public` + signed URLs [D7]; `impressions` filtering / purge schedule [D8]; Doorkeeper hashing and TTL [D9];
  retention jobs §5.3 [D10]; extend `remove_pii` / `delete_visit_data!` to the new tables and S3 files.
- **Acceptance:** signed URLs expire; a removed visitor has no sessions and no readable images; jobs idempotent and
  dry-run logged; legacy pages still render the images they need.

### Testing strategy (all phases)

| Level | Tool | What |
|---|---|---|
| Rails unit / controller | Minitest, `RAILS_ENV=test`, files run separately (the `ScheduledTourMailerJob` hang [V in memory]) | services, controllers, security matrix, throttles (rack-attack test mode), concurrency (threads + advisory lock), idempotency |
| Legacy parity | in-process Warden harness (October QA recipe) | legacy Visitors / Scheduled Tours pages and the four legacy API calls after migrations and after new rows exist |
| App unit | vitest (103 today [V]) | event queue, reducers, session store, repository error mapping |
| End to end | headless Playwright against Rails on the audit clone (recipe in memory and the Start Tour QA) | book → check in → stops → unlock (igloohome v1 BLE skipped; PIN on a test account only) → end → Connect shows it |
| Device | Android debug APK on the A02s; iOS when the plugin is wired | secure storage, offline queue replay, Bluetooth enable flow |
| Non-functional | `bundle audit`, `npm audit`; Heroku router logs for 429s and p95 of `/visits/*/events` | security and performance evidence |

No CI exists [V]; a minimal GitHub Actions workflow running the Rails suite file-by-file and vitest is recommended
before Phase 2 [D11].

### Deployment, monitoring, rollback

- **Deploy:** Heroku `pyn-system` (web + Sidekiq worker [V Procfile]). Migrations are run manually after deploy
  (no release phase [V]); all are additive and concurrent-index, so they can run while the old code serves. Order:
  migrate, then flip the flag.
- **Flags:** `PYN_TOUR_VISITS`, `PYN_TOUR_VISITOR_AUTH` (and `_COMMUNITY_IDS` allowlists, as `PYN_CONNECT_WRITES`
  does [V `connect/flags.rb`]). The app reads `capabilities` and hides what the server does not offer, so an old app
  and a new server, or the reverse, both keep working.
- **Monitoring:** Bugsnag is configured [V]; add `[tour-api]`-prefixed log lines (existing convention [V
  `auth_controller.rb`]) for OTP send / verify failure / throttle / visit start / end; a daily count query of
  `visitor_sessions`, OTP sends, visits by `source`, 429s; Twilio spend alert. lograge is in the Gemfile but not
  configured [V]; configuring it is optional.
- **Rollback:** flag off first (seconds), code revert second; data stays consistent because every write is additive
  and the readers tolerate the new columns being present but empty.

---

## 7. Failure handling and concurrency

| Case | Behaviour |
|---|---|
| Offline during the tour | the app queues events locally (persisted) and replays in order with the same ids; the server accepts late `occurred_at`; a visit with no `end` is closed by the existing 120-minute rule as abandoned [V `status.rb`], or by a later `end` with the real time |
| Two devices, one visitor | one open visit per visitor per property; the second `start` returns the open visit |
| Duplicate submit of a booking | advisory lock + the existing "reuse the upcoming booking" rule [V `create.rb:57`] |
| SMS provider down | `TwilioSmsWorker` retries once [V `retry: 1`]; the endpoint still answers `202`; the user can resend after 60 s |
| Lock vendor error | unchanged (`vendor_error` [V `locks.rb`]); the issuance attempt is still recorded as `unlock_failed` with the error code |
| Clock skew | server stores `received_at`; `occurred_at` is bounded to ±24 h of now, else clamped and flagged |
| Partial batch | per-item result; the client drops accepted ids and retries rejected ones only when the code is retryable |

---

## 8. Open questions and decisions

| # | Decision | Recommendation |
|---|---|---|
| D1 | Admit prospects to the new Tour App (phone + OTP), or keep it staff-only? | Admit (Phase 2). Without it the app cannot replace the legacy one. |
| D2 | Register on OTP verify (profile fields) vs. require a prior booking? | Register on verify; it mirrors the legacy app's hidden registration and the widget's dedupe. |
| D3 | OTP channel and format | SMS, 6 digits, 10 min. Email fallback later. |
| D4 | Geofence in the new app (needs a geolocation plugin) | Phase 3, optional per property; absent coordinates never block a tour. |
| D5 | ID verification in the new app (today simulated) | Server-side flag only until a provider is chosen; do not issue locks on properties that require verification until then. |
| D6 | Store `party_size`, `preferred_unit_id`, `length_minutes` | Store `party_size` and `preferred_unit_id`; drop `length_minutes`. |
| D7 | Make selfie / ID / photo uploads private (signed URLs) | Yes; verify the legacy CMS pages that print these URLs. |
| D8 | `impressions`: filter secrets and schedule the purge, or stop logging the self-tour namespace | Filter + schedule now; stop logging when the legacy app is retired. |
| D9 | Doorkeeper: hash tokens, shorter Tour App TTL, refresh tokens | Hash + 12 h + refresh for the Tour App grant; legacy `api/v2` unaffected until its tokens expire. |
| D10 | Retention periods (§5.3) | As proposed; confirm against customer contracts. |
| D11 | Add CI | Yes, before Phase 2. |
| D12 | Cancellation stays "destroy the row" | Yes, for legacy and CRM compatibility; revisit only with the legacy CMS retirement. |
| D13 | Self-service account deletion for visitors (app-store requirement for consumer apps) | Yes if D1 is yes: `DELETE /visitor/me` reusing `TourUsersController#destroy_user`'s list via a service. |
| D14 | Visitor session store: dedicated table (proposed) vs. Doorkeeper with a polymorphic owner | Dedicated table. |
| D15 | Which Connect roles may use the Tour App in staff mode | Super Admin only until the Connect role model is revisited. |

### Assumptions to confirm

- [A] The `destroy_old_impressions` rake task is scheduled on Heroku; the production size of `impressions` is unknown.
- [A] Twilio and Stripe credentials are present on `pyn-system` for the new endpoints to reuse the workers.
- [A] The Connect Visitors UI needs no change for Phase 1 beyond reading the new optional fields.
- [A] Apple / Google review will require a demo login; the reviewer bypass must not weaken production OTP.
- [A] `HOST_URL` is still unset on `pyn-system` (handoff item 3); booking links in notifications stay empty until set.

---

## 9. File map for the implementer

| Area | Files |
|---|---|
| Tour App API base and auth | `app/controllers/api/tour_app/v1/base_controller.rb`, `auth_controller.rb`, `app/services/tour_api/auth.rb` |
| Bookings | `app/controllers/api/tour_app/v1/bookings_controller.rb`, `app/services/bookings/{create,reschedule,availability}.rb`, `app/controllers/concerns/schedual_tours/{capacity,notifications}.rb` |
| Locks | `app/controllers/api/tour_app/v1/locks_controller.rb`, `app/services/tour_api/locks.rb` |
| Connect Visitors | `app/controllers/connect/visitors_controller.rb`, `app/services/visitors/*.rb`, `pyn-connect-web/src/core/screens/properties/tour/VisitorsTab.tsx`, `useTourVisitors.ts` |
| Legacy writers to mirror | `app/controllers/api/v1/tour_histories_controller.rb` (`save_tour_history`), `app/controllers/api/self_tour/v1/communities_controller.rb` (`user_tour_status`, `initialize_tour`) |
| App | `tour-app/src/store/useAppActions.ts`, `store/reducer.ts`, `store/appState.ts`, `services/session.ts`, `services/persistence.ts`, `repositories/pynwheelApi/pynwheelApiTourRepository.ts`, `screens/ScheduleScreen.tsx`, `screens/UnlockPanel.tsx` |
| Config | `config/initializers/{rack_attack,doorkeeper,carrierwave,filter_parameter_logging}.rb`, `app/services/connect/flags.rb`, `lib/log/impression.rb` |
| Tests to extend | `test/controllers/api/tour_app/v1/{security,bookings,locks,auth}_test.rb`, `test/controllers/connect/visitors_controller_test.rb`, `tour-app` vitest |
