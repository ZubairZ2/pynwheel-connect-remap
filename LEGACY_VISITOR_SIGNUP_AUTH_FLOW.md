# Learning doc: how the legacy Pynwheel Tour app handles visitors

Written October 23, 2026 from the code on disk: the React Native app in `pyn-tour-old/` and the Rails
controllers it calls in this repository. Every claim below points at the file that proves it. Line numbers are
from the current `main`.

This doc answers five questions:

1. Who is a "visitor" and where is one stored?
2. How does a visitor get created (web widget vs. the app)?
3. How does the app authenticate a visitor (phone + OTP + JWT)?
4. What does the app keep on the device, and how does a session survive a restart?
5. What does the CMS record when the visitor books, arrives, tours and leaves?

A short comparison with the new Capacitor Tour App closes the doc.

---

## 1. The visitor is a `TourUser`

There is no `visitors` table. A visitor is a row in `tour_users` ([db/schema.rb](db/schema.rb), `create_table "tour_users"`).
The row is the identity and also the per-tour scratch state: the legacy design keeps one `TourUser` per person
and overwrites tour-specific columns on every new tour.

| Column group | Columns | Written by |
|---|---|---|
| Identity | `first_name`, `last_name`, `name`, `email`, `phone_number`, `is_sms_enabled`, `desired_bedroom` | widget submit, app registration, profile edit |
| Login | `pin_code` (the 4-digit OTP, cleared after 15 min) | `generate_otp`, `ExpireOtpJob` |
| Current tour | `tour_type` (`self_tour` / `guided_tour` / `virtual_tour`), `tour_key` (random hex per tour), `latitude`, `longitude`, `verified_by`, `lock_access_time` | `user_tour_status`, `initialize_tour`, `generate_locks_accesses` |
| ID verification | `image`, `id_card`, `id_selfie_mismatch`, `is_authentiq_verified`, `is_checkpoint_verified`, `*_verified_at`, `authentication_request_id` | the three ID-verification flows |
| Lock provider state | `dwelo_status`, `edge_state_status`, `latch_status`, `zerv_status`, `igloohome_status` | lock access threads, polled by `check_lock_access` |
| Payment | `strip_customer_id`, `card_last_digits`, `card_expiry` | widget (Stripe escrow), ID-verification charge |
| Property access | `property_access_code`, `property_access_code_generated_at`, `restricted_property_access` | gated properties |

`TourUser` ([app/models/tour_user.rb](app/models/tour_user.rb)) validates first name, last name, email (format) and
phone presence, and owns everything the visitor produces:

```
TourUser
 ├── schedual_tours      bookings (one row per scheduled tour)
 ├── tour_histories      visits (one row per tour session: arrived / left / state)
 ├── visited_stops       per-stop events (photos, notes, the door code shown)
 ├── tours               a customised copy of the community tour when customization is on
 ├── prospects           what was pushed to the property's CRM
 ├── igloohome_guests, latch_guests, zerv_guests, igloo_guests, as_guests   lock credentials per tour
 ├── chatrooms, feedbacks, user_stripes, lock_histories, latch_auth_token
```

Everything is `dependent: :destroy`, and the app's "delete account" calls the same list by hand
([tour_users_controller.rb:138](app/controllers/api/self_tour/v1/tour_users_controller.rb:138)).

### How duplicates are avoided

Both creation paths run `TourUserSearcherService` ([app/services/tour_user_searcher_service.rb](app/services/tour_user_searcher_service.rb))
before inserting. It tries, in order:

1. same email **and** same phone
2. same email with an empty phone
3. same phone with an empty email
4. same phone, any email

and takes the newest match. So phone number is the real key. A visitor who books with a different email but the
same phone is matched to the old row and the row's email is overwritten. The dedupe is not a database constraint,
and there is no unique index on `phone_number` or `email`.

---

## 2. How a visitor gets created

### 2a. The normal path: the web scheduling widget

Most visitors are born on a property's website, not in the app. The property embeds Pynwheel's scheduler widget
(an iframe or button; `SchedulerWidget::WidgetsController`,
[app/controllers/scheduler_widget/widgets_controller.rb](app/controllers/scheduler_widget/widgets_controller.rb)).

The widget page is public. The controller skips Devise (`skip_before_action :authenticate_user!`), skips CSRF,
and allows framing. The only protection is a **community code**: a JWT `{community_id}` signed with
`Community.widget_signing_key` (HS256). When the page is opened with `direct=true` the code must decode to the
same `community_id` as the query string, otherwise 404 ([widgets_controller.rb:48](app/controllers/scheduler_widget/widgets_controller.rb:48)).
The CMS mints that code wherever it renders a booking link (`app/models/community.rb:350` and the
scheduler-widget settings page).

Booking is two requests from the browser:

1. **Pick a slot** → `POST /schedual_tours` (JSON) → `SchedualToursController#create`
   ([app/controllers/schedual_tours_controller.rb:180](app/controllers/schedual_tours_controller.rb:180)).
   It counts bookings in the same interval and per day against the community's limits, then inserts a
   **placeholder** `schedual_tours` row with `tour_date`, `tour_time`, `end_time`, `community_id` and no
   `tour_user_id`. The widget keeps the id as `sched_tour_id`.

2. **Submit the form** → `POST /create_tour_user_from` → `SchedualToursController#create_tour_user_from`
   ([schedual_tours_controller.rb:54](app/controllers/schedual_tours_controller.rb:54)). In order:
   - normalise the phone to E.164 with the picked country code (`make_phone`);
   - `TourUserSearcherService` lookup by phone and email;
   - **slot check** against the same booking rules Connect and the new Tour App use (added October 20, 2026:
     `scheduled_slot_problem` → `Bookings::Availability`), bouncing back to the widget with a message if the slot closed;
   - create or update the `TourUser` (name, first/last, email downcased, phone, `desired_bedroom`,
     `card_last_digits`, `is_sms_enabled`);
   - if the property requires a card: Stripe customer + a 50-unit "Escrow Payment" charge that is refunded two
     seconds later (`charge_customer` / `refund_customer`, `StripeServices`); the ids land on the booking as
     `charge_id` / `pay_back_id`;
   - find the placeholder booking (or create one), copy a previous booking's `stops_list`, and `update` it with
     `tour_user_id`, `tour_type`, `property_tour_type`, `desired_move_in_date`, `desired_bedroom`,
     `user_time_zone`, `country_code`, marketing source and the CRM discovery source (Funnel / Knock / RentCafe);
   - if this visitor already had a future booking, that one is updated instead and the placeholder is deleted
     (that is the "one upcoming booking per visitor" rule the new app has to live with);
   - push the appointment to the CRM: Yardi RentCafe (`book_yardi_appointment`), Funnel, Knock, RealPage
     (`realpage_insert_prospect`), which fills the `yardirentcafe_*`, `funnel_*`, `knock_*` columns;
   - send the confirmation: `SchedualTours::Notifications#send_email_and_other_notifications`
     ([app/controllers/concerns/schedual_tours/notifications.rb:15](app/controllers/concerns/schedual_tours/notifications.rb:15))
     builds the HTML, enqueues `ScheduledTourMailerJob` (visitor + property, depending on `alert_contact`) and
     `TwilioSmsWorker` for the SMS, both with the app-store download links;
   - redirect back to the widget with the confirmation text.

Result on the CMS: one `tour_users` row, one `schedual_tours` row (`created_by` "Pynwheel"), possibly a
`prospects` row, and a PaperTrail version on the booking (`SchedualTour has_paper_trail`; production has the
history, local dumps mostly do not).

Other booking sources write the same two tables: the legacy walk-in page in the CMS (`communities/:id/scheduled_tours`),
PERQ and Salesforce webhooks (`Api::V1::PerqWebhooksController`, `SalesforceWebhooksController`), the Connect
Visitors tab (`created_by` "Connect") and the new Tour App (`created_by` "Tour App").

### 2b. The app path: registration inside the app

The app can also create a `TourUser`, which the app's own `CONTEXT.md` gets wrong. The screen is
`LoginScreen` ([pyn-tour-old/src/Screens/LoginScreen/index.js](pyn-tour-old/src/Screens/LoginScreen/index.js)),
reached when the phone lookup finds nobody (§3, step 2). It asks for first name, last name, email, phone and an
SMS consent checkbox and calls `userLogin` ([API.js:610](pyn-tour-old/src/Library/ServerCalls/API.js:610)):

```
POST /api/v1/tours/tour_user_login        (multipart form, no token)
  email, first_name, last_name, phone_number, is_sms_enabled,
  license_key, community_id
```

`Api::V1::ToursController#tour_user_login` ([tours_controller.rb:201](app/controllers/api/v1/tours_controller.rb:201)):

- `set_tour_user` runs the same `TourUserSearcherService`; if found, the row's name, phone and email are
  **overwritten** with what the form sent;
- otherwise `create_new_tour_user` inserts the row with every verification flag false;
- the response is `{ tour_user, token, allowed_email }` where `token` is the JWT (§3) and `allowed_email` is
  false when the community has `restrict_access` and the email is not in `allowed_emails`.

`license_key` is sent from `.env` but **never checked**: the only reference is a commented-out line in
`grant_access` ([application_helper.rb:80](app/helpers/application_helper.rb:80)). The endpoint is effectively
open: anyone who knows a phone number and the URL can create or rename a visitor. The OTP step after it is what
proves the phone.

---

## 3. Authentication: phone → OTP → JWT

### 3a. The screens

```
Launch ──(check_version)──► Onboarding ──► Welcome ──► LoginWithPhone
                                                           │
                                   POST get_tour_user (phone)│
                                   ┌─────────────────────────┴─────────────────────────┐
                                   │ found: generate_otp → OtpScreen                   │ not found: LoginScreen (register)
                                   │                                                   │ → tour_user_login → generate_otp → OtpScreen
                                   └─────────────────────────┬─────────────────────────┘
                                                             ▼
                                                 OtpScreen: verify_otp (4 digits)
                                                             ▼
                                          redux: userLoginState=true, userID, access_token
                                                             ▼
                                                        WelcomeTour (home)
```

Files: [LoginWithPhone/index.js:21](pyn-tour-old/src/Screens/LoginWithPhone/index.js:21),
[LoginScreen/index.js:89](pyn-tour-old/src/Screens/LoginScreen/index.js:89),
[otp/index.tsx:52](pyn-tour-old/src/Screens/otp/index.tsx:52), route table in
[NewAppNavigator.js](pyn-tour-old/src/NewAppNavigator.js).

### 3b. The three calls, on the wire

All three are `fetch` with `multipart/form-data`; the Rails side is
`Api::SelfTour::V1::TourUsersController` ([tour_users_controller.rb](app/controllers/api/self_tour/v1/tour_users_controller.rb)).

**1. Lookup** (`getUserByPhone`, [API.js:78](pyn-tour-old/src/Library/ServerCalls/API.js:78))

```
POST /api/self_tour/v1/tour_users/get_tour_user
  phone_number=+1…   licenseKey=…
→ { status: true, data: <tour_user>, token: <JWT> }      or { status: false, success_code: 404 }
```

No authentication (`except: :get_tour_user`). `set_tour_user` does `TourUser.where(phone_number:).last`. The
JWT is minted **before** the phone is proven; the app only keeps it after the OTP succeeds, but the server has
no way to know that.

**2. Send the code** (`generateOTP`, [API.js:101](pyn-tour-old/src/Library/ServerCalls/API.js:101))

```
POST /api/self_tour/v1/tour_users/generate_otp
  phone_number, token, tour_user_id
```

`check_authentication` must pass (§3c). Then `send_otp_phone`: `pin_code = rand(0..9999)` zero-padded to 4
digits, saved on the row; `TwilioSmsWorker.perform_async` (Sidekiq, queue `message`) sends
"Verification code NNNN. Code will expire in 15 minutes." from `TWILIO_FROM_PHONE_NUMBER`;
`ExpireOtpJob.perform_in(900, user)` (Sucker Punch, in-process) sets `pin_code` back to nil after 15 minutes.
`NotificationValidatorService` can suppress the SMS for blocked recipients.

The App Store reviewer bypass: phone `+10123456789` skips the SMS and accepts whatever `pin_code` is already in
the database ([tour_users_controller.rb:26](app/controllers/api/self_tour/v1/tour_users_controller.rb:26)).

**3. Verify** (`verifyOtpFromServer`, [API.js:128](pyn-tour-old/src/Library/ServerCalls/API.js:128))

```
POST /api/self_tour/v1/tour_users/verify_otp
  phone_number, pin_code, tour_user_id, token
→ { status: true, data: { user, upcoming_tours, completed_tours, visited_history } }
```

A plain string compare `@tour_user.pin_code === params[:pin_code].to_s`. No attempt counter, no lockout; the
only limit is the 15-minute expiry and the app's 60-second resend timer. `verify_otp` also destroys any stored
Latch auth token (`destroy_latch_screen_session`) so a new tour starts clean with Latch.

On success the OTP screen dispatches four redux actions (`setLoginUserID`, `setLoginUser`, `setLoginStatus(true)`,
`setAccessToken(token)`) and resets navigation to `WelcomeTour`. If the user came from "edit profile"
(`userData` param), it first `PUT`s the profile and uses the token from that response.

### 3c. The token and how every later call is authorised

`encoded` / `decoded` / `grant_access` live in `ApplicationHelper`
([application_helper.rb:63](app/helpers/application_helper.rb:63)):

```ruby
payload = { tour_user_id: tour_user.id, tour_user_email: tour_user.email }
JWT.encode payload, ENV['SECRET_KEY_BASE'], 'HS256'
```

- **No expiry claim, no issued-at, no revocation.** A token is valid for as long as `SECRET_KEY_BASE` stays the
  same and the `tour_users` row exists. Logout in the app does not invalidate it.
- **Signed with the Rails secret key base**, the same secret as the session cookie store.
- **Check:** `grant_access(decoded(token), tour_user_id)` returns true when the token decodes and its
  `tour_user_id` equals the `tour_user_id` **parameter** of the request. Every legacy endpoint carries both; the
  token is a form field or a query-string parameter named `token`, never an `Authorization` header
  (see any URL in [API.js](pyn-tour-old/src/Library/ServerCalls/API.js), e.g. line 198).
- **Bypass:** `api_access` returns true when `ENV["API_ACCESS"] == "true"`, and every check is written as
  `api_access || grant_access(...)`. Local servers started with `API_ACCESS=true` accept any token for any
  visitor. Never set it on a public server.
- The check is copy-pasted per action rather than a filter: `check_authentication` in the self-tour
  tour-users controller, `check_authorization` in the self-tour communities controller
  ([communities_controller.rb:250](app/controllers/api/self_tour/v1/communities_controller.rb:250)), and inline
  `has_access = …` at the top of each `Api::V1` action (`tour_user_data`, `get_filtered_tours`,
  `save_tour_history`, `save_user_data`, …). A few actions have none (e.g. `completed_tours`, the Latch and
  igloohome account endpoints take only ids).

Because the token binds a `tour_user_id` and nothing else, a visitor who has one token can only read and write
their own rows, but across **every** community: the token carries no community and `allowed_emails` is only
consulted at registration.

---

## 4. What the app stores on the device

The app has three places for state, and only one survives a restart.

| Store | Tech | Survives restart | Holds |
|---|---|---|---|
| `persistReducer` slice | Redux + redux-persist on `@react-native-async-storage/async-storage`, key `persist:root`, whitelist `['persistReducer']` ([redux/store/index.js](pyn-tour-old/src/redux/store/index.js)) | **yes** | `userLoginState`, `userID`, `access_token`, `onboardingCount`, `firstAttemptCount`, `loacationAlertStatus`, `userInfo4TopSlider` ([redux/reducers/persistReducer.js](pyn-tour-old/src/redux/reducers/persistReducer.js)) |
| other redux slices | plain Redux | no | `loginUserReducer.userData` (the TourUser JSON), `selectedCommunityReducer`, `chatReducer`, `sessionReducer` |
| `Singleton` | a mutable class instance ([src/Singleton.js](pyn-tour-old/src/Singleton.js)) | no | property id, tour id, `tour_key`, tour type, verification provider, lock thread ref, Zerv credentials, navigation intents |

Two things worth knowing about the token:

- `Singleton.getToken()` and `getTourUserId()` **read the persisted redux slice**
  ([Singleton.js:189](pyn-tour-old/src/Singleton.js:189) and [:270](pyn-tour-old/src/Singleton.js:270)); the
  `setToken` method writes a field nobody reads. So `setAccessToken` is the one call that matters, and the
  JWT sits in AsyncStorage in clear text (AsyncStorage is unencrypted on both platforms).
- **Session restore:** `Launch` reads `persistReducer.userLoginState` and goes straight to the home flow when
  true ([launch/index.js:13](pyn-tour-old/src/Screens/launch/index.js:13)). Nothing re-validates the token;
  the first authenticated call simply 401s if the row is gone. `check_version` is the only network call at
  launch (minimum app version from the server's `MINIMUM_SUPPORTED_VERSION_FOR_*`).
- **Logout** is `setLoginStatus(false)` ([WelcomeTour/TopSlider.js:54](pyn-tour-old/src/Screens/WelcomeTour/TopSlider.js:54)).
  The id and token stay in storage until the next login overwrites them. "Delete account" calls
  `DELETE /api/self_tour/v1/tour_users/:id/delete_account`.
- Lock vendors keep their own: the Latch SDK token is cached under `latch_access_token` by
  `LatchTokenStorage.js`; Zerv username/password live on the `Singleton` for the tour.

There is no local database of visitors or tours in the app. Upcoming and completed tours are fetched each time.

---

## 5. After login: booking, arriving, touring, leaving

### 5a. Home and the schedule-a-tour entry points

- `WelcomeTour` calls `GET /api/v1/get_count_screen` (counts for the top slider) and the property list comes from
  `POST /api/v1/communities/portico_list_communities.json` (every community with `self_tour = true`; properties
  with `restrict_access` are hidden unless the visitor's email is in `allowed_emails`).
- `TourHistory` / `ScheduleTour` call `GET /api/v1/get_filtered_tours?tour_user_id&token`
  ([communities_controller.rb:498](app/controllers/api/v1/communities_controller.rb:498)), which splits the
  visitor's `schedual_tours` into `upcoming`, `completed` (`is_tour_completed`) and `exipred` (sic) by comparing
  `tour_date` + `tour_time` with now, and `GET /api/self_tour/v1/tour_users/:id/completed_tours` (paginated).
- **Booking from the app is the web widget in a WebView.** The app never posts a booking itself. `Home` reads
  `scheduler_widget_allowed` and `scheduler_widget_url` from `tour_configrations_v1`
  ([tour_configrations_v1.json.jbuilder:46-67](app/views/api/v1/communities/tour_configrations_v1.json.jbuilder:46))
  and opens it in `Common/WebViewScreen` ([HomeScreen/index.js:264](pyn-tour-old/src/Screens/HomeScreen/index.js:264)).
  The URL is the same widget as the website, with the community-code JWT:
  `…/scheduler_widget/test_widget?community_id=…&community_code=<JWT>&direct=true`, or
  `…/scheduler/change_schedule_tour_time/:id?datetime=…&community_code=…&direct=true` to reschedule an existing
  booking. The Welcome screen builds the same URL itself (`scheduleTourURL`,
  [Utils/Helpers.js:214](pyn-tour-old/src/Utils/Helpers.js:214)). The WebView only watches the URL for
  `?errors=true`; it does not pass the visitor's identity in, so the widget form is filled by hand and the dedupe
  in §1 is what links the booking to the logged-in visitor.

### 5b. Arriving at the property

`GET /api/self_tour/v1/communities/:id/user_tour_status` with the phone's GPS, the local time and the token
([communities_controller.rb](app/controllers/api/self_tour/v1/communities_controller.rb), `user_tour_status`).
The server stores `latitude` / `longitude` on the `TourUser`, computes whether the phone is within 1 km of the
community, whether now is inside `opening_hours`, and which booking is "on time" (`nearest_time_tour`, or the
Salesforce variant for Salesforce-managed properties). From that it sets `tour_users.tour_type`:

- outside visiting hours → `virtual_tour`;
- inside hours, on-time booking and within 1 km → the booking's `tour_type` (`self_tour` or `guided_tour`);
- inside hours, no booking (or `only_scheduled_tour` off) → `self_tour`;

and returns `tour_session_type` (`scheduled` / `unscheduled`), `verification_type`, `is_tour_completed`,
`with_in_radius`, `scheduler_widget_allowed` and the widget URL above.

### 5c. Starting the tour

1. ID verification if the property asks for it (`ScanIdScreen`/`SelfieScreen`, Authenteq, or Checkpoint); photos
   go to `POST /api/v1/tours/1/save_user_data` and the flags land on the `TourUser`.
2. `GET …/initialize_tour?tour_status=…&verfied_by_provider=…` (sic) → `tour_users.tour_type`, a fresh
   `tour_key = SecureRandom.hex`, `verified_by`; charges for ID verification if configured; checks the property
   access code ([communities_controller.rb](app/controllers/api/self_tour/v1/communities_controller.rb), `initialize_tour`).
   `tour_key` is the thing that groups one visit's `visited_stops`.
3. `GET …/generate_locks_accesses` → spawns a thread per lock provider; the app polls
   `POST /api/v1/communities/:id/check_lock_access` until every `*_status` on the `TourUser` leaves "in progress"
   (at most 20 polls, counted in the Rails session).
4. `DELETE …/start_tour` (yes, DELETE with a body) → the full stop list with lock fields per stop.

### 5d. What the CMS records during and after the visit

`POST /api/v1/save_tour_history` ([tour_histories_controller.rb](app/controllers/api/v1/tour_histories_controller.rb),
`save_tour_history`) is called by the app at arrival, on each stop and at the end, always with `tour_user_id`,
`community_id`, `tour_id` and the token:

- `tour_histories`: one row per visit. `arrived` and `left` (epoch from the phone), `tour_state` becomes
  `completed` when `left` arrives (default `abandoned`), `tour_type`, `tour_site` (`onsite` for self/guided,
  `offsite` for virtual), `my_time_zone`, `community_time_zone`, the engagement counters
  (`see_availability_counter`, `apply_click_counter`, `price_opened_counter`, `notes_opened_counter`,
  `camera_opened_counter`, `visited_pages_counter`), `abandoned_tour_at_stop`, and a copy of the TourUser's
  `tour_key`, `tour_type`, `verified_by`, `lock_access_time`, coordinates and `id_selfie_mismatch`.
  `after_create` sends the arrival notifications to the property, `after_update` the "left" / lengthy-stay ones
  ([app/models/tour_history.rb:10](app/models/tour_history.rb:10)).
- `visited_stops`: one row per stop event, parsed from the `tour_stop_id` parameter
  (`"stop|datetime|type|Use code 1234 to enter."` entries): `tour_stop_id`, `stop_type`, `event_date/time`,
  `device_id`, `tour_key` and the `stop_pin` the app showed. Photos and notes from the stop screen go through
  `save_user_data` into the same table (`image`, `description`).
- The booking is marked `is_tour_completed` and `tour_completed_at` by `TourHistory#complete_scheduled_tour`.
- `POST /api/v1/tours/:id/feedback` → `feedbacks` (rating, comment, cancellation).
- `prospects` and the CRM (RentCafe "unit shown", Salesforce feedback) are updated from the history callbacks.

This is why the new Tour App's tours do not appear in Connect › Visitors: they create a booking but never post
`save_tour_history`, so there is no `tour_histories` row and no `visited_stops`.

### 5e. Where staff see visitors in the CMS

- Legacy HTML: `communities/:id/tour_users` ("All Visitors",
  [app/controllers/tour_users_controller.rb:10](app/controllers/tour_users_controller.rb:10)) lists the
  `TourUser`s that have a `tour_histories` row for one of the community's tours; the show page lists the visited
  stops, the ID-check images, and offers "reset tour stops" and checkpoint verification.
  `communities/:id/scheduled_tours` lists bookings.
- Connect (new): `Visitors::Query` ([app/services/visitors/query.rb](app/services/visitors/query.rb)) builds one
  row per `tour_users` row matched to the property through `schedual_tours` and `tour_histories`, and derives
  the status (`upcoming`, `in_progress`, `completed`, `abandoned`, `missed`, `cancelled`) instead of storing it;
  cancellations and reschedules come from PaperTrail versions of the booking.

---

## 6. The tech, in one table

| Concern | Legacy app (`pyn-tour-old`) | Legacy CMS side |
|---|---|---|
| Framework | React Native 0.63.3, React 16.13, react-navigation v4 stack, Redux + redux-persist, Firebase Crashlytics | Rails, `Api::SelfTour::V1` + `Api::V1` namespaces, jbuilder views |
| HTTP | `fetch` + `FormData`; token and ids as form fields or query params | `ActionController::Base` with a logging `around_action`; CSRF not involved |
| Identity | phone number | `tour_users` row, deduped by `TourUserSearcherService` |
| Proof of phone | 4-digit OTP by SMS | `pin_code` column, Twilio via Sidekiq, Sucker Punch job clears it after 15 min |
| Session token | HS256 JWT `{tour_user_id, tour_user_email}` | signed with `SECRET_KEY_BASE`, no expiry, checked by `grant_access` against the `tour_user_id` param; `API_ACCESS=true` bypasses |
| Device storage | AsyncStorage via redux-persist (`userID`, `access_token`, `userLoginState`) | — |
| Booking | WebView to the public scheduler widget | `schedual_tours` placeholder + `create_tour_user_from`, community-code JWT, Stripe escrow, CRM push, email + SMS |
| Visit record | `save_tour_history` at arrival / stops / end | `tour_histories` + `visited_stops`, keyed by `tour_key` |
| Config | `.env` + `react-native-config` (`ENV=pynwheel|lincoln`), `ServerConfig.BaseURL` hard-coded per build | `ENV` for Twilio, Stripe, SECRET_KEY_BASE, API_ACCESS |

---

## 7. Compared with the new Capacitor Tour App

| | Legacy (visitor-facing) | New `tour-app/` + `Api::TourApp::V1` |
|---|---|---|
| Who signs in | the visitor (`TourUser`) by phone + OTP | a CMS `User`, email + password, **Super Admins only**; prospects cannot sign in ([auth_controller.rb](app/controllers/api/tour_app/v1/auth_controller.rb)) |
| Token | long-lived JWT in a query param | Doorkeeper access token in `Authorization: Bearer`, with expiry and server-side revocation |
| Booking | web widget in a WebView | `POST /api/tour/v1/properties/:id/bookings` through `Bookings::Availability`; writes `schedual_tours` with `created_by` "Tour App" |
| Visit record | `save_tour_history` → `tour_histories` / `visited_stops` | nothing yet (open product gap, see `gaps_tour_setup_feature.md`) |
| Visitor identity on the booking | `tour_user_id` set by the dedupe | the booking's visitor; lock codes issued by the new app have `tour_user_id` NULL |

If the new app is to replace the legacy one for visitors, the pieces to reproduce from this doc are: the
phone + OTP login against `tour_users` (with a token that expires), the dedupe rules, `initialize_tour`'s
`tour_key`, and the `tour_histories` / `visited_stops` writes that make a tour visible to the property.

---

## 8. Known weaknesses to keep in mind (not fixed here, legacy stays as is)

- JWT without expiry, in query strings (so it lands in Heroku router logs and `Log::Impression`).
- `tour_user_login` and `get_tour_user` are unauthenticated and the `license_key` is never checked; the OTP is
  the only real gate.
- OTP compare has no attempt limit.
- `API_ACCESS=true` disables all visitor authorisation in one switch.
- Lookup by `phone_number` takes `.last`, so two rows with the same phone resolve to the newest; older bookings
  stay on the older row.
- The WebView booking does not carry the visitor's identity, so a typo in the form creates a second visitor.
