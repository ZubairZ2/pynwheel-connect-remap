# Tour App: a Beans property's shared background map under every floor SVG; maps test on the October 25 SVG-plate contract

Branch `feature/tour-app-beans-background-layer` → `main`. Compare: https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/tour-app-beans-background-layer

## Why

Cypress Terra (8005) and the other Beans exports are two files per floor: a floor SVG (`*_noBG.svg`, the unit polygons and hallway network) drawn over one shared background map (`communities.background_svg_image`, the site plan). The CMS's Map & Plotting canvas, the renter map and the Map SDK composite the two; the Tour App drew only the floor file, so the phone showed the unit plotting on a blank page (found during the October 29 regression QA on the Samsung A02s).

Separately, two expectations in `maps_test.rb` written on October 7 encoded the pre-October-25 SVG-plate contract and failed against `main` since the Beans street-network commit (5755cf274).

## What changed

**API (`Api::TourApp::V1`)**
- `GET /properties/:id/map` answers `background: { svg_path }` for an `is_beans_svg` property with a stored background, `null` for every other property (the CMS draws the background only where the flag is set).
- `GET /properties/:id/map/background/svg` (`maps#background_svg`) serves the file the way a floor SVG is served: resolved through `Connect::UploadUrl` with the property's bucket hint, validated by `TourApi::Assets`, ETag / 304, `X-Svg-ViewBox`, 404 `no_background` elsewhere, 401 without a token. The two actions share `serve_svg`.

**App (`tour-app/`)**
- `MapLevel.backgroundSvgPath` (set on every level of a Beans property by `parseBundle`), `TourRepository.getBackgroundSvg` (API: the blob through the session token; dummy: unavailable).
- `useLevelBase` reads the background once per property (cached by path, like the floor SVGs; prefetched with the route's levels) and exposes it on the base; a background that cannot be read never hides the floor.
- `MapView` draws `<image data-plan="background">` under the floor document. `backgroundPlacement` (mapBase.ts) places the background's viewBox relative to the floor's through the same mapping that places the floor — the calibrated matrix when one is stored, else the floor viewBox over the frame — the rule of Connect's `backgroundBox`.

**Tests**
- `maps_test.rb`: an SVG-only plate is framed by its viewBox and lives in SVG space; a raster plate that also carries a floor SVG keeps its `image`; a new test covers the background facts and the endpoint (Beans on/off, ETag, 401, 404).
- `mapBase.test.ts`: three `backgroundPlacement` cases (viewBox frame, stretched raster frame, calibrated matrix).

## Verification

- `bundle exec rails test test/controllers/api/tour_app …` and the other in-scope suites: 249 runs, 2,714 assertions, 0 failures. `npm run typecheck` clean; `vitest` 25 files / 183 tests green.
- Audit clone, QA Rails on :3108: `/map` lists the background for 8005 and `/map/background/svg` serves 380 KB with viewBox `0 0 1412 932` (identical to the three floor files, so the overlay is 1:1).
- Samsung SM-A025F (Android 12), LAN debug build `artifacts/pynwheel-tour-igloo-20261029.apk`: Find Shortest Path and the route screens show the aerial site plan under the unit polygons on floors 1, 2 and 3 (`<image data-plan="background">` 1412×932 under `data-plan="svg"`); a non-Beans property is unchanged.
- Script-made clones of Cypress Terra on the audit clone: the older clone 8045 and a fresh clone 8048 made with `rake property_clone:execute[8005]` (CLONE_SUFFIX " [SCRIPT TESTING 3]", files shared through `file_source_id`, 14/14 verifier checks PASS) both answer `background.svg_path`, serve the background (380 KB) and the three floor files from the source's S3 folders, and on the phone show the background under floors 1, 2 and 3 of the clone; a full tour on the fresh clone (check-in verified by the server from the phone's fix, route playback over both layers, 8 stops, completion) ran from the phone.
- Read-only production check: 0 floorplates with an SVG, no image and a raster frame, so the October 25 heuristic the test now asserts strands no real property.

## Not in this PR

The other October 29 QA findings (booking unit not persisted, placeholder distance line, "Open Settings" toast, services-off copy, per-session SVG error cache, demo tour card at sign-in) are listed in `TOUR_APP_DEEP_REGRESSION_QA_2026-10-29.md` and untouched here.
