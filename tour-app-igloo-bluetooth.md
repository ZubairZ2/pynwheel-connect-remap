# igloohome v1 Bluetooth in the Capacitor Tour App: the native plugin (October 16–17, 2026)

Brief: the "IGLOO BLUETOOTH SDK INTEGRATION" task. Branch: `feature/igloo-bluetooth-capacitor-plugin`, created
from `feature/legacy-app-in-repo` (`c50752d2e`, which contains `main` and the vendored legacy app). Previous
step: `tour-app-igloo-integration.md` (the v2 / v3 door-code flows, October 16).

## 1. Branch

| | |
|---|---|
| Original branch | `feature/legacy-app-in-repo` at `c50752d2e` |
| New branch | `feature/igloo-bluetooth-capacitor-plugin` — merged into `feature/legacy-app-in-repo` (PR #27) and into `main` (PR #28, which also brought the vendored legacy app to `main`) on October 17, 2026 |
| Base verified | `git merge-base --is-ancestor feature/legacy-app-in-repo HEAD` → yes; `main` is an ancestor too |
| Uncommitted work preserved | the owner's `tour-app/ios/App/App.xcodeproj/project.pbxproj`, `Info.plist`, `.DS_Store`, `db_compat_audit/` and the two reference HTML files are untouched and not part of this work |

## 2. The two SDK binaries

| | Android | iOS |
|---|---|---|
| File | `pyn-tour-old/android/libs/ble-sdk-release.aar` (688 KB), copied unchanged (same SHA-256) to `tour-app/plugins/igloohome-ble/android/libs/ble-sdk-release.aar` | `pyn-tour-old/ios/IgloohomeSDK.xcframework` (device slice 16 MB, simulator slice 23 MB), linked from `tour-app/plugins/igloohome-ble/ios/IgloohomeSDK.xcframework` |
| Vendor / purpose | igloohome's Android Bluetooth SDK, package `co.igloohome.ble`: scan for igloohome locks, connect with a key, operate the lock (unlock, lock, status, logs, pairing, PINs, DFU) | igloohome's iOS Bluetooth SDK, Swift module `IgloohomeSDK`, same purpose |
| Platform / arch | Android, `minSdkVersion 23`, `targetSdkVersion 31`; native `libnative-lib.so` for `arm64-v8a` and `armeabi-v7a` (no x86: an x86 emulator cannot run it) | iOS 11+ (`-target arm64-apple-ios11.0`), slices `ios-arm64` and `ios-arm64_x86_64-simulator` |
| Packaging | AAR: `classes.jar` (Kotlin-compiled, obfuscated except the public API kept by its `proguard.txt`: `IglooLock`, `BleManager`, `co.igloohome.ble.error.*`, enums), `AndroidManifest.xml`, `jni/`, consumer ProGuard rules | XCFramework with a Swift module interface (`arm64-apple-ios.swiftinterface`, Swift 5.6.1, library evolution on, so newer compilers can import it) |
| Runtime dependencies | from `javap` over every class: `kotlin.*` (stdlib), `io.reactivex.*` (RxJava 2), `androidx.annotation`; the plugin adds `kotlin-stdlib 1.9.24`, `rxjava 2.2.21`, `rxandroid 2.1.1` | the interface imports `RxSwift`, `RxBluetoothKit`, `iOSDFULibrary`, `CoreBluetooth`, `CoreLocation`, `CommonCrypto`, `LocalAuthentication`; the legacy Podfile pinned RxSwift ~> 5.1, igloohome's RxBluetoothKit fork (gitlab.com/igloohome/rxbluetoothkit, tag 6.1.2) and iOSDFULibrary ~> 4.11.1 |
| Permissions the SDK's manifest declares | BLUETOOTH / BLUETOOTH_ADMIN (≤ 30), BLUETOOTH_SCAN (`neverForLocation`), BLUETOOTH_CONNECT, ACCESS_FINE / COARSE / BACKGROUND_LOCATION | `NSBluetoothAlwaysUsageDescription` (the legacy Info.plist carries it) |
| Public API the flow uses | `new BleManager(ctx).scan(ScanSettings, Handler): Observable<IglooLock>`, `IglooLock.getName()`, `connectByStringKey(ctx, key): Observable<IglooLock>`, `unlock(Long, Integer): Completable`, dispose to disconnect; errors are `co.igloohome.ble.error.Exception$…` (`InvalidKeyException`, `ConnectionException`, `PermissionsNotGrantedException`, `LockTimeoutFailureException`, …) | `BleManager.initialize()`, `BleManager().scan(options:)`, `IglooLock.name`, `connectByStringKey(_:)`, `unlock(timestamp:)` |
| Initialization | none beyond a `Context`; the legacy module returned the device time zone from `initIgloo` | `BleManager.initialize()` once |
| Licence | proprietary vendor SDKs, redistributed exactly as the legacy app shipped them; not decompiled or modified | same |
| Compatibility with this build | compiles and links under AGP 8.13 / Gradle 8.14 / compileSdk 36 / minSdk 24 (above the SDK's 23); the AAR is resolved through a `flatDir` repository because AGP 8 refuses a direct `.aar` file dependency inside a library module | the Swift module imports under Xcode 27 only if packages producing modules named exactly `RxBluetoothKit` and `iOSDFULibrary` resolve; see §8 |

The legacy Android module also carried a Room database and Kotlin pairing helpers (`igloo/database/`,
`PairingDataRequest.kt`): they belong to the unused "pair a lock from the phone" experiment, not to the tour
flow, and were not ported.

## 3. Where each responsibility lives

```
Capacitor UI (StopScreens → LockAccessCard)             the card: Unlock Door / phase / cancel / unlocked / error
      ↓
useAppActions.unlockWithBluetooth / cancelBluetoothUnlock   one attempt per stop, phases → store, stale-property guard
      ↓
TourRepository.getStopLockBluetoothKey  ──►  Rails POST /api/tour/v1/properties/:id/locks/bluetooth-key
                                                 ↓ TourApi::Locks#bluetooth_key!  ──►  IgloohomeService#guest_access_for
                                                 ↓                                       ──►  igloohome partner API (ekeys + pin/hourly)
      ↓  the 90-minute guest key, in memory for the tour
services/iglooBle.unlockOverBluetooth         the legacy order: initialize → permission → scan until the lock's name → stop → connect(key) → unlock → disconnect
      ↓
@pynwheel/igloohome-ble (Capacitor plugin)    Android: IgloohomeBlePlugin.java over ble-sdk-release.aar · iOS: IgloohomeBlePlugin.swift over IgloohomeSDK.xcframework · web: unavailable
      ↓
vendor SDK ⇄ the lock over Bluetooth LE
```

| Layer | Responsibility |
|---|---|
| React / TypeScript | which flow a stop uses (`lock.method`: `pin` → the existing v2/v3 door-code card, `bluetooth` → the Bluetooth card), phases and errors as sentences, cancellation, the key kept in memory per stop for the tour |
| Existing Igloo services (Rails) | which lock a stop carries (`TourApi::Locks#describe`, door-first rule), the vendor calls (`IgloohomeService`, `IgloohomeLockService`, `IgloohomeIglooworksService`), the gates (tour on, locks enabled, stop on the list) |
| Backend endpoints | `POST …/locks/pin` (v2 / v3, unchanged) and the new `POST …/locks/bluetooth-key` (v1) |
| Native Android / iOS | the SDK calls, permissions, timeouts, one-operation-at-a-time, cleanup on pause / destroy, error codes |
| Vendor SDK | the Bluetooth protocol, the key handshake, the unlock |

The version is still decided by the CMS record (`igloohomes.version`) and reported per stop by the backend
(`lock.mode`, `lock.method`); nothing in the app chooses a vendor flow on its own.

## 4. Implementation

### Backend (additive; `Api::SelfTour::V1` and the legacy tour start untouched)

| File | Change |
|---|---|
| `app/services/igloohome_service.rb` | one public method, `guest_access_for(lock)`: the partner-API `ekeys` request (90 minutes from now, the legacy permission list) and the backup hourly PIN, returned without writing anything. The per-tour-user `assign_guest_bluetooth_key` path is unchanged |
| `app/services/tour_api/locks.rb` | `describe`: a v1 lock with a mapped device is `supported: true, method: "bluetooth"`; `pin!` refuses it (`lock_unsupported`, "opens over Bluetooth, not with a door code"); new `bluetooth_key!`: the stop gates, then `guest_access_for`, 502 `lock_unavailable` when the partner API refuses or is unreachable (log line: property, stop, HTTP status; never the key) |
| `app/controllers/api/tour_app/v1/locks_controller.rb`, `config/routes.rb` | `POST /api/tour/v1/properties/:property_id/locks/bluetooth-key` `{stop_id}` → `{stop_id, provider, mode: "v1", device_id, lock_name, bluetooth_key, key_id, guest_pin, valid_from, valid_until}` |
| `test/controllers/api/tour_app/v1/locks_test.rb` | v1 supported / PIN refused; the exact legacy requests (URLs, `X-IGLOOCOMPANY-APIKEY`, 23 permissions, variance 3, the 90-minute window); refusal → 502; door-code locks → 422; unauthenticated → 401 |

### The plugin: `tour-app/plugins/igloohome-ble/` (`@pynwheel/igloohome-ble`, a `file:` dependency of the app)

| File | Purpose |
|---|---|
| `package.json` | Capacitor plugin manifest (`capacitor.android.src`, `capacitor.ios.src`); `npx cap sync` registers it as the Gradle project `:pynwheel-igloohome-ble` |
| `src/definitions.ts`, `src/index.ts`, `src/web.ts` | the typed API: `initialize`, `checkPermissions`, `requestPermissions`, `startScan({timeoutMs})` + `lockFound` / `scanStopped` events, `stopScan`, `connect({name, key, timeoutMs})`, `unlock({timeoutMs})`, `disconnect`, `reset`; the error codes `unavailable · unsupported · bluetooth_off · permission_denied · not_found · connect_failed · invalid_key · timeout · not_connected · unlock_failed · busy · cancelled · sdk_error`; the web implementation answers `unavailable` and simulates nothing |
| `android/build.gradle`, `android/libs/ble-sdk-release.aar`, `android/src/main/AndroidManifest.xml` | the library module: the AAR through `flatDir`, Kotlin stdlib, RxJava 2 + RxAndroid; `minSdk` from the app (24); the manifest declares BLUETOOTH / BLUETOOTH_ADMIN (≤ 30), BLUETOOTH_SCAN (`neverForLocation`), BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION (≤ 30, `tools:replace`) and `bluetooth_le` as an optional feature |
| `android/src/main/java/com/pynwheel/tour/igloohomeble/IgloohomeBlePlugin.java` | the port of the legacy `IglooModule.java`: `BleManager.scan` with low-latency settings → `lockFound` events; `connectByStringKey` with the guest key; `unlock(now, now)` (the legacy arguments, kept); timeouts (scan 60 s, connect 30 s, unlock 30 s) through Rx `timeout`; permission aliases (`bluetooth` = SCAN + CONNECT on Android 12+, `location` = FINE on 11 and below, only the one the OS needs is requested); `busy` / `not_connected` from the session; the scan stops on `onPause`, everything is disposed on `onDestroy`; SDK exceptions mapped by class name to the codes above |
| `android/src/main/java/.../LockSession.java` + `android/src/test/java/.../LockSessionTest.java` | the state machine (IDLE → SCANNING → CONNECTING → CONNECTED → UNLOCKING, cleanup from any state), unit-tested on the JVM: 4 tests |
| `Package.swift`, `ios/Sources/IgloohomeBlePlugin/IgloohomeBlePlugin.swift`, `ios/IgloohomeSDK.xcframework` (symlink) | the iOS half: the port of the legacy `IglooModule.swift` as a `CAPBridgedPlugin` with the same methods, events and codes; compiled against the SDK only when `canImport(IgloohomeSDK)`, otherwise every operation answers `unavailable` |

### App (`tour-app/src`)

| File | Change |
|---|---|
| `repositories/pynwheelApi/apiTypes.ts`, `models/inventory.model.ts`, `parsers.ts`, `tourRepository.ts`, `pynwheelApiTourRepository.ts`, `dummy/dummyTourRepository.ts` | `ApiLockBluetoothKeyResponse` → `LockBluetoothKey`; `getStopLockBluetoothKey(node)` through the one `ApiClient` (a 200 without a key is `malformed_response`); the demo provider has none |
| `services/iglooBle.ts` | `unlockOverBluetooth`: the legacy sequence over the plugin, phases (`preparing` → `scanning` → `connecting` → `unlocking`), an `AbortSignal` that resets the plugin, every outcome a `BluetoothUnlockError` with a code and a sentence; `bluetoothUnlockAvailable()` = native platform + plugin compiled in |
| `store/appState.ts`, `reducer.ts`, `AppProvider.tsx` | `lockKeys` (memory only, never persisted, dropped with the tour / property / sign-out / relaunch), `lockRequest.status` gains the phases, `lockKeyReady` / `lockPhase` / `lockUnlocked`; the unlocked mark feeds the summary as before |
| `store/useAppActions.ts` | `unlockWithBluetooth(node)`: key from the store or the backend (re-fetched when expired), the sequence, `lockUnlocked` + haptic on success, the sentence on failure, cancelled attempts cleared quietly; `cancelBluetoothUnlock(node)`; one attempt per stop (ref guard) |
| `screens/LockAccess.tsx`, `StopScreens.tsx`, `App.tsx`, `styles/screens.css` | the Bluetooth branch of the existing card: "Unlock Door" → the phase as a busy button with "Hold your phone near the lock" and Cancel → "Unlocked — Push Door To Enter" (the reference's unlocked state) with "unlock once more" → errors with Try Again; where the plugin is not compiled in, the honest note. The v2 / v3 door-code branch is untouched; stops without a lock keep the demo slider |
| `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle` | `tools:node="remove"` for the SDK's ACCESS_COARSE_LOCATION and ACCESS_BACKGROUND_LOCATION (its geofenced quick-unlock, unused); the plugin's `libs` folder added to the app's existing `flatDir` list |
| Tests | `services/iglooBle.test.ts` (8: the order of calls, permission prompt then denial, Bluetooth off, unsupported phone, scan timeout → `not_found`, scan error with the SDK message, invalid key and a lock that will not open with disconnect afterwards, cancel → reset, no plugin, the error mapping), `store/lockBluetooth.test.ts` (4), `lockPin.test.ts` (+1, the endpoint), `parsers.test.ts` (+1) |

Nothing changed in the v2 / v3 flow's request, endpoint, state or screens; the card only branches on `lock.method`.

## 5. Permissions and lifecycle

* Android 12+: `BLUETOOTH_SCAN` (never for location) and `BLUETOOTH_CONNECT`, requested at the first unlock through
  Capacitor's permission flow; Android 11 and below: the install-time Bluetooth permissions plus a runtime
  `ACCESS_FINE_LOCATION` request, because a BLE scan needs it there. Coarse and background location are removed
  from the merged manifest. The merged APK manifest was checked (§7).
* Bluetooth off → `bluetooth_off` before any scan; a phone without BLE → `unsupported`; a refused permission →
  `permission_denied` with the settings hint, and the screen returns to the button (never stuck).
* Timeouts: scan 60 s (the legacy value), connect 30 s, unlock 30 s; a timeout is `timeout` / `not_found`.
* Cancel (the card's button, or leaving while scanning) aborts the sequence and `reset`s the plugin; the app's
  `onPause` stops a running scan; `onDestroy` disposes everything.
* Android back on the stop screen is unchanged (back to the guided map); a running attempt is cancelled by its
  Cancel button, not by navigation, so a visitor who returns sees the current phase or the result.

## 6. Tests actually executed

| Suite | Result |
|---|---|
| Rails `test/controllers/api/tour_app/v1` + `test/services/tour_api` | **84 runs, 605 assertions, 0 failures** (locks: 15, the vendor stubbed at `HTTParty.post`) |
| Plugin JVM tests (`./gradlew :pynwheel-igloohome-ble:testDebugUnitTest`) | **4 tests, 0 failures**; the plugin compiles against the real AAR (`compileDebugJavaWithJavac`) |
| App `npm run typecheck`, `npx vitest run`, `npm run build` | clean; **9 files, 53 tests passed** |
| Browser (Vite `tour-app-igloo` :3013 → Rails `rails-cms-lan` :3000, dev DB, the owner's igloohome developer account) | v2 door-code regression on Hazel 1604 after the change: Get Door Code → a fresh code (HTTP 200). v3 shares the same request and card; its vendor request is covered by the Rails test. With Hazel switched to v1 for the check: the stop reports `method: bluetooth, supported: true`, the browser card shows the honest "this build cannot do Bluetooth" note (no plugin on the web), `POST …/locks/pin` answers `lock_unsupported`, and `POST …/locks/bluetooth-key` for the owner's keybox answers **502 `lock_unavailable`**, the partner API having returned 404 (the keybox is not enrolled under Pynwheel's partner account); the log line carries the status only. Hazel was switched back to `igloohome` afterwards |
| Android device / emulator | **not run**: no phone connected, no AVD or system image on this Mac (and the SDK has no x86 slice, so only an arm64 image would do). The plugin's native code is therefore compiled and unit-tested, not executed |

## 7. APK

```text
APK path:                      artifacts/pynwheel-tour-igloo-bluetooth-test.apk (7.9 MB)
Build type:                    debug (assembleDebug), debug keystore, cleartext allowed by the debug manifest
Application/package ID:        com.pynwheel.tour, "Pynwheel Tour", versionCode 1, versionName 1.0
Configured server:             VITE_TOUR_API_URL=http://192.168.8.100:3000 (tour-app/.env.production.local, git-ignored) = rails-cms-lan on this Mac
Build status:                  success (npm run build → npx cap sync android → ./gradlew assembleDebug; JDK 21, Gradle 8.14.3, AGP 8.13)
Installation status:           not installed (no device connected)
Bluetooth hardware test status: not run (see §9)
```

Verified inside the file: `classes.dex` holds the SDK (`co/igloohome/ble/lock/IglooLock`, 136 references) and
`classes7.dex` the plugin (`IgloohomeBlePlugin`); `lib/arm64-v8a/libnative-lib.so` and
`lib/armeabi-v7a/libnative-lib.so` are packaged; the merged manifest lists exactly INTERNET, VIBRATE,
BLUETOOTH (≤ 30), BLUETOOTH_ADMIN (≤ 30), BLUETOOTH_SCAN (`neverForLocation`), BLUETOOTH_CONNECT,
ACCESS_FINE_LOCATION (≤ 30); `native-code: arm64-v8a armeabi-v7a`; the web bundle carries the LAN API URL, the
"Unlock Door" card and the `locks/bluetooth-key` call. No mock Bluetooth path exists in the bundle: the web
implementation only ever answers `unavailable`.

## 8. iOS status

The Swift plugin and `Package.swift` are written (binary target on the xcframework, dependencies on RxSwift,
igloohome's RxBluetoothKit fork and the Nordic DFU library, as the legacy Podfile had them). `swift package
resolve` was started to check whether those packages resolve by Swift Package Manager; the app's own
`CapApp-SPM` package was **not** modified (the owner has uncommitted iOS project changes) and no iOS build was
attempted. Known risks: the RxBluetoothKit fork must be fetchable from gitlab and build as an SPM package, the
Nordic library's SPM product must expose the module name `iOSDFULibrary` (newer releases call it `NordicDFU`),
and the SDK's Swift 5.6 interface must import under Xcode 27's Swift 6.4. Until that is proven, the iOS build
answers `unavailable` for the Bluetooth flow (the `#if canImport(IgloohomeSDK)` fallback) and the card shows
the honest note.

## 9. Remaining issues and blockers

1. **Hardware validation needs a lock under Pynwheel's partner account.** The v1 guest key comes from the
   partner API (`IGLOOHOME_API_KEY`), which only knows locks enrolled under Pynwheel's igloohome partner account
   (Hazel's four keyboxes are; the owner's keybox, paired to the owner's own igloohome account, is not, hence the
   404 above). To test the Bluetooth flow end to end: (a) have the owner's Smart Keybox 3E enrolled under
   Pynwheel's partner account by igloohome / Pynwheel's account holder, or use a lock that already is, within
   Bluetooth range; (b) switch the test property's igloohome record to `v1` (`update igloohomes set version='v1'
   where community_id=1618`) and map the lock; (c) install the APK on an Android phone on the same Wi-Fi and run the
   flow. Also required: the phone itself (none was connected).
2. **iOS dependency resolution** (§8) is unproven.
3. **The partner key in the local environment is the one copied from Heroku staging**; it was not exercised against
   a partner-enrolled lock here, deliberately, since that would create a real 90-minute guest key on a customer's
   door in Burnaby.
4. The SDK has no x86 slice: Android emulators must be arm64 images, and the emulator has no Bluetooth anyway, so
   it can only prove that the plugin loads and answers `unsupported`.
5. The backup keypad PIN the backend returns with the key (`guest_pin`, as the legacy flow fetched it) is kept in
   the store but not shown, to match the legacy screen; showing it when Bluetooth fails would be a small addition.

## 10. Final platform QA pass (October 18, 2026)

- Still **BLOCKED for hardware**: no Android device or AVD on this Mac, no lock enrolled under Pynwheel's partner account
  within reach; the APK was rebuilt (10.7 MB) and its manifest, native libraries and dex contents re-verified; plugin
  JVM tests 4/4.
- **iOS still unproven**: the plugin is not referenced by `ios/App/CapApp-SPM/Package.swift`, `Info.plist` lacks
  `NSBluetoothAlwaysUsageDescription`, and the review found the Swift plugin's scan timer runs on a queue without a run
  loop and `requestPermissions` resolves before the system prompt answers; `swift package resolve` had not completed
  at report time.
- Review findings in the Java plugin (not fixed): cancelling during connect/unlock disposes the Rx subscription without
  rejecting the pending `PluginCall` (the JS promise never settles, the stop stays "Connecting…"); the 30 s `timeout` on
  the connect observable tears a live connection down 30 s after connecting; `scanStopped{reason:'paused'}` maps to
  `not_found`. Fixed in JS: cancel while the key is fetched (`lockPinDismiss`); the card now stays visible after an
  unlock so "unlock once more" is reachable; Capacitor bridge logging disabled so the guest key is not printed.

## 11. Bluetooth keys from the account's own igloohome API client (October 19, 2026)

The partner-account blocker of §9.1 has a second way round. The igloohome API that the door-code flow already
uses (`api.igloodeveloper.co/igloohome`, OAuth client credentials) has an eKey endpoint,
`POST /devices/:deviceId/ekey` (scope `igloohomeapi/create-ekey-access`, body `startDate` / `endDate` /
`permissions`), answering the same `bluetoothGuestKey` / `keyId` pair as the partner API's `/v2/locks/:id/ekeys`.
A client-credentials token for the owner's Individual-mode developer client (Hazel's account in the development
database) was checked on October 19 and carries that scope.

`TourApi::Locks#bluetooth_key!` therefore asks through the account's own client when the v1 account holds a
client id and secret (`IgloohomeLockService#generate_bluetooth_key`, 90 minutes, the legacy permission set
`IgloohomeService::GUEST_KEY_PERMISSIONS`, one token renewal on a 401, then the backup hourly algoPIN named after
the stop; a missing PIN does not refuse the key), and through the partner key otherwise. No production v1
account holds client credentials (22 rows checked in the local production copy), so production behaviour is
unchanged. Tests: `locks_test.rb` 17 runs, 118 assertions, green; the partner-API test now runs on an account
without a client, two tests cover the developer path and its renewal, the refusal test covers both paths.

Hardware test setup for the owner's Smart Keybox 3E (SK3E14001756, Hazel unit 1604's door): Hazel's account in
`pynwheel_development` switched to `v1` (back to `igloohome` for door-code tests), the LAN server on the
development `DATABASE_URL`, the October 19 review APK (`artifacts/pynwheel-tour-igloo-demo-2026-10-19.apk`).
Whether the eKey the developer API issues opens the lock through the v1 BLE SDK (`IglooLock.connectByStringKey`)
is the remaining unknown; the key string has the same base64 shape as the partner key.

### Hardware result (October 20, 2026, Samsung Galaxy A02s, Android 12, the owner's Smart Keybox 3E)

The developer-API eKey was issued (HTTP 200 once the dates were sent as `YYYY-MM-DDTHH:mm:00+hh:mm`, whole minutes
with an explicit offset; the vendor's 400 text is now in the refusal log line), the phone found the lock by its
Bluetooth name, connected, and the SDK aborted at "START: Establish secure connection" with
`ran out of connection IDs`. That message is misleading: the native `beginConnection` returns -1 both when its 32
connection slots are taken and when the guest AES key is not exactly 16 bytes (`GetArrayLength == 0x10`,
`libnative-lib.so`). The plugin's debug-only diagnostic (`logKeyShape`, reflection on the SDK's parser `d.b.a`)
showed the developer-API key parsed as `a.b$b` with **a 32-byte guest AES key**, a 103-byte token and an 8-byte
password. The vendor SDK in `plugins/igloohome-ble/android/libs/ble-sdk-release.aar` (minSdk 23, targetSdk 31, the
build the legacy RN app shipped) is therefore an older generation than the eKey the current API issues.

Ways forward, none of them app-side only: (a) the current igloohome BLE SDK from the portal's SDK Access page,
which would replace the aar (its API is unknown; the plugin wraps six SDK calls); (b) igloohome support confirming
whether `/devices/:id/ekey` can issue a legacy 16-byte key; (c) the original partner route (Pynwheel's partner
key, lock enrolled under the partner account), whose `ekeys` answer the legacy app consumed with this SDK.
The app now shows the SDK's reason in brackets after the Bluetooth error banner (`BluetoothUnlockError.detail`).

## 12. The plugin on igloohome SDK 3.5.0 (October 20, 2026)

The portal's **SDK Access** page issues a GitLab token for igloohome's Maven registry
(`https://gitlab.com/api/v4/projects/64441730/packages/maven`, header `Private-Token`); the documented artifact is
`co.igloo.home:sdk:3.5.0` (minSdk 24, Kotlin 2.1, coroutines / Flow), which pulls `co.igloo:core` and
`co.igloohome:ble-sdk-idp` 3.80.19. Its native `beginConnection` accepts a 32-byte guest AES key on one connection
type and a 16-byte key on the other, so it covers the developer-API eKey and the legacy partner key alike. The
`ble-sdk-idp` part lives in package `co.igloohome.ble`, the same package as the legacy `ble-sdk-release.aar`, so the
old binary was removed rather than kept beside it.

Changes: `tour-app/android/build.gradle` (Kotlin Gradle plugin 2.1.21 on the classpath; the registry under
`allprojects.repositories`, token from the `iglooGitlabToken` Gradle property in `~/.gradle/gradle.properties` or
the `IGLOO_GITLAB_TOKEN` variable, never from the repo); `tour-app/android/app/build.gradle` (the plugin's flatDir
entry dropped); the plugin's `build.gradle` (Kotlin, the SDK and coroutines in place of the aar, RxJava and the
1.9 stdlib); `IgloohomeBlePlugin.kt` replacing the Java class with the same JavaScript contract - the SDK has no
connect step (`unlock(deviceId, key, timeInSeconds)` connects, sets the clock and unlocks), so `connect` now only
settles the lock and key after checking the scan saw the lock, `unlock` runs the SDK call under the app's
timeout, `disconnect` calls the SDK's `disconnect(deviceId)`; error codes map from the SDK's documented statuses
(12 connection, 703 timeout, 708 Bluetooth off, 972 scan attempts) and class names; the plugin manifest keeps the
version bounds with `tools:replace` against the SDK's unbounded declarations; the app manifest also removes
`POST_NOTIFICATIONS` (the SDK's firmware updates). The SDK's WorkManager / Room parts add WAKE_LOCK,
FOREGROUND_SERVICE, RECEIVE_BOOT_COMPLETED and ACCESS_NETWORK_STATE to the merged manifest; the debug APK grew from
10.8 MB to 20.4 MB. `definitions.ts` documents the new `connect` semantics; `web.ts` and the app are unchanged.

Not changed: the iOS side (still the legacy `IgloohomeSDK.xcframework` wiring in `Package.swift`; the SDK 3.x
iOS package is `https://gitlab.com/igloohome/iglooaccess-ios-sdk.git` from 3.5.0, product `IgloohomeSDK` plus
`IglooSDKCore`, deployment target 15, Swift 6). Hardware result with this build: pending at the time of writing.

**October 21, 2026.** The v1 flow renders as the design's BLE variant: the Bluetooth availability pill (the plugin's real availability,
the SDK's scanning / connecting / unlocking phases), slide to unlock → `unlockWithBluetooth`, cancel, failure with "Slide to try
again", and "Try another method" → the backup keypad PIN that came with the guest key (`LockBluetoothKey.guestPin`). In a browser the
panel says the plugin is not available instead of pretending. Hardware still unverified this session.
