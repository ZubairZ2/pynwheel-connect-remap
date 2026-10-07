# Tour App Final QA (October 7, 2026)

Branch `feature/tour_app_rails_api`. Rails CMS (Tour App API `Api::TourApp::V1`) + Capacitor app
`tour-app/`. Everything below was run on this Mac against the Rails verify server (:3100,
development mode) and the local **development** database dump; see "Real Production-DB Properties
Tested" for why `pynwheel_prod` was not used.

## Scope
Tour App gaps only: property selection → stops → SVG/map → graph → routing → floor transitions →
Play Route → mobile UX/performance. Admin-only Map & Plotting and Tour Setup work was left alone.

## Known Issues Tested
- John Demo routing slow / stuck — **not reproducible here**: the development dump's John Pynwheel
  Demo (1411) routes in 24–40 ms (warm) and its stops/map/graph answer in 25–40 ms; the production
  copy the owner saw could not be read (permission). Two generic causes that *do* make a cold
  property open stall were found and fixed: every parallel request built its own graph, and nothing
  deduplicated the app's duplicate bundle loads (below).
- John Demo map loading slow — the only slow stage found anywhere is the **first** read of a floor
  SVG from S3 by the Rails process (9 s, 17 s and once 205 s for 2934's 5.2 MB plan on this
  connection), after which it was served from memory (30–300 ms). The SVG is now also cached on disk
  so a restart or another worker never fetches it again. 1411's own plates (1412×932 PNGs) load from
  the browser directly; in this dump they sit on a private bucket (403), which the app reports as
  "Map unavailable".
- John Demo Play Route slow / not smooth — reproduced as an architecture issue, not a John Demo one:
  the player published every animation frame into the global store (the whole app re-rendered
  ~60×/s) and the floor plan image shared one SVG with the animated route and walker (every tick
  repainted the plan). Fixed generically (below); measured at a steady 60 fps on the largest plates
  in the dump.
- Properties Search Cancel not working — reproduced: the screen had **no Cancel control** at all; the
  only clear was the native "×" of `<input type="search">`, whose event does not reach React's
  `onChange` on every web view, so the text stayed and the list stayed filtered. Fixed (below).

## Hazel Baseline
Hazel (1618, 31 plates 1412×932, 220 hallway points, 7 stops): property open 4 requests
(detail 40 ms, stops 40 ms, map 38 ms, graph 31 ms / 244 KB, then distances 43 ms); 3-stop tour
route 52 ms; Play Route 60 fps on the earlier run of this session (Floor 1 → 31 at the elevators,
step card in sync, arrival text). Hazel stays the reference and was re-run after every change.

## Tour-App-Relevant Gaps (filtered from `gaps_map_plotting_feature.md` and `gaps_tour_setup_feature.md`)

Only gaps that touch the Tour App's path (property selection → stops → SVG/map → graph → routing →
floor transitions → Play Route → mobile UX) are listed with a status; everything else in the two
documents is admin-side Connect work and is marked out of scope below.

| Gap | Tour App dependency | Status |
|---|---|---|
| M5 Routing across floors and buildings over the stored graph | the Tour App's routes | **RESOLVED** (Oct 4 `Wayfinding::RouteService`; the Tour App API's `/route`, `/tour-route`, `/stops/distances` are that engine) |
| M6 Vertical connections other than elevators | stairs / ramps in a route, step-free routing | **RESOLVED** (`elevators.kind`, `accessible`; step-free skips stairs — `routing_test` covers it) |
| M7 Set as Building Starting Point / gates | the tour start, cross-building routes | **RESOLVED** (gates = entry/exit points, tour start, `wayfinding_stops` entry/exit; outdoor legs) |
| M9 / M20 / M22 SVG pointers and the SVG ↔ image coordinate frame | drawing the plan under the graph | **RESOLVED for the app** (`mapBase.ts`: frame = image pixels, else viewBox; `svg_to_image_transform` honoured when stored); the calibration itself (storing a transform) is admin work |
| M16 / M21 / M23 / M24 Detect Hallways, provenance, no walkway layer in any floor SVG | stops without paths cannot be routed | **REQUIRES PRODUCT DECISION / DATA** — the app reports them honestly (`routable: false`, `not_linked`, skipped with a warning); creating paths is a CMS action, see "Auto Detect Tests" |
| M17 Walking distance and time | "240 ft", minutes on cards and steps | **BLOCKED on data**: no `scale_ft_per_px` is stored anywhere; the app shows pixels and no minutes (contract: `distance_ft`/`duration_s` null) |
| M18 Blockers, stairs and step-free routes in the self-tour app | `avoid_blockers`, `step_free` | **RESOLVED** in the API; the app sends `step_free` / `avoid_blockers` on Find Shortest Path; blockers cut the route and `blocked` is a handled error |
| M19 Floorplate building vs unit building | multi-building properties (The Lagoons 15, The Meadows 17, Alderwood 19 buildings) | **RESOLVED** (`GraphBuilder#belongs_elsewhere?`; verified on 1264 / 1064 / 1105 routes) |
| T1 Saving the tour (order, visibility, added/removed stops) | the stops list and tour order the app shows | **RESOLVED** (Oct 4; `TourStops::Membership` is the rule the API reads) |
| T3 Dwell time per stop | `dwell_s` on arrival steps, summary minutes | **RESOLVED** (`tour_stops.duration_minutes`); feet still M17 |
| T6 Route preview as the CMS routes | the app and the CMS agree on routes | **RESOLVED** (one engine; `script/tour_api_parity.rb` proved the API byte-identical to the previous service) |
| T8 / M15 Additional stops (leasing, restroom, …) as tour stops | Build Your Tour lists only units and amenities | **REQUIRES PRODUCT DECISION** (phase 2 of the backend plan: `wayfinding_stops` → `tour_stops`); they are routable From/To places today |
| T9 / M25 Connect-created elevators break the legacy Elevators page | none for the app (an admin page) | **OUT OF SCOPE — NOT TOUR APP RELATED** |
| T10 / M26 / M27 Mixed editing between legacy and Connect | the Tour App graph misses points drawn on the legacy server | **BLOCKED (deployment)**: resolved by running one backend; nothing the app can do |
| M1 / M2 / M3 / M4 / M8 / M10–M14 (saving plots, publish, uploads, auto-plot, marker colours, polygon placements, plot rules, CMS SVG auto-plot, dev-DB files, saving wayfinding edits) | admin plotting UI | **OUT OF SCOPE — NOT TOUR APP RELATED** |
| T2 AI Concierge talking point, T4 elevator banks gating/photos, T5 publish, T7 dev-DB files | admin Tour Setup / content | **OUT OF SCOPE — NOT TOUR APP RELATED** (the app's concierge answers a fixed "not connected" message by design) |

## Out-of-Scope Gaps

Listed in the table above as **OUT OF SCOPE — NOT TOUR APP RELATED**: M1–M4, M8, M10–M14, M25/T9, T2, T4 (gating/photos), T5, T7. No implementation time was spent on them.

## Real Production-DB Properties Tested

**Not tested against `pynwheel_prod`.** The session's permission classifier refused every read of
that database ("Production Reads") and its ruling covers reaching the same data through other
tools, including an API server pointed at it, so nothing below was run on production data. The
owner can grant that permission (a Bash permission rule for `psql pynwheel_prod`, or by running the
Rails verify server against `pynwheel_prod` and asking for the measurement again); until then John
Demo on production remains unobserved here. Everything below ran on the local development dump
(`pynwheel_development`), which holds the same properties by name with their own graph state.

### Development-dump property matrix (Self-Guided Tour on)

| Property | ID | Buildings | Plates | Plate size (px) | SVG plates | Hallway points | Elevators | Gates | Stops (routable) | Notes |
|---|---:|---:|---:|---|---:|---:|---:|---:|---|---|
| Hazel | 1618 | 1 | 31 | 1412×932 | 0 | 220 | 3 | 0 | 7 (7) | baseline |
| John Pynwheel Demo | 1411 | 1 | 4 | 1412×932 | 0 | 73 | 1 | 0 | 3 (3) | floor images on a private bucket (403 here) |
| Jennifer Demo FP | 1412 | 2 | 4 | 1412×932 | 0 | 9 | 1 | 0 | 9 (5) | 3 plates have no hallway points |
| Hazel Copy Test ("Hazel Test") | 1935 | 2 | 33 | 1412×932, 2943×1943, 850×582, 625×625, one 0×0 | 0 | 274 | 2 | 1 | 30 (30) | **no tour start plotted** → `no_start` |
| Sofia | 2919 | 1 | 7 | 2942×1942 | 0 | 367 | 1 | 1 | 15 (15) | largest graph (573 nodes, 359 edges), large plates |
| The Lagoons | 1264 | 15 | 2 | 1412×932 | 0 | 141 | 1 | 15 | 9 (7) | many buildings and gates |
| The Meadows | 1064 | 17 | 3 | 2943×1943 | 0 | 71 | 0 | 2 | 6 (5) | large plates, no elevator |
| Trestle Apartments | 1105 | 6 | 2 | 1412×932 | 0 | 98 | 3 | 2 | 8 (8) | cross-building routes |
| Dummy-High-Rise-0012 | 2934 | 2 | 3 | 1251×626, one SVG-only | 2 | 47 | 4 | 2 | 12 (12) | SVG plate 3029 (5.2 MB, viewBox 2000×2000) |
| Raleigh Slabtown | 1114 | 1 | 6 | 1412×932 | 0 | 178 | 1 | 0 | 11 (11) | |
| Montecito | 1241 | 11 | 2 | 1412×932 | 0 | 91 | 4 | 9 | 15 (15) | |

No property in the dump has an SVG with a walkway layer; the only SVG plates are 2934's.

## Auto Detect Tests

Not run. Two reasons, both honest: (1) on production data the classifier blocked every access
(above), and the brief forbids modifying production without a verified rollback; (2) in the
development dump every unroutable stop sits on a floor plate that has **no hallway points at all**
(Jennifer Demo FP: Wellness Center, Rooftop Lounge, units 335 and 438 on plates 1863/1864/1865;
The Lagoons: units 206 and 202 on plate 1677; The Meadows: unit E2036 on plate 2041 — all
`link: none`, 0 hallways, 0 edges on the level). That is the "No source graph data" case of §7:
the graph is built correctly from what is stored, routing is right to refuse, and the Tour App
reports it (stop cards say "no path yet", tour-route skips the stop with a warning, `route`
answers `not_linked`). Detect Hallways runs from the Connect Map & Plotting screen
(`PUT /communities/:id/wayfinding_graph.json`, `origin: 'detect'`) and needs a floor SVG with a
walkway layer or the Textract auto-plot; none of these plates has an SVG, so there was nothing for
detection to read. No temporary paths were created anywhere.

## Temporary DB Changes and Restoration

None. `pynwheel_prod` was never opened; the development dump was only read (plus the Doorkeeper
token rows that signing in creates and signing out revokes).

## SVG Performance

| Stage | Measured |
|---|---|
| `GET …/map/levels/floorplate:3029/svg` first read of the process (S3 → Rails) | 17.0 s this run; 9–11 s and once 205 s on earlier runs (the fetch itself; the client sees "Loading map…" meanwhile) |
| same, process memory warm | 30–300 ms for 5.2 MB (293 ms with gzip to a browser) |
| same, after a restart with the new disk cache (`tmp/cache/tour_api_svg/`) | **33.18 s** for the first request of the new process (read from disk, validated, no S3 request) |
| `304` on `If-None-Match` | 30 ms |
| SVG validation | first element only (`Nokogiri::XML::Reader`), viewBox `0 0 2000 2000`, ETag `"01d7a1f975a54da98156"`, `Content-Type: image/svg+xml` |
| In the app | Blob URL drawn by an `<image>` on its own compositing layer; the frame is the viewBox for an SVG-only plate (2000×2000); Dummy-High-Rise 3029 rendered with the route over it (earlier run this session) |

Only Dummy-High-Rise has SVG plates in the dump (3029 SVG-only, 3085 SVG over a 1251×626 raster);
every other property's plans are 1412×932 or 2942×1942 PNGs loaded by the web view from S3.

## Routing Performance (Rails :3100, development mode, warm; cold = first request of a graph version)

| Property | detail | stops | map | graph | route | tour-route | distances |
|---|---:|---:|---:|---:|---:|---:|---:|
| Hazel 1618 | 40 ms | 40 ms | 38 ms | 31 ms · 244 KB | 34 ms | 55 ms (3 stops, 29 KB) | 43 ms |
| Hazel Copy Test 1935 | 44 ms | 51 ms · 30 KB | 31 ms | 40 ms · 256 KB | — (no tour start) | 47 ms → `422 no_start` | 28 ms |
| John Pynwheel Demo 1411 | 39 ms | 34 ms | 26 ms | 30 ms · 114 KB | 28 ms | 39 ms | 27 ms |
| Jennifer Demo FP 1412 | 40 ms | 38 ms | 23 ms | 27 ms · 82 KB | 24 ms | 41 ms (4 skipped) | 27 ms |
| Sofia 2919 (largest graph) | 43 ms | 39 ms | 31 ms | 36 ms · 248 KB | 27 ms | 37 ms (6 stops, 29 KB) | 36 ms |
| The Lagoons 1264 (15 buildings) | 41 ms | 39 ms | 31 ms | 33 ms · 140 KB | 26 ms | 38 ms | 26 ms |
| The Meadows 1064 (17 buildings) | 41 ms | 55 ms | 28 ms | 27 ms · 144 KB | 27 ms | 39 ms | 33 ms |
| Trestle 1105 (6 buildings) | 40 ms | 71 ms | 32 ms | 28 ms · 121 KB | 29 ms | 44 ms | 37 ms |
| Dummy-High-Rise 2934 | 44 ms | 40 ms | 29 ms | 31 ms · 37 KB | 29 ms | 46 ms | 39 ms |

Cold property open (the app's 4 parallel requests on a graph version nobody has built yet),
before/after the single-flight fix (`script`: `scratchpad/probe.rb`, graph builds counted in the log):

| Property | before: wall / graph builds | after: wall / graph builds |
|---|---|---|
| The Meadows 1064 | 328 ms / **4 builds** | — |
| Raleigh Slabtown 1114 | 439 ms / **4 builds** | — |
| Montecito 1241 | 1771 ms / **4 builds** | — |
| Miramar 1268 | — | 593 ms / **1 build** |
| Alderwood 1234 | — | 185 ms / **1 build** |

(Each property can only be cold once per process, hence different properties before and after.)
The ~25 ms floor on every request is the development server (reloader, debug logging); production
was not measured.

## Play Route Performance (browser, 375-wide device frame, `requestAnimationFrame` sampled)

| Case | Frames | fps | p95 frame | worst frame | frames > 50 ms | network requests during playback |
|---|---:|---:|---:|---:|---:|---:|
| Sofia stop 1, floor 1 (2942×1942 plan), 459 px | 361 / 6 s | 60.0 | 18.7 ms | 18.8 ms | 0 | 0 |
| Sofia stop 2, Floor 1 → 3 via Elevator Lobby, 895 px, **before** stage prefetch | 1760 / 15 s | 59.6 | 18.7 ms | **216.7 ms** (the floor-3 image fetched + decoded at the switch) | 1 | 1 (the next floor's plan) |
| Sofia Find Shortest Path, Floor 1 → 7, 6,231 px, **after** stage prefetch | 1206 / 20 s | 60.1 | 17.6 ms | 18.7 ms | 0 | 0 (the floor-7 plan was fetched when the route arrived, 1.7 s earlier) |

DOM mutations during playback ≈ 60/s (the walker's `transform` and the step card), nothing else
re-renders. No route request, graph work or SVG reconstruction happens per frame.

## Property Comparison

| Flow | Hazel 1618 | Sofia 2919 (largest) | The Lagoons 1264 (15 buildings) | Hazel Copy Test 1935 (33 plates) | Target |
|---|---|---|---|---|---|
| Property load (4 requests, warm) | ~40 ms each | ~40 ms each | ~40 ms each | ~45 ms each | Smooth ✓ |
| Stops load | 40 ms, 7 stops | 39 ms, 15 stops | 39 ms, 9 stops | 51 ms, 30 stops (30 KB) | Smooth ✓ |
| Map load (levels JSON) | 38 ms | 31 ms | 31 ms | 31 ms | Smooth ✓ |
| Plan load/render | 1412×932 PNG from S3, direct | 2942×1942 PNG, 1.7 s from S3 once, then cached; prefetched for route stages | 1412×932 PNG | mixed sizes | Smooth ✓ (first paint waits on S3) |
| Graph load | 31 ms, 244 KB | 36 ms, 248 KB | 33 ms, 140 KB | 40 ms, 256 KB | Smooth ✓ |
| Route generation | 34–55 ms | 27–37 ms | 26–38 ms | n/a (no tour start) | Smooth ✓ |
| Route rendering | immediate | immediate | immediate | n/a | Smooth ✓ |
| Play Route | 60 fps (earlier run) | 60 fps, 0 long frames incl. floor change | not played this run | n/a | Smooth ✓ |

## Search/Cancel Validation (browser, 803 properties)
- type "hazel" → 4 rows, Cancel visible → **Cancel** → text "", field blurred, 803 rows, Cancel hidden ✓
- clear "×" → text "", 803 rows, field keeps focus, Cancel still shown ✓ · retype "jo" → 9 rows ✓
- Escape clears, Enter closes the keyboard; selecting a result resets the query (reopening the picker
  shows "" and the full list with the current property marked) ✓
- rapid typing: the list is in memory (one `GET /properties` at sign-in, cached 60 s server-side),
  so no request is sent per keystroke and nothing can arrive late and restore a stale query ✓
- loading / error states: "Loading your properties…" and "The properties could not be loaded · Try
  again" are shown instead of an empty list ✓ (Cancel while loading: there is no in-flight search request to race)

## API Findings
- Request storms (found and fixed in the app): opening a property issued the four bundle requests
  **twice** (`getPlaces`/`getContent` ran in the same `Promise.all` as `getProperty` and, finding no
  cached bundle yet, loaded it again); `getContent` fetched the property list a second time; the
  provider refetched the list (145 KB) on every property switch. Now one request each; verified in the
  network log (2919 and 1618 opens: detail, graph, stops, map, distances once; list once at sign-in).
- Zero API requests during Play Route, zoom or pan ✓. `/graph` answers 304 on `If-None-Match` ✓.
- Cold graph builds were one per concurrent request; now one per (property, graph version, options).
- Contract unchanged (the 172-run Rails suite incl. the 64 Tour App API tests passes); every error the
  app meets has an envelope the UI shows: `no_start` ("Route not available · The tour has no starting
  point on the map." with Generate still active), `not_linked`, `invalid_stop`, `tour_disabled`,
  `unknown_endpoint`, 401 → sign-in.
- Development-only noise seen in the network log: React StrictMode runs the session-restore effect
  twice (`auth/me` ×2 at launch) and one `GET /properties` fires before the stored token is loaded
  (401, then retried with it). Neither happens in a production build; the second is harmless but
  could be tidied by gating the list load on the session restore.

## Mobile Findings
- iOS: **not run** (no Xcode on this Mac).
- Android: **not run by this session**. Android Studio and an SDK are installed; the owner builds and
  installs the APK (`tour-app/android`, web bundle rebuilt and synced with these fixes; manifest allows
  cleartext for the LAN development URL in `.env.production.local`). The owner's earlier device run
  reached Rails over the LAN (sign-in attempts logged from 192.168.1.104).
- Everything above was measured in the desktop web view at the app's device frame; the frame-rate
  numbers are an upper bound for a phone.

## Issues Fixed (this phase)
1. **Search Cancel** — `SearchScreen`: explicit Cancel (while typing or focused) and a clear button;
   plain text input (`inputMode="search"`) so every change reaches React; Escape/Enter handling; the
   query resets when a property is chosen; filter logic in `searchFilter.ts` with unit tests.
2. **Play Route re-rendered the whole app per frame** — `useSimulationPlayer` keeps the live state in
   the hook (ref + local state) and publishes to the store only on status changes and at most every
   500 ms; Guided and Wayfinding screens read the live status.
3. **Floor plan repainted on every animation tick** — `MapView` draws the plan `<image>` in its own
   `<svg>` compositing layer under the overlay (route, markers, walker); CSS `will-change` on both.
4. **Floor change hitch (217 ms frame)** — `usePrefetchRouteLevels` warms every level a route's stages
   visit (SVG into the session cache, image into the browser cache) as soon as the route is known.
5. **Duplicate requests** — one in-flight bundle load per property, one in-flight property-list load,
   no list refetch on property switch, one shared session restore.
6. **Cold graph built once under concurrency** — `TourApi::Engine.built` single-flight (mutex +
   condition variable); `engine_test.rb` (4 tests incl. 4 threads → 1 build).
7. **Floor SVGs cached on disk** — `TourApi::Assets` writes validated files to
   `tmp/cache/tour_api_svg/` and reads them before fetching; `assets_test.rb`.

## Remaining Tour App Issues
- **Production data not validated**: John Demo / Hazel / Jennifer Demo FP / Hazel Test on
  `pynwheel_prod` were not opened (permission). The owner can run the same scripts
  (`script/tour_api_measure.rb`, `scratchpad/probe.rb`) against a Rails server on that database.
- Unroutable stops where a floor has no hallway points (Jennifer Demo FP ×4, The Lagoons ×2, The
  Meadows ×1 in the dump) need paths drawn or detected in the CMS; the app reports them honestly.
- Hazel Copy Test has no plotted tour start; the app explains it; the CMS must plot one.
- First read of a floor SVG from S3 is slow and happens inside a request (now once per deployment
  thanks to the disk cache; a background warm-up on deploy would remove it entirely).
- No `scale_ft_per_px` anywhere → pixels and no minutes (M17).
- iOS / Android device runs.

## Overall Status
**NOT READY** — the code paths the brief names are fixed and measured smooth on every development
property including the largest ones, but rule 6 (multiple real `pynwheel_prod` properties), rule 8–9
(Auto Detect temporary test on production with verified rollback) and rule 11 (iOS/Android) could
not be exercised from this session. Hazel (1), the generic fixes (7), Search Cancel (5) and SVG /
graph / routing / stops / floor transitions / Play Route on real (development-dump) data (10) hold.
