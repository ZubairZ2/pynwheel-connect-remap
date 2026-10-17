# Final Pynwheel Platform QA Report

Dates: October 17–18, 2026. Scope: the October 14–17 work (PRs #26, #28, #29, #30, #31, #32 and the upstream
auto-plotting merge `2abe79004`) as integrated on `main` at `e86a28024`. Fixes and new tests live on the branch
`qa/final-platform-regression-2026-10-17` (uncommitted at the time of writing; the owner decides on commits and the PR).

## 1. Executive Summary

**Decision: NOT READY FOR PRODUCTION** for `main` at `e86a28024`.

- The integrated code has a **critical authorization bypass** in the new Connect Tour Setup endpoints: any signed-in CMS
  user could read another company's visitors (names, emails, phones), lock inventory, stops and settings, and reach the
  write actions, by appending `.html` / `.xml` / `.js` to the URL (the guards were keyed on the JSON format while the
  routes accept a format suffix). Reproduced on the clone with a company admin of company 44 against Hazel (company 596);
  fixed in `Connect::BaseController` with nine regression tests. The fix is on the QA branch, not on `main`.
- The redesigned Self Tour App **hid the door code the moment it was issued** (the lock card rendered only while the
  stop was still locked), so a visitor could never read or renew a code. Fixed in `StopScreen.tsx` and verified in the
  browser with a mocked code response.
- Three Connect hooks **re-requested a failed module read forever** (Overview, Settings/Visitors booking read, the
  Stops drawer's lock inventory). Fixed and verified by blocking the backend route: one request, then a Retry.
- Two **query storms**: the visitors list cost 500 queries for 25 rows and a week of booking availability 1,872 queries
  (1.5 s). Now 13 and 25 queries; the rewritten availability matches the legacy per-slot rule on 2,792 slots with zero
  mismatches.
- The legacy Elevators page **500s on an elevator without a photo** (the kind Connect's Map & Plotting creates); fixed in
  the legacy partial and re-verified on the clone.
- Six smaller Self Tour App defects fixed (stuck cancel, "Applied online" after a failed application, a stop's answer
  clearing another stop's request, the verified badge surviving sign-out, the Bluetooth key printed by the bridge log,
  a repeat booking re-enabling SMS for an opted-out visitor on the Connect side).
- **Not validated and still blocking for their features:** igloohome v1 Bluetooth on hardware (no phone, no lock
  enrolled under Pynwheel's partner account), the iOS plugin (not wired into the app's Swift package; Swift package
  resolution unproven; `NSBluetoothAlwaysUsageDescription` missing), and the live Claude Design artifacts (behind a
  sign-in wall in both browsers available to this session; compared against the briefs and the Oct 17 reports instead).
- Production was read only. Every production query ran inside `BEGIN READ ONLY … ROLLBACK` as the role
  `readonly-debug`, whose INSERT/UPDATE privileges are false; no production row, object or configuration changed.

With the QA branch merged, the Connect CMS modules and the Self Tour App's door-code (v2/v3) flows are in a state fit
for a staging release; the Bluetooth (v1) flow and iOS must stay behind the honest "cannot open from this build" state
until hardware and platform validation happen.

## 2. Commit / PR Scope Verified

| PR / commit | Work | Verified on this checkout |
|---|---|---|
| upstream `2abe79004` | three `svgAutoPlotting.js` fixes (exact-match tiers before fuzzy, claimed polygons, number-suffix matching, the "no match" error) | Diff reviewed; production shows 8005's 333/339 units plotted on Oct 17 (the clone carries the same pointer data); the legacy auto-plot page renders for all five properties (harness `automate_plotting`, `shortest_path.json` 200) |
| PR #26 (`d5d92632c`, `0f3256b27`) | Igloo PIN: `lock` on stops, `POST locks/pin`, token renewal | Rails `test/controllers/api/tour_app` green (71 runs in the module set); the in-person run shows the card; the mocked-code run shows the issued code (after the fix in §24) |
| PR #28 (`65cf060f6`…`080135086`) | Bluetooth plugin, `bluetooth-key` endpoint | Plugin JVM tests 4/4, debug APK built and inspected; web/iOS answer the honest unavailable state; hardware BLOCKED (§18) |
| PR #29 | `pyn-tour-old/` on main | Present and untouched; the legacy app's build recipes are documented in `tour-app-igloo-integration.md` |
| PR #30 (`b7b2ced89`) | CMS redesign | 41-page headless audit, 0 page errors, 0 non-GET requests; demo surfaces isolated (§7) |
| PR #31 (`89dda9ace`, `20aa23ae1`, `8fdcff8c4`) | Tour Setup modules backend + frontend | Every module read and write exercised on the clone (§9–§14); the authorization bypass found and fixed |
| PR #32 (`bd8c85667`) | Self Tour App redesign | Full virtual and in-person journeys on real Hazel data; all seven demo scenarios present; the door-code defect found and fixed (§15–§17) |

No migration was added by the October 14–17 work: `db/schema.rb` is at `2026_10_03_100011`, the latest migration file is
`20261003100011_add_plotting_indexes.rb`, and production's `schema_migrations` max is `20261003100011`.

## 3. Environment and Branch

- Repository `main` at `e86a28024`; QA branch `qa/final-platform-regression-2026-10-17` created from it. The owner's
  uncommitted files (`tour-app/ios/App/App.xcodeproj/project.pbxproj`, `Info.plist`, `app/.DS_Store`, the untracked
  design HTML files and `db_compat_audit/`) were left as found.
- Rails 7.2 on Ruby 3.3.5 (RVM), Node 26.8.2, Next 15.5, Vite/Capacitor 8, Xcode 27, Android SDK 36 with JDK 21.
- Verify pair: Rails on `:3100` against the local clone `pynwheel_audit_clone` with `PYN_CONNECT_WRITES=on
  API_ACCESS=true` (confirmed through `pg_stat_activity`: the only `bin/rails` connection is on that database),
  Connect `next dev` on `:3005` from the working tree (`PYNWHEEL_CMS_URL=http://127.0.0.1:3100`), the Self Tour App
  Vite server on `:3012` with `VITE_TOUR_API_URL=http://127.0.0.1:3100`. Rails tests ran on `pynwheel_test`.
- Signed-in sessions were minted with `rails runner` (Devise cookie) for the clone's super admin (user 2181) and, for the
  authorization tests, a company admin of company 44 (user 1966). The Self Tour App signed in with a throwaway password
  set on clone user 2181 (stored only in the session scratchpad; the original hash could not be restored because the
  first session's scratchpad was emptied by a crash — see §27).
- Local development is a fresh checkout of the Oct 17 docs: the `.claude/launch.json` entries `connect-design-verify`
  and `tour-app` were used for the two browser-served apps; Rails ran from a background shell.

## 4. Production Read-Only Access

- Connection: the documented `~/.pynwheel_ro_url` through a runner that reads the file, prepends
  `SET default_transaction_read_only = on; SET statement_timeout = '60s'; BEGIN READ ONLY;`, appends `ROLLBACK;` and
  redacts connection strings from the output. The URL was never printed.
- Verified on the server: `current_user = readonly-debug`, `transaction_read_only = on`,
  `has_table_privilege(current_user, 'communities', 'UPDATE') = false` and `INSERT = false`, `rolsuper/rolcreatedb =
  false`, database `d68qfab1s2ngoj` (Heroku Postgres 16.14), `schema_migrations` max `20261003100011`.
- Queries run (all read): identity and privileges; the Alliance company and its properties; counts and timestamps for
  818, 8005, 1618, 1411, 1412; floorplates, sitemaps, tours, tour stops, tour settings and community flags for the two
  Alliance properties; elevator image presence and the Hazel igloohome account/locks; and one `\copy … TO` export of
  the Alliance dependency set (§6). Nothing else touched production.

## 5. Alliance Property Discovery

Production, read on October 17, 2026:

| Field | 818 | 8005 |
|---|---|---|
| Name | Residences at Escaya | Cypress Terra |
| Company | 198 Alliance | 198 Alliance |
| Time zone | America/Los_Angeles | America/Chicago |
| Floorplates (with SVG) | 0 (0) | 3 (3, `*_noBG.svg` Beans plates) |
| Sitemap | 1 PNG | 1 PNG |
| Units (plotted) | 275 (0) | 339 (333, plotted Oct 17 2026) |
| Amenities / floorplans | 8 / 32 | 0 / 12 |
| Tour / stops | 133 "Start Here - Check-in" / 6 plotted on the sitemap | 5926 / 0 |
| Hallways / elevators / entry points / doors | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Lock providers | none | none |
| Bookings / visitors / visits | 0 / 0 / 0 | 0 / 0 / 0 |
| Opening hours (self / guided) | 6 / 0 | 6 / 6 |
| Scheduler widget | off; scheduler disabled | live; Knock-managed availability (RealPage data provider) |
| Last change | 2026-06-26 | 2026-10-17 12:02 (units and the community row) |

Exactly two Alliance properties exist, so both were tested. Neither has hallway graphs, locks, bookings or visitors in
production, so route, lock, visitor and booking behaviour on Alliance data is limited to the empty and "connect a
provider" states; those states were verified, and the full flows were exercised on Hazel 1618, John Demo 1411 and
Jennifer Demo FP 1412 (§19).

## 6. Alliance Data Replication and Consistency

- Destination: `pynwheel_audit_clone` (a migrated production clone taken on October 7, 2026; no application or process
  was connected to it; the Heroku apps use their own databases). The user's own `pynwheel_prod` copy was not touched.
- Recovery point: a `\copy` export of the clone's current rows for the same 46 tables was taken before the import.
  (That export was lost with the first session's scratchpad after a network crash; the import had already been verified
  identical to production, so the clone's Alliance rows are the production rows.)
- Dependency closure (46 tables, column lists taken from the clone's `information_schema`): communities,
  sub_communities, community_users, floorplates, sitemaps, floorplans, units, unit_space_details, neighbour_units,
  unit_elevators, amenities, amenity_galleries, galleries, gallery_images, tours, tour_stops, tour_settings,
  scheduler_widget_settings, stop_details, stop_galleries, opening_hours, guided_opening_hours, crm_discovery_sources,
  crm_time_slots, doors, elevators, building_starting_points, hallways, hallway_edges, hallway_suppressions,
  hallway_attachments, hallway_detection_runs, wayfinding_stops, maps_positions, map_filters, neighborhoods, igloohomes,
  zervs, latches, dwelos, edge_states, schedual_tours, tour_histories, favorite_settings, bedroom_marker_colors,
  three_d_maps_configurations. Excluded on purpose: `credentials`, `crm_credentials` (secrets; the clone keeps its Oct 7
  copies), `prospects`, logs, `versions`, `users`. Vendor secret columns were nulled in the export (none existed for
  Alliance).
- Import: staging schema `prodsync` + `INSERT … ON CONFLICT (id) DO UPDATE`; sequences bumped; 0 local-only rows found;
  after the import every one of the 46 re-exported clone tables was byte-identical to the production export (791 CSV
  lines, 614 unit rows). Deltas applied relative to the Oct 7 clone: 8005 units (availability feed fields and
  `floor_is_updated`; pointer data unchanged), 8005 community `data_provider_updated_on`, tour 5926 `sort_hash`, 44
  floorplan rows; nothing for 818. The staging schema was dropped afterwards.
- Assets: the sitemap PNGs and the three 8005 SVG plates resolve from S3 through the existing `plan-svg` proxy and
  `standard_image_url` copies (the Map & Plotting pages render; one transient 502 during the owner's network outage was
  re-requested and answered 200, 1.4 MB for plate 3638).
- Named properties, clone versus production (read October 17): 1412 identical; 1618 carries 32 tour stops / 232
  hallways / 5 elevators against 31 / 220 / 4 in production (earlier local Connect test writes; two of the extra
  elevators have no photo) and 528 bookings against 533; 1411 carries 73 / 152 / 6 against 69 / 149 / 2 and 29 bookings
  against 30. These deltas were left in place and are the reason the legacy Elevators page could be shown to crash.
- Test residue left in the clone, deliberately: PaperTrail audit rows for the Connect writes below; 818 `opening_hours`
  recreated with new ids (content identical); `tours.tour_setup_version` 3 on 133 and 1 on 5926 (version bumps);
  user 2181's throwaway password. Removed: the QA visitor, its bookings and versions; the five entry points and tour
  stops the legacy `tours/building_starting_point` GET created during the first harness run; the `prodsync` schema.

## 7. CMS Design and Navigation QA

Headless Chrome (1440×960 and 390×844) over 41 pages with a minted super-admin session, twice (the first pass ran during
the owner's network outage, the five pages that timed out on S3 images were re-run and passed):

- 0 page errors, 0 console errors from the app (the only console lines were Next's `<Image>` width/height warning on
  the Connect logo at phone width, and S3 fetches that failed during the outage), **0 non-GET requests** on every page.
- Navigation: sidebar groups, Launch Board (`/launch-board`, marked "Placeholder data"), Companies with the Add Company
  dialog ("Companies are created in the legacy CMS … nothing is created from here"), Properties, Company 198, the
  property pages (Property, Tour Setup with every tab, Touch and Map setup, Integrations Hub\*, Live Chat\*, Map &
  Plotting), the legacy URLs `/scheduling` and `/integrations` (still routable, marked demo), `?tab=bogus` (opens
  Overview), a non-existent property id (a "Property not found" panel with Back to Properties, on the property page and
  on Tour Setup).
- Demo isolation: Launch Board, Add Company/Property, the profile menu, the Embed Map dialog and the property-scoped
  demo pages make no network call and carry the asterisk / "not available in Connect yet" wording. One gap: the
  `/properties/:id/pricing` page is the only property page not wrapped in the demo frame (it shows "No demo property
  with the id" for a real id, no breadcrumb) — not fixed, listed in §25.
- The live Claude Design artifact (project `13d18a36…`, the Back Office and Self Tour App files) answers a sign-in wall
  from this session's browsers; the September exports in `~/Downloads` predate the Oct 13/16 designs. The visual pass
  therefore compares the screens with the briefs (`new_app_design_17_oct.md`, `app_ui_redesign_17_oct.md`) and the
  Oct 17 reports, not with the live file. No pixel-level claim is made.

## 8. Property Details QA

Property Detail rendered for 818, 8005, 1618, 1411 and 1412 from `communities#edit.json` (real values, Manage grid,
product cards, Entry QR Codes "Managed in the legacy CMS", Embed Map dialog disabled with its note). Property switching
re-mounts the page in the App Router, so no state leaks between properties (the Tour Setup tabs for each property showed
their own counts: 818 six stops / no locks, 8005 no stops / no locks, Hazel 11 stops / locks, John Demo 10 stops).

## 9. Tour Setup Overview QA

Overview KPIs are the three module reads (visitors today, lock inventory, stop rows). On 818: six stops, all on the
tour, six needing attention (no directions), no locks, no visitors; on 8005: "No stops configured yet"; on Hazel: 11
stops, locks, visitors from the real rows. Defect fixed: when one of the three reads failed the hook re-ran all three
forever; it now loads once per property and the failed note stays until Reload (§24, verified by blocking the locks
route: 1 request, none in the following 8 s).

## 10. Stops QA

- List and filters on 818 (six stops in one group, numbering, attention filter count 6), 8005 (empty state), Hazel (11
  stops, three with issues), John Demo (10 stops). The route preview rendered 818's sitemap with the six pins and "No
  hallway paths on this floor yet", Hazel's floor plan with hallway paths; the shortest-path test on Hazel (first
  session) answered a one-leg route on Floor 1.
- Drawer content write on 818 (amenity 4938 "Handle Bar"): `PUT connect/stops/193 {instructions}` wrote
  `amenities.directional_text`, bumped `tours.tour_setup_version`, wrote a PaperTrail `stop_content_save` version with
  the user id, the reload showed the text and cleared the `no_instructions` issue; the revert (blank) stored NULL again.
- Order, visibility, add and remove still go through the page's Save (`TourSetup::Save`, one transaction with the
  version check) — unchanged since Oct 4 and covered by the real-data Playwright spec.
- Open findings (not fixed): an unsaved drawer draft is discarded when a lock write or Retry reloads the rows; a tour
  whose stop record is missing from the map opens with "Save (1 change)" enabled; the shortest-path test sends the
  previewed plate's lowest floor for floor-less endpoints on stacked plates where Rails would otherwise ask for the floor
  (§25).

## 11. Locks and Provider Integration QA

- Providers and inventory on Hazel (igloohome v1 "Hazel", 4 keyboxes on doors 1390/1418/1489/1474 — the same four
  devices and doors production holds; Zerv facility, 6 locks; 61 locked holders without a lock). Alliance 818 and 8005:
  "connect a provider" state with the seven and one targets listed.
- Unmap `SK3E02552775` → inventory 9 mapped / 1 unmapped, `igloohome_locks.stop_*` NULL, `doors.lock_provider` cleared;
  map back to unit 1508 → the door (door-first rule) with provider and code set; `lock_map` / `lock_unmap` audit rows.
- Foreign target: mapping the Hazel device to a unit of 818 answered 404 "No such stop on this property." and changed
  nothing.
- Manual code on the Fitness Centre: the code went to the holder door, counts updated, the code was listed; clearing
  removed it; an invalid code answered 422 `invalid_code`. Observed and documented, not changed: a manual code on a
  holder that already carries a vendor device **releases that device** (the service's documented contract) — the Zerv
  lock on the Fitness Centre door was unmapped by the test and had to be mapped back. The Connect UI offers "manual"
  on such stops without a confirmation; recommended UX change in §25.
- No vendor call was made: sync/test/purge were not run against the clone's copied production accounts.
- The TourApi lock endpoints (`locks/pin`, `locks/bluetooth-key`) are gated by `enable_locks`, the stop list and the
  tour; they do not write an `IgloohomeGuest` audit row and do not check `multiple_locks_provider` (§25).

## 12. Visitors and Bookings QA

- Hazel: 277 rows, chips Upcoming 2 / Completed 115 / Missed 160 / Cancelled 0, search, date and type filters, pages
  of 25, the profile and the New booking dialog (first session); 1411 and 8005 lists; 818 and 8005 empty.
- Lifecycle on Jennifer Demo FP 1412 (no CRM, so no vendor push; mail through `letter_opener` with its browser launch
  disabled; SMS is a Sidekiq job and no worker runs here): staff booking for a synthetic visitor at Mon 10:00 →
  `schedual_tours` + `tour_users` rows (`created_by Staff`, property zone, SMS opt-out honoured, notifications
  `{email: true, sms: false, web: true}`); the list showed Upcoming 1; reschedule to 11:00 moved the row and rebuilt the
  reschedule notification; a closed day answered 422 `slot_unavailable`; a second booking for the same person reused the
  upcoming one (`rescheduled: true`, still one row); missing contact answered 422 `invalid_visitor`; cancel destroyed
  the row, left the PaperTrail `destroy` version, and the list showed Cancelled 1; cancelling a Hazel booking id through
  1412 answered 404 and left the Hazel row intact.
- Defect fixed: the repeat booking without `is_sms_enabled` flipped the opted-out visitor back to opted in (and would
  have queued an SMS). `Bookings::Create` now keeps an existing visitor's choice; test added; re-verified live.
- Mobile-generated records: the Self Tour App signs in as a CMS super admin and has no TourUser, so it creates no
  booking or visit rows (by design since Oct 7); the Visitors module therefore shows only legacy-app and CMS records.
  Reading and refreshing the Visitors page created no rows (0 non-GET requests on every read; `impressions` logging
  belongs to the legacy mobile API only).
- CSV export: the signed-in route answers the filtered rows; the search text travels in its query string (§25).

## 13. Scheduling QA

- Tour types & slots on 818: grace 10 → 15 (persisted on `tours.grace_period`, reload showed 15), 5 refused with
  "the grace period is 10 to 60 minutes", reverted to 10; audit `booking_rules_save` rows.
- Visiting hours on 818: the self lane re-saved unchanged (rows recreated as the legacy form does, guided lane
  untouched), overlapping ranges 422 `overlap`, closing before opening and `9am` 422 `invalid` with paths; audit
  `visiting_hours_save`.
- Availability: Hazel (Funnel-managed, 1-hour slots), 1412 (15-minute slots 07:00–22:45, Sunday closed), 1411, 818,
  8005 all answer the 7- and 31-day grids. The rewritten computation (hours and capacity resolved once per request)
  matches the legacy per-slot rule on 2,792 slots over 14 days for the five properties with 0 mismatches
  (`availability_parity.rb`).
- Time zones: the property zone is used for "now", the slot comparison and the stored clock values (unchanged legacy
  semantics, confirmed by the parity run and the booking rows' `user_time_zone`).

## 14. Booking Form and Booking Link QA

- Booking form on 818: button text and colour written to `scheduler_widget_settings` and read back; `blue` refused
  (`the colour is a #rrggbb value`); restored to the original "Schedule a Visit" / `#20a345`.
- Booking link: the panel needs the CMS's `HOST_URL`; none is configured locally, so it says so and disables copy/open
  instead of building a wrong URL (unchanged from the Oct 17 report). The public booking submission through the signed
  link was therefore not exercised here; the backend path it uses (`Bookings::Create` through the widget rules) is the
  one exercised in §12.
- CRM & Sync: read-only by decision; nothing new claimed.

## 15. Self Tour App Design QA

Headless Chrome, 390×844 mobile context, real API on the clone, signed in as the verification super admin:

- Onboarding (three slides, Skip / Next), Get Started (email + password, Continue as Guest), profile confirmation,
  Properties (real list with search), Explore (Hazel with Schedule a Self-Tour / Book a Live Tour, demo hours line
  marked \*), Schedule Self-Tour (date rail, slots, length, party, channel, confirmation with Add to calendar /
  directions / Verify / Back To Home), Home (location row, Upcoming\* and Today's tour\* cards, Start Tour / Continue
  Tour, Upcoming tours sheet with Virtual tour / Verify / QR / Running late / Reschedule / Cancel), check-in sheets
  (away, needs-verification, ready), Before You Start (starting point, help), Build Your Tour (list + map, real stops
  grouped by floor with real px distances, Add Stops), Guided Navigation (real plan, route, Replay/skip controls,
  Directions, Avoid stairs, Pause guide, I've Arrived, Skip, safety bar with Leasing / SOS / Report and the 45-minute
  countdown), Stop screens (unit and amenity: facts, plan, photos, narration\*, reactions, concierge, lease pricing\*,
  move-in estimate\*, Next Stop / Skip), Tour Complete (survey\*), Tour Summary, Profile (journey, verification, saved
  units, passes, history, notifications, Settings with Demo scenarios\*). 0 console errors and 0 page errors in every
  run.
- The seven design tweaks are present under Settings › Demo scenarios (tour status with eight values, location with
  seven, ID verification, chat agent, upcoming tours list, starting points, four Build layouts). Tour status "Today",
  location "At property" and ID verified were switched on to drive the in-person path; they changed only the phone's
  state (the API calls stayed the existing seven to nine reads).
- Unmarked simulated copy on real properties (review finding, not changed): "You're 0.3 mi from Hazel" / "You're at
  Hazel" (no geolocation exists), "Door access is active for 45 minutes", the saved-units count including two demo
  rows, the chat sheet's office hours (§25).

## 16. Real-Data Tour Flow QA

Hazel 1618 on the clone (31 floor plates, 6 default stops):

```text
Sign in → Properties (search "Hazel") → Explore → Schedule (Sun 10:00) → Home (Upcoming*) → View Tour Details
→ Take a Virtual Tour → Before You Start (Main Entrance, 1 · Floor 1) → Build Your Tour (Fitness Centre, The Lobby,
1001, 1508, Penthouse North Lounge, Penthouse West Lounge; real px distances) → Let's go! → Guided (Stop 1 of 6,
1,032 px, Directions) → Play Route (Replay, walker on the plan) → I've Arrived ×6 with floor changes 1 → 10 → 15 → 31
→ Avoid stairs re-route → Finish Tour → Tour Complete (survey) → View Tour Summary
```

Every step passed in two independent runs (29 steps, 0 console errors, 9 API calls: login, properties, property,
stops, distances, tour-route twice, graph/levels). The in-person variant (scenario "Today" + "At property" + verified)
ran Start Tour → Start In-Person Tour → Before You Start → Build → Guided → stops 1–4 with the 45-minute access
countdown, and reached unit 1508's lock card. Arbour Place-style "no plan" states and the AR flow were covered by the
Oct 17 report and not repeated.

## 17. Igloo PIN Integration QA

- Backend: `TourApi::Locks#describe/pin!` and the `locks_controller` are covered by the Rails suite (stop contract with
  `lock`, door-first rule, the exact igloohome and Iglooworks requests, vendor 401 / no-pin / outage → 502 without a
  trace, unsupported modes, gates); all green on this checkout.
- App: with Hazel's account in production's `v1` mode the stop reports `method: bluetooth` and the card shows the honest
  "opens over Bluetooth, which this build of the app cannot do" note. With the clone row switched to `igloohome` mode
  and the `POST …/locks/pin` answered in the browser by a mocked code (no backend or vendor call was made; the Rails log
  shows no `locks/pin` request), "Get Door Code" showed the code, "Valid until", the keypad instruction and "Not
  working? Get a new code", with "Code accepted — push the door to enter" and Next Stop enabled; the Hazel row was
  restored from its backup afterwards (v1, nil client fields, original timestamp).
- Defect fixed (critical): before the fix the card disappeared as soon as `lockPinReady` set the stop unlocked, so the
  code was never visible (§24).
- No real access code was issued during this QA (the vendor was never called).

## 18. Igloo Bluetooth Integration QA

- Code level: the plugin's state machine tests pass (JVM, 4/4), the plugin compiles against the vendor AAR, the debug
  APK (10.7 MB) carries `IgloohomeBlePlugin`, the SDK classes, `libnative-lib.so` for arm64-v8a and armeabi-v7a, and
  exactly INTERNET, VIBRATE, BLUETOOTH/BLUETOOTH_ADMIN (≤30), BLUETOOTH_SCAN (`neverForLocation`), BLUETOOTH_CONNECT,
  ACCESS_FINE_LOCATION (≤30). The `bluetooth-key` endpoint and `guest_access_for` are covered by the Rails suite.
- Review findings, not fixed (native code, cannot be exercised here): cancelling during connect/unlock never settles
  the JS promise (the stop stays "Connecting…" until relaunch); the 30-second Rx `timeout` on the connect observable
  tears a live connection down 30 s after it connected; backgrounding during a scan reports "not found" instead of
  cancelled (§25). Fixed in the JS layer: cancelling while the key is being fetched left the stop loading forever.
- **Hardware: BLOCKED.** No Android device was attached (`adb devices` empty), no booted simulator, and the only
  Bluetooth keybox available belongs to the owner's own igloohome account, not Pynwheel's partner account (the partner
  API answers 404 for it). Hazel's four keyboxes are partner-enrolled but are customer doors; no guest key was requested.
- **iOS: BLOCKED.** The plugin is not referenced by `ios/App/CapApp-SPM/Package.swift` (so the app answers
  `unavailable`, which is honest), `Info.plist` has no `NSBluetoothAlwaysUsageDescription`, the Swift plugin's scan
  timer runs on a queue without a run loop and its permission request resolves before the system prompt answers, and
  `swift package resolve` for the plugin package had not completed when this report was written (it was fetching the
  RxSwift / igloohome RxBluetoothKit / Nordic DFU packages). None of this is release-ready.

## 19. Auto-Plotting and Map Regression

- The upstream `svgAutoPlotting.js` change was reviewed line by line: exact tiers before fuzzy matching, each polygon
  claimed once, number-suffix matching only when unambiguous both ways, the digit guard on fuzzy matches, and the
  "Auto Plot couldn't match any unit names" error replacing a silent empty save. Production's 8005 shows 333 of 339
  units plotted on October 17 with this code (the clone carries the same values).
- Legacy Map & Plotting / auto-plot pages (`/automate_plotting`, `shortest_path.json`) rendered for all five
  properties through the in-process harness; the Connect Map & Plotting page rendered 8005 (Beans background + `noBG`
  plate through the proxy), 1411 (SVG plates) and 1412 (3638 "Floors 1-3" 1.4 MB SVG through the proxy; plate 5 has
  no SVG and answers 404 honestly).
- Hazel's stored hallway graph still routes (Connect shortest-path test, Tour App `tour-route` for six stops across
  four floors).

Property inventory matrix (clone, after the Alliance refresh; production values where they differ in brackets):

| Property | Id | Company | Plates (SVG) | Stops | Hallways | Elevators | Locks / providers | Bookings / histories | Scenarios run |
|---|---|---|---|---|---|---|---|---|---|
| Residences at Escaya | 818 | 198 Alliance | 0 (0) + sitemap | 6 | 0 | 0 | none | 0 / 0 | CMS all tabs, stops write, rules/hours/form writes, legacy pages, mobile API (422: no path data) |
| Cypress Terra | 8005 | 198 Alliance | 3 (3) + sitemap | 0 | 0 | 0 | none | 0 / 0 | CMS all tabs (empty states), Map & Plotting dual map, legacy pages, mobile API |
| Hazel | 1618 | 596 | 31 (0) | 32 [31] | 232 [220] | 5 [4] | igloohome v1 ×4, Zerv ×6 | 528 [533] / 408 [411] | CMS all tabs, lock map/unmap/manual, visitors, availability, Self Tour App full journeys, PIN card (mocked), legacy pages |
| John Demo | 1411 | 44 | 6 (6) + sitemap | 73 [69] | 152 [149] | 6 [2] | none | 29 [30] / 146 | CMS stops + map, visitors, availability, legacy pages, mobile API |
| Jennifer Demo FP | 1412 | 44 | 6 (3) + sitemap | 10 | 9 | 1 | Latch account rows (no live account) | 1 / 10 | CMS stops + map, booking lifecycle, availability, legacy pages, mobile API |

## 20. Legacy HTML/ERB Regression

In-process harness (Warden login, `ActionDispatch::Integration::Session`, query and write counters) on the clone:

- Run 2 (90 GET requests over the five properties): 81 × 200, 4 × 404 (`/communities/:id/sitemaps` has no index
  action), 4 × 500 — `/communities` (pre-existing: the page needs a company in the session, documented on Oct 7),
  `/communities/1618/elevators` and `/communities/1411/elevators` (the image-less elevators; **fixed**, run 3 answers
  200 for 1618, 1411 and 1412), `/communities/1412/tour_users/14458` (pre-existing: the legacy visitor view, unchanged
  since February 2025, raises "Nil location provided" for a visitor without images).
- Zero writes from any legacy page read except the legacy mobile `wayfinding.json`, whose two statements are its
  `impressions` request log (pre-existing). The legacy `tours/building_starting_point` GET creates an entry point and a
  tour stop on every visit (pre-existing write-on-GET; it was requested once by mistake in the first run and its ten
  rows were deleted).
- Pages covered per property: company property edit, tours index, tour settings, scheduler widget, select stops,
  starting point, visitors list and detail, bookings page and datatable JSON, elevators, units, amenities, auto-plot,
  shortest path, floorplates, legacy mobile wayfinding JSON.
- Slowest legacy page: Hazel's visitors list, 34 s and 2,308 queries (pre-existing N+1; the Connect list answers in
  0.3 s with 13 queries).
- The three legacy delegations (`TourUsersController` privacy actions, `ToursController#flag_id_mismatch`,
  `SchedualToursController#check_limit`) were compared with the removed inline code: `check_limit` and the notification
  bodies are textually identical; `flag_id_mismatch` used `update_attributes` (removed in Rails 6.1, so the old action
  raised) and now uses `update_attribute`; `hide_history!` deliberately hides the property's main-tour histories too
  (documented in the code).

## 21. API / Domain Logic / Data Integrity

- Property scoping of every id on the JSON path was traced (locks, stops, visitors, bookings, settings) and is
  correct; the format-suffix bypass was the one hole (fixed, §24).
- Error envelope `{data, meta, flash_messages, errors[]}` is consistent across the four controllers; 422 carries
  `path/code/message`; 404 / 403 / 502 as documented. Unexpected exceptions (a CRM push raising inside
  `SchedualTour#before_destroy`, a bad `hours` type) still answer a Rails 500 HTML page instead of the envelope (§25).
- Writes keep the real CSRF check (`403 csrf` with a wrong token, verified), the `PYN_CONNECT_WRITES` kill switch and
  `User#can_edit_map?` (`403 forbidden` for the foreign company admin, verified); every write leaves a PaperTrail row.
- Shared database integrity: no migration; the Connect writes use the legacy columns; counts for the Alliance set
  returned to the production values after the tests (818 six stops, six opening hours; 8005 zero stops).

## 22. Performance Results

Connect module reads on Rails `:3100` (development mode, clone), before and after the fixes:

| Read | Before | After |
|---|---|---|
| Hazel `visitors?status=all` (25 of 277 rows) | 462 ms, 500 queries | 299 ms, 13 queries |
| Hazel `booking/availability` 7 days | 1,502 ms, 1,872 queries | 99 ms, 25 queries |
| Hazel `booking/availability` 31 days | not measured (≈25k queries by the per-slot rule) | 111 ms, 49 queries |
| Hazel `stops` / `locks` / `booking` | 125 ms 39 q / 130 ms 59 q / 15 ms 14 q | unchanged |
| 818 `stops` / `locks` / `visitors` / `booking` | 592 ms 29 q (cold) / 79 ms 34 q / 79 ms 11 q / 113 ms 14 q | unchanged |
| 8005 `stops` / `locks` / `visitors` / `booking` | 9 ms 7 q / 26 ms 22 q / 20 ms 11 q / 33 ms 14 q | unchanged |

Availability parity run (14 days): Hazel 152 slots 1,824 → 25 queries; 8005 384 slots 4,608 → 24; 818 384 slots
4,608 → 24; John Demo 1,104 slots 13,248 → 26; Jennifer Demo FP 768 slots 9,216 → 24.

Page loads (headless, `next dev`, cold): dashboard 4.4 s, property detail 2.4–4.0 s, Tour Setup tabs 2.2–5.4 s,
Hazel Stops 10.9 s (31 plate images from S3), John Demo Stops 28 s and the Map & Plotting pages ~20 s settle (S3 SVG and
image fetches from this Mac). The Self Tour App journeys made 8–9 API calls each; frame rates were not measured
(headless).

Remaining hot spots (not changed): `Locks::Inventory` / `Stops::Rows` recompute their lists and load door parents per
stop (59 queries for Hazel's locks); `Visitors::Query#histories` is unbounded and unindexed by community; the visitor
profile rebuilds the whole list for one visitor (§25).

## 23. Tests Executed and Results

| Suite | Command | Result |
|---|---|---|
| Rails, full | `RAILS_ENV=test DATABASE_URL=…/pynwheel_test bundle exec rails test` | 266 runs, 1,368 assertions, 1 failure + 3 errors, 7 skips — all four in `PartnerConfigurationsControllerTest` (pre-existing; the Oct 17 baseline had the same four on 256 runs). 10 tests added (9 format guard, 1 SMS opt-out) |
| Rails, Connect + Tour App API | `rails test test/controllers/connect test/controllers/api/tour_app` | 111 runs, 824 assertions, 0 failures (after the backend fixes); visitors + booking: 18 runs, 150 assertions, 0 failures |
| Connect types / build | `tsc --noEmit`; `next build` | clean / compiled successfully (`.next` removed afterwards) |
| Connect Playwright, real data | `tourModules.spec`, `tourSetup.spec` against `:3005` + `:3100` | 7 passed, every test ending on "only GETs" |
| Connect Playwright, demo screens | `routes`, `screens`, `interactions`, `listingSearch`, `listingsAndInventory` | 101 passed, 3 failed; re-run of `listingsAndInventory` alone: 6 passed, 2 failed — both search the dev-database name "John Pynwheel" (the clone and production call 1411 "John Demo"), a data expectation, not a regression |
| Self Tour App | `tsc`, `vitest run`, `vite build` | clean; 68 tests in 11 files (6 new); built (574 kB index chunk) |
| Android | `vite build && cap sync android && gradlew :pynwheel-igloohome-ble:testDebugUnitTest assembleDebug` | plugin tests 4/4; `app-debug.apk` 10.7 MB; manifest, native libs and dex contents verified |
| iOS | `swift package resolve` on the plugin package | not completed at report time (see §25) |
| Legacy harness | `legacy_regress.rb` on the clone | 90 requests, see §20 |
| Availability parity | `availability_parity.rb` | 2,792 slots, 0 mismatches |
| Refetch-loop check | `loopcheck.mjs` (blocks one module route, counts requests) | 1 request per failing read (2 on the drawer with Strict Mode), 0 in the following 8 s, Retry shown on Settings and the drawer |
| Authorization probe | `cq.sh` with a company admin of company 44 | before the fix: Hazel `visitors.html` 200 with contact data, `locks.html` 200, `visitors/export.html` 200, `stops.xml` 200; after: all 404, write `.html` 403 |
| Headless CMS audit | `shots.mjs` over 41 pages, then 5 re-runs | 0 page errors, 0 non-GET requests |
| Self Tour App runs | `tourrun.mjs` ×7 scripts | virtual journey 29/29 steps, in-person to the lock stop, mocked door code |

## 24. Defects Found and Fixes Applied

| # | Severity | Where | Defect | Fix and verification |
|---|---|---|---|---|
| 1 | Critical | `app/controllers/connect/base_controller.rb` | Read/write guards keyed on `request.format.json?`; routes keep `(.:format)`; `.html`/`.xml`/`.js` skipped scoping, CSRF, kill switch and `can_edit_map?` | `before_action :force_connect_json_format, prepend: true`; `connect_read?` / `connect_write?` ignore the format; actions in neither list answer 404. `test/controllers/connect/format_guard_test.rb` (9 tests); re-probed on the clone |
| 2 | Critical | `tour-app/src/screens/StopScreen.tsx` | `LockAccessCard` rendered only while the stop was locked; `lockPinReady` sets it unlocked, so the issued code was never shown and could not be renewed; a re-locked Bluetooth door could not be reopened | The card renders for every supported real lock, with "Your door code" / "Door unlocked" headings once open; the skip link only while locked. Verified with the mocked-code run |
| 3 | High | `useTourOverview.ts`, `useTourBooking.ts`, `useTourStops.ts`, `StopsTab.tsx` | A failed read re-ran the effect forever (three requests per iteration on Overview; the booking read on Visitors and Settings; the lock inventory in the drawer) | One attempt per property / an `error` guard / `inventoryError` with a Retry button. Verified with `loopcheck.mjs` |
| 4 | High | `visitors/status.rb`, `query.rb`, `profile.rb` | `community_tour` (a query) per booking status and per stay-limit read | Grace period and stay limit resolved once per query/profile and passed in. 500 → 13 queries |
| 5 | High | `bookings/availability.rb`, `schedual_tours/capacity.rb` | ~25 queries per slot (tour, setting, hours, four COUNTs) | Tour/setting/interval memoised; hours loaded once per lane; `Capacity::DayCounter` loads a day's bookings once and applies the widget's rule in Ruby (`limits_for`, same rule, same window incl. the midnight wrap); `check_limit` delegates. 1,872 → 25 queries; parity 2,792 slots / 0 mismatches |
| 6 | Medium | `app/views/elevators/_index.html.erb` | `image_tag elevator.image.url` and `elevator.image_url` raised for an elevator without a photo (Connect creates them); the legacy page answered 500 | Placeholder photo when no image (two sites). Harness run 3: 200 for 1618, 1411, 1412. A Rails test could not be added: legacy views do not render under the test environment (a pre-existing Sass `rgba` compile error) |
| 7 | Medium | `app/services/bookings/create.rb` | A repeat booking without `is_sms_enabled` reset an opted-out visitor to opted in and queued an SMS | Keep the existing visitor's choice; only a new visitor defaults to opted in. Test added; re-verified live |
| 8 | Medium | `tour-app/src/store/useAppActions.ts` | Cancel while the Bluetooth key was being fetched left the stop on "Getting your key…" with a dead Cancel | `lockPinDismiss` dispatched on the aborted path |
| 9 | Medium | `reducer.ts`, `useAppActions.ts` | A failed online application marked the journey "Applied online" | New `applyFailed` action; tests in `qaFixes.test.ts` |
| 10 | Low | `reducer.ts` | A stop's lock answer cleared another stop's in-flight request | Clear only when the request belongs to the answering stop; tests |
| 11 | Low | `reducer.ts` | `signOut` carried `verified` to the next account | Dropped; test |
| 12 | Low | `tour-app/capacitor.config.ts` | Capacitor's default bridge logging printed every plugin call with its options (the Bluetooth guest key) in debug builds | `loggingBehavior: 'none'` |

All fixes are backward compatible; no schema change; no legacy action changed except the elevators partial.

## 25. Remaining Blockers

Updated October 18, 2026 after the resolution round (§29). Still blocking for production:

1. The authorization bypass fix (and everything else on the QA branch) must be merged and deployed before `main` is
   considered; the index migration `20261018090000` then runs on production (index-only, built concurrently).
2. igloohome v1 Bluetooth: no hardware validation possible (a phone and a lock enrolled under Pynwheel's partner
   account are still needed). The native cancel hang, the connect-observable timeout and the paused-scan mapping are
   fixed in code; the Java plugin compiles and its JVM tests pass; the Swift plugin passes `swiftc -parse` only.
3. iOS: the plugin is still not wired into `ios/App/CapApp-SPM/Package.swift` and `Info.plist` still lacks
   `NSBluetoothAlwaysUsageDescription` (both files carry the owner's uncommitted changes; wiring them needs the owner's
   go-ahead). `swift package resolve` now succeeds for the plugin package (capacitor-swift-pm, igloohome's
   RxBluetoothKit 6.1.2, RxSwift 5.1.3, IOS-DFU-Library 4.11.1, ZIPFoundation; the first two attempts had aborted
   mid-clone on the unstable network), so the dependency question is answered; an Xcode build of the plugin against
   the SDK is still outstanding.
4. The live Claude Design artifacts could not be compared (sign-in wall; the Claude in Chrome extension was not
   connected to this session); only the briefs and reports were used.
5. The booking link needs `HOST_URL` on the Connect-facing Rails instance (a Heroku config change).

Known and accepted (not defects of this work): the Partner Configuration screen test cannot render legacy HTML under
the test environment (a Sass `rgba` arity error raised only there; the page renders in development and the three
denial tests of that file now pass with the new `partners` fixture); the legacy mobile API logs an `impressions` row
per read.

## 26. Documentation Updated

Append-only dated entries (October 18, 2026) were added to `context.md`, `PYN_CONNECT_PROGRESS.md`,
`TOUR_SETUP_MODULES_QA_17_oct.md`, `tour-app-implementation.md`, `tour-app-backend-api.md`,
`tour-app-igloo-integration.md`, `tour-app-igloo-bluetooth.md`, `tour-app-design-refresh-report.md`,
`gaps_tour_setup_feature.md` and `performance-audit-report.md`; this report is new.

## 27. Production-Safety Confirmation

- Every production statement ran as `readonly-debug` inside `BEGIN READ ONLY … ROLLBACK` with `transaction_read_only =
  on`; the role's INSERT and UPDATE privileges are false (checked with `has_table_privilege`). No migration, write,
  import, cleanup, deploy, configuration change, storage change, booking, visit, lock mapping, access code, vendor call
  or physical unlock touched production or any live property.
- All mutation tests ran on `pynwheel_audit_clone` behind Rails `:3100` (confirmed as the only Rails connection, on that
  database). The legacy Heroku apps were not touched.
- One operational caveat: the first session's scratchpad (helper scripts, screenshots, the clone recovery-point CSVs,
  the production export CSVs and the backup of clone user 2181's password hash) was emptied when that session ended
  after the owner's network outage. The imported data had been verified byte-identical to production before the loss,
  the evidence runs were repeated into the new scratchpad, and clone user 2181 keeps a throwaway password (the clone is
  a local test database; the production hash can be re-copied by the owner if ever needed).

## 28. Final Readiness Decision

```text
NOT READY FOR PRODUCTION
```

`main` at `e86a28024` ships a critical cross-tenant data exposure in the new Connect endpoints and a Self Tour App that
hides every issued door code. Both are fixed on `qa/final-platform-regression-2026-10-17`, together with the refetch
loops, the two query storms, the legacy Elevators crash and the smaller app defects, with tests. After that branch is
reviewed, merged and deployed (with the index migration), the Connect CMS modules and the door-code flows are fit for a
staging release; the Bluetooth (v1) unlock and the iOS build must remain behind their honest unavailable states until a
partner-enrolled lock, an Android phone and the iOS package wiring are available for validation. The October 18
resolution round (§29) closed every code-level finding of §25's earlier list except the four items that need the
owner's environment or hardware.

## 29. Resolution Round (October 18, 2026)

Every code-level finding listed as open in the first version of §25 was fixed on the QA branch and re-verified; the
items that need the owner's environment or hardware are the only ones left (§25 above). Changes, by layer:

**Rails backend**
- `Visitors::Query` takes `visitor_id:` and bounds the visits it loads (`HISTORY_LIMIT`); `Visitors::Profile` and every
  visitor write use the one-visitor query; `visitor_of_property?` checks bookings and visits before the PaperTrail
  cancelled list. Migration `20261018090000` adds `tour_histories(community_id)` and `tour_histories(tour_id)` (index
  only, concurrent); applied to the test database and the clone, not to production.
- `Locks::Inventory` memoises its four lists and preloads door parents (Hazel's locks read: 59 → 34 queries).
- `Connect::BaseController` rescues `StandardError` into the JSON envelope (`500 {code: "internal", ref}` with a logged
  reference), declared before the specific handlers so domain errors keep their codes.
- `Bookings::Create` reuses an existing booking only when it is dated and still upcoming (the legacy service answered
  an old unscheduled row unchecked).
- `Connect::VisitorsController` refuses the legacy `visitor_detail_page` role (403) on the list, profile and CSV.
- `TourApi::Locks` gates issuance on `communities.multiple_locks_provider` including Igloohome (the switch the Locks
  tab shows) and writes the legacy `igloohome_guests` audit row per issued code or key (so the Locks tab lists them).
- `Locks::AutoMatch.apply!` is one transaction (≤ 500 pairs); `Locks::Purge` clears the holder's access code and the
  parent unit's/amenity's provider; `LocksController#enabled` requires the `enabled` parameter (422 otherwise).
- Tour App route: `POST …/tour-route` accepts `start_stop_id` (an entry gate `bsp:<id>` or the tour start) and the
  tour starts and finishes there; an unknown or non-gate key answers 422 `unknown_start` (test added).
- Legacy: `/communities` without a company in the session redirects to Companies instead of a 500; the visitor detail
  page tolerates a property without a site-map image; the visitors list reads its per-visitor flags once (Hazel:
  34.6 s / 2,308 queries → 0.6 s / 328 queries); `partners.yml` fixture for the partner tests.

**Connect (Next.js)**
- Drawer drafts survive a lock write or Retry; the availability picker shows an error with Retry and Confirm stays
  disabled until a slot is picked; the shortest-path test sends a floor only when it knows it and offers From/To floor
  selects on `ambiguous_floor`; tours with a missing-record stop open without a phantom change; the timeline uses the
  guarded formatter; `/properties/:id/pricing` is framed like its siblings; the CSV link carries no search text (a
  note says so); search is debounced; reschedule uses the booking's own type with a note for virtual/walk-in; a save
  resets only its own section's draft; only changed hour lanes are sent; choosing a manual code or "none" on a stop
  that holds a smart lock asks for confirmation first.

**Self Tour App**
- Simulated copy on real properties carries the demo mark (location line, 45-minute access, countdown, chat hours,
  access-pass ending); the saved-units count excludes the demo rows; a paused scan reports cancelled; `pendingAfterAuth`
  is cleared on navigation and only set after a successful property pick; Back from the sign-in confirmation and
  "Continue as Guest" end the live session; malformed lock-key and route answers are typed errors with readable copy;
  the Demo scenarios panel is gated (`import.meta.env.DEV` or `VITE_DEMO_SCENARIOS=on`) and a hidden panel cannot
  leave a forced scenario behind; the chosen starting point is sent to the route request (real, no longer demo).
- Plugin: pending connect/unlock calls are rejected with `cancelled` on reset/disconnect/destroy (Java and Swift);
  the connect timeout applies to the first emission only; the Swift scan timeout is a cancellable dispatch item, the
  permission request resolves from the Bluetooth state delegate, the no-SDK build rejects with `unavailable`;
  `IOS-DFU-Library` pinned to 4.11.1; `swift package resolve` completes for the plugin package.

**Re-verification**
- Rails full suite: 267 runs, 1,438 assertions, 1 failure (the Partner Configuration screen render, test environment
  only), 0 errors; Connect + Tour App API + services: 131 runs green; routing: 14 runs green.
- Connect: `tsc` clean; real-data Playwright 7/7; the refetch-loop check still answers one request per failing read.
- Self Tour App: `tsc` clean; vitest 77/77 (11 files); the full virtual journey (29/29 steps) and the in-person journey
  to the mocked door code pass on the updated code, 0 console errors; the Java plugin compiles and its JVM tests pass.
- Legacy harness over the five properties: 85 requests, 84 × 200 and 1 × 422 (the mobile API for 818, which has no
  path data), 0 × 500; no legacy page writes on read.
- The clone's Hazel lock row was switched to door-code mode for the mocked run and restored from its backup (v1, nil
  client fields, original timestamp) afterwards; no vendor call was made.
