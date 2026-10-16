# Pynwheel Tour (legacy React Native app) — context for Claude

This folder (`pyn-tour-old/` at the root of the `pynwheel-staging` checkout since October 16, 2026; before that `~/Downloads/pyn-tour-old`) is the **legacy Pynwheel Tour / SelfTour mobile app**: React Native 0.63.3, React 16.13, Redux + redux-persist, react-navigation v4 (stack), Firebase Crashlytics. Clone of `github.com/jencyphers/PynwheelReactNative-ST`. First commit April 2020, last commit July 2026 (API level 35 / 16 KB page size work).

**Where the code lives (owner's decision, October 16, 2026):** the folder is *not* tracked on `main` and must never be merged into it; `pyn-tour-old/` is git-ignored there. The vendored copy exists only on the remote branch `feature/legacy-app-in-repo` (commit `812451753`, "Vendor the legacy Pynwheel Tour React Native app as pyn-tour-old/"). On a fresh clone of `main`, restore it without switching branches:

```bash
git fetch origin feature/legacy-app-in-repo && git checkout origin/feature/legacy-app-in-repo -- pyn-tour-old && git restore --staged pyn-tour-old
```

The release keystore (`android/app/selftour-key.keystore`) is git-ignored on that branch too and has to be copied in separately.

It is being replaced by the **Capacitor app in `pynwheel-staging/tour-app/`** (branch `feature/tour_app_front_end`), which talks to the new Rails namespace `Api::TourApp::V1` mounted at `/api/tour/v1`. Use this file to understand what the legacy app does, which backend contracts it depends on, and what must be reproduced (or deliberately dropped) in the new app.

Both apps share the **same Rails backend** (`pynwheel-staging/`, "Pynwheel Connect" CMS + APIs). The legacy app uses the *legacy* namespaces `/api/v1` and `/api/self_tour/v1`; those controllers are the source of truth for every flow below.

---

## 1. Repository layout

| Path | What it is |
|---|---|
| `App.js` | Root: Redux `Provider` + `PersistGate` + `AppProvider` (context) + `NewAppNavigator`. Locks orientation to portrait, silences LogBox. |
| `src/NewAppNavigator.js` | Single stack navigator with ~70 routes. `AppNavigator.js` is the older unused one. |
| `src/Singleton.js` | **Global mutable state bag** used everywhere instead of Redux: tour user id, token, property id, tour id, tour key, tour type (`getVirtualTour()`), ID-verification provider, locks thread ref, Zerv creds, navigation intents (`shouldUserMoveToNextStop`…). Treat it as the "session". |
| `src/redux/` | Mostly login/session, selected community, chat, and a `persistReducer` (the only persisted slice). |
| `src/Library/ServerCalls/API.js` | **Every HTTP call** (fetch + FormData). ~55 functions. See §4. |
| `src/Library/ServerCalls/ServerConfig.js` | `BaseURL`. Currently set to the local LAN Rails server `http://192.168.8.100:3000`; production is `https://pynwheel.herokuapp.com`, staging `https://pynwheel-staging.herokuapp.com`. |
| `src/Library/IglooModule.js`, `IglooManager.ts` | JS bridge to the native Igloohome BLE SDK (scan / connect / unlock). Used only for Igloohome **v1** locks. |
| `src/Library/LatchModule.js`, `ZERVModule.js`, `ZervManager.ts` | JS bridges to the native Latch and Zerv SDKs. |
| `src/Screens/*` | One folder per screen (see §3). |
| `src/PathDrow/` | Old floor-plan path drawer (image + overlay points). The live map is in `Screens/TourMapScreen`. |
| `src/Utils/`, `src/Components/`, `src/assest/` | Helpers, shared components, images/fonts/json (`R.js` is the asset registry). |
| `android/` | Gradle 7.6.4, AGP 7.4.2, compileSdk 34, targetSdk 35, minSdk 26. Flavours `selftour` (Pynwheel Tour, `com.pynwheel.selftour`) and `lincolnselftour` (white-label "Lincoln"). Native modules in `app/src/main/java/com/pynwheel/selftour/{igloo,latch}` and `ZervModule.java`; vendored SDKs in `android/libs/*.aar` and `android/leafble/`. |
| `ios/` | `SelfTour.xcworkspace`, targets SelfTour and Lincoln. Swift bridges `IglooModule.swift`, `LatchModule.swift`, `ZervModule.swift`; frameworks `IgloohomeSDK.xcframework`, `LeafBle.framework`, `Zerv_SDK_Library.framework`. |
| `ios/Zerv_SDK_Library.framework/` | **Not in git** (its binary embeds Zerv's own AWS credentials, which GitHub push protection rejects); copy it in from the original clone before building the iOS target. The release signing key `android/app/selftour-key.keystore` is likewise kept local. |
| `patches/` | `patch-package` patches (RN 0.63, camera, video, netinfo, orientation, country picker, node-emoji). Applied on `yarn install`. |
| `.env`, `.env.pynwheel`, `.env.lincoln` | `react-native-config`. `ENV=pynwheel` or `lincoln` picks the flavour's endpoints. Contains committed Google API keys — do not copy them anywhere. |
| `IglooTest.js`, `Pynwheel_Invoice.html`, `.scannerwork/` | Leftovers, not part of the app. |

---

## 2. End-to-end user flow

Route names are from `NewAppNavigator.js`. Backend endpoints are listed in §4.

1. **Launch → OnboardingScreen → Welcome.** `Launch` calls `check_version` (app version gate, `MINIMUM_SUPPORTED_VERSION_FOR_*` env on the server) and restores the persisted session.
2. **Login (LoginWithPhone → OtpScreen).** Phone number → `tour_users/get_tour_user` (returns the TourUser + JWT `token`) → `generate_otp` (Twilio SMS, 4-digit code stored in `tour_users.pin_code`, 15-min expiry) → `verify_otp` (returns upcoming/completed tours). The phone `+10123456789` is the App Store reviewer bypass: no SMS is sent, whatever `pin_code` is in the DB is accepted. `LoginWithEmail` and `/api/v1/get_user_by_email` are deprecated. **A TourUser must already exist**; the app never registers one (they are created by the web scheduling widget / CMS).
3. **Home → Search.** `portico_list_communities.json` (POST, form-data: `tour_user_id, version, appName, appPlatform, token`) lists every community with `self_tour = true`, excluding `restrict_access` ones unless the user's email is in `allowed_emails`. The Lincoln flavour uses `lincoln_list_communities.json`.
4. **Property selected → user_tour_status** (`/api/self_tour/v1/communities/:id/user_tour_status`, GET with `latitude, longitude, current_time, id_verification=1`). Backend decides:
   * `tour_type`: `virtual_tour` unless **inside visiting hours** (`opening_hours` rows for today) — then `self_tour` / `guided_tour` from a scheduled tour, or `self_tour` by default.
   * `with_in_radius`: phone within **1 km** of `communities.latitude/longitude` (Geocoder). If false and the property enforces scheduled tours, the app shows "It looks like you're not at the property".
   * `verification_type` (`email` / `authenteq` / `checkpoint` / id-scan), `scheduler_widget_allowed`, `tour_session_type`, `is_tour_completed`.
5. **Tour setup (TourReview / CreateTour / YourTour / EditTour / NonCustomTour / FloorPlatList / ChoseTourStop / ChoseTourAmenities).** If the community enables customization the user picks floor plans, units and amenities (`/api/v1/floorplans`, `floorplan_amenities`, `update_tour_stops_list`). Otherwise the fixed community tour is used.
6. **ID verification (ScanIdScreen → SelfieScreen, or Authenteq, or CheckPointScreen).** Pictures go to `/api/v1/tours/1/save_user_data`; mismatches to `mis_match_verification`. `CommunityCode` / `verify_property_access_code` handles properties that require an access code. `StartPointLockCode` shows the starting-point lock code.
7. **initialize_tour** (GET `tour_status=self_tour|guided_tour|virtual_tour`, `verfied_by_provider`). Returns `tour_id`, `tour_key`, customization flags, property-access flags. Sets `tour_users.tour_type`.
8. **generate_locks_accesses** (GET, `time_zone`, `current_time`). Backend spawns a thread per lock provider (`dwelo_devices_helper#lock_access_by_type`) and the app polls **`/api/v1/communities/:id/check_lock_access`** (POST) until every provider's `*_status` column on the TourUser is `complete` (max ~20 polls).
9. **start_tour** — **HTTP DELETE** `/api/self_tour/v1/communities/:id/start_tour` with form-data `tour_id, tour_user_id, stop_id, current_time, locks_thread_ref` (the function is misleadingly called `deleteTourStop`; the same call removes a stop when `stop_id` is set). Returns `{tours:[{tour_stop:[…]}]}` — the ordered stop list with floor, building, elevator hops, `path_points`, and **per-stop lock fields** (§5). This is the payload the map screen runs on.
10. **TourMap (the main screen).** Floor-plate image/SVG with the route drawn from `path_points`, blinking current stop, floor pills, "next" button. Sub-screens: `UnitFloorPlan`, `TourStop` (unit/amenity detail, photos, notes, pricing, availability, apply), `LockInfoScreen` (unlock UI, §5), `UnlockDoorPin`, `Chat`, `MediaPlayer`, `WebView`.
11. **End of tour → ThanksUnit / ThankProperty → TourReview** (`postUserFeedback` to `/api/v1/tours/…`), `SavedTour` (notes, gallery, `user_saved_tour.json`), `Share` (`save_shared_tour`), `TourHistory` (`completed_tours`), `EditProfileInfo`, delete account.

---

## 3. Screen folders (what to look at for each feature)

* `launch`, `Onboarding`, `WelcomeScreen` (+ `SearchScreen/SearchBar`), `LoginWithPhone`, `LoginWithEmail`, `otp` — auth.
* `HomeScreen`, `WelcomeTour`, `TourHistory`, `ScheduleTour`, `Mapview` — property list, upcoming/completed tours, scheduling (webview to the scheduler widget).
* `TourReview/*` (CreateTour, EditTour, YourTour, NonCustomTour, `ZERV.js`), `EditStopsList/*` — tour customization.
* `ScanIDSelfiScreens`, `AuthenteqScreen`, `CheckPointScreen` — three ID-verification providers.
* `TourMapScreen` (`index.js`, `TourmapScreenHelper.js`, `SVG/`, `components/`, `UnitFloorPlan.js`, `CommunityCode.js`, `StartPointLockCode.js`) — the map/route engine. Coordinates are **pixel coordinates on the floor-plate image** (`tour_stops.latitude/longitude`, `path_points`), not geo.
* `TourStopDetail/*` — stop detail, camera, notes, availability, apply-for-unit.
* `LockInfoScreen`, `UnlockDoorPin`, `LatchScreens`, `ZervScreens` — smart locks (§5).
* `SavedTour`, `ShareTour`, `ChatScreens`, `MediaPlayer`, `PrivacyPolicyAndUserTerms`, `Common/WebViewScreen`, `EditProfileInfo`.
* `Test`, `PathDrow` — legacy/experimental; `AppNavigator.js` is unused.

---

## 4. Backend contracts the legacy app uses

All requests are `fetch` with `multipart/form-data` or query strings; auth is the JWT `token` from `get_tour_user` passed as a param (`token=`), checked by `grant_access(decoded(token), tour_user_id)`. Servers started with `API_ACCESS=true` skip the token check.

### `/api/self_tour/v1` (controllers in `app/controllers/api/self_tour/v1/`)
| Call | Method | Purpose |
|---|---|---|
| `tour_users/get_tour_user` | POST `phone_number` | Login lookup, returns user + token |
| `tour_users/generate_otp`, `verify_otp` | POST | SMS OTP |
| `tour_users/:id` | PUT | Edit profile |
| `tour_users/:id/delete_account` | DELETE | GDPR delete |
| `tour_users/:id/completed_tours` | GET | History |
| `communities/:id/user_tour_status` | GET | Tour type, radius, verification type |
| `communities/:id/initialize_tour` | GET | Creates/loads the user tour |
| `communities/:id/customize_tour` | GET | Customization data |
| `communities/:id/generate_locks_accesses` | GET | Kick off lock credential generation |
| `communities/:id/start_tour` | **DELETE** | Full stop list with lock fields |
| `igloohome_accounts/get_pin_code` | GET | On-demand Igloohome PIN (fallback) |
| `latch_accounts/generate_verification_code`, `get_user_auth_token` | POST/GET | Latch user OTP → SDK token |

### `/api/v1` (legacy `communities_controller.rb`, `tours_controller.rb` …)
`communities/portico_list_communities.json`, `communities/check_version`, `communities/:id/check_lock_access`, `communities/:id` (tour data), `communities/authenteq`, `get_count_screen`, `get_filtered_tours`, `get_floorplan_list`, `floorplans`, `floorplans/:id/units`, `floorplan_amenities`, `get_floorplan_units(_v1)`, `update_tour_stops_list`, `tours/1/save_user_tour`, `tours/1/save_user_data`, `tours/:id` (feedback), `save_shared_tour`, `user_saved_tour.json`, `verify_property_access_code`, `mis_match_verification`, `device_lock_unlock` (Dwelo/EdgeState remote unlock), `tours/tour_user_login` (old).

Chat: `/chatrooms`, `/chats`, `/listening_message?chatroom_id=` (long-poll).

**Response shapes** are jbuilder views under `app/views/api/self_tour/v1/communities/` (`start_tour.json.jbuilder` is ~1,100 lines and defines every stop field) and `app/views/api/v1/`.

---

## 5. Smart-lock integrations (the part most worth reusing carefully)

`start_tour` emits, for each stop that has a lock, `stop_lock_provider` plus provider-specific fields. `LockInfoScreen/index.js` branches on them:

| Provider | Fields in `start_tour` | App behaviour |
|---|---|---|
| **Igloohome `v1`** | `igloohome_lock_id` (device id e.g. `IGB…`), `igloohome_guest_bluetooth_key`, `igloohome_version='v1'` | Native BLE: `igloo.scanLocks()` → event `iglooLockScanEvent` → `connect(lockId, bluetoothKey)` → `unlock()`. Needs `IGLOOHOME_API_KEY` partner account on the server (`IgloohomeService#assign_guest_bluetooth_key`, legacy `api.igloodeveloper.co/v2/locks/:id/ekeys`). Only works for locks enrolled under Pynwheel's partner account. |
| **Igloohome `igloohome`** (CMS label "Igloohome", formerly "V2") | `igloohome_lock_id` (`SK3E…`), `igloohome_guest_pin`, `igloohome_version='igloohome'` | **PIN only.** Backend `IgloohomeLockService` uses the igloohome API v2 (`IGLOOHOME_API_V2_BASE_URL=https://api.igloodeveloper.co/igloohome`, OAuth client-credentials with the *community's* `igloohomes.client_id/client_secret`, or Pynwheel's `PYNWHEEL_IGLOOHOME_CLIENT_ID/SECRET` via code grant) and `POST /devices/:id/algopin/hourly` for a 3-hour PIN. Devices are imported from the igloohome "home" named `igloohomes.home_name`. |
| **Iglooworks** | same fields, `igloohome_version='iglooworks'` | PIN only. `IgloohomeIglooworksService`, `X-IGLOOWORKS-APIKEY`, `/departments/:dept/locks/:id/pin/hourly`. Per-community `iglooworks_api_key` + `iglooworks_department_id`. (Jira PYN-1103 / PYN-1108, SunByrnes.) |
| **Latch** | `latch_link`, `latch_connected_elevator_bluetooth_ids` | Latch SDK: user OTP → `get_user_auth_token` → `initLatch(token)` → `listLatchLocks` → `unlockLatch(uuid)`; fallback to the Latch web link. |
| **Zerv** | `list_of_zerv_lock_ids`, `elevator_bank_list`, Zerv username/password on the TourUser | Zerv SDK via `ZervModule`; `TourReview/ZERV.js#initDeviceListenerAndUnlockZerv`. |
| **Dwelo / EdgeState** | `unit_dwelo_lock_id`, `guest_pin` | Remote unlock through `/api/v1/device_lock_unlock` or displayed PIN. |
| **Manual** | `guest_pin` | Just shows the code. |

Server-side mapping: `igloohome_locks` (`device_id`, `device_name`, polymorphic `stop_type/stop_id` → `Unit`, `Door`, `Amenity`, `Elevator`, `BuildingStartingPoint`), `units.lock_provider` + `access_code`, `MapLocksJob#auto_map_locks` (matches `device_name` to `units.marketing_name`, `building-unit`, or door name). Guest credentials per tour live in `igloohome_guests` (`guest_pin`, `guest_bluetooth_key`) and are regenerated on every `generate_locks_accesses`.

**Gate conditions for any lock to appear:** `communities.enable_locks = true`, provider in `multiple_locks_provider`, tour type ≠ `virtual_tour`, and the stop must be a **plotted** `tour_stop` (`display_stop = true` and non-zero `latitude/longitude`) in the community tour (`CustomizeTourService#available_stops`, `AllowedTourStopsHelper#igloohome_allowed_stops`). Unplotted properties silently get no lock data.

---

## 6. Building and running on Android (verified 15–16 Oct 2026 on this Mac)

Prereqs that were missing and had to be added:
* **JDK 17** (`brew install openjdk@17`) — Gradle 7.6 rejects JDK 21+. `android/gradle.properties` `org.gradle.java.home` now points to `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` (it used to point at a non-existent Intel JDK 11 path).
* **Watchman** (`brew install watchman`) — without it Metro's `sane` watcher dies with `EMFILE` on Node 26 even with a huge ulimit.
* `android/local.properties` with `sdk.dir=~/Library/Android/sdk`. Gradle auto-downloads build-tools 34/30.0.3 and platforms 34/23/28 on first run (slow). No NDK is needed despite `ndkVersion` being declared.
* `node_modules/@react-native-community/cli-platform-android/native_modules.gradle` line 121: `ArrayList<HashMap<String, String>>[] packages` must become `ArrayList<HashMap<String, String>> packages` (Groovy 3 "argument type mismatch"). This is inside `node_modules`, so **re-apply after every `yarn install`** or add a patch-package patch.
* Node 26 works for bundling/building (`.nvmrc` says 16; `NODE_OPTIONS=--openssl-legacy-provider` is already in the scripts).

Build a standalone debug APK (no Metro server needed on the phone). For a fresh build clear the old outputs first:
```bash
cd /Users/zubairzulifqar/pynwheel-staging/pyn-tour-old
rm -rf android/app/build android/app/src/main/assets/index.android.bundle
export PATH=/opt/homebrew/bin:$PATH ANDROID_HOME=$HOME/Library/Android/sdk JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
yarn apk:debug          # bundles JS into android/app/src/main/assets then assembleSelftourDebug
# output: android/app/build/outputs/apk/selftour/debug/app-selftour-debug.apk (~95 MB)
```
If only JS changed, `yarn apk:debug` is still the simplest; if only native changed, `cd android && ./gradlew assembleSelftourDebug`.

Debug builds allow cleartext HTTP (`android/app/src/debug/AndroidManifest.xml`), so a LAN `BaseURL` works. The debug signing key is `android/app/selftour-key.keystore` (password in `build.gradle`), different from the Play Store key — uninstall the store app before sideloading.

---

## 7. Local end-to-end test recipe against `pynwheel-staging`

* Run Rails bound to all interfaces: launch config **`rails-cms-lan`** in `pynwheel-staging/.claude/launch.json` (port 3000, `-b 0.0.0.0`, `API_ACCESS=true`, DB `pynwheel_development`). Set `ServerConfig.BaseURL` to `http://<Mac LAN IP>:3000` and rebuild; phone on the same Wi-Fi.
* Igloo env (`IGLOOHOME_*`, `PYNWHEEL_IGLOOHOME_CLIENT_*`) was copied from Heroku staging into the gitignored `config/application.yml`.
* Test tour user: id **13541**, phone `+10123456789` (App Store bypass), OTP = `tour_users.pin_code` (`1122`).
* Test property: **Floor-Level (community 3539)** — has 4 floor plates with images and 4 plotted unit stops. Visiting hours set to 00:00–23:59 all week; coordinates moved to the tester's phone location to pass the 1 km check. The Igloohome Smart Keybox 3E (`SK3E14001756`, name "pynwheel", home "pynwheel home") is imported via the tester's own igloohome API account (portal `https://web.igloohome.co/api/login`) in `igloohome` mode and mapped to **unit 101** (stop "1-101"). `start_tour` returns `stop_lock_provider=Igloohome`, `igloohome_version=igloohome`, `igloohome_guest_pin=<9-digit algoPIN>`.
* Community 2370 "test-Data-Providers" is useless for tours (no floor plates, unplotted stops).
* Simulating the app with curl: `user_tour_status` → `initialize_tour` → `generate_locks_accesses` → wait ~5 s → `DELETE start_tour` and inspect `tours[0].tour_stop[*]`.

---

## 8. Mapping to the new Capacitor app (`pynwheel-staging/tour-app/`)

New app: Vite + React + TypeScript + Capacitor (iOS in SPM mode, Android), dev port 3012, `VITE_TOUR_API_URL`. Structure: `screens/` (Splash, Onboarding, Login, Home, Search, BuildTour, Wayfinding, Guided, Stop, Summary, Profile, AR), `map/` (SVG map engine), `wayfinding/`, `repositories/` (`pynwheelApi`, `tourRepository`), `services/` (`native.ts`, `persistence.ts`, `session.ts`), `store/`. Backend: `app/controllers/api/tour_app/v1/` (`auth`, `properties`, `property`, `maps`, `graphs`, `routes`, `stops`, `health`).

What carries over conceptually:
* **Session = TourUser + JWT**, phone-OTP login, App Store bypass number — mirror in `auth_controller` / `session.ts`.
* **Tour lifecycle** = `user_tour_status` gates (visiting hours, radius, scheduled tour, verification type) → `initialize_tour` → lock access generation (async + poll) → `start_tour` payload. The new `routes`/`stops` controllers should expose the same lock fields per stop, or the new app cannot unlock anything.
* **Lock UI matrix** in §5 — PIN display (Igloohome v2, Iglooworks, Manual, Dwelo/EdgeState) is pure UI and trivially portable; BLE/SDK providers (Igloohome v1, Latch, Zerv) need Capacitor native plugins wrapping the same vendor SDKs in `android/libs` and `ios/*.framework`.
* **Map semantics**: stop coordinates and `path_points` are pixel positions on the floor-plate raster; the new SVG map (`map/mapBase.ts`, `wayfinding/`) uses its own coordinate space and the `ShortestPath` service (must stay byte-identical per owner decision, see memory `wayfinding-backend-plan-decisions`).
* **Customization flows** (choose floor plans / units / amenities) map to `BuildTourScreen`.
* Deliberately drop: `LoginWithEmail`, `AppNavigator.js`, `PathDrow`, `Test`, chat long-polling (`/listening_message`), Lincoln flavour unless a white-label is still needed.

Gotchas when porting:
* `start_tour` is a DELETE with a body — do not copy that; design a proper GET/POST in `/api/tour/v1`.
* Many legacy endpoints take `token` in the query string; the new API uses headers.
* `Singleton.js` hides a lot of implicit state (tour type, verification provider, "move to next stop" flags) — look there first when a screen behaves unexpectedly.
* Lock data only exists for plotted stops; the new map must keep `tour_stops.display_stop` and coordinates populated or locks vanish.

**Update, October 17, 2026:** the Capacitor app now wraps both SDK binaries in `tour-app/plugins/igloohome-ble` and runs the v1 Bluetooth flow through them (`tour-app-igloo-bluetooth.md`); the Android AAR is copied there, the iOS xcframework linked.
