# Xcode setup and recovery (verified October 30, 2026)

## Current installation

| Item | Value | Command used |
|---|---|---|
| Xcode | **27.0**, build `27A266a`, `/Applications/Xcode.app` (direct download / App Store) | `xcodebuild -version` |
| Active developer dir | `/Applications/Xcode.app/Contents/Developer` | `xcode-select -p` |
| Command Line Tools | package `com.apple.pkg.CLTools_Executables` 27.0.0.0.1788430756; `/Library/Developer/CommandLineTools` also present | `pkgutil --pkg-info` |
| SDKs | iOS 27.0, iOS Simulator 27.0, macOS 27.0, tvOS 27.0, watchOS 27.0, visionOS 27.0, DriverKit 27.0 | `xcodebuild -showsdks` |
| Simulator runtimes | **none installed** (`xcrun simctl list runtimes` is empty) | |
| Simulator devices | **none** | `xcrun simctl list devices` |
| CocoaPods | **not installed** and not needed (`pod` not found) | |
| DerivedData | 527 MB (regenerable) | |
| macOS requirement | Xcode 27 requires macOS 27 (this machine runs 27.0.1) | |

The Tour App has been built and run from Xcode on this machine on physical iPhones and through
TestFlight (build 3), never on a simulator. iOS work therefore needs either a connected iPhone or a
downloaded simulator runtime.

## Signing state

`security find-identity -v -p codesigning` lists three valid **Apple Development** identities (no
Apple Distribution identity on this Mac):

| Identity | Team |
|---|---|
| Apple Development: zubair03114698669@gmail.com (LHTF88A98W) | `JKRNV2FMT9` — "Zubair Zulifqar (Personal Team)", free provisioning |
| Apple Development: Zubair Zulifqar (S328472HD5) ×2 | one of them for `M2G7SBRU58` — **"Pynwheel, LLC"** (company team) |

Xcode's account list (`IDEProvisioningTeamByIdentifier`) holds both teams. Two provisioning profiles
are in `~/Library/Developer/Xcode/UserData/Provisioning Profiles/` (copied to the backup under
`04_dotfiles/xcode/UserData/`; they are not secret but are tied to the certificates).

Project settings on `main` (`tour-app/ios/App/App.xcodeproj`): `PRODUCT_BUNDLE_IDENTIFIER = com.pynwheel.tour`,
`CODE_SIGN_STYLE = Automatic`, `IPHONEOS_DEPLOYMENT_TARGET = 15.0`, `MARKETING_VERSION 1.0`,
`CURRENT_PROJECT_VERSION 1`, no `DEVELOPMENT_TEAM`. The **stash** (now branch
`temporary/stash-igloohome-ios-plugin-prep-2026-10-30` and `patches/…xcode-project.patch`) is the
TestFlight configuration: team `M2G7SBRU58`, bundle id `com.pynwheel.SelfTourDev`, version `1.0.0`
build `3`, `ITSAppUsesNonExemptEncryption = false`, `LastUpgradeCheck 2700`.

**Private keys are not in git and were not exported.** Apple Development certificates are regenerated
automatically by Xcode (Automatic signing) once the Apple IDs are signed in, so nothing is lost by not
exporting them. If policy allows and you want the exact certificates: Keychain Access → My Certificates →
select the "Apple Development" items → File → Export Items → `.p12` with a password → put the file in
the backup folder under `01_secrets/`. After the wipe, double-click the `.p12` to import.

## Swift Package Manager dependencies (Capacitor "SPM mode", no Podfile)

`tour-app/ios/App/CapApp-SPM/Package.swift` (managed by Capacitor, do not edit) pins
`capacitor-swift-pm` **exact 8.5.2** and links the local plugin packages from `node_modules/@capacitor/*`
plus `plugins/igloohome-ble`. That plugin's `Package.swift` depends on the **private**
`https://gitlab.com/igloohome/iglooaccess-ios-sdk.git` (from 3.5.0). Resolving it needs a GitLab
credential: either a GitLab account in **Xcode → Settings → Accounts**, or `~/.netrc` with a
`machine gitlab.com` entry (`login oauth2`, password = the token from `~/.igloohome_ios_sdk_token`). Both
the `.netrc` and the token file are in the backup under `01_secrets/home/`.

## Reinstalling after the wipe

1. **Install Xcode 27.x** from the App Store (or the same build from https://developer.apple.com/download/
   if parity with `27A266a` matters). Open it once, accept the licence, let it install additional components:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -runFirstLaunch
   xcode-select --install          # the standalone Command Line Tools package, as before
   xcodebuild -version && xcrun simctl list runtimes
   ```
2. **Simulator runtime** (optional, none was installed): Xcode → Settings → Components → iOS 27, or
   `xcodebuild -downloadPlatform iOS`. Create a device with
   `xcrun simctl create "iPhone 17" "iPhone 17" "com.apple.CoreSimulator.SimRuntime.iOS-27-0"` [VERIFY names].
3. **Accounts**: Xcode → Settings → Accounts → add the Apple ID of the personal team and the Apple ID
   that belongs to the Pynwheel, LLC team (`M2G7SBRU58`). Add the GitLab account for the igloohome SDK
   (or restore `~/.netrc`).
4. **Node side first** (the Xcode project links `node_modules`): in `tour-app/`, `npm ci`, then
   `npm run build && npx cap sync ios`.
5. **Open and build**:
   ```bash
   cd ~/pynwheel-staging/tour-app && npx cap open ios
   # or headless, on a connected iPhone / generic destination:
   xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
     -destination 'generic/platform=iOS' -allowProvisioningUpdates build
   ```
   The first build resolves the Swift packages (needs the GitLab credential) and, with Automatic signing,
   creates a new Apple Development certificate for each team.
6. **TestFlight configuration**: apply `docs/recovery/patches/stash-2026-10-30-igloohome-ios-plugin-prep-xcode-project.patch`
   (`git apply --3way`) or set team `M2G7SBRU58`, bundle id `com.pynwheel.SelfTourDev`, build 4+ by hand,
   then Product → Archive → Distribute → TestFlight. An Apple Distribution certificate is created by Xcode
   on first upload for the team (it was never on this Mac).

## What is regenerable vs what must be kept

| Regenerable (not backed up) | Keep (in the backup) |
|---|---|
| Xcode itself, Command Line Tools, simulator runtimes, DerivedData, SPM caches (`~/Library/Caches/org.swift.swiftpm`), device support files | `~/Library/Developer/Xcode/UserData` (key bindings, settings, provisioning profiles) → `04_dotfiles/xcode/` |
| Apple Development certificates (Automatic signing recreates them) | GitLab token for the SDK (`~/.igloohome_ios_sdk_token`, `~/.netrc`) → `01_secrets/home/` |
| | The stash patch (TestFlight team/bundle settings) → git |
