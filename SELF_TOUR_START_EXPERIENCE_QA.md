# Self Tour App — Start Tour experience: QA report (October 21, 2026)

Brief: `pynwheel_tour_app_screens.md`. Design: the Claude Design project `13d18a36-ed41-492e-b118-e69e26e4636a`, file
**"Pynwheel Self Tour App.dc.html"** (live version of October 16, 22:40, 4,560 lines, 12 project files) and its
`UnlockScreen.dc.html` component, both read from the signed-in design session through the design service's `GetFile`
RPC and saved to the session scratchpad for inspection.

## Scope and branch

- Feature branch `feature/self-tour-start-tour-experience`, from `main` `4d0351a2d` (the merge of PR #37), in the
  existing checkout (no worktree). The owner's uncommitted iOS project files and untracked notes were left untouched.
- Databases: the audit clone `pynwheel_audit_clone` (prod rows synced on October 17, plus earlier test residue) for every
  read and every write; nothing was written to `pynwheel_prod` or Heroku. The owner's note that Cypress Terra's routes
  were "created in the test and audit database" did not match the clone: see §Representative properties.
- Existing functionality preserved: sign-in and session, property selection, the map pipeline (`MapView`,
  `useLevelBase`, `useMapViewport`), route generation (`POST …/tour-route`, `Wayfinding::RouteService`), Play Route
  (`useSimulationPlayer` / `simulation.ts`), the lock services (`TourApi::Locks`, `iglooBle.ts`), the booking
  engine (`Bookings::Availability` / `Bookings::Create`), Find Shortest Path, the AR flow, the demo-scenario model.

## Design coverage

| Design state | Where it was read | Existing component | Change | Result |
|---|---|---|---|---|
| Build Your Tour (all four `buildLayout` tweaks) | `Pynwheel Self Tour App.dc.html` lines 738–864 + `renderVals` 4160–4290 | `BuildTourScreen.tsx` | "All floors" entry in the floor menu (the site plan, or every floor of a stacked plate), maximize to ~62 % of the viewport, locate now zooms (not only centres), CMS thumbnails, "not on the map yet" stops, building chips in Add Stops, `Available now` never passes a unit without availability data, route-time estimate once the backend calculated it | PASS (headless: Hazel, Jennifer Demo FP, John Demo; pane: Hazel) |
| Add Stops (search, All / Units / Amenities, Building & floor, unit preferences, grouped rows, Add / ✓ Added, empty states) | lines 2597–2660 + 4229–4283 | `AddStopsBody` | building chips, availability rule, CMS thumbnails | PASS |
| Stop preview overlay | 2662–2700 | `BuildTourScreen` preview | the real floor-plan / amenity image when published | PASS |
| Guided Navigation · Map (zone chip, zoom, fit, bigger map, Directions, Avoid stairs, Play / Pause guide, I've Arrived, Skip) | 1750–1854 + 3600–3760 | `GuidedScreen.tsx` | replay icon on the map, audio guide with real pause / resume / no re-reading on replay, secured-floor note on elevators the CMS marks with a lock vendor, `Rerouting…` state, remaining minutes, "On map" focus | PASS |
| Stop (unit and amenity): facts, unlock block, floor plan with zoom, About this space, Photos, narration, reactions, Video / 360 / Notes / Photo, concierge, price by lease term, move-in estimate, Next / Skip | 865–1039 + 3840–3900 | `StopScreen.tsx` | rewritten on the CMS data (see §Unit and amenity details) | PASS |
| Unlock · `Demo · Method` BLE / PIN / Remote / Gate (artboards A–D and the `UnlockScreen` component) | `UnlockScreen.dc.html` (291 lines) + lines 2764–2830 | `LockAccess.tsx` (kept for its helpers) → new `UnlockPanel.tsx` | the shared frame (type pill, Powered by, access validity, method block, success panel, Try another method, Report, Call leasing, Skip) | PASS on demo data (all four); on real data BLE (igloohome v1) and PIN (igloohome API / Iglooworks) wired to the existing services, Remote and Gate report "not connected" honestly |
| Skip Stop sheet | 1855–1880 | `SkipSheet` | unchanged | PASS |
| Schedule Self-Tour | 409–530 | `ScheduleScreen.tsx` | Desired bedrooms / move-in date when the property's Booking Form shows them, card-on-file note, self-tours-off state, text booking on the real phone | PASS (Hazel shows both fields; Oeuvre neither) |
| Book a Live Tour | design sheet | `BookSheet` | the property's agent-guided calendar instead of fixture days / times | PASS (booked on Oeuvre) |
| Call leasing / Report an issue / 360° / Gallery | sheets | `FlowSheets.tsx` | real phone (or an honest unavailable state), honest report copy, the CMS's Matterport link in a frame, real photos | PASS |
| Tweaks: `confirmTourScenario`, `locationScenario`, `idVerified`, `agentOnline`, `upcomingTours`, `startingPoints`, `buildLayout` | `data-props` of the file | Settings › Demo scenarios | unchanged (verified through them) | PASS |

Visual comparison: the design's Unlock artboard A (BLE) and the component's PIN block were screenshotted in the design
canvas and compared with the app's demo screenshots (`scratchpad/pw/shots/demo-*/09-demo-2-ble.png`,
`10-demo-2-pin.png`): same frame order (Demo · Method strip, type pill + Powered by, access line, method block, footer),
same copy. Two differences were found and fixed: the live green tokens (`--pw-live`, `--pw-live-soft`) did not exist in
the app's token set, so the "Bluetooth on · Lock in range" pill and the success panel were invisible; and the PIN
expiry showed a 24-hour time in the headless locale (the device locale decides). Not pixel-matched: the design's
Unlock is a full screen, the app keeps it as the Stop screen's unlock card (the October 17 decision to merge Stop Detail
and Unlock into one screen was kept).

Design states not reachable: none that matter to this brief; the whole file was read. The artboards for Remote and Gate
were not screenshotted (the canvas scroll stayed on artboard A), their markup was read from the component source.

## Build Your Tour

- Stop list: the real stops of the property (`GET …/stops`), grouped by the level label the data gives them
  ("Floor 1", "Tower A · Floor 2"); Hazel 6 stops on floors 1 / 10 / 15 / 31, Jennifer Demo FP 9 on floors 2–5, John
  Demo 5 on floors 1–3, Cypress Terra 0 (no stops on the clone).
- Count and duration: the dwell minutes, replaced by the backend's route time (`route.duration_s`) once a route for
  exactly these stops exists ("~N min with walking").
- Remove: the trash / Remove actions update the list, the count, the pins and the floor-menu counts; the CMS Tour Stop
  is never touched (no write endpoint exists). Verified: Hazel 6 → 5 stops after removing 1508, back to 6 after Add.
- Add Stops: duplicate additions are impossible (a stop already in the tour is not in the pool; tapping ✓ Added undoes),
  the baseline is taken when the sheet opens, filters compose (tab × building × floor × beds × availability × search),
  empty states say why ("No matches" + Clear filters, or "Everything is already in your tour").
- Unplotted stops: a listed stop the CMS has not plotted shows "not on the map yet", has no locate pin, is left out of
  the route request, and the route answer names it (John Demo's Business Center).
- Let's go: `POST …/tour-route` with the chosen stops, the chosen entry gate and the Avoid-stairs flag; a refused route
  shows the backend's message in the footer banner; stops the backend could not reach are named in a toast instead of
  being dropped silently (Jennifer Demo FP: 5 units on floors 3–5 that no vertical link reaches from the SVG plate).

## Map and navigation

- Existing map preserved: `MapView` renders the same plan layer, overlay and walker; only the focus effect gained a zoom.
- All Floors: offered when the property has a site plan or a stacked plate; Hazel (31 single-floor plates, no site plan)
  gets the plain floor list, Jennifer Demo FP gets "All floors 9" + the floors; the count per floor is the chosen stops.
- Maximize / locate / zoom: bigger map = 62 % of the viewport height (min 360 px); locate switches the map to the stop's
  level and floor, centres it and zooms to 2.6× the fit scale (capped) — Hazel 1508 → Floor 15, John Demo 438 → Floor 4.
- Route overlay: unchanged (the real legs on the current floor, transitions badged).
- Replay icon: on the map next to the size control; `player.controls.replay` restarts the walker from frame 0 as a new
  run (Hazel: progress 82 % → 33 % a second after the tap, toast "Replaying the route from its start"); Pause / Resume
  stays the main control, so replay and resume are distinct.
- Avoid stairs: unchanged request (`step_free: true`, the backend's step-free graph), now with the chosen entry gate,
  a `Rerouting…` state while in flight, and the "On · elevators and ramps only" line; the control appears only when the
  segment changes floor (none of the first segments did in the headless runs; the Oct 18 QA covered the 29-step Hazel
  route).
- Elevator access: a transition step whose connector carries a lock vendor in the graph (Hazel's elevators: Zerv) shows
  "Secured floor · tap your pass at the Zerv reader in the elevator" with "Reader not responding? Call leasing" while
  current. No unlock button: the backend has no elevator-reader operation, so none is claimed.
- Audio guide: `services/audioGuide.ts` over SpeechSynthesis. Play guide reads the current direction (or resumes the
  paused one), Pause guide pauses in place, a direction is read automatically only when the walker moves past what was
  already read (replay does not re-read), leaving the screen stops the guide, the Stop screen's narration is a separate
  key. The test runtime has no synthesis: `audioGuide.available` is false and every call is a no-op (unit-tested).

## Unit and amenity details

- Real data: name, building / floor, rent (`effective_rent` → `market_rent`), beds / baths, size, type (the feed's
  `unit_type` unless it merely repeats the unit number), move-in (`available` + `available_date`), model unit, the
  amenity's hours when the CMS holds any (none of the four properties does), the stop's directional text.
- About this space: generated by `aboutSpace()` from those fields and the record's description; nothing invented, a
  missing field is left out. Examples: "153 is a 2-bedroom, 2-bath The Jupiter plan of 1,204 sq ft on Floor 1 at John
  Demo. Available now at $2,450 a month. Courtyard View 1st Floor"; "Fitness Centre is a fitness amenity on Floor 1 at
  Hazel. Open 24/7, …".
- Price by lease term: the property's `lease_pricing` by the kiosk rule (`Unit#get_lease_term_pricing_matrix`: only
  while the property displays pricing options, only entries with a rent, sorted by term), as `unit.lease_terms`. None of
  the four properties publishes it, so the section says "Lease-term pricing is not published for this unit"; the demo
  property keeps the design's factors marked `*`.
- Move-in estimate: rent + the floor plan's `deposit` when the CMS holds one, with the property's additional-fee text as
  a note; hidden when nothing beyond the rent is published; never a quote (John Demo 153 shows one from its deposit).
- Floor plan: the floor plan's `standard_image_url` with zoom + / − (1×–3×) and full screen (the gallery); "On map"
  returns to the guided map on the stop's floor, centred on it (`locateStop`).
- Photos: the unit's image, the floor plan's interior images, the amenity's image and `amenity_galleries`, plus the
  visitor's own (captured through the camera / file picker, downscaled to 640 px JPEG data URLs, this tour only, never
  uploaded, labelled "Yours"); the gallery shows all of them full screen.
- Video / 360°: Video only when `video_link` is a video; a Matterport / 360 link (Hazel's amenities and units, John
  Demo's units) opens as the 360° view in a frame with "Open in your browser". No placeholder player on real data.
- Notes: unchanged (local).

## Unlock integration

Method resolution (`accessMethodOf`): a real lock answers from the backend's `lock` (`pin` for igloohome API /
Iglooworks, `ble` for igloohome v1, `unsupported` for Zerv / Latch / Dwelo / EdgeState / Manual / an unassigned igloohome
device); the `Demo · Method` switch changes a demo stop only and can never move a real lock (unit-tested).

| Method | Real data | Demo data |
|---|---|---|
| Bluetooth / mobile key | Hazel 1508 (igloohome v1 on the clone): panel "Bluetooth unlock not available on this device" in the browser; on a device with the plugin the slide calls `unlockWithBluetooth` with the SDK's phases (scanning / connecting / unlocking), cancel, failure + Slide to try again. Hardware not available this session. | slide → "Unlocked — push door to enter" |
| PIN / keypad | real door code through `POST …/locks/pin` (not pressed on real data: it issues a live vendor code); the mocked answer path shows the code, Copy, keypad, expiry, "I've entered the code" → "Code entered — push the door", expired / refused → Get a new code | the design's example code marked `*` |
| Remote / cloud | no cloud-unlock integration exists in the backend: the panel says so (no button) | Unlock door → 2 s → done with the re-lock countdown |
| Gate / garage | no gate integration exists: the panel says so | Open gate → Gate open — walk through |
| Other vendors | Zerv on Hazel's Fitness Centre / Lobby: "This Zerv lock cannot be opened from this app yet…", tour continues | — |

- Try another method: offered only when the lock offers one (a v1 door whose Bluetooth key came with a backup keypad PIN
  → PIN; demo stops cycle the design's variants); otherwise "No other way in is set up for this door".
- Report an issue: no CMS endpoint exists; the sheet and toast say the report stays on the phone (no "sent" claim).
- Call leasing: the property's own phone (`communities.phone`, else `property_manager_phone`) dialled through `tel:`;
  Cypress Terra has none → the unavailable state.
- Skip: unchanged (the Skip sheet, the CMS Tour Stop untouched).

## Scheduling and booking

- Real configuration: `GET …/booking/settings` and `GET …/booking/availability` (the CMS's `Bookings::Availability`).
  Hazel: self-tour only, 10 AM–8 PM today, form asks desired bedrooms + move-in date, text booking on 7789000352.
  Oeuvre: self + guided, slots at :01/:16/:31/:46, after-hours self-only times labelled. Jennifer Demo FP: widget off →
  "Bookings are paused". Cypress Terra: Knock-managed, bookable.
- Booking Form fields: `desired_bedroom` / `desired_move_in_date` sent only when the property's form shows them.
- Submission on the clone (Oeuvre 229, user 2181 as the visitor): self-tour today 9:31 PM → 201, "Self-tour confirmed";
  then Book a Live Tour tomorrow 9:01 AM → 201. The CMS keeps one upcoming booking per visitor, so the second request
  **moved** the first (the row changed from `self_tour` to `guided_tour`, `rescheduled: true`); the app now says so and
  updates its tour card. Connect's Visitors query lists it: `Sallu, salahudin · Upcoming · Person Guided Tour · source
  Tour App` (booking 25525, visitor 16268).
- Not changed: the booking engine, the slot check, the legacy widget.

## Regression

- Existing routes and maps: the Hazel / John Demo / Jennifer Demo FP headless runs used only the existing endpoints
  (auth/me, properties, property, graph, stops, map, level SVGs, stops/distances, tour-route, booking/*); 0 console
  errors except Matterport's own network errors inside its iframe (the headless browser blocks its API).
- Other screens: Home, Profile, Settings, check-in, Before You Start, Tour Return unchanged apart from the sheets above.
- API and state: `shots`, `demoMethod`, `codeEntered` are memory-only; `tourReady` resets entered codes; `locateStop`
  keeps the tour state; bookings reload the calendar after a write.

## Test results

| Check | Status | Evidence |
|---|---|---|
| `npm run typecheck` (tsc, noUnusedLocals) | PASS | clean |
| `npx vitest run` | PASS | 14 files / 103 tests (84 before; new: `store/access.test.ts`, `screens/guideAudio.test.ts`, parser cases) |
| `npx vite build` | PASS | 616 kB main chunk |
| Rails `test/controllers/api/tour_app` + `test/services/tour_api` | PASS | 95 runs, 714 assertions, 0 failures (new: stops detail facts / media, unplotted stop skipped, property keys) |
| Android debug build (`cap sync android`, `gradlew assembleDebug`) | PASS | `artifacts/pynwheel-tour-start-tour-2026-10-21.apk` (20.4 MB, git-ignored); not installed on a device |
| Headless Build Your Tour on Hazel 1618 | PASS | `scratchpad/pw/shots/build-1618-*/log.md`: floors, locate, maximize, remove, Add Stops filters, empty states, duplicate prevention |
| Headless Build on Jennifer Demo FP 1412 | PASS | All floors, locate 438 → Floor 4, Available now → 1 row |
| Headless Build on Cypress Terra 8005 | PASS (empty) | 3 SVG plates render, 0 stops, no graph (see below) |
| Headless Guided on Hazel / John Demo | PASS | Play, replay, Pause / Play guide, bigger map |
| Headless stops walk on Hazel (6), John Demo (4), Jennifer Demo FP (4) | PASS | facts, About, photos, 360, On map, secured elevator note (Hazel stops 3–5), Skip sheet |
| Headless demo Unlock variants (dummy property) | PASS | BLE / PIN / Remote / Gate on three stops, actions, Try another method |
| Headless booking on Oeuvre 229 (write) | PASS | bookings 25525 (self-tour, then moved to guided) in `schedual_tours`, listed by `Visitors::Query` |
| Real igloohome PIN issuance | NOT RUN | would call the vendor on a customer lock; the UI path verified with a mocked answer on demo data |
| Bluetooth unlock on a device | BLOCKED | no device / enrolled lock this session (unchanged since Oct 20) |
| Avoid stairs on a cross-floor segment | NOT RE-RUN | the first segments of the test tours stay on one floor; covered by the Oct 18 QA |
| iOS build | NOT RUN | the owner's uncommitted iOS project changes were left alone |
| Design pixel comparison | PARTIAL | Unlock BLE / PIN compared against the design canvas; the rest against the read templates |

## Representative properties (audit clone)

| Property | Plates | Hallways | Stops | Elevators / locks | Scheduling | Result |
|---|---|---|---|---|---|---|
| Hazel 1618 | 31 raster, 0 SVG | 232 | 6 (floors 1/10/15/31) | 5 elevators (Zerv), igloohome v1 on 1508, Zerv on the lobby and gym | self-tour only, Funnel-managed | full flow; v1 lock honest in the browser |
| John Demo 1411 | 6 SVG | 152 | 5 (Business Center unplotted) | 6 elevators, none locked | self + guided, Yardi | full flow after the unplotted-stop fix |
| Jennifer Demo FP 1412 | 6 (3 SVG) | 9 | 9 | 1 elevator | widget off | Build complete; route reaches the 4 Floor-2 amenities only (no vertical link from the SVG plate), reported to the visitor |
| Cypress Terra 8005 | 3 SVG | 0 | 0 | 0 | Knock, bookable, no phone | plates render; nothing to tour. The clone holds no hallways, tour stops, elevators or wayfinding rows for 8005 (`pynwheel_development` has no 8005 at all; the local `pynwheel_prod` read was refused by the auto-mode classifier). If the routes were made on another database, point the Rails server at it and re-run `pw/run.mjs build --property 8005`. |
| Oeuvre 229 | — | — | — | — | self + guided, widget live | bookings written |

## Remaining work

- Live vendor checks still need hardware and a partner-enrolled lock (Bluetooth), or the owner's go-ahead to issue a
  real PIN on Hazel 1604 / 1508.
- Cypress Terra: no graph on the clone (above).
- Remote-unlock and gate integrations do not exist in the backend; the UI states so and demo mode shows the design.
- Report an issue has no endpoint; elevator readers have no unlock operation; `Extend access` is local.
- Lease-term pricing and deposits appear only where the CMS publishes them (none of the four test properties).
- `$1/mo` on Hazel 1508 is the clone's `effective_rent`; the app shows the data as published.
- The 45-minute door-access window and the check-in remain local simulations (marked `*`).
- Design pixel comparison beyond the Unlock artboards was done against the read templates, not screenshots.
