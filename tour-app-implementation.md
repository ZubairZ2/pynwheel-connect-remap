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
