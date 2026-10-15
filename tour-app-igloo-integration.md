# Igloo smart locks in the Capacitor Tour App (October 16, 2026)

Brief: `IGLOO_INTEGRATION_mobile_app.md`. Branch: `feature/igloo-integration-tour-app`. Legacy reference:
`/Users/zubairzulifqar/Downloads/pyn-tour-old/` (its context file is `LEGACY_APP_CONTEXT.md` at the
repository root, a copy of `pyn-tour-old/CONTEXT.md`).

The legacy Pynwheel Tour app's working Igloo integration — the Smart Keybox 3E was unlocked with it on
October 15 against the local CMS — is now in the Capacitor app: the same backend account, the same vendor
services, the same hourly algoPIN request, shown in the app's own unlock screen. Nothing of the
Capacitor app's design, navigation or theme changed; stops without a lock behave exactly as before.

## A. What the legacy integration does (verified from `pyn-tour-old` and the Rails code)

* **Three igloohome modes on one CMS record** (`igloohomes.version`): `v1` — Bluetooth guest keys from
  igloohome's partner API (`IGLOOHOME_API_KEY`, `api.igloodeveloper.co/v2/locks/:id/ekeys`), opened by the
  native igloohome SDK in the app; `igloohome` — the igloohome API v2 (OAuth client credentials of the
  property's own developer client, or Pynwheel's client through a code grant), `POST
  /devices/:id/algopin/hourly`; `iglooworks` — Iglooworks (`X-IGLOOWORKS-APIKEY`,
  `/departments/:dept/locks/:id/pin/hourly`). PYN-1103 / PYN-1108 added Iglooworks in 2024.
* **Where the lock is**: `igloohome_locks(device_id, device_name, stop_type, stop_id)` under the
  property's account; `MapLocksJob#auto_map_locks` puts it on the unit's **door** when the unit has one
  (`doors.lock_provider`, `units.access_code`), else on the unit / amenity; `AllowedTourStopsHelper`
  reads it back the same way.
* **When a tour starts** (`generate_locks_accesses`, a thread per vendor): `IgloohomeLockService` /
  `IgloohomeIglooworksService#generate_accesses` ask the vendor for an **hourly PIN from the top of the
  property's current hour for three hours, named after the lock's stop** (`access_name`, Iglooworks
  without punctuation), and write `igloohome_guests(tour_user, stop, guest_pin)`; `start_tour` then emits
  per stop `stop_lock_provider`, `igloohome_lock_id`, `igloohome_version`, `igloohome_guest_pin`
  (`igloohome_guest_bluetooth_key` for v1). The app's `LockInfoScreen` shows the PIN for `igloohome` /
  `iglooworks`, scans and connects over BLE for `v1`, and has "Not working? → Retry", which calls
  `igloohome_accounts#get_pin_code` for a fresh PIN on demand.
* **Gates**: `communities.enable_locks`, the vendor in `multiple_locks_provider`, the tour user's
  `tour_type` not `virtual_tour` (visiting hours, the 1 km radius, a scheduled tour), and the stop being a
  plotted, visible `tour_stops` row of the user's tour.
* Legacy baseline reproduced on October 15 (see `LEGACY_APP_CONTEXT.md` §7): Floor-Level (community
  3539), unit 101, the keybox `SK3E14001756` in the tester's own igloohome home "pynwheel home";
  `start_tour` returned the lock fields and the API-issued PIN.

## B. Gap matrix (legacy → Capacitor)

| Integration capability | Legacy behavior | Already in Capacitor? | Required change |
|---|---|---|---|
| Initialization / configuration | Per-property `igloohomes` record set up in the CMS (mode, credentials, home name, imported locks, auto-mapped to stops) | **Yes** (the CMS and its tables are shared; nothing in the app) | Reuse |
| Authentication / authorization | TourUser JWT (`API_ACCESS` locally); the vendor credentials never leave Rails | **Partial**: the app signs in as a CMS Super Admin with a Doorkeeper bearer token; the legacy lock endpoints require a TourUser and were declared off-limits for the new auth (Oct 5/7 decisions) | Additive endpoints under `/api/tour/v1` (same services, same request) — no change to `Api::SelfTour::V1` |
| Which stop carries which lock | `start_tour` per-stop lock fields | **No** (`ApiStop` had no lock; graph nodes only carry `lock_provider`) | `lock` on every stop of `GET /properties/:id/stops` (`TourApi::Locks#describe`) |
| Main workflow: get a door code | PIN generated at tour start + on-demand `get_pin_code`; shown on the lock screen | **No** (the unit screen was the reference's demo slider, marked `*`) | `POST /properties/:id/locks/pin` = the on-demand legacy request; the lock card in the existing unit / amenity screens |
| Bluetooth unlock (igloohome v1, Latch, Zerv) | Native SDKs in the RN app | **No** (no native plugin, no Bluetooth permission) | Reported as present / unsupported; not implemented (out of scope: needs Capacitor plugins wrapping the vendor SDKs) |
| Status and error handling | Loading spinner, "Not working? Skip / Retry" alert, silent failures | **Partial** (shared `ApiError`, `ErrorBanner`, `Button busy`) | Loading / error / retry states on the card; the API's reason codes; 502 for vendor refusals, never a fake code |
| Navigation and completion | CONTINUE button after the lock screen | **Yes** ("Next Stop" / "Finish Tour") | Keep; the button is secondary until a code was issued |
| Persistence across screens / relaunch | PIN lives in the tour payload for the tour | **Partial** (state persisted per property) | `lockPins` in the persisted state, cleared on a new tour, property change, sign-out |
| Tour-user gates (visiting hours, radius, scheduled tour, virtual tour) | Enforced in `user_tour_status` for TourUsers | **N/A** (no TourUser; the app's visitor is a CMS Super Admin) | `enable_locks`, provider, stops-list membership and the tour gate are enforced; the TourUser scheduling gates are not applicable and are documented as such |

## C. Implementation

### Backend (Rails, additive, legacy namespaces untouched)

| File | Change |
|---|---|
| `app/services/tour_api/locks.rb` (new) | `index` (one read of the property's `igloohome_locks`), `target_of` (door first, then the record — the `MapLocksJob` rule), `describe` → `{provider, mode, method, device_id, supported}`, `pin!` → the legacy request through `IgloohomeLockService#generate_hourly_pin` (igloohome) / `IgloohomeIglooworksService#generate_hourly_pin` (iglooworks): hourly algoPIN, `valid_from` = top of the current hour in `community.get_time_zone`, `valid_until` = +3 h, `access_name` = the lock stop's `name` (sanitised for Iglooworks). Errors: 422 `invalid_stop` / `no_lock` / `locks_disabled` / `lock_unsupported`, 502 `lock_unavailable` (vendor refused, answered without a pin, or unreachable; the log line carries property, stop, mode and HTTP status only). |
| `app/services/tour_api/stops.rb` | each stop gets `lock` (last key; `nil` without a lock); unit rows preload their door |
| `app/controllers/api/tour_app/v1/locks_controller.rb` (new), `config/routes.rb` | `POST /api/tour/v1/properties/:property_id/locks/pin` `{stop_id}` behind the property gates (404 / 422 `tour_disabled`) |
| `test/controllers/api/tour_app/v1/locks_test.rb` (new), `stops_test.rb` | 12 tests (below); the stop contract now lists `lock` |

One behaviour added on top of the legacy service, documented in `TourApi::Locks#igloohome_pin`: once
`IgloohomeLockService` has stored a token it sets `is_authorized_with_pynwheel`, after which
`is_client_auth` is false and a client-credentials account **never renews** (the CMS clears the flag only
when staff re-save the credentials; `DAILY_EXPIRY` is also computed when the class loads). A 401 from the
vendor on an account that has a client id and secret is therefore answered with one fresh
client-credentials token, stored as the service stores it, and one retry. This was hit live during the
failure test (section D) and is the reason the legacy app would stop issuing codes a day after first use.

Not reproduced, on purpose: the `igloohome_guests` rows (they exist to key the legacy `start_tour` payload
by TourUser; the app's visitor has none), and the plotted-stop requirement (the new app's membership is
the stops list; a stop a route cannot reach is never arrived at).

### Mobile (`tour-app/`)

| File | Change |
|---|---|
| `src/repositories/pynwheelApi/apiTypes.ts` | `ApiStopLock`, `ApiStop.lock?`, `ApiLockPinResponse` |
| `src/models/inventory.model.ts`, `models/index.ts` | `StopLock`, `LockPin`; `Unit.lock`, `Amenity.lock` |
| `src/repositories/pynwheelApi/parsers.ts` | `parseLock` (defensive: unknown modes / methods become null, `supported` only when `true`), `parseLockPin`; units and amenities carry `lock` |
| `src/repositories/tourRepository.ts`, `pynwheelApi/pynwheelApiTourRepository.ts`, `dummy/dummyTourRepository.ts` | `getStopLockPin(node)`: `POST …/locks/pin` through the one `ApiClient` (bearer, timeout, `ApiError` codes, 401 → session expired); a 200 without a pin is `malformed_response`; the demo provider throws `FeatureUnavailableError` |
| `src/store/appState.ts`, `reducer.ts` | `lockPins` (persisted) and `lockRequest` (not persisted); `lockPinStart / Ready / Failed / Dismiss`; a code marks the stop `unlocked`; an answer for a property the visitor left is dropped; codes clear on `tourReady`, `resetTour`, `selectProperty` (other property), sign-out, session expiry; `hydrate` never restores a request in flight |
| `src/store/selectors.ts` | `TourStopView.lock` |
| `src/store/useAppActions.ts` | `requestLockPin(node)`: one request per stop at a time (a ref guards double taps before the re-render), haptic on success, the API's message on failure |
| `src/screens/LockAccess.tsx` (new) | the lock card: vendor label, "Get Door Code" (busy state), the code (large, selectable, `aria-label` spelled out), "Valid until h:mm", the keypad instruction, "Not working? Get a new code", expired-code and error states; unsupported locks say why |
| `src/screens/StopScreens.tsx` | `UnlockUnitScreen` shows the card instead of the demo slider **only when the stop has a lock**; `StopDetailScreen` shows it for an amenity with a lock; "Next Stop" stays available (secondary until a code is issued) |
| `src/App.tsx`, `src/store/AppProvider.tsx` | wiring (`lockOf(node)`); the hydration reset for a changed property also drops `lockPins` |
| `src/styles/screens.css` | `.pw-lockcode*` with the existing tokens (primary tint, radii, Manrope) |
| Tests | `parsers.test.ts` (+3), `store/lockPins.test.ts` (5), `repositories/pynwheelApi/lockPin.test.ts` (5, fake `fetch`) |

No new permission, plugin, dependency or Android/Capacitor configuration. The API base URL stays the
established `VITE_TOUR_API_URL` (`.env.production.local` for a LAN build).

## D. Testing

**Automated.** Rails: `test/controllers/api/tour_app/v1` + `test/services/tour_api` — **81 runs, 585
assertions, 0 failures** (`locks_test.rb`: the stops contract, the door-vs-unit rule, the exact legacy
request to igloohome (URL, body, bearer, token stored) and to Iglooworks (department URL, API-key header,
sanitised name), vendor 401 / no-pin / outage → 502 without a trace, unknown / hidden / lock-less stops, v1
and Latch unsupported, no device mapped, locks disabled, the stale-token renewal, 401 / tour_disabled /
404 gates). Mobile: `npm run typecheck` clean, `npx vitest run` **7 files, 39 tests passed**, `npm run
build` clean.

**Test property.** The owner chose **Hazel (community 1618)** as the test property: every stop of its tour is
routable in the new graph, and it is a real igloohome property (four Smart Keybox 3E on the doors of 3007,
2907, 1508 and 1506, in v1 mode). In the development database Hazel's account was switched to the igloohome
API mode with the tester's developer client, and the tester's keybox was mapped to **unit 1604** (on its door,
as the CMS rule maps it); Hazel's own four lock rows are untouched. Hazel's own locks (1508, 1506) now show a
door-code card but answer `lock_unavailable`, because the tester's igloohome account does not own them.
The earlier staging-Floorplates (3137) setup was removed again. Verified on Hazel through the API: the stops
list carries the keybox on `unit:483954`, `POST /locks/pin` issued a real code (`access_name` `1-1604 (door
1)`), and the browser run below was repeated on Hazel (sign in → Hazel → 1604 → route Floor 1 → Floor 16 →
I've Arrived → Get Door Code → code shown).

**End to end (browser, the Vite dev server `tour-app-igloo` on :3013 → Rails `rails-cms-lan` on :3000,
`pynwheel_development`, the tester's real igloohome developer account; first run on staging-Floorplates, then
repeated on Hazel).**

| Step | Result |
|---|---|
| Sign in as the dev-only Super Admin, pick **staging-Floorplates** (3137) | Home; property loaded |
| Build Your Tour → unit 1101 → Generate My Route | route 785 px on Floor 1 |
| I've Arrived → unlock screen | lock card "igloohome smart lock · Door code", **Get Door Code**, Finish Tour secondary |
| Get Door Code | `POST /properties/3137/locks/pin` → 200; code **221673337**, "Valid until 3:00", access name `1-1101 (door 1)` (the door, as the legacy rule), issued by `api.igloodeveloper.co` |
| Close → I've Arrived again | the code is shown again, no new request |
| Not working? Get a new code | second request → 200, a new code for the new hour window (063266423) |
| Vendor refusal (the account's secret broken in the DB) | 502 `lock_unavailable` → "A new code could not be issued" banner, the previous code kept, retry offered; the log line names property / stop / mode / status only |
| Recovery (secret restored) | 502 again until the renewal logic landed (the legacy quirk above), then 200 |
| Add unit 1102 (flagged Latch for the test) from the itinerary, Next Stop, arrive | "Latch smart lock — This Latch lock cannot be opened from this app yet…", no request made |
| Reload the page | Home → Resume your tour (stop 2 of 2); 1101's code restored from the persisted state |
| Sign out / sign in | back to the login screen; sign-in works again |

The physical keybox was not opened with a code issued by the Capacitor app in this session (the lock sits
with the tester); the same account issued the code that opened it from the legacy flow on October 15.

**Android.** The APK was built (section F) and its contents verified (package id, the LAN API URL in the
bundle, the lock screen strings, `usesCleartextTraffic` merged from the debug manifest). **It was not
installed or run on a device or emulator by me: no device was connected; the tester sideloads it.**
Android-only behaviour (WebView, back button, background/foreground, keyboard) is therefore reported as
untested.

**Not testable here**: igloohome v1 Bluetooth, Latch, Zerv (no SDK in the app), Iglooworks against a real
account (the request is covered by the test suite with the same URL / header / body as the legacy service).

## E. Backend and configuration reused

* `IgloohomeLockService` (token renewal, `generate_hourly_pin`), `IgloohomeIglooworksService`, the
  `igloohomes` / `igloohome_locks` / `doors` / `units` tables, `MapLocksJob`'s mapping rule, the
  `IGLOOHOME_*` environment (copied from Heroku staging into the git-ignored `config/application.yml`).
* The app's own auth (Doorkeeper bearer, Super Admin), `ApiClient`, `TourApi::Properties` gates and
  `TourApi::Stops` membership. The vendor credentials stay on the server; the APK carries only the API URL.
* Backend modifications: the two additive endpoints above and the `lock` field. No migration, no change to
  `Api::SelfTour::V1`, `Api::V1`, the CMS pages or production data.

## F. APK

```text
APK path:                      artifacts/pynwheel-tour-igloo-test.apk (6.6 MB)
Build type:                    debug (assembleDebug), debug keystore, cleartext allowed by the debug manifest
Application/package ID:        com.pynwheel.tour, "Pynwheel Tour", versionCode 1, versionName 1.0
Configured server environment: VITE_TOUR_API_URL=http://192.168.8.100:3000 (tour-app/.env.production.local, git-ignored)
                               = the local Rails CMS bound to the LAN (launch config rails-cms-lan, pynwheel_development)
Build status:                  success (npm run build → npx cap sync android → ./gradlew assembleDebug, JDK 21 jbr, Gradle 8.14.3, AGP 8.13)
Installation status:           not installed by me (no device connected); sideload the file
Device/emulator test status:   not run
```

To test on the phone: same Wi-Fi as this Mac, `rails-cms-lan` running, sign in with a Super Admin of the
development database, choose **Hazel**, build a tour with **1604**, arrive, **Get Door Code**, enter it on the
keybox and press the unlock key. For the legacy app Hazel's visiting hours are open all day and its
coordinates sit at the tester's phone location in the development database, but the legacy `start_tour`
leaves 1604 out of Hazel's tour (its legacy path data does not reach floor 16), so the legacy app keeps
using Floor-Level (3539, unit 101).

## G. Documentation updated

`tour-app-implementation.md` §17, `tour-app-backend-api.md` §16 (+ the endpoint table), `PYN_CONNECT_PROGRESS.md`
§38, `context.md` §33, `tour-app/README.md`, this file. The legacy context (`LEGACY_APP_CONTEXT.md`) is unchanged.

## H. Remaining issues

1. **Device run outstanding** — the APK has not been opened on Android; the first device run should confirm
   the LAN connection, the code screen and the keybox opening with a code issued by this app.
2. **Bluetooth locks** (igloohome v1, Latch, Zerv) are reported but cannot be opened; porting them means
   Capacitor plugins around the vendor SDKs in `pyn-tour-old/android/libs` and `ios/*.framework`, plus
   Bluetooth / location permissions.
3. **Legacy service quirk** — `IgloohomeLockService` stops renewing client-credentials tokens after the
   first one (and `DAILY_EXPIRY` is fixed at boot). The new endpoint works around it; the legacy app's
   `generate_locks_accesses` does not, so the legacy path can go silent a day after first use until the
   credentials are re-saved in the CMS. Worth a separate fix in the service.
4. **No `igloohome_guests` audit row** is written for codes issued to the app's CMS-user visitor; if an
   audit trail per visitor is wanted once the app has real tour users, add it where `TourApi::Locks#pin!`
   returns.
5. Test data in `pynwheel_development` only: Floor-Level's coordinates and visiting hours were changed for
   the legacy test (October 15); Hazel's account is in igloohome API mode with the tester's client, its hours
   and coordinates were opened for the legacy app, and the keybox sits on unit 1604's door. The legacy app
   cannot reach 1604 on Hazel (floor 16 is outside its legacy path data); if one property must serve both apps,
   the keybox would have to move onto 1508's door, replacing Hazel's own lock row there.
6. Hazel's own locks (1508, 1506) look supported in this mode but cannot be opened from the tester's account;
   restoring Hazel's record to `v1` undoes that.
