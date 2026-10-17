# Pynwheel Tour — mobile app (Capacitor)

The self-guided tour app for iOS and Android. Since October 17, 2026 it renders the Claude Design
"Pynwheel Self Tour App" (the October 16 version with every tweak); real data comes from the Rails
Tour App API (`/api/tour/v1`) through a repository interface, and every value the backend does not
publish is local demo data marked with a trailing `*`.

```
Screens / hooks  ──►  TourRepository  ──►  PynwheelApiTourRepository  (VITE_TOUR_API_URL, the Rails CMS: /api/tour/v1)
                                      └─►  DummyTourRepository        (VITE_TOUR_DATA_SOURCE=dummy: src/dummy, offline)
```

See [`../tour-app-implementation.md`](../tour-app-implementation.md) for the full write-up:
screens, components, the map and graph model, routing, Play Route, Capacitor and the test checklist.

## Running it

```bash
npm install
npm run dev          # http://127.0.0.1:3012 — framed as a phone on a desktop browser
npm run test         # vitest: routing engine + simulation
npm run typecheck
npm run build        # dist/ (what Capacitor bundles)
```

## Native

```bash
npm run cap:sync     # build + copy dist/ into ios/ and android/
npm run cap:ios      # build + sync + open Xcode          (needs Xcode)
npm run cap:android  # build + sync + open Android Studio (needs Android Studio / JDK 21)
npm run assets       # regenerate icons + splash from assets/logo.png (@capacitor/assets)
```

| | |
|---|---|
| App id | `com.pynwheel.tour` |
| App name | Pynwheel Tour |
| Web dir | `dist/` |
| iOS | `ios/App/App.xcodeproj` — Swift Package Manager (`ios/App/CapApp-SPM`), no CocoaPods |
| Android | `android/` — Gradle, `minSdk` / `targetSdk` from `android/variables.gradle` |
| Plugins | app (back button, resume), status-bar, splash-screen, keyboard, haptics, preferences, `@pynwheel/igloohome-ble` (`plugins/igloohome-ble`: the igloohome Bluetooth SDK for v1 locks) |

## Dummy data

`*` on any value = dummy / demo data, not read from the Pynwheel backend. It all lives in
`src/dummy/` (`floorplans.dummy.ts` is the property, `content.dummy.ts` the rest) and reaches the
UI only through `DummyTourRepository`.

## Smart locks (October 2026)

A stop whose unit or amenity carries an igloohome API or Iglooworks lock in the CMS shows a **Get Door Code**
card instead of the demo slider; the code comes from `POST /api/tour/v1/properties/{id}/locks/pin` (the
legacy app's hourly algoPIN request, issued by the property's own vendor account on the server). Bluetooth
locks (igloohome v1, Latch, Zerv) are shown as unsupported. See `../tour-app-igloo-integration.md`.

Locks in igloohome **v1** mode open over Bluetooth: the backend issues the guest key
(`POST /api/tour/v1/properties/{id}/locks/bluetooth-key`) and the local plugin `plugins/igloohome-ble`
drives the vendor SDK (Android `ble-sdk-release.aar`; iOS `IgloohomeSDK.xcframework`, dependencies still
to be proven). See `../tour-app-igloo-bluetooth.md`.

## Design refresh (October 2026)

The screens follow the Claude Design artifact (see `../tour-app-implementation.md` §19 and
`../tour-app-design-refresh-report.md`). The design's Tweaks are **Settings › Demo scenarios**
(tour status, location, ID verified, agent online, upcoming tours, starting points, Build layout):
they change only what this phone shows and never call the backend. Styles for the refreshed screens
live in `src/styles/refresh.css`; the untouched screens (Wayfinding, AR, lock card) keep `screens.css`.

Local flows with no backend yet (booking, verification, check-in, reactions, favourites, survey,
apply / hold, share) keep their state on the phone and say so in the UI.
