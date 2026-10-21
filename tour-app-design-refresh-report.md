# Self Tour App design refresh — final report (October 17, 2026)

Brief: `app_ui_redesign_17_oct.md`. Design: Claude Design project `13d18a36-ed41-492e-b118-e69e26e4636a`, file
**"Pynwheel Self Tour App.dc.html"** (October 16, 22:40 version), `UnlockScreen.dc.html`, the Pynwheel design system.
Branch `feature/self-tour-app-design-refresh` from `main` (`cf51ffec8`) in the worktree
`.claude/worktrees/self-tour-app-design-refresh`. Nothing committed or pushed.
Details: `tour-app-implementation.md` §19; knowledge: `context.md` §36; progress: `PYN_CONNECT_PROGRESS.md` §41.

## A. Design coverage

Implemented from the artifact (every screen, sheet and tweak that the live file exposes):

- Splash (kept), Onboarding (3 slides), Get Started (email + password → profile confirmation → Home; Continue as Guest).
- Home — member (location row, tour-status card in its seven variants, property card, links card, how it works) and guest
  (nearby listings, guest card, find-a-property rows).
- Schedule Self-Tour and confirmation; Verify Identity (intro · scan · selfie · card · done).
- Check-in sheet (ready · verify · away · active · uncertain · pending · early), Before You Start (one or several starting points),
  Return to Start.
- Build Your Tour (List + map · Map + cards · List / Map tabs · List / Map switch), Add Stops sheet, stop preview overlay.
- Guided Navigation (zone pill, Directions, Avoid stairs, audio guide, Play Route, I've Arrived, skip, safety bar with SOS / Report).
- Stop (units and amenities): lock card, facts, floor plan, photos, narration, reactions, actions, AI concierge, lease pricing and
  move-in estimate, Next Stop / Skip; Skip sheet; Gallery; 360.
- Tour Complete (survey), Tour Summary (recap, best match, favourites, compare, highlights, follow-up, share, second visit).
- Properties (real list) and Explore (real listing or demo community); Profile (member / guest), Saved units, Tour passes,
  Tour History, Notifications, Settings with Demo scenarios.
- Sheets: Help, Itinerary, Add stop, Note, Video, Book, AI chat (agent / offline / mic), Apply (details / hold), Share, Call,
  Chat options, Location, QR, Tour link, Guest gate, Upcoming list, Add units, Preview, SOS, Report.
- All seven Tweaks (tour status, location, ID verified, agent online, upcoming tours, starting points, Build layout) as runtime
  demo scenarios; every one of their values was walked in the browser.

Kept from the current app because the design keeps them: Find Shortest Path (Wayfinding), the AR flow, Play Route, the lock flows.
Not accessible / not reproduced: nothing in the live file was inaccessible. Deliberate deviations: a real listing's Explore hero is
the generic site plan (the listing payload has no image); a lock the app cannot open shows a "Staff-assisted door" strip instead of
the design's generic unlocked strip.

## B. Self Tour App changes

22 files modified (+3,719 / −1,802) and 16 added, all under `tour-app/src/` (plus the four docs and this report).

- Screens: `OnboardingScreen`, `GetStartedScreen` (new, replaces `LoginScreen`), `HomeScreen`, `ScheduleScreen` (new),
  `VerifyScreen` (new), `TourStartScreens` (new), `BuildTourScreen`, `GuidedScreen`, `StopScreen` (new, replaces `StopScreens`),
  `SummaryScreens`, `SearchScreen` (+ `ExploreScreen`), `ProfileScreen`; sheets `FlowSheets` (new), `AccountSheets`, `TourSheets`.
- Shell and store: `App.tsx`, `navigation/screens.ts`, `store/appState.ts` (`STATE_VERSION` 2), `reducer.ts`, `useAppActions.ts`,
  `store/scenarios.ts` (new) + tests, `store/views.ts` (new), `content/appCopy.ts`, `content/demoFixtures.ts` (new).
- Theme: `styles/refresh.css` (new, 5,647 lines on the `--pw-*` tokens, Manrope, `#0077AE`, the design's radii and shadows);
  `styles/screens.css` trimmed of the eight replaced blocks; `components/ui2.tsx` (new primitives), `ui.tsx` (Button height),
  `Icon.tsx` (+23 icons); `map/MapView.tsx` (`pins`, `focusNode`).
- Responsive: every screen is built for the phone frame (safe-area padding, sticky footers, bottom sheets with scroll locks,
  horizontal card rails, truncation for long names); verified at 375×812 and in a 390×844 headless mobile context.

## C. Original assets reused

| Asset | Source | Used in |
|---|---|---|
| `tour-app/src/assets/images/onboard-home.png`, `onboard-wayfinding.png`, `onboard-access.png` | legacy app `img_slide1..3` (748×700) | the three onboarding slides (instead of the artifact's stock photos) |
| `tour-app/src/assets/images/checkpointid.png` | legacy CheckpointID wordmark | Verify Identity (on a blue badge; the glyphs are white) |
| `logo.png` / Pynwheel Tour wordmark, site-plan hero, community photo | already in `tour-app/src/assets/images/` | splash, Get Started, Home and Explore fallbacks |

No image was generated; real property plans and photos come from the API as before.

## D. Existing functionality preserved

- Login / logout and session restore (`POST /auth/login`, bearer token), the property list and search (803 properties on the dev DB).
- Build Your Tour on real stops with real distances (`POST /stops/distances`); the real route (`POST /tour-route`) drives Guided
  Navigation, its Directions and Play Route; the SVG / image plans, pins, zoom, floor changes and prefetch are the existing `MapView`
  and `useSimulationPlayer`; `src/wayfinding` is untouched.
- The lock card (`LockAccess.tsx`, unchanged): door code, Bluetooth, unsupported vendors — rendered inside the new Stop screen.
- Find Shortest Path and the AR flow are unchanged and re-verified.
- Repositories, parsers, API client, Capacitor config and the native projects were not modified.

## E. UI-only additions (local state or demo data, nothing persisted on a server)

Guest mode and the guest gate; the local schedule (`scheduledTour`) and its confirmation; Verify Identity; check-in, the 45-minute
door-access window and tour passes; starting-point choice; reactions, photos, favourites, compare, notes, survey; lease-term pricing,
move-in estimate, apply / hold; AI chat and the agent / offline modes; notifications; the Demo scenarios panel. Each is marked `*` in
the UI where it is not backend data; no new API call, no fake success response, no claim of a server save.

## F. Testing

| Check | Result |
|---|---|
| `npm run typecheck` (tsc) | clean |
| `npm run test` (vitest) | 10 files, 62 tests passed (9 new scenario tests) |
| `vite build` | clean (index chunk 573.75 kB, gzip 169.46 kB) |
| Browser, dummy data (Vite :3015, pane 375×812) | every screen and sheet; 7 tour-status + 7 location scenarios; agent online; multiple upcoming tours; multiple starting points; 4 Build layouts; Properties / Explore; guest mode; Wayfinding; AR |
| Browser, real API (Vite :3014 → Rails :3000 on `pynwheel_development`, headless Playwright, verification Super Admin) | sign-in, properties, Explore, Schedule, Today card, check-in (away / ready), virtual and in-person tours on Hazel 1618 (7 real stops, real plan, route, Guided, Play Route, Zerv lobby, igloohome unit 1508 with the Get Door Code card, Skip sheet); Arbour Place 1601 (no-plan state). 0 console errors; only existing endpoints |
| Not run | iOS / Android builds; the live door-code request (deliberately not pressed); Bluetooth hardware |

Screenshots of the headless real-API runs: `<scratchpad>/real/*.png` and `<scratchpad>/real/inperson/*.png` (67 frames) with `log.md`.

## G. Git status

- Branch `feature/self-tour-app-design-refresh`, base `main` at `cf51ffec8` (merge of PR #30), worktree
  `.claude/worktrees/self-tour-app-design-refresh`. The main checkout (`feature/tour-setup-stops-locks-visitors-booking`) was not touched.
- Working tree: 22 modified + 2 deleted (`LoginScreen.tsx`, `StopScreens.tsx`, staged) + 16 new files under `tour-app/src/`;
  docs `tour-app-implementation.md`, `tour-app/README.md`, `context.md`, `PYN_CONNECT_PROGRESS.md` appended; this report.
- Nothing committed or pushed. Git-ignored helpers copied into the worktree to run Rails from it: `.ruby-version`, `.bundle/config`,
  `config/application.yml`; the `gems` symlink was removed again (recreate with `ln -s ../../gems gems` if Rails is restarted here).

## H. Remaining issues

- Device builds not run; the Capacitor projects are untouched, so `npm run cap:sync` should carry the new bundle unchanged.
- The real igloohome code request was not issued during this pass (it would create a live vendor code); the card and flow are the
  October 16 implementation, unchanged.
- A real listing's Explore has no photo from the API; the design shows one.
- Chat with an agent, booking, apply / hold, verification, survey and share remain local until the CMS exposes endpoints.
- The dev-only verification account's password lives in the session scratchpad; the browser pane could not be signed in with it
  (the auto-mode classifier refuses to read it), so the real-API pass is headless; the owner can sign in on the :3014 pane tab to
  drive it by hand.

## I. Final platform QA pass (October 18, 2026)

Every screen and sheet listed in §A was walked again in headless Chrome on real Hazel data (virtual and in-person
journeys, all seven Demo scenarios present and switchable, 0 console errors). One critical defect was found in the
redesign: the Stop screen's lock card disappeared as soon as a door code was issued (§B "unified Stop screen"); fixed.
Simulated copy that is still unmarked on real properties: the location line ("You're 0.3 mi from …"), the 45-minute door
access text, the saved-units count, the chat sheet's office hours. The live Claude Design file could not be opened from
this session (sign-in wall), so the comparison used this report and the brief. Details:
`FINAL_PLATFORM_QA_REPORT_2026-10-17.md` §15–§16, §24–§25.

## J. The Start Tour experience on the live design (October 21, 2026)

The live design was read this time (sign-in in the browser pane, then the design service's `GetFile` RPC). The seven Tweaks of §A are
unchanged; the Unlock component's `Demo · Method` (BLE · PIN · Remote · Gate) became `UnlockPanel.tsx` with `state.demoMethod` on demo
data only. What changed on the screens of §B and what was verified: `SELF_TOUR_START_EXPERIENCE_QA.md`. The simulated copy still
unmarked on real properties listed in §I is now marked or real: the access-window line carries `*`, the leasing phone is the
property's own, the 360° view and photos are the CMS's.
