# Pynwheel Tour — mobile app implementation (October 5, 2026)

The **Pynwheel Tour** mobile app: a Capacitor application for iOS and Android that renders the
design in `tour-app.html` and makes every interaction work on local dummy data, structured so the
Pynwheel Rails backend (the Tour App API built in `map_plotting_backend_implementation.md` §14)
can be connected later without rewriting a screen.

Brief: `pynwheel_tour_app_front_end.md`. Reference UI: `tour-app.html` (a bundled page; its
template, inline script, fonts and images were unpacked to read it — the same recipe as
`pyn-connect-new.html`, see `react-architecture.md`). Design language for the From / To / Find
Shortest Path / Play Route controls, which the mobile reference does not draw: the Map & Plotting
design's "Test shortest path" panel (`wayfinding-tour-app.html`).

`*` on any value shown to the visitor = **dummy / demo data, not read from the Pynwheel backend**
(section 6).

---

## 1. Project structure

```
tour-app/                         Capacitor app (sibling of pyn-connect-web/, same repository)
├── capacitor.config.ts           appId com.pynwheel.tour, appName "Pynwheel Tour", webDir dist/
├── package.json                  Vite 8 + React 19 + TypeScript 5.9; Capacitor 8; vitest
├── vite.config.ts                base './', alias ~ → src/, vitest config
├── index.html                    viewport-fit=cover, no zoom
├── assets/logo.png               icon / splash source (the Pynwheel pinwheel, public/logo_transparent_bg.png)
├── public/favicon.png
├── ios/                          native iOS project (Swift Package Manager, no CocoaPods)
├── android/                      native Android project (Gradle)
└── src/
    ├── main.tsx, App.tsx         root; screen switch, overlays, toast, timers, Android Back
    ├── styles/                   tokens.css (the design's :root), base.css, components.css, screens.css
    ├── assets/                   Manrope woff2 (bundled, offline), the design's images
    ├── models/                   backend-shaped TypeScript models (property, graph, inventory, route, app)
    ├── repositories/
    │   ├── tourRepository.ts     the TourRepository interface (the data boundary)
    │   ├── dummy/dummyTourRepository.ts        today's provider (dummy data + routing engine, simulated latency)
    │   ├── pynwheelApi/pynwheelApiTourRepository.ts  the future provider — stub, not wired, no requests
    │   ├── repositoryContext.ts, repositoryProvider.tsx
    ├── dummy/                    ALL dummy data: floorplans.dummy.ts (the property), content.dummy.ts, buildGraph.ts
    ├── wayfinding/               graphIndex (per-floor copies), shortestPath (Dijkstra), timing (steps), routeService, simulation (Play Route) + tests
    ├── map/                      MapView (layers, pan/zoom), mapSymbols, FloorPills, useMapViewport
    ├── store/                    appState, reducer, AppProvider (persistence), appContext, selectors, useAppActions (async flows)
    ├── navigation/screens.ts     screens, overlays, what Back means on each screen
    ├── services/                 native.ts (status bar, splash, keyboard, haptics, back, resume), persistence.ts (Preferences)
    ├── hooks/                    useSimulationPlayer (rAF driver), useDevice (chrome, back, keyboard inset, framed)
    ├── components/               Icon, ui (buttons, sheet, modal, toast, toggle, rows, states), chrome (status area, header, tab bar)
    └── screens/                  one file per screen + sheets/ (every bottom sheet and modal)
```

Why Vite rather than Next.js: Capacitor bundles a static web build into the native shell; the
Connect app's server components, route handlers and Devise session have no place in it. The
layering (screens → hooks/actions → repository → models; components never fetch) follows
`react-architecture.md`, and the conventions of `pyn-connect-web` (`~/*` alias, strict TypeScript,
camelCase models, the `*` placeholder rule of `context.md` §15) are kept. No code is imported across
the two packages, so nothing in Connect or Rails changes (section 10).

## 2. Screens (the reference's `screen` state → the app)

| Reference | App screen | Notes |
|---|---|---|
| `splash` | `SplashScreen` | logo, spinner, "Powered by Pynwheel"; 1.7 s, then onboarding or Home when a session is restored |
| `onboarding` (3 slides) | `OnboardingScreen` | the three picture cards, dots, Previous / Next / Get Started, Skip; swipe on the picture |
| `login` | `LoginScreen` | email + password; empty / malformed fields refused inline; any valid pair signs in (no backend) |
| `home` | `HomeScreen` | Welcome, Current Location, agent banner (hidden unless an agent is present), property card, Start Self-Tour, Book a Live Tour, AR card, **Find Shortest Path card** (added, §13–16 of the brief), **Resume your tour** (added, only while a tour is in progress), Tour History |
| `buildTour` | `BuildTourScreen` | Amenities / Floorplans cards with icons, distance from the tour start, footer "{n} Stops · ~{min} min" + Generate My Route (busy while calculating; error banner on failure) |
| `scanQR` → `arInit` → `chooseStops` → `arLive` | `ScanQrScreen`, `ArInitScreen`, `ChooseStopsScreen`, `ArLiveScreen` | dark chrome; the five init steps tick every 550 ms; pins over the property photo at the design's positions; stats; Begin Guided Tour |
| `arGuided` (self) | `GuidedScreen` mode `self` | **the real map** with the route to the current stop, "Follow the highlighted path", floor pills on a cross-floor segment, Play Route, the direction card reads the route's steps, I've Arrived |
| `arGuided` (AR) | `GuidedScreen` mode `ar` | photo background, small map, Play button, I've Arrived |
| `stopDetail` | `StopDetailScreen` | Amenity pill, Available Now, description + hours, Watch Video Tour, Take Notes, AI Concierge, Next Stop / Finish Tour |
| `unlockUnit` | `UnlockUnitScreen` | 64 px track, 56 px thumb, pointer drag, unlocks past 85 %, haptic, Next Stop |
| `tourComplete`, `tourSummary` | `TourCompleteScreen`, `TourSummaryScreen` | stats, AI recap (built from the visited stops and notes), best match, visited stops with notes, concierge, Apply, Email, Back To Home |
| `search`, `profile` | `SearchScreen`, `ProfileScreen` | search over nearby + hi-rise listings with a no-results state; journey, History / Notifications / Settings sheets, Sign Out |
| — | `WayfindingScreen` | **From → To → Find Shortest Path → route → Play Route** (section 7) |

Sheets and modals (`screens/sheets/`): Help & Support, Tour Itinerary (+ Add Another Stop), Add A
Stop, Add Note, Video Tour (modal), Book a Live Tour (form + Request Sent), AI Concierge (86 % tall,
prompts, Talk to a Human, typing), Apply For A Unit, Notifications (toggles), Settings, Tour History,
and the From / To **place picker** (search, kind chips, grouped by floor). Every sheet closes with
its ×, a tap on the backdrop, a drag down, or Android Back.

## 3. Components

| Component | Responsibility |
|---|---|
| `Icon` | the design's SVG icons (24×24 paths copied from the reference and the Map & Plotting stop glyphs) |
| `ui.tsx`: `Button` (50/48/46/44 px, busy spinner), `IconButton` (34 px light / dark, 30 px round close), `Pill`, `Toggle` (48×28), `Checkbox`, `SelectableRow` (the stop card), `Sheet` (backdrop, drag-to-dismiss, keyboard inset), `Modal`, `Toast`, `Spinner`, `LoadingState`, `EmptyState`, `ErrorBanner`, `Demo` (the `*` mark) | the reference's building blocks with its exact sizes, radii, shadows and colours (`styles/tokens.css`) |
| `chrome.tsx`: `StatusArea`, `HomeIndicator`, `ScreenHeader`, `TabBar` | the device chrome: safe-area heights on a device (the OS draws the real status bar), the design's fake "9:41" bar only in the desktop frame |
| `map/MapView` | the map (section 5) with pan, pinch-zoom, double-tap, wheel, fit-to-route, follow-the-walker |
| `map/FloorPills` | building / floor selector; limited to the route's floors when a route exists |
| `screens/shared.tsx`: `LightShell`, `DarkShell` | the two screen shells (status area + scrolling body + footer + home indicator) |

On a desktop browser wider than a phone the app is framed exactly as the reference presents it
(393 × 852 in the dark bezel on #EAEAEA); on a device it fills the screen and respects
`env(safe-area-inset-*)`.

## 4. Dummy data

Everything lives in `tour-app/src/dummy/` and is reached only through `DummyTourRepository`:

| File | Holds |
|---|---|
| `floorplans.dummy.ts` | the property **Luxe Mile High \*** (3401 Blake St, Denver, CO \*): two buildings, six levels, their corridors, hallway points and paths, every unit / amenity / stop with its room, door point and the hallway it joins; the outdoor walks between the towers' gates; the main tour's stops and dwell minutes |
| `content.dummy.ts` | the visitor (Alex Johnson \*), nearby properties and hi-rise listings, tour history, onboarding copy, AR init labels, help items, the concierge's canned answers, booking choices, best-match reasons, app version |
| `buildGraph.ts` | turns the definition into the models: `WayfindingGraph` (API shape), `MapLevel[]` with vector plans, `Unit[]`, `Amenity[]`, `TourStopPlace[]`, AR pin positions |

The property was laid out to exercise the whole model:

- **Tower A \***: Floor 1 \* (one floor), Floors 2–3 \* (one stacked plate shared by two floors, like
  the CMS's `floorplate_covering_range`), Rooftop \* (floor 15);
- **Tower B \***: Floor 1 \*, Floor 2 \* — linked only by stairs, so a step-free route to Tower B's
  second floor is impossible;
- Elevator A \* serves floors 1, 2, 3, 15; Stairs A \* serves 1–3; Stairs B \* serves Tower B;
- gates: Main Entrance \* (entry, the tour start), Courtyard Exit \*, Tower B Entrance \* — joined by
  two outdoor walks drawn on the site plan;
- stops of the Map & Plotting types: Leasing Office \*, Mail & Packages \*, Restroom \*, Parking
  Access \*, Package Room \*, Hallway Waypoint \*;
- a **blocker** (Wet Floor \*) cutting one Floor 1 corridor — routes go round it;
- two places deliberately **not joined to a path** (Storage Room \*, Rooftop Garden \*) so the "not
  linked" error can be seen;
- 18 units (seven on the stops list), 7 amenities, 11 additional stops.

Every string in these files that reaches the screen carries ` *`; derived labels ("Floor 1 \*",
"1st Floor \*", "$2,400/mo \*", "Today \*") add it in `store/selectors.ts`.

## 5. Map / graph model (`src/models`)

The models follow the backend's `Wayfinding::GraphSerializer` payload key for key (camelCased), so
the dummy provider and the future API provider build the same object:

| Model | Backend concept |
|---|---|
| `MapLevel` (`floorplate:101`, `sitemap:1`; `floors[]`, `image`, `svg`, `width`, `height`, `space`, `scaleFtPerPx`) | `levels[]` |
| `FloorGeometry` / `FloorShape` (outline, room, corridor, core, water, outdoor, label; `ref` to the unit / amenity) | the floor SVG |
| `GraphNode` (`id` typed `unit:101` / `amenity:3` / `hallway:12` / `elevator:1` / `bsp:1` / `tour_start:1` / `stop:7`; `level`, `floor`, `x`, `y`, `anchor`, `attach`, `link`, `vertical`, `accessible`, `floorsServed`, `positions`, `note`, `radiusPx`) | `nodes[]`, unique by (id, level) |
| `GraphEdge` (`from`, `to`, `pathKind`, `level`, `lengthPx`, `polyline`) | `edges[]` (hallway paths) |
| `VerticalConnection` (elevator / stairs / ramp; floors, accessible, levels) | `vertical_connections[]` |
| `Gate` | `gates[]` |
| `OutdoorLink` (polyline on the site plan) | frontend extension — the backend joins gates with one nominal edge and no geometry; the app draws this when present |
| `TourInfo` / `TourStopRef` | `tour{ start, starting_floor, building_order, stops[] }` |
| `Unit`, `Amenity`, `TourStopPlace`, `Place` | the inventory and the From / To choices |
| `Route`, `WalkLeg`, `TransitionLeg`, `RouteStep`, `RouteError`, `TourRoute` | `RouteSerializer` (`legs`, `steps`, `length_px`, `length_ft`, `duration_s`, `warnings`, the error taxonomy) |

The map draws, in layers: background (site plan image or the vector plan) → unit and amenity
footprints (highlighted when they are a route end or the current stop; leased units greyed) →
hallway network (faint, on the wayfinding screen until a route exists) → stops with their glyph and
colour (entry / exit green, elevator / stairs blue, blocker red with its radius, destinations) →
the route on this floor (green with a white casing and a flowing dash) → "Elevator A → Floor 3" /
"From Floor 1" transition badges, the From dot and To square → the Play Route walker. Only the
selected floor's data is rendered: a stacked plate shows that floor's units alone.

## 6. Future API architecture

```
UI (screens, hooks)
   ↓
TourRepository                      src/repositories/tourRepository.ts
   ├─ getProperty()                 → PropertyBundle (levels, graph, units, amenities, stops)
   ├─ getContent()                  → visitor, listings, help …
   ├─ getPlaces()                   → From / To choices
   ├─ findRoute(from, to, options)  → RouteResult
   ├─ getTourRoute(stops, options)  → TourRouteResult (start → stops → start, per-stop segments)
   ├─ getStopDistances(nodes)       → "45 ft ↑" per stop
   ├─ askConcierge, requestBooking, startApplication
   ↓
DummyTourRepository  (today)        src/repositories/dummy — local data, simulated latency (loading states), offline
PynwheelApiTourRepository (later)   src/repositories/pynwheelApi — GET /api/self_tour/v1/communities/:id/wayfinding.json,
                                    …/wayfinding/route.json, …/wayfinding/tour_route.json (token scheme, ETag per graph version)
```

`createTourRepository()` in `repositoryProvider.tsx` is the single place that chooses the provider.
The API class exists as a documented stub that throws `RepositoryUnavailableError`; it is never
constructed and the app makes **no network request** (verified in the browser: zero requests beyond
the dev server's own modules). Screens never import `src/dummy`.

## 7. Routing (shortest path)

A port of `Wayfinding::RouteService` (`src/wayfinding`):

1. `graphIndex.ts` expands the graph into **per-floor copies** (a stacked level has one copy per
   floor; a node with a concrete floor stands on that copy only; a hallway or elevator on all of
   them), joins hallway paths, joins each stop to its hallway by a straight link, joins the copies of
   one elevator / stairs record across floors with the backend's weights (`(50 + 10·Δ)·unit` for an
   elevator or ramp, `90·Δ·unit` for stairs, `unit` = image diagonal ÷ √(760² + 470²)), joins gates of
   different buildings with the `500·unit` outdoor edge (along the drawn outdoor link when one exists),
   leaves out stairs and non-accessible connectors when step-free, and drops any path within a
   blocker's radius when avoiding blockers.
2. `shortestPath.ts` is Dijkstra with a binary heap over the copies.
3. `routeService.ts` resolves endpoints (`unknown_endpoint`, `ambiguous_floor` for an elevator
   without a floor, `same_endpoint`), checks both ends are linked (`not_linked`), runs Dijkstra, and
   on failure diagnoses as the backend does (`blocked`, `no_building_link`, `no_step_free`,
   `no_vertical_link`, `no_path`) with the same messages. A found path becomes legs: one walk leg per
   floor with the centre-pixel points along each path's polyline, and elevator / stairs / outdoor
   transitions between them.
4. `timing.ts` is a port of `Wayfinding::Timing`: 4.4 ft/s walking where a level has a scale,
   `30 + 8·floors` s per elevator ride, `15·floors` s on stairs, and the steps' wording — "Walk to
   Elevator A \*" / "130 ft on Floor 1", "Take Elevator A \* to Floor 3" / "Up 2 floors", "Walk outside
   to Tower B Entrance \*" / "Leave by …, enter by …", "Arrive at …".
5. The tour route chains start → chosen stops in building-order / floor / sort order → start, keeps
   each stop's segment, adds the dwell to the arrive step, and skips an unreachable stop with a
   warning rather than failing.

Unit tests (`vitest`, 13 passing): single floor, elevator up two floors with the exact step
wording, stairs vs elevator (and step-free), cross-building with the outdoor stage, the step-free
failure into Tower B, the whole error taxonomy, the blocker detour, the tour chain and its warning.

## 8. Play Route

`src/wayfinding/simulation.ts` flattens a route into frames — one per hallway point of every walk
leg, one per transition, one for the arrival — with the cumulative distance. The state
`{ status, mode, frame, t, holdMs, run }` is pure data in the app store (so it persists and survives a
screen change); `useSimulationPlayer` advances it from `requestAnimationFrame` while playing.

- **Point by point** moves through every hallway point at 220 px/s; **stop by stop** gives every leg
  the same time and pauses at the end of each.
- A transition holds for 1.4 s and **switches the displayed floor** to where the route continues; an
  outdoor walk is animated along its polyline on the site plan.
- Controls: Play / Pause / Resume / Replay, Stop, previous and next point, tapping a step seeks to
  its leg and shows that floor; a progress bar and a status line ("Playing · step 2 of 4 · Take
  Elevator A \* to Floor 3") follow it; the map keeps the walker in view.
- The loop owns its state in a ref and advances by real elapsed time (capped at 1 s), with a 200 ms
  timer behind `requestAnimationFrame`, so a throttled frame rate (a hidden web view — the desktop
  app's browser pane throttled rAF to ~1 Hz during verification) delays the picture but never the
  walker. The map memoizes every static layer; a frame re-renders only the walker.

## 9. Capacitor

| | |
|---|---|
| App id / name | `com.pynwheel.tour` / Pynwheel Tour (`capacitor.config.ts`) |
| Web build | `npm run build` → `dist/` (Vite, `base: './'`, assets hashed); `npx cap sync` copies it into `ios/App/App/public` and `android/app/src/main/assets/public` |
| iOS | `npx cap add ios --packagemanager SPM` → `ios/App/App.xcodeproj` + `ios/App/CapApp-SPM/Package.swift` (Capacitor 8.5, six plugins). Open with `npm run cap:ios`. No CocoaPods needed. |
| Android | `npx cap add android` → `android/` (Gradle wrapper, `variables.gradle`). Open with `npm run cap:android`. |
| Icons / splash | `@capacitor/assets` from `assets/logo.png` (the Pynwheel pinwheel) on a white background: `ios/App/App/Assets.xcassets/AppIcon.appiconset` + `Splash.imageset`, `android/app/src/main/res/mipmap-*` + `drawable*/splash.png`, light and dark. Regenerate with `npm run assets`. |
| Plugins | `@capacitor/app` (Android Back, resume), `status-bar` (light chrome on white screens, dark over the AR photo), `splash-screen` (hidden once React paints the in-app splash), `keyboard` (native resize; sheets with inputs lift above the keyboard), `haptics` (taps, unlock), `preferences` (session persistence) |
| Offline | nothing is fetched at runtime; fonts and images are bundled; the app launches and routes with no network |
| Android Back | closes the top overlay, else pauses a playing animation, else the screen's own back; from Home / Login / Onboarding the app exits (`navigation/screens.ts`) |
| Resume | the session (screen, chosen stops, tour, stop index, unlocked units, notes, From / To, route, animation, floor per level) is saved to Preferences 250 ms after every change and on going to background; a relaunch restores it (a playing animation comes back paused; the Home card offers to resume a tour in progress) |

Build commands:

```bash
cd tour-app
npm install
npm run build && npx cap sync        # web build into both native projects
npm run cap:ios                      # Xcode → run on a simulator or a signed device
npm run cap:android                  # Android Studio → run on an emulator or device
```

## 10. Safety

No Rails controller, service, model, route, migration, setting or CMS view was touched. Nothing in
`pyn-connect-web` was touched (a stray scaffold that briefly landed under it during setup was
removed; `git status` shows no change there). The app never calls localhost, staging or
production; there are no credentials, keys or environment-specific values in the code.

## 11. Verification

### Automated
- `npm run typecheck` — clean.
- `npm run test` — 13 / 13 (routing engine, simulation).
- `npm run build` — ✅ (380 kB JS gzip 116 kB, 58 kB CSS, images); `npx cap sync` — ✅ iOS and Android.

### Browser, phone viewport (375 × 812, touch emulation, Chrome in the desktop app's pane)
Every screen and interaction below was driven and screenshotted; the console stayed free of errors
and no network request left the dev server.

| Area | Checked |
|---|---|
| Launch | splash → onboarding; swipe and Next / Previous / Get Started; Skip |
| Login | empty form refused; valid pair signs in with a busy state |
| Home | property card, Start Self-Tour, Book a Live Tour, AR card, Find Shortest Path card, Tour History (grows after a tour), Resume card after a relaunch |
| Build Your Tour | selection toggles, footer count and minutes, disabled Generate, busy while calculating, route generated (stops ordered by building / floor / sort) |
| Guided | real map with the route, "Follow the highlighted path", step card from the route's steps, Play / Pause / Replay, prev / next / stop, progress bar, **cross-floor segment** with floor pills and the elevator badge, the map switching floor while playing, I've Arrived |
| Stop detail / unlock | video modal, notes sheet (saved note shown on the summary), AI concierge, slide to unlock (drag past 85 %), Next Stop, Finish Tour |
| Itinerary | done / current / upcoming, Add Another Stop |
| Summary | stats, recap, best match, visited stops with notes, Apply sheet, Email toast, Back To Home |
| Find Shortest Path | place picker (search, kind chips, grouped by floor, "not on a path yet"), From / To / swap / Reset, same-floor and cross-floor routes, result card ("270 ft · about 2 min · 2 floors · 1 elevator ride"), steps with View, Play Route in both modes with floor switching, seeking by step, **errors**: not linked, no step-free route, cross-building route with the outdoor stage on the site plan |
| AR flow | AR card → Scan QR (Simulate / Skip) → Initializing AR (five steps tick, Continue) → Choose AR Stops (distances from the start) → Launch (busy) → AR Live (pins with floor and distance, stats) → Begin Guided Tour → AR guided (mini map, play, I've Arrived) |
| Search / Profile | filter to "miami" (one hi-rise listing), no-results state; journey card; Notifications toggles, Settings, Tour History sheets; Sign Out |
| Book a Live Tour | date / time / unit selects, visitor line, Request (busy) → Request Sent → Done |
| Help | sheet, questions expand, support email |
| Back | the back handler (Android Back / Escape) closes the top sheet first, then pauses a playing animation, then leaves the screen; verified by dispatching the key in the page |
| Persistence | full reload restores the signed-in session, the tour in progress (Resume card), the wayfinding route and the notification toggles |
| Desktop | wider than a phone, the app is framed as the reference's 393 × 852 phone |

### Native
iOS and Android projects were generated and synced, and their icon / splash assets written. They
could **not** be built or run here: this Mac has no Xcode (only the Command Line Tools), no Java /
Android SDK and no simulators or emulators. The remaining real-device checks of the brief (touch,
keyboard, safe areas, status bar, rotation, app lifecycle on hardware) are listed in section 12.

## 12. Known issues / not verified

- **Native builds not run** (no Xcode, JDK or Android SDK on this machine). First run on a Mac with
  Xcode 16+: `npm run cap:ios`, set a signing team, run on an iPhone 15 simulator. Android: Android
  Studio with JDK 21, `npm run cap:android`, run on an API 34 emulator.
- Safe areas, the native keyboard, haptics and the native status bar are implemented against the
  Capacitor APIs but only the web fallbacks were exercised.
- The desktop frame hides the OS status bar, so the "9:41" bar is the design's; on a device the OS
  draws its own and the app only reserves the height.
- The reference's cross-surface "loop" (an agent banner fed by another prototype through
  localStorage) is modelled (`state.agent`) but has no source yet, so the banner stays hidden.
- Scan QR has no camera: "Simulate QR Scan" / "Skip" as the reference.

## 13. Real data: the Tour App API integration (October 5, 2026)

The dummy provider is no longer the app's data source. `createTourRepository()` now builds
`PynwheelApiTourRepository` against `VITE_TOUR_API_URL` (the FastAPI service in `tour-api/`, see
`tour-app-backend-api.md`); `DummyTourRepository` remains for development with
`VITE_TOUR_DATA_SOURCE=dummy`, and nothing falls back from one to the other.

| Area | Change |
|---|---|
| `src/config/env.ts`, `.env.*` | build configuration: API URL, data source, timeout |
| `src/services/session.ts` | the signed-in session (token, user, selected property) in `@capacitor/preferences` |
| `src/repositories/tourRepository.ts` | interface extended: `login`, `logout`, `restoreSession`, `onSessionExpired`, `getProperties`, `selectProperty`, `currentPropertyId`; `PropertyBundle.demo` |
| `src/repositories/pynwheelApi/` | `apiClient.ts` (bearer, JSON, timeout, `ApiError`, 401 → session expired), `apiTypes.ts`, `parsers.ts` (+ tests), the repository |
| `src/repositories/places.ts` | the From / To places builder shared by both providers |
| `src/content/appCopy.ts` | app copy (onboarding, help, AR labels, concierge prompts) without demo markers |
| `src/store/*` | `auth`, `user`, `propertyId` state; `loginStart/Failed/Succeeded`, `selectProperty`, `sessionExpired`; the provider restores the session, loads the property list and the chosen property (never showing a stale bundle), and signs out on a 401 |
| Screens | `LoginScreen` (real sign-in, inline backend errors), `SearchScreen` = property picker (real properties; "No Self-Guided Tour" rows cannot be chosen), `HomeScreen` "Change property" row + hero fallback, `SummaryScreens` / selectors mark derived labels only on demo data |

Flow on real data: Login (CMS Super Admin credentials) → property picker → Home → Build Your Tour
(the CMS stops list with distances from the tour start) → Generate (`POST /tour-route`) → Guided
stop by stop (segment routes, floor switching on elevator steps, the API's step titles) → arrive →
summary; Find Shortest Path (`POST /route`). Verified in the browser against the live API; native
builds still cannot be produced on this Mac.

## 14. Map plans, zoom and playback (October 6, 2026)

- The map's plan layer is now loaded by `src/map/useLevelBase.ts` and placed by `src/map/mapBase.ts`:
  floor SVG through the API (`level.svgPath`, Blob URL in an `<image>`), else the floor image (with a
  retry on the plain S3 host), else the demo level's inline geometry. States: "Loading map…",
  ready, "Map unavailable" / "Invalid floor plan" / "No floor plan" — never a silent blank sheet.
- One coordinate rule: frame = image pixels, else the SVG viewBox, else the measured image; the SVG
  fills the frame (the CMS canvas rule) unless the CMS stores a calibrated transform.
- Zoom controls `+`, `−`, Reset (one action per tap; the controls are excluded from the map gesture so
  pointer capture no longer swallows the click). Reset returns to the screen's initial fit only.
- Play Route speed is per level (`PLAYBACK_SPEED_DESIGN_PX_PER_S` × the level's diagonal unit,
  clamped), so long segments take proportionally longer and the walk can be followed; transitions
  hold 2.2 s.
- Instructions are plain text; the API strips the CMS's HTML.
- Tests: `src/map/mapBase.test.ts`, playback speed in `simulation.test.ts`; 22 vitest in all.

## 15. The API is the Rails CMS now (October 7, 2026)

The FastAPI service the app talked to since §13 was ported into the Rails CMS as `Api::TourApp::V1`
(`tour-app-backend-api.md` §14) and `tour-api/` was deleted. The app's contract is unchanged; the
only app change is the API prefix, `/api/v1` → **`/api/tour/v1`**, held in one constant (`API`) in
`src/repositories/pynwheelApi/pynwheelApiTourRepository.ts` (the legacy CMS already serves a vendor
route at `GET /api/v1/properties`, so the Tour App API needed its own prefix). `svg_path` values the
API returns carry the new prefix too, so `getLevelSvg` needed nothing.

| Area | Change |
|---|---|
| `src/repositories/pynwheelApi/pynwheelApiTourRepository.ts` | `const API = '/api/tour/v1'`; every path is `${API}/…`; doc comment names the Rails controllers |
| `src/repositories/pynwheelApi/apiTypes.ts` | comment: the JSON is now defined by `app/services/tour_api/` in the CMS |
| `.env.development` / `.env.example` | `VITE_TOUR_API_URL=http://127.0.0.1:3000` (the CMS; the verify server is :3100, set at launch) |
| `.env.staging` / `.env.production` | comments: the URL is the CMS host; `VITE_TOUR_API_URL=https://<cms host> npm run build && npx cap sync android` |
| `src/config/env.ts`, `src/repositories/tourRepository.ts`, `src/repositories/repositoryProvider.tsx` | comments / the configuration-error message name the CMS instead of `:8000` |

One API behaviour the app benefits from: the `tour-route` segments now index their own legs
(`legs[].index`, `steps[].leg`, `stages[].leg` are 0-based per segment) and an elevator step's
`transition.to_level_id` is filled in every segment — the FastAPI service offset them twice after the
first stop, which desynchronised the step card during Play Route from the second stop on
(`wayfinding/simulation.ts` `stepIndexOf` matches steps to legs by index). No parser change was needed.

Verified in the browser against the Rails verify server (:3100, `pynwheel_development`): sign-in →
property list → Hazel (1618): Build Your Tour with real distances, 3-stop tour, Play Route, the floor
change to Floor 31 at the elevators, stop detail, Tour Complete, Tour Summary → Change property →
Dummy-High-Rise (2934): the SVG-only plate `floorplate:3029` served through the Rails SVG endpoint,
3-stop tour incl. unit 1130's slide-to-unlock and the Floor 1 → Floor 2 switch at the Elevator Bank.
`npm run typecheck`, `npx vitest run` (22) and `npm run build` are clean. Still not verified: iOS /
Android web views (no SDKs on this Mac). The owner's git-ignored `.env.production.local` still points
at `:8000` and must name the CMS host before the next device build.

## 16. Final QA pass: Search Cancel, Play Route smoothness, request efficiency (October 7, 2026)

Brief `issues_in_tour_app.md`; report `tour-app-final-qa-report.md`.

| Area | Change |
|---|---|
| `src/screens/SearchScreen.tsx`, `src/screens/searchFilter.ts` (+ test) | the picker had no Cancel: a Cancel appears while typing or focused (clears, blurs, restores the full list), a clear "×" in the field, Escape/Enter handling; plain `type="text"` + `inputMode="search"` because the native search clear did not reach React; the query resets when a property is chosen (`reducer` `selectProperty`) |
| `src/hooks/useSimulationPlayer.ts` | the walker's state lives in the hook at frame rate (ref + local state) and is published to the store only on status changes and every 500 ms, instead of dispatching every animation frame through the whole app (`live` is returned for the screens' controls) |
| `src/map/MapView.tsx`, `components.css` | the floor plan (`<image>`) is drawn in its own `<svg>` compositing layer under the overlay SVG (route, markers, walker), so the animated dashes, the pulse and the per-frame walker never repaint the plan |
| `src/map/useLevelBase.ts` | `prefetchLevelPlan` / `usePrefetchRouteLevels`: the SVG (session cache) and image (browser cache) of every level a route's stages visit are warmed as soon as the route is known; Guided and Wayfinding screens call it. Removes the one 217 ms frame measured at a floor change |
| `src/repositories/pynwheelApi/pynwheelApiTourRepository.ts` | one in-flight bundle load per property (the provider's `getProperty` / `getContent` / `getPlaces` used to load the bundle twice), one in-flight property-list request, one shared session restore |
| `src/store/AppProvider.tsx` | the property list is no longer refetched on every property switch |

Measured in the browser on the dump's largest plans (Sofia 2919, 2942×1942): 60 fps, worst frame 18.7
ms, zero network requests during Play Route, including the Floor 1 → 7 change. Property open and
sign-in now issue each request once. Not run: iOS / Android devices.

**Addendum, same evening (production data):** with `pynwheel_prod` reads allowed, John Demo's own six SVG
plates played at 60 fps (worst frame 17.8 ms) including the Floor 1 → 2 change; its tour-route took
66 ms. Two more app fixes came out of that run: a selection persisted for another property could leak
into the tour request (hydration now resets per-property state when the session's property differs,
and `selectedNodes` only sends stops on the current list), and the picker rendered all 4,832
production properties (now capped at 120 rows with a "Showing 120 of N" footer, the current property
pinned first, the filter behind `useDeferredValue`: 851 DOM nodes instead of 33,640, 78 ms per
keystroke instead of 163 ms on this Mac). Report: `tour-app-final-qa-report.md`, "Production-DB run".

## 17. Igloo smart locks: the legacy app's door-code flow in the unlock screen (October 16, 2026)

Brief `IGLOO_INTEGRATION_mobile_app.md`; report `tour-app-igloo-integration.md`; branch
`feature/igloo-integration-tour-app`. The legacy Pynwheel Tour app (`/Users/zubairzulifqar/pynwheel-staging/pyn-tour-old`, on `main` since pull request #28 of
October 17, 2026; context in `LEGACY_APP_CONTEXT.md`) opened the tester's igloohome Smart Keybox 3E with a code issued by the
CMS's igloohome account on October 15; the same flow now runs in this app.

| Area | Change |
|---|---|
| `src/repositories/pynwheelApi/apiTypes.ts`, `parsers.ts`, `src/models/inventory.model.ts` | every stop of `GET /properties/{id}/stops` carries `lock` (`StopLock`: provider, igloohome mode `v1` / `igloohome` / `iglooworks`, `pin` / `bluetooth`, device id, `supported`); `parseLock` is defensive, `parseLockPin` keeps the code and its validity window |
| `src/repositories/tourRepository.ts`, `pynwheelApi/pynwheelApiTourRepository.ts`, `dummy/dummyTourRepository.ts` | `getStopLockPin(node)` → `POST /properties/{id}/locks/pin` through the one `ApiClient`; the API's reasons (`no_lock`, `lock_unsupported`, `locks_disabled`, `lock_unavailable`, `invalid_stop`) reach the screen as `ApiError`; the demo provider has no locks |
| `src/store/appState.ts`, `reducer.ts`, `selectors.ts`, `useAppActions.ts`, `AppProvider.tsx` | `lockPins` (persisted, by stop) and `lockRequest` (in flight / failed, never persisted); `requestLockPin` with a per-stop in-flight guard; a code marks the stop unlocked; an answer for a property the visitor left is dropped; codes clear on a new tour, another property, sign-out, session expiry |
| `src/screens/LockAccess.tsx` (new), `StopScreens.tsx`, `App.tsx`, `styles/screens.css` | the lock card in the existing unit screen (instead of the demo slider, **only for stops with a lock**) and in the amenity screen: Get Door Code → the code, "Valid until h:mm", the keypad instruction, "Not working? Get a new code" (the legacy Retry), expired / error states; unsupported locks (igloohome v1, Latch, Zerv, Dwelo, EdgeState, Manual) say so; "Next Stop" stays available |
| Tests | `parsers.test.ts` (+3), `store/lockPins.test.ts` (5), `repositories/pynwheelApi/lockPin.test.ts` (5): 39 vitest tests, typecheck and build clean |

Verified in the browser against the local CMS (Vite `tour-app-igloo` :3013 → Rails `rails-cms-lan` :3000) first on
staging-Floorplates (3137) and then on the owner's chosen test property **Hazel (1618, the keybox on unit 1604's
door)**: code issued by the real igloohome API, kept across
leaving the screen and a reload, renewed on demand, a vendor refusal shown with the previous code kept, a Latch
unit shown as unsupported, sign-out / sign-in. Android: `artifacts/pynwheel-tour-igloo-test.apk` (debug,
`com.pynwheel.tour`, API `http://192.168.8.100:3000` from `.env.production.local`) built and inspected, **not run
on a device** (none connected). Bluetooth locks are out of scope: no native SDK plugin exists in this app.

## 18. igloohome v1 over Bluetooth: the native Capacitor plugin (October 17, 2026)

Report `tour-app-igloo-bluetooth.md`; branch `feature/igloo-bluetooth-capacitor-plugin` (from `feature/legacy-app-in-repo`).
The v2 / v3 door-code flow of §17 is unchanged; a stop whose lock is an igloohome **v1** lock now opens over
Bluetooth through the vendor SDK, as the legacy app did.

| Area | Change |
|---|---|
| `plugins/igloohome-ble/` (`@pynwheel/igloohome-ble`, a `file:` dependency) | the Capacitor plugin: `src/definitions.ts` (typed methods, events `lockFound` / `scanStopped`, the error codes), `src/web.ts` (`unavailable`, nothing simulated); Android `IgloohomeBlePlugin.java` over the vendored `ble-sdk-release.aar` (scan → connect with the guest key → unlock → disconnect, permission aliases per Android version, timeouts, `LockSession` state machine with JVM tests); iOS `IgloohomeBlePlugin.swift` over `IgloohomeSDK.xcframework` behind `#if canImport` (its SPM dependencies are not yet proven, §8 of the report) |
| `src/services/iglooBle.ts` | `unlockOverBluetooth`: the legacy lock screen's order over the plugin, phases for the card, `AbortSignal` cancel that resets the plugin, every outcome a `BluetoothUnlockError` with a code and a sentence |
| `src/repositories/*`, `src/models/inventory.model.ts` | `getStopLockBluetoothKey(node)` → `POST /properties/{id}/locks/bluetooth-key` → `LockBluetoothKey` (lock name, guest key, backup PIN, 90-minute window) |
| `src/store/*` | `lockKeys` (memory only), the request phases (`loading` → `scanning` → `connecting` → `unlocking`), `lockKeyReady` / `lockPhase` / `lockUnlocked`; `unlockWithBluetooth` / `cancelBluetoothUnlock` in `useAppActions` |
| `src/screens/LockAccess.tsx`, `StopScreens.tsx`, `App.tsx` | the Bluetooth branch of the existing lock card: Unlock Door → phase + Cancel → "Unlocked — Push Door To Enter" → errors with Try Again; the honest note where the plugin is not compiled in (web, iOS for now) |
| `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle` | the SDK's coarse / background location removed; the plugin's `libs` in the app's `flatDir` |
| Tests | vitest 9 files / 53 tests (new `services/iglooBle.test.ts`, `store/lockBluetooth.test.ts`); plugin JVM tests 4; typecheck and build clean |

`artifacts/pynwheel-tour-igloo-bluetooth-test.apk` (debug, `com.pynwheel.tour`, API `http://192.168.8.100:3000`)
was built and inspected (SDK classes, plugin class, both native libs, the exact permission set) but **not run on a
device**: none was connected. The real Bluetooth unlock also needs a lock enrolled under Pynwheel's igloohome
partner account; the owner's keybox is not (the live key request answered 502 `lock_unavailable`, partner API 404).

## 19. The Self Tour App design refresh: the Claude Design tour app, tweak by tweak (October 17, 2026)

Brief `app_ui_redesign_17_oct.md`; report `tour-app-design-refresh-report.md`; branch `feature/self-tour-app-design-refresh`
from `main` (`cf51ffec8`, the merge of PR #30) in the worktree `.claude/worktrees/self-tour-app-design-refresh`. Design reference:
the Claude Design project `13d18a36-ed41-492e-b118-e69e26e4636a`, file **"Pynwheel Self Tour App.dc.html"** (the live version of
October 16, 22:40, 4,560 lines, read through the design service's `GetFile` RPC), with `UnlockScreen.dc.html`, the Pynwheel design
system (`--pw-*` tokens, Manrope, `#0077AE`) and the earlier October 5 bundle (`tour-app.html`) for comparison. **Frontend only:**
the diff is confined to `tour-app/src/` (plus these docs); no Rails, API, serializer, route, schema or Capacitor-native change, and no
new request to the CMS.

### The design's Tweaks are runtime demo scenarios

The artifact's Tweaks panel (design-time props) became **Settings › Demo scenarios** (`state.demo`, persisted; `store/scenarios.ts`
resolves them into view models; `auto` means "whatever the app's own state says"). Every value a scenario invents is marked `*`.

| Tweak in the design | Runtime scenario | What it drives |
|---|---|---|
| `confirmTourScenario` (Today · Later this week · Pending approval · Past tour · Missed · Cancelled · No tours) | `demo.tour` | the Home tour-status card (`tourCard`), the profile-confirmation card after sign-in, the check-in sheet, the upcoming list |
| `locationScenario` (Not asked · Denied · Nearby · At property · Approximate · Offline · Precise off) | `demo.location` + the real `location` state (ask / allow / deny) | the Home location row, the location sheet, which check-in variant opens (`checkinModel`: ready / verify / away / active / uncertain / pending / early) |
| `idVerified` | `demo.idVerified` or the local Verify Identity flow | the Verified pill, "Verify now", the check-in gate |
| `agentOnline` | `demo.agentOnline` | the Chat options sheet (AI assistant + "Chat with Maya · Online now"), the AI sheet's agent offer |
| `upcomingTours` One / Multiple | `demo.upcomingTours` | "+N more tours" on the card and the Upcoming tours list (the booked tour, then the demo extras) |
| `startingPoints` One / Multiple | `demo.startingPoints` | Before You Start: one entrance, or a choice of the graph's start + entry gates |
| `buildLayout` (List + map · Map + cards · List / Map tabs · List / Map switch) | `demo.buildLayout` | the four Build Your Tour layouts around the same real `MapView` and stop list |

### Screens and sheets

| Design screen | App | Data |
|---|---|---|
| Splash | kept | — |
| Onboarding (3 slides, points card, Prev / dots / Next, Let's Start) | `OnboardingScreen.tsx` rewritten | legacy slide images |
| Get Started: email + password → "Does everything look good?" (profile + tour-status card) → Home; Continue as Guest | `GetStartedScreen.tsx` (replaces `LoginScreen.tsx`); `authStep: 'email' | 'confirm'` | **real** login (`POST /auth/login`), real profile; local edits never sent |
| Home (member): location row, tour card (7 scenarios), property card, links (Upcoming / Book / Completed / Find Shortest Path / AR), how it works; Home (guest): nearby listings, guest card, find-a-property rows | `HomeScreen.tsx` rewritten | real property, real property list; demo listings and tours marked `*` |
| Schedule Self-Tour + confirmation | `ScheduleScreen.tsx` (new) | local booking (`state.scheduledTour`), never sent |
| Verify Identity (intro · scan · selfie · card · done) with the CheckpointID wordmark | `VerifyScreen.tsx` (new) | simulated; `state.verified` local |
| Check-in sheet (7 variants), Before You Start (starting point), Return to Start | `FlowSheets.tsx`, `TourStartScreens.tsx` (new) | starting points from the real graph (`startPoints(bundle)`), the 45-minute door-access window is local |
| Build Your Tour: real map + pins, floor menu, groups by floor, Add Stops sheet, preview overlay, 4 layouts | `BuildTourScreen.tsx` rewritten; `MapView` gained `pins` / `focusNode` | **real** stops, distances (`POST /stops/distances`) and plans |
| Guided Navigation: zone pill, Directions from the real route steps, Avoid stairs (`stepFree` re-route), audio guide, Play Route, I've Arrived, skip, safety bar (time left · Leasing · SOS · Report) | `GuidedScreen.tsx` rewritten | **real** `POST /tour-route`, the existing `useSimulationPlayer` |
| Stop (one screen for units and amenities): lock card, facts, floor plan, photos, narration, reactions, actions, AI concierge, lease pricing / move-in estimate (`*`), Next Stop / Skip | `StopScreen.tsx` (replaces `StopScreens.tsx`); `LockAccess.tsx` **unchanged** | real lock (`pin` / `bluetooth` / unsupported) through the existing flows; the demo slider only on the dummy property |
| Tour Complete (survey) / Tour Summary (recap, best match, favourites, compare, highlights, follow-up, share, 2nd visit) | `SummaryScreens.tsx` rewritten | local; skipped stops carry a labelled pill and are not counted as visited |
| Properties (real list; beds / price chips only for demo listings) + Explore | `SearchScreen.tsx` (+ `ExploreScreen`) | **real** `GET /properties`; a real listing's Explore shows what the listing carries and switches the property |
| Profile (member / guest), Saved units, Tour passes, Settings (+ Demo scenarios), Notifications, History | `ProfileScreen.tsx`, `AccountSheets.tsx` | real user; the rest local |
| Help, Itinerary, Add stop, Note, Video, Book, AI chat (agent / offline / mic), Apply (details / hold), 360, Share, Call, Chat options, Location, QR, Tour link, Guest gate, Upcoming list, Add units, Preview, Gallery, Skip, SOS, Report | `TourSheets.tsx`, `AccountSheets.tsx`, `FlowSheets.tsx` | local |
| Kept as they were: Find Shortest Path (Wayfinding), the AR flow (entry row on Home), Play Route, the lock flows | — | real |

Stylesheet: `src/styles/refresh.css` (new, every new screen and sheet) beside `screens.css`, from which the eight replaced blocks
(onboarding, login, home, profile, build, guided, stop, complete / summary) were removed; `components/ui2.tsx` adds the primitives the
design needed (Eyebrow, Chip, Segmented, LinkRow, RoundAction, NumberedStep, Callout, TonePill, DemoNote); `Icon.tsx` gained 23 icons.
Store: `appState.ts` (new types and fields, `STATE_VERSION` 2), `reducer.ts`, `useAppActions.ts`, `scenarios.ts`, `views.ts`,
`content/demoFixtures.ts` (every demo constant, `DEMO = ' *'`), `navigation/screens.ts` (the new screens and overlays, `backScreenOf`).

### Original assets reused

`src/assets/images/onboard-home.png`, `onboard-wayfinding.png`, `onboard-access.png` (the legacy app's `img_slide1..3`, 748×700) for
the three onboarding slides instead of the artifact's stock photos; `checkpointid.png` (the legacy CheckpointID wordmark, on a blue badge
because its glyphs are white) in Verify Identity; the existing `logo.png` / wordmark, the site-plan hero and the community photo
fallbacks already in `src/assets/images/`.

### Verification

- `npm run typecheck`, `npm run test` (vitest: **10 files / 62 tests**, including the 9 new `scenarios.test.ts` cases), `vite build`: clean.
- **Dummy data source** (Vite `tour-app-refresh-dummy` on :3015, the browser pane at 375×812): onboarding, Get Started, profile
  confirmation, Home, Schedule and confirmation, the Verify Identity flow, the Today card and countdown, the check-in sheet, the QR path,
  Before You Start, Build Your Tour (map focus, preview, Add Stops), route generation, Guided Navigation with the safety bar, Play Route,
  SOS, amenity and unit stops (slide to unlock, lease pricing, move-in estimate), the Skip sheet, Return to Start, Tour Complete,
  Tour Summary, Profile, Settings; **all seven tour-status scenarios** on the Home card; **all seven location scenarios** (row + sheet);
  Agent online (chat options); Multiple upcoming tours (card "+N more" and the list); Multiple starting points (Before You Start);
  **all four Build layouts**; Properties and Explore (tourable and not); guest mode (guest Home, nearby listings, Explore with plans and
  amenities, the guest gate, guest Profile, sign-in from the gate); Find Shortest Path (picker, route, Play Route controls, the
  "pick two different places" validation); the AR flow (QR scan → initializing → Choose AR Stops → AR Live → AR guided stop).
- **Real API** (Vite `tour-app-refresh` on :3014 → Rails :3000 on `pynwheel_development`, the dev-only verification Super Admin, driven
  by headless Playwright in the scratchpad because the browser pane cannot be given the account's password): sign-in and the real
  profile, the 803-property list and search, Explore of a real listing, Schedule (property switch → local booking), the Today card,
  the check-in sheet "away" (0.3 mi) and "ready" (At property + ID verified) variants, Take a Virtual Tour → Before You Start → Build
  with **Hazel's seven real stops on its real Floor 1 plan**, `POST /tour-route`, Guided Navigation with the real directions, Play Route
  on the real plan, the Lobby stop with its Zerv lock, the in-person check-in → Before You Start (door access 45 min) → Build → route →
  stops 1–3 including unit 1508 with the real igloohome **Get Door Code** card (not pressed: it would issue a live vendor code) and
  the Skip sheet. Every request stayed on the existing `/api/tour/v1` endpoints (login, properties, property, graph, map, stops,
  stops/distances, tour-route); 0 console errors. Arbour Place (1601) was also opened: a property without a floor plan renders the
  "This level has no floor plan in Pynwheel yet" state.

### Bugs found and fixed during verification

Previous pass (dummy): Add Stops ignored stops removed after it first mounted; the shared Sheet's drag handler swallowed clicks on its
× button; "Avoid stairs" could swap in a route that dropped a stop and reset progress; the summary and completion counted skipped stops
as visited; the last-tour card hard-coded "5 doors unlocked"; the CheckpointID wordmark was invisible on white.
This pass (real API and the remaining scenarios): **a signed-in member with no property could never open Explore** (App forced the
Properties list whenever `propertyId` was null, so a real listing could not be chosen — the design's only way to pick a property);
Explore › Schedule a Self-Tour on another real property flashed the guest gate (it used the gate action to set `pendingAfterAuth`;
a dedicated `pendingAfterAuth` action now does it); a stop whose lock the app cannot open (Zerv, Latch, …) showed **"Code accepted —
push the door to enter"** on in-person tours (now a muted "Staff-assisted door" strip; `LockAccess` untouched); the Upcoming tours list
ignored the demo tour scenario (it listed only the extras while the card said "+1 more"; it now shows the same tour the card shows,
and never a missed one); dismissing the guest gate with Keep Browsing kept the pending action, so a later sign-in jumped to Schedule.

### Not done

Device builds (iOS / Android) were not run; the real lock request was not issued on purpose; the design's agent chat, booking, apply,
hold, verification, survey and share actions stay local (the CMS has no endpoints for them); the Explore hero of a real listing is the
generic site plan (the listing endpoint carries no image).

## 20. Final platform QA pass (October 18, 2026)

Branch `qa/final-platform-regression-2026-10-17`; report `FINAL_PLATFORM_QA_REPORT_2026-10-17.md`.

- **Critical fix:** `StopScreen.tsx` rendered the lock card only while the stop was locked, and `lockPinReady` marks
  the stop unlocked, so an issued door code vanished immediately and could never be read or renewed (the Bluetooth
  "unlock once more" state was unreachable too). The card now renders for every supported real lock; verified in
  headless Chrome on Hazel with `POST …/locks/pin` answered by a mocked code (no vendor call).
- Also fixed: cancelling while the Bluetooth key is fetched left the stop loading (`useAppActions`); a failed online
  application marked the journey applied (`applyFailed`); a stop's lock answer cleared another stop's in-flight request;
  `signOut` kept `verified`; Capacitor bridge logging (`loggingBehavior: 'none'`) no longer prints the guest key. Tests:
  `src/store/qaFixes.test.ts` (6); vitest 68/68, tsc and `vite build` clean; Android plugin tests 4/4, debug APK built.
- Verified on real Hazel data (clone): the virtual journey end to end (29 steps, four floors, Avoid stairs, Summary) and
  the in-person journey through Settings › Demo scenarios (Today + At property + verified) to the lock stop; 0 console
  errors; only the existing `/api/tour/v1` reads.
- Open (not fixed): native cancel during connect/unlock never settles the promise; the 30 s Rx timeout on the connect
  observable; iOS plugin not wired into `CapApp-SPM`, `NSBluetoothAlwaysUsageDescription` missing, timer/permission
  defects; unmarked simulated copy ("You're 0.3 mi from …", 45-minute access, saved-units count, chat hours);
  the Demo scenarios panel is reachable by every visitor. Hardware validation remains blocked.

### 20a. Resolution round (October 18, 2026)
Demo marks on every simulated line, `pendingAfterAuth` hygiene, sign-out on Back / guest, typed malformed-response
errors, the Demo scenarios panel gated by `VITE_DEMO_SCENARIOS` (always on in dev), and the chosen starting point sent
as `start_stop_id` to `POST …/tour-route` (the tour starts and finishes at the chosen entry gate). Plugin: pending calls
rejected with `cancelled`, first-emission connect timeout, Swift timer / permission / no-SDK fixes, DFU pinned, Swift
package resolution proven. Report §29.

## 21. Schedule Self-Tour on the CMS's booking rules (October 20, 2026)

- The Schedule screen no longer uses `DAY_SLOTS` / `AFTER_HOURS_SLOTS` / `TOUR_LENGTHS` / `PARTY_MAX` on the real provider: the
  `booking` slice (`appState.ts`, not persisted) holds the property's `BookingSettings` and seven days of `AvailabilityDay`s from
  `GET …/booking/settings` and `GET …/booking/availability` (`useAppActions.loadBooking`, five-minute freshness, read whenever the
  screen opens — `App.tsx` effect — so Home, Explore's card and a second visit all load it).
- Slots: `views.bookableSlots` (self-tour open, not full, not past today), `daySlots` / `afterSlots` (after-hours = self-only times when
  the CMS's "Label self-only times as After hours" option is on and agent tours exist), `slotByLabel` (label → `HH:MM` for the
  booking), `dayNote` (closure label / "Too far ahead to book yet" / "Closed"), `tourLengthOptions` (up to three lengths ending at the
  length of tour, or just that length when the option is off). The reducer moves the draft to the first open day.
- Booking: `confirmSchedule` posts through `repository.requestBooking` (first/last/phone from the new "Your details" block over the
  profile, email from the session); the CMS checks the slot again; the answer's booking id, label and end time become
  `scheduledTour` (`tourType`, `endTime` added); a refused slot (`slot_unavailable` / `slot_full`) re-reads the calendar; the toast
  says when the CMS moved an earlier booking instead (`rescheduled`). "Book a Live Tour" (`submitBooking`) books a `guided_tour`
  the same way (the sheet's day/time labels are mapped to a date and `HH:MM`).
- Still demo copy on the real provider: the "Book via" row, the leasing phone under the button, the 24h/1h reminder note. The
  dummy repository answers the former fixtures, so demo mode and the design's scenarios are unchanged.
- Verified headless on the audit clone (Hazel 1618): sign in → Hazel → Schedule a Self-Tour → real slots → Confirm → `POST
  …/bookings` 201 (booking 25519, created_by "Tour App") → "Self-tour confirmed" → the booking in Connect Visitors. Tests:
  `src/store/booking.test.ts`; `npm test` 84 passing.

### October 21, 2026 — Visitors module note

Connect's Visitors tab lists this app's bookings ("Tour App") but cannot show its tours as sessions: the app never posts an
arrival, stops or an end, and the door codes it issues are not tied to a visitor row. Adding those calls (or a new
endpoint on `Api::TourApp::V1`) is the open product gap recorded in `VISITORS_MODULE_FULL_QA.md` §12.

## 22. The Start Tour experience: Build Your Tour, map controls, unit / amenity details, the shared Unlock frame, the audio guide, real booking (October 21, 2026)

Brief `pynwheel_tour_app_screens.md`; report `SELF_TOUR_START_EXPERIENCE_QA.md`; branch `feature/self-tour-start-tour-experience`
from `main` `4d0351a2d`. The live Claude Design file ("Pynwheel Self Tour App.dc.html", October 16 version, and `UnlockScreen.dc.html`)
was read from the signed-in design session this time, tweak by tweak; the seven Tweaks stay the Settings › Demo scenarios of §19.

- **Build Your Tour** (`BuildTourScreen.tsx`): "All floors" in the floor menu (the site plan, else every floor of a stacked plate);
  the bigger map takes ~62 % of the viewport; locate switches level / floor, centres and zooms (`MapView` focus effect, 2.6× the fit
  scale); stop thumbnails are the CMS floor-plan / amenity images; a listed stop the CMS has not plotted says "not on the map yet" and is
  left out of the route request; Add Stops gained building chips and an "Available now" rule that never passes a unit without
  availability data (`availableNow`); the footer estimate becomes the backend's route time once a route for exactly these stops exists.
- **Guided Navigation** (`GuidedScreen.tsx`): a replay icon on the map (`useSimulationPlayer.controls.replay`, a new run from frame 0,
  distinct from Pause / Resume); the audio guide moved to `services/audioGuide.ts` (SpeechSynthesis, pause keeps the position, resume
  continues, a direction is read once as the walker reaches it so a replay does not re-read, the Stop narration is a separate key);
  a secured-floor note on an elevator step whose connector carries a lock vendor in the graph (`RouteStep.via` → `GraphNode.lockProvider`);
  Avoid stairs sends the chosen entry gate and shows `Rerouting…`; the header shows the minutes left from the remaining segments.
- **Stop** (`StopScreen.tsx`, rewritten): facts from the inventory (`unitType` unless it repeats the unit number, `availableDate`,
  `availability`, model), **About this space** generated by `store/access.ts#aboutSpace` from the record, the real floor plan with zoom
  and "On map" (`locateStop` → the guided map on the stop's floor), the CMS photos (`media`: image, floor plan, `amenity_galleries`,
  unit interiors) plus the visitor's own camera shots (data URLs in `state.shots`, this tour only), narration read from the About text,
  Video only for a real video link, 360° for a Matterport / virtual-tour link (`PanoSheet` frames it), published lease terms
  (`unit.leaseTerms`) and a move-in estimate from rent + deposit + the fee text only (`moveInEstimate`; the demo factors stay on demo
  data, marked `*`).
- **Unlock** (`screens/UnlockPanel.tsx`, the design's shared frame): `accessMethodOf(lock, demo, override)` picks BLE / PIN /
  Remote / Gate / unsupported / none; real locks follow the backend's `lock` (`pin`, `ble`, or an honest unsupported note), the
  `Demo · Method` switch (`state.demoMethod`) touches demo stops only; "Try another method" only when the lock really offers one
  (`alternateMethods`: a v1 door's backup keypad PIN); "I've entered the code" is the visitor's confirmation (`state.codeEntered`),
  never a claim the door opened; Report / Call leasing (the property's own `phone`) / Skip in the footer. `LockAccess.tsx` keeps its
  helpers (`pinExpired`, `unsupportedText`).
- **Booking**: the Schedule screen asks the Booking Form's desired bedrooms / move-in date when the property shows them, notes a card
  on file, blocks when self-tours are off, and shows the real text-booking number; `BookSheet` books agent-guided tours on the real
  calendar (`guidedSlots`) through the same endpoint and tells the visitor when the CMS moved an earlier booking.
- Store: `shots`, `demoMethod`, `codeEntered` (memory only), `guided.rerouting`, `leaseTerm: number`, `ScheduleDraft.bedroom / moveIn`,
  actions `locateStop`, `setDemoMethod`, `codeEntered`, `guidedRerouting`. Models: `StopMedia`, `LeaseTerm`, `AccessMethod`,
  `Unit.availabilityKnown / availableDate / availability / unitType / leaseTerms / deposit / additionalFee / media`, `Property.phone / email`,
  `RouteStep.via / instruction`. Tokens: `--pw-live`, `--pw-live-soft`.
- Tests: vitest 14 files / 103 (`store/access.test.ts`, `screens/guideAudio.test.ts`, parser cases); tsc, `vite build`, Android debug
  build clean. Headless Playwright runs (Chrome, the token injected, never a password) on Hazel, John Demo, Jennifer Demo FP, Cypress
  Terra, Oeuvre and the dummy property: see the report.

## 23. The property's zone, the grace window, and revalidation on resume (October 25, 2026)

- `src/store/zone.ts`: `zonedSlotMs(date, time, tz)`, `dayKeyInZone(ms, tz, offsetDays)`, `dayOffsetInZone`, `zoneOffsetMs`,
  `parseClock` — the property's IANA zone through `Intl` (DST-safe); the phone's zone only when none is known.
- `ScheduledTour.bookedAtMs / timeZone` from the API's `booked_at` / `time_zone`; `scenarios.tourStartMs`, `tourDayLabel`,
  `graceMinutesOf`; `autoTourScenario(tour, now, grace)` = upcoming / today (± grace) / missed; the check-in sheet's "early" text
  names the grace period.
- `reducer`: `finishTour.bookingCompleted` (a virtual, demo or phone-only tour never completes a CMS booking), `syncBookings`,
  `bundleLoaded` (prunes stale `tourOrder` / `selected`), `bookingStale`; `selectProperty(…, 'schedule')` and the sign-in gate
  prefill the Schedule draft; `profileOf` prefers the CMS's `firstName` / `lastName`.
- `AppProvider.revalidate` (resume, `online`, 60 s throttle): `getPropertyVersion` → reload when `config_version` moved;
  `refreshVisitorBookings` → `syncBookings`.
- `App.tsx`: "Book Another Tour" / "Book a New Time" open Schedule on the current property.
- Tests: `zone.test.ts` (the owner's Vancouver/Karachi case, DST), `qaFixes.test.ts` (prefill, lifecycle, pruning),
  `scenarios.test.ts` (the window); 145 vitest, tsc clean.
