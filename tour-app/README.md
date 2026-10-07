# Pynwheel Tour — mobile app (Capacitor)

The self-guided tour app for iOS and Android, rendering the design in `../tour-app.html`. This
phase is **frontend only**: every value the visitor sees is local dummy data, marked with a
trailing `*`, served through a repository interface that the real Pynwheel Tour App API will
replace later. No request is ever made to a Rails server.

```
Screens / hooks  ──►  TourRepository  ──►  DummyTourRepository  (today: src/dummy, local, offline)
                                      └─►  PynwheelApiTourRepository (later: /api/self_tour/v1/…/wayfinding.json)
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
| Plugins | app (back button, resume), status-bar, splash-screen, keyboard, haptics, preferences |

## Dummy data

`*` on any value = dummy / demo data, not read from the Pynwheel backend. It all lives in
`src/dummy/` (`floorplans.dummy.ts` is the property, `content.dummy.ts` the rest) and reaches the
UI only through `DummyTourRepository`.
