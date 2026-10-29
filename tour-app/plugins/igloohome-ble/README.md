# @pynwheel/igloohome-ble

The Capacitor plugin behind the Pynwheel Tour app's igloohome v1 (Bluetooth) lock flow: scan for a lock by its
Bluetooth name, keep the guest key the backend issued, unlock, disconnect. `src/definitions.ts` is the contract.

## Android

`android/src/main/java/.../IgloohomeBlePlugin.kt` over igloohome's SDK 3.x (`co.igloo.home:sdk`, see
`android/build.gradle`). The SDK comes from igloohome's private GitLab Maven registry (project 64441730): put the
SDK Access token from the igloohome developer portal in `~/.gradle/gradle.properties` as `iglooGitlabToken=…`
(or export `IGLOO_GITLAB_TOKEN`). Never commit it.

## iOS

`ios/Sources/IgloohomeBlePlugin/IgloohomeBlePlugin.swift` over igloohome's SDK 3.x for iOS (`IgloohomeSDK`, the
counterpart of the Android SDK), declared in `Package.swift`:

| | |
|---|---|
| Repository | `https://gitlab.com/igloohome/iglooaccess-ios-sdk.git` (private) |
| Version | from 3.5.0 |
| Product | `IgloohomeSDK` (its own dependency: Alamofire; the Bluetooth protocol is the prebuilt `IglooSDKCore` binary inside the package) |
| Requirements | iOS 15 deployment target, Xcode 16 or later (the SDK is in the Swift 6 language mode) |

The same shape as the Kotlin plugin: `scansLock()` feeds `lockFound` events by Bluetooth name (this SDK reports no
RSSI); `connect` only settles the lock and the guest key after the scan saw the lock; `unlock` runs the SDK's
`unlock(deviceId, key:, timeInSeconds:)` under the app's timeout (the SDK connects, sets the clock and opens);
`disconnect` drops the connection the unlock left open. The radio itself is read through one Core Bluetooth central
manager, created only once the visitor may be asked for the permission (creating it shows the system prompt, and,
with Bluetooth off, the system's "Turn On Bluetooth" alert, which is what `enableBluetooth` re-shows). Error codes
map from the SDK's `IgloohomeError` cases (`bluetoothIsTurnedOff`, `lockNotFound`, `timeout`, `connection`, …) and
its words ("Invalid rights" / "Guest key not found" → `invalid_key`). `Info.plist` carries
`NSBluetoothAlwaysUsageDescription` and `NSBluetoothPeripheralUsageDescription`; Bluetooth needs a physical iPhone.

### Access to the SDK repository

The repository is private, so Swift Package Manager needs a GitLab credential that can read it. A GitLab
*project* access token is issued per project: the Android one (`~/.igloohome_sdk_token`, for the Maven registry)
does not open the iOS project. The iOS token comes from the igloohome developer portal, **SDK Access**, iOS;
keep it outside the repository (e.g. `~/.igloohome_ios_sdk_token`) and give it to SPM one of two ways:

- Xcode › Settings › Accounts › add a GitLab.com account, signing in with the token as the password; or
- a `~/.netrc` entry (mode 600):

  ```
  machine gitlab.com
    login oauth2
    password <the token>
  ```

Check: `git ls-remote --tags https://oauth2:<token>@gitlab.com/igloohome/iglooaccess-ios-sdk.git` lists `3.5.0`.
Then `npx cap sync ios` and archive; the app's `CapApp-SPM` package picks the plugin up as it does today. Xcode
caches the package graph per DerivedData: after a manifest that failed to resolve, build into a fresh
`-derivedDataPath` once, or the plugin target is silently skipped.

### History

The first iOS half wrapped the legacy app's `IgloohomeSDK.xcframework` (Swift 5.6, RxSwift, igloohome's
RxBluetoothKit fork, Nordic DFU 4.11). It never built: no 4.x release of the Nordic library ships the
`iOSDFULibrary` product the framework's module interface imports (they all export `NordicDFU`), and the
framework is the same generation as the Android aar that refused the developer API's 32-byte guest keys.
That wiring was removed on October 25, 2026 (git history has it) and the SDK 3.x port landed the same day.
