## Why

The Capacitor app's igloohome v1 (Bluetooth) flow could not be tested on hardware: the Bluetooth guest key came from Pynwheel's **partner** API key, which only knows locks enrolled under the partner account, and the owner's Smart Keybox 3E is on the owner's own igloohome developer client. Two things were found and fixed on the way to a working unlock:

1. The igloohome **developer API** (the client the door-code flow already uses) has an eKey endpoint, `POST /devices/:id/ekey` (scope `igloohomeapi/create-ekey-access`), answering the same `bluetoothGuestKey` / `keyId` pair. The backend now uses it for a v1 account that holds its own client id and secret, and the partner key otherwise.
2. That eKey carries a **32-byte** guest AES key. The legacy `ble-sdk-release.aar` the plugin wrapped only accepts 16 bytes in its native layer and reports anything else as `ran out of connection IDs` (verified by disassembly and a debug log of the SDK's own key parser on the phone). igloohome's current SDK, `co.igloo.home:sdk:3.5.0` from the portal's SDK Access registry, accepts both sizes; the plugin is rewritten against it.

Details, the hardware log, and the SDK facts are in `tour-app-igloo-bluetooth.md` §11–12.

## What changed, file by file

**Backend (Rails)**
- `app/services/tour_api/locks.rb` — `bluetooth_key!` picks the developer eKey path when the v1 account has client credentials (`developer_client?`), else the partner path; `developer_guest_access` builds the 90-minute window with the vendor's required `YYYY-MM-DDTHH:mm:00+hh:mm` format, fetches the backup hourly algoPIN, and returns the same hash shape as the partner service; the one-retry token renewal is factored into `with_renewed_token` and reused by the door-code path; the refusal log line now carries the vendor's reason text (never the key).
- `app/services/igloohome_lock_service.rb` — new `generate_bluetooth_key` (the eKey request on the account's bearer token).
- `app/services/igloohome_service.rb` — the legacy permission list becomes the `GUEST_KEY_PERMISSIONS` constant so both paths send the same 23 permissions.
- `config/initializers/filter_parameter_logging.rb` — `guest_bluetooth_key` added to the parameter and attribute filters, so the development SQL log no longer prints the key in the `igloohome_guests` insert.
- `test/controllers/api/tour_app/v1/locks_test.rb` — the partner-API test now runs on an account without a client (as production v1 accounts are); new tests for the developer path (URL, bearer, body, dates, permissions, backup PIN), its 401 renewal with a missing backup PIN, and both refusal paths. 17 runs, 118 assertions, green.

**Android plugin (`tour-app/plugins/igloohome-ble`)**
- `android/src/main/java/.../IgloohomeBlePlugin.kt` (new) / `IgloohomeBlePlugin.java` (deleted) — the plugin in Kotlin on SDK 3.5.0, same JavaScript contract. The SDK has no connect step (`unlock(deviceId, key, timeInSeconds)` connects, sets the clock and unlocks), so `connect` settles the lock and key after checking the scan saw the lock, `unlock` runs the SDK call under the app's timeout, `disconnect` calls the SDK's `disconnect(deviceId)`. Error codes map from the SDK's documented statuses and class names.
- `android/libs/ble-sdk-release.aar` (deleted) — the legacy binary; its `co.igloohome.ble` package is the same one the new SDK's `ble-sdk-idp` part occupies, so they cannot coexist.
- `android/build.gradle` — Kotlin 2.1.21, `co.igloo.home:sdk:3.5.0` and coroutines in place of the aar, RxJava and the 1.9 stdlib; igloohome's Maven registry with the token from the `iglooGitlabToken` Gradle property (`~/.gradle/gradle.properties`) or `IGLOO_GITLAB_TOKEN`, with a warning when neither is set.
- `android/src/main/AndroidManifest.xml` — keeps the Bluetooth / location permission bounds with `tools:replace`, since the SDK's manifests declare them unbounded.
- `android/proguard-rules.pro` — comment updated for the new artifacts.
- `package.json` — `android/libs/` dropped from the published files; description updated.
- `src/definitions.ts` — documents the new `connect` / `unlock` semantics (contract unchanged).

**Android app (`tour-app/android`)**
- `build.gradle` — Kotlin Gradle plugin on the classpath; the igloohome registry under `allprojects.repositories`, because Gradle resolves a project dependency's artifacts with the consuming project's repositories.
- `app/build.gradle` — the plugin's flatDir entry removed.
- `app/src/main/AndroidManifest.xml` — also removes `POST_NOTIFICATIONS`, which the SDK's firmware-update part requests.

**App (`tour-app/src`)**
- `services/iglooBle.ts` — `BluetoothUnlockError.detail` keeps the SDK's reason for the lock-side failures and the banner shows it in brackets, so testers and the leasing office can quote it.
- `services/iglooBle.test.ts` — covers the detail handling. 78 tests green.

**Docs**
- `tour-app-igloo-bluetooth.md` — §11 (developer eKey path, the hardware log and the key-size finding) and §12 (the SDK 3.5.0 rewrite, what the iOS side still needs).

## Not in this PR / still open
- The iOS side still points at the legacy `IgloohomeSDK.xcframework`; SDK 3.x iOS is `https://gitlab.com/igloohome/iglooaccess-ios-sdk.git` (3.5.0, deployment target 15, Swift 6).
- Hardware result with SDK 3.5.0 on the owner's keybox: pending at the time of opening this PR.
- The SDK's WorkManager / Room parts add WAKE_LOCK, FOREGROUND_SERVICE, RECEIVE_BOOT_COMPLETED and ACCESS_NETWORK_STATE to the merged manifest and about 10 MB to the APK.
- Building needs the portal's SDK Access token in `~/.gradle/gradle.properties` (`iglooGitlabToken=…`); it is never read from the repo.
