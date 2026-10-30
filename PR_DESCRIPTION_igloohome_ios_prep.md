# Tour App iOS: igloohome Bluetooth unlock on igloohome's SDK 3.5.0

Branch `feature/igloohome-ios-plugin-prep` → `main`.

## Why

Every iOS archive with the plugin in the package list failed at package resolution: the legacy
`IgloohomeSDK.xcframework` wiring asked the Nordic DFU library for a product `iOSDFULibrary`, which no `4.*` tag
ships (all export `NordicDFU`). The TestFlight build of October 25 had to drop the plugin by hand. That framework is
also the same generation as the Android aar that refused the developer API's 32-byte guest keys, so it is not a
route to opening doors anyway. The real iOS implementation is igloohome's SDK 3.x (`iglooaccess-ios-sdk` ≥ 3.5.0),
whose private repository needs an access token the owner must issue (the one on the build Mac is scoped to the
Android project).

## What changes

- `tour-app/plugins/igloohome-ble/Package.swift`: Capacitor only; the xcframework symlink, RxSwift, igloohome's
  RxBluetoothKit fork and Nordic DFU are gone.
- `…/ios/Sources/IgloohomeBlePlugin/IgloohomeBlePlugin.swift`: the `unavailable` implementation (the app shows
  "Bluetooth unlock is not available in this build of the app") plus the Bluetooth permission prompt, which
  settles through the Core Bluetooth delegate rather than before the visitor answers.
- `…/README.md`: how to get the iOS SDK token, the two dependency lines, and the port recipe mirroring
  `IgloohomeBlePlugin.kt`.
- `tour-app/ios/App/App/Info.plist`: `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`.
- `tour-app/ios/App/CapApp-SPM/Package.swift`: the plugin listed, as `npx cap sync ios` writes it.
- `tour-app-igloo-bluetooth.md` §12: the findings and the blocker.

Android is untouched. The JavaScript contract and the app are unchanged.

## Verification

- Release archive (`xcodebuild archive`, automatic signing, build 2, `com.pynwheel.SelfTourDev`) with the target
  `IgloohomeBlePlugin` compiled and its strings in the App binary; the usage string in the bundle's Info.plist.
- `npx vitest run`: 145/145.
- Trap found: a DerivedData that had seen the failing manifest resolved the package but skipped its target; a
  fresh `-derivedDataPath` built it.

## Second commit: the SDK 3.x port

With the iOS SDK token issued from the portal, `Package.swift` depends on
`https://gitlab.com/igloohome/iglooaccess-ios-sdk.git` from 3.5.0 (product `IgloohomeSDK`; swift-tools 6.3, so
Xcode 26.3+), and `IgloohomeBlePlugin.swift` is the Kotlin plugin's shape over the SDK's `IglooPlugin`: `scansLock()`
→ `lockFound` by Bluetooth name; `connect` settles lock + key; `unlock(name, key:, timeInSeconds: now)` under the
app's timeout; `disconnect`. One Core Bluetooth central manager reads the radio (created only when the permission
may be asked; with the radio off its creation shows the system "Turn On Bluetooth" alert, which `enableBluetooth`
re-shows). Error codes map from `IgloohomeError` cases and the SDK's words. README: the credential SPM needs for
the private repository (Xcode GitLab account or `~/.netrc`).

Verified: Release archive in a fresh DerivedData with the SDK resolved from a local clone of tag 3.5.0 (same
content as the URL dependency): plugin target compiled without warnings, `IglooSDKCore.framework` embedded, build 2
of `com.pynwheel.SelfTourDev`. Not verified on a door: no iPhone on this Mac; the TestFlight build is the hardware
route (the eKey must carry `LOCK` + `UNLOCK`).
