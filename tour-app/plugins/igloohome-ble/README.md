# @pynwheel/igloohome-ble

The Capacitor plugin behind the Pynwheel Tour app's igloohome v1 (Bluetooth) lock flow: scan for a lock by its
Bluetooth name, keep the guest key the backend issued, unlock, disconnect. `src/definitions.ts` is the contract.

## Android

`android/src/main/java/.../IgloohomeBlePlugin.kt` over igloohome's SDK 3.x (`co.igloo.home:sdk`, see
`android/build.gradle`). The SDK comes from igloohome's private GitLab Maven registry (project 64441730): put the
SDK Access token from the igloohome developer portal in `~/.gradle/gradle.properties` as `iglooGitlabToken=…`
(or export `IGLOO_GITLAB_TOKEN`). Never commit it.

## iOS

`ios/Sources/IgloohomeBlePlugin/IgloohomeBlePlugin.swift`. The build carries **no igloohome SDK yet**: every
Bluetooth operation answers `unavailable` and the app shows "Bluetooth unlock is not available in this build of
the app". The Bluetooth permission prompt and `Info.plist` usage strings are already in place.

The real implementation is igloohome's SDK 3.x for iOS, the counterpart of the Android SDK:

| | |
|---|---|
| Repository | `https://gitlab.com/igloohome/iglooaccess-ios-sdk.git` (private) |
| Version | from 3.5.0 |
| Products | `IgloohomeSDK`, `IglooSDKCore` |
| Requirements | iOS 15 deployment target, Swift 6 |

### Getting access

The Android token on this machine is a *project* access token scoped to the Android SDK project only
(`project_64441730_bot_…`, scopes `read_api` + `read_repository`); GitLab answers 404 for the iOS project with it.
A token for the iOS project is issued the same way the Android one was:

1. Sign in to the igloohome developer portal (the account that holds the Pynwheel client credentials), open
   **SDK Access**, and request / generate the **iOS** SDK token.
2. Save it outside the repository, e.g. `~/.igloohome_ios_sdk_token`.
3. Let Swift Package Manager use it for `gitlab.com`: either add a GitLab account in Xcode › Settings › Accounts
   (sign in with the token as the password), or a `~/.netrc` line
   `machine gitlab.com login oauth2 password <token>` (mode 600).
4. Check: `git ls-remote --tags https://oauth2:<token>@gitlab.com/igloohome/iglooaccess-ios-sdk.git` lists `3.5.0`.

### Wiring it in (once the token works)

In `Package.swift` add the dependency and the products:

```swift
.package(url: "https://gitlab.com/igloohome/iglooaccess-ios-sdk.git", from: "3.5.0"),
// in the target's dependencies:
.product(name: "IgloohomeSDK", package: "iglooaccess-ios-sdk"),
.product(name: "IglooSDKCore", package: "iglooaccess-ios-sdk"),
```

then port the Swift plugin to the Android plugin's shape (`IgloohomeBlePlugin.kt`): the SDK's scan feeds
`lockFound` events by Bluetooth name; `connect` only settles the lock and key after the scan saw the lock;
`unlock` runs the SDK's `unlock(deviceId, key, now)` under the app's timeout (the SDK connects, sets the clock and
opens); `disconnect` drops what the unlock left open. Error codes map from the SDK's statuses as on Android
(12 connection, 703 timeout, 708 Bluetooth off, 972 scan attempts) and class names.

Then `npx cap sync ios` and archive; the app's `CapApp-SPM` package picks the plugin up as it does today.

### History

The first iOS half wrapped the legacy app's `IgloohomeSDK.xcframework` (Swift 5.6, RxSwift, igloohome's
RxBluetoothKit fork, Nordic DFU 4.11). It never built: no 4.x release of the Nordic library ships the
`iOSDFULibrary` product the framework's module interface imports (they all export `NordicDFU`), and the
framework is the same generation as the Android aar that refused the developer API's 32-byte guest keys.
That wiring was removed on October 25, 2026 (git history has it).
