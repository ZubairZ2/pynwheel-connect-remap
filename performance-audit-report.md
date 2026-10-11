# Pynwheel Connect — performance audit (Next.js, Map & Plotting, Inventory, data loading)

**Date:** October 11, 2026 · **Branch audited:** `main` at `29c056606` (PR #23 merged), working tree untouched · **Scope:** investigation and plan only; no application code was changed · **Evidence folder:** `perf_audit/` (scripts and raw outputs, untracked like `db_compat_audit/` and `svg_map_qa/`)

Every number below is either read from production (Heroku router logs of the owner's own session on October 10, 2026, 17:22–17:46 UTC; Heroku app and add-on metadata; public S3 object headers) or measured locally on the isolated production clone (`pynwheel_audit_clone`, CMS on :3100 in development mode, Connect **production build** on :3005, headless Chrome, minted super-admin session). Where a value could not be collected it is marked **unavailable** with the way to collect it. "Prod" means the Heroku pair `pyn-system` (CMS) + `pyn-system-connect` (Next.js) the owner uses as production.

---

## A. Executive summary

**Confirmed: the Rails queries are not what makes Map & Plotting slow.** Every Connect JSON read answers in 40–180 ms with 10–57 SQL queries on a 339-unit property locally, and the browser's own parsing of the biggest floor SVG (1.48 MB) takes under 40 ms. The time goes into *how* the Next.js app moves the data, and into the production environment:

1. **The floor SVG travels the longest possible path, uncompressed, and is never cached.** The browser asks the Next.js route `/api/properties/:id/plan-svg`; that route re-reads the whole `floorplates.json` listing from Rails (22–28 queries, the same request the page just made), then downloads the SVG from S3 into memory, then sends it to the browser **without gzip** (Heroku router: `bytes=1412069` for a 1,412,069-byte file; local production build: no `Content-Encoding`). The hook fetches it with `cache: 'no-store'`, so the route's `Cache-Control: private, max-age=600` is dead and every reload, floor revisit after a remount, and back-navigation downloads it again. Gzip alone cuts the real exports 2.9–3.4× (1,412,069 → 495,469 B). *(P0, Next.js)*
2. **The SVG request only starts after the page has hydrated**, i.e. after the RSC payload (410–770 KB raw, 17–67 KB gzipped) and ~370 KB of JavaScript have arrived and run. Locally that is 1.0 s; on an emulated 1.5 Mbps / 500 ms link it is 4.6 s; in production the owner's browser issued the first SVG request **9 s** after receiving the page. Nothing about the map is visible until this chain completes. *(P0, Next.js)*
3. **The production CMS dyno is permanently out of memory.** `pyn-system` logs `Error R14 (Memory quota exceeded)` every ~20 s (Basic dyno, 512 MB, Puma 2 workers × 5 threads). The same `units.json` that takes 111 ms locally took 1,357 ms in production; `floorplates.json` ranged 56–1,755 ms. The Beans map open makes **7 CMS reads** (3 of them `floorplates.json`), so this penalty is paid up to seven times per open. *(P0, infrastructure)*
4. **The root layout's Google Fonts stylesheet blocks the first paint of every hard navigation.** With `fonts.googleapis.com` delayed 8 s, the map editor appears after 9.4 s instead of 1.3–1.9 s, for Beans and non-Beans properties alike. The owner's machine is known to have Google Fonts stalls (progress doc trap 18/22). *(P1, Next.js, trivial fix with `next/font`)*
5. **The map ships every unit with every field.** `units.json` is 422–574 KB raw for 228–339 units because each row carries lease terms, buttons, interior images, descriptions and flags the map never reads; the whole thing is serialized again into the page's RSC payload. A lean map view of a unit is ~10 fields. *(P1, Next.js first, then API)*
6. **Two-file floorplates download the SVG even when the image layer is shown** (John Demo: 555 KB per floor, six floors), and **Unit Detail loads all four inventory listings, including every unit, to show one unit** (489–676 KB document). *(P1, Next.js / API)*

Recommended order of work: (1) compress + cache + de-duplicate the SVG route and start its download before hydration; (2) self-host the fonts; (3) prune the map's unit payload on the server; (4) give the CMS dyno memory or cut Puma to one worker; (5) stop the needless SVG fetch on image floors and give Unit Detail a single-unit read; (6) the smaller items in §H.

---

## B. Architecture overview (what actually happens when a page opens)

**Data path.** Every Connect screen is a Next.js 15 App Router page (`force-dynamic`). The page's server component reads Rails through `apiRequest` ([base.api.ts](pyn-connect-web/src/core/repository/remote/api/base.api.ts)) with the user's Devise cookie replayed and `cache: 'no-store'`; the JSON is parsed once (`core/repository/parser/*`) and the resulting model is handed as props to a **client** screen component, so the whole model is serialized into the React Server Component (RSC) payload (inlined into the HTML on a hard load, fetched as `text/x-component` on a client navigation). Components never call Rails; the browser only calls this app's own route handlers under `/api/properties/:id/*`, which again call Rails with the cookie.

**Map & Plotting** ([map/page.tsx](pyn-connect-web/src/app/(connect)/properties/[propId]/map/page.tsx) → [propertyMap.server.ts](pyn-connect-web/src/core/repository/remote/propertyMap.server.ts)):

```
browser ──GET /properties/8005/map──▶ Next (server component)
                                       ├─ GET /communities/8005/floorplates.json  ┐
                                       ├─ GET /communities/8005/floorplans.json   │ Promise.all
                                       ├─ GET /communities/8005/amenities.json    │ (5 Rails reads)
                                       ├─ GET /communities/8005/units.json        │  ← every unit, every field
                                       └─ GET /automate_plotting.json?community_id=8005 ┘
        ◀── HTML + RSC payload (495 KB raw / 25 KB gz) ──
browser: download JS (23 scripts, 371 KB wire) → hydrate → usePropertyMap effect:
browser ──GET /api/properties/8005/plan-svg?floorplate=4606 {cache:'no-store'}──▶ Next route handler
                                       ├─ GET /communities/8005/floorplates.json   (again: 22–28 SQL)
                                       └─ GET https://images-pynwheel-cms-v2.s3-accelerate…/…Floor_1_noBG.svg (full body in memory)
        ◀── image/svg+xml, 291,180 B, NOT gzipped, Cache-Control: private, max-age=600 (ignored by no-store) ──
browser ──GET /api/properties/8005/plan-svg?background=1 (Beans only)──▶ same again (floorplates.json + S3), 380,532 B
browser: measureFloorSvg (DOMParser + bbox, ~10 ms) → SvgPlanLayer mounts a second parse → markers drawn
```

A floor switch repeats the last block for the new floorplate; a mode switch (Plotting ↔ Wayfinding) sends nothing; a reload or a back-navigation repeats everything, because the hook state is per mount and the Next router cache for dynamic pages is 0 s.

**Floor images** (raster floorplates) are different: the canvas renders `<img src=standard_image_url>` straight from S3 Transfer Acceleration — one hop, browser-cacheable.

**Inventory** ([inventory/page.tsx](pyn-connect-web/src/app/(connect)/properties/[propId]/inventory/page.tsx)): three parallel reads (floorplates, floorplans, amenities); the Units tab reads one page at a time through `/api/properties/:id/inventory/units` (since October 3). **Unit Detail** ([units/[unitId]/page.tsx](pyn-connect-web/src/app/(connect)/properties/[propId]/units/[unitId]/page.tsx)) still calls `loadPropertyInventory` with every unit. The route `/properties/:id/units` is the **phase-2 demo screen** (`demo` flag, mock data) — it reads nothing from Rails and was therefore not measured; "Units page" below means the Inventory Units tab and Unit Detail.

**Rails side.** Each read is a `format.json` branch on a legacy `index` action with a `Connect::*Serializer`; `Connect::UploadUrl` resolves every CarrierWave column to a URL. On `pyn-system` the configured bucket (`staging-pynwheel`) differs from the bucket the production rows name, so the resolver's HEAD probing is active there (cached a day in Redis). `Rack::Deflater` gzips Rails → Next, and Next's `fetch` accepts gzip, so that leg is compressed. Production Rails logging is effectively off (`config.log_level = :error` in `production.rb` overrides the lograge setup in `application.rb`), so per-request Rails timings exist only as Heroku router `service=` totals.

---

## C. Critical findings

### C1 — The floor SVG is proxied, re-resolved, uncompressed and uncached

```text
Finding:            Every floor SVG (and the Beans background) is fetched through /api/properties/:id/plan-svg,
                    which re-reads the full floorplates.json listing, buffers the whole file from S3, and returns
                    it without gzip; the browser fetches it with cache:'no-store', so nothing is ever reused.
Affected page/property: Map & Plotting, every SVG floorplate. Worst: Jennifer Demo FP 1412 (3638: 1,412,069 B;
                    1865: 1,480,467 B), John Demo 1411 (555–563 KB × 6 floors), Cypress Terra 8005
                    (291 KB per floor + 381 KB background).
Severity:           P0
Evidence:           • Heroku router (pyn-system-connect): plan-svg?floorplate=3638 → bytes=1412069 (= raw file),
                      service 597–3,775 ms typical, 127,510 ms once; 1865 → bytes=1480467, 565–3,600 ms, 100,657 ms once;
                      8005 floors → 291,180–291,216 B, 398–1,995 ms; 1411 floors → 473–768 ms, 6,388 / 6,525 / 23,704 ms outliers.
                    • Heroku router (pyn-system): one /communities/<id>/floorplates.json per plan-svg request
                      (17:41:13.7, :15.4, :39.1, :47.6 for the four 8005 plan-svg calls; 78 / 1,755 / 843 / 1,390 ms).
                    • Local production build: curl with Accept-Encoding: gzip → no Content-Encoding, Transfer-Encoding: chunked,
                      size on wire = file size; the page HTML and RSC of the same server are gzipped.
                    • Code: route.ts fetches the listing (`fetchInventoryListing(…,'floorplates')`), `await response.text()`
                      the whole file, returns `new NextResponse(text)` with `Cache-Control: private, max-age=600`;
                      usePropertyMap.ts `loadSvg`/`loadBackground` use `fetch(url, { cache: 'no-store' })`.
                    • Local open sequence (perf.mjs): reload and away-and-back re-download the SVG every time
                      (1412/3638: 5.9 s first, 3.9 s reload, 4.9 s back; transfer = full 1,412,369 B each time).
                    • gzip of the real exports: 1,412,069 → 495,469; 1,480,467 → 503,961; 555,288 → 168,275;
                      291,216 → 163,541; background 380,532 → 184,486 (2.9–3.4×).
Root cause:         Next's compression middleware (router-server.js) does not compress streamed app-route responses;
                    the handler never sets an ETag/Last-Modified; the hook opts out of the HTTP cache; the listing
                    is the only way the handler knows the file's URL, so it pays the whole serializer each time.
Relevant files:     pyn-connect-web/src/app/api/properties/[propId]/plan-svg/route.ts
                    pyn-connect-web/src/core/hooks/usePropertyMap.ts (loadSvg, loadBackground, fetchSvgText, fetchBackgroundText)
                    app/controllers/floorplates_controller.rb#render_connect_floorplates, app/serializers/connect/floorplate_serializer.rb
Recommended fix:    (1) gzip in the handler when the request accepts it (zlib.gzipSync or a CompressionStream; the file
                    is already buffered) and set Content-Length; (2) answer with a strong ETag derived from the stored file
                    name + the floorplate's updated_at (both already in floorplates.json) and honour If-None-Match with 304;
                    (3) drop `cache: 'no-store'` in the hook (default fetch cache) so reloads and revisits revalidate;
                    (4) stop re-reading the full listing per SVG: memoise the resolved upload URL per (session cookie hash,
                    property) for ~60 s in the Next server process, or add a read-only `floorplates.json?only=plan`
                    branch that returns ids + upload URLs without the inventory meta (unit counts, lock devices, markers).
                    (5) Longer term, align with docs/map_load_performance_plan.md Phase A: serve SVGs from S3/CloudFront
                    directly (needs a CORS rule on images-pynwheel-cms-v2 — today the bucket answers no
                    Access-Control-Allow-Origin for the Connect or CMS origins and 403 to OPTIONS — and gzip at the edge).
Implementation layer: Next.js (1–4); infrastructure (5).
Expected benefit:   ~65–70 % fewer bytes per SVG on the wire; repeat views ≈ 0 bytes (304); one Rails read fewer per
                    floor; at 1.5 Mbps the 1412/3638 transfer alone drops from ~7.5 s to ~2.6 s.
Regression risks:   An ETag that does not change when the stored file is replaced under the same name (the uploader
                    prefixes a timestamp, and updated_at moves on every save — safe); a per-user URL cache must be keyed
                    by the session, never shared across users.
Validation:         perf.mjs `plan-svg … bytes` and `total` per case; browser DevTools shows content-encoding: gzip and
                    304 on reload; Heroku router `bytes` for plan-svg ≈ gzip size; Rails log shows one floorplates.json per
                    page open, not per SVG.
```

### C2 — The SVG download starts only after hydration, behind the RSC payload and ~370 KB of JavaScript

```text
Finding:            The first byte of the floor SVG is requested from a client effect (usePropertyMap) that runs after
                    the page has downloaded its JavaScript and hydrated. The map canvas shows only the loading cover
                    until then.
Affected page/property: Map & Plotting, every property; worst on slow links and on first visits (cold JS cache).
Severity:           P0
Evidence:           • Local (production build, warm S3): page response complete at 313 ms, hydrated at 1,038 ms, plan-svg
                      request starts at 1,025 ms (8005); 1,036 ms (1412); 1,489 ms (1411 — 717 KB document).
                    • Emulated links (perf-wan.mjs): plan-svg start at 2,150 ms on 4 Mbps/300 ms, at 4,608 ms on
                      1.5 Mbps/500 ms (JS last byte at 5,102 ms). Document 495 KB raw / 25 KB gz; 23 scripts,
                      371,277 B on the wire (1,160,742 B raw across the 20 scripts the map document references,
                      324 KB gzipped; the map page chunk alone is 187,928 B raw / 49,865 B gz).
                    • Production: map RSC served 17:41:04.57, first plan-svg's floorplates.json at 17:41:13.71 — a 9 s gap
                      in which the server received nothing for this page.
Root cause:         Sequential design: data → hydrate → effect → fetch. The server component already knows the initial
                    level and whether the property is Beans, but emits no preload for the SVG.
Relevant files:     pyn-connect-web/src/app/(connect)/properties/[propId]/map/page.tsx (knows map + initial level)
                    pyn-connect-web/src/core/hooks/usePropertyMap.ts (effect at the "floor SVGs" block)
                    pyn-connect-web/src/core/screens/properties/map/MapCanvas.tsx (`ready` gate)
Recommended fix:    Emit `<link rel="preload" as="fetch" href="/api/properties/:id/plan-svg?floorplate=<initial>"
                    crossorigin="use-credentials">` (and `?background=1` for Beans) from the page's server render, so the
                    browser starts the download in parallel with the JS; keep the hook's fetch (it then hits the preload
                    cache). Requires C1(3): a `no-store` fetch cannot consume a preload. Alternative with the same effect
                    on a client navigation: call `fetch()` for the initial level's SVG at module scope of the client screen
                    before React mounts, or start it from the first render instead of an effect.
Implementation layer: Next.js
Expected benefit:   The SVG download overlaps JS download + hydration: 0.7–1.0 s saved locally, 2–4.5 s on the emulated
                    links, up to the observed 9 s in production.
Regression risks:   Preloading a level the user did not deep-link to is wasted when the user's first action is a floor
                    switch (one file); preload + no-store would double-download (hence C1(3) first).
Validation:         perf.mjs: `plan-svg start` ≤ `nav.responseEnd` + ~50 ms; `planReadyMs` − `hydratedMs` shrinks to the
                    parse cost; production router: plan-svg logged within a second of the map response.
```

### C3 — The production CMS dyno is swapping (R14) and every read pays for it

```text
Finding:            pyn-system runs with Puma `workers 2` (WEB_CONCURRENCY default) × 5 threads on a Basic dyno (512 MB)
                    and logs "Error R14 (Memory quota exceeded)" every ~20 s, continuously. Connect's reads cost 3–20×
                    their local time there, and the map pays it 5–7 times per open.
Affected page/property: Every Connect screen; most visibly Map & Plotting (units.json gates the page; floorplates.json
                    gates each SVG) and the Inventory's first paint.
Severity:           P0 (environment)
Evidence:           • Heroku logs pyn-system: R14 at 17:40:04, :25, :45, 17:41:04 … 18:06:42 without a gap.
                    • Router (pyn-system), Cypress Terra first open 17:41:03: amenities 35 ms, floorplans 84, floorplates 196,
                      automate_plotting 243, units.json 1,357 ms → map RSC 1,410 ms. Same reads three minutes later:
                      units 362 ms, map 414 ms. floorplates.json for the SVG proxy: 78 / 1,755 / 843 / 1,390 ms.
                    • Local (same data, development mode): units.json 8005 111 ms / 18 SQL; floorplates.json 43–60 ms /
                      22–28 SQL; automate_plotting 49–92 ms; edit.json 25–60 ms; floorplans ≤ 27 ms; amenities ≤ 38 ms.
                    • heroku ps: both apps web=1 Basic; DATABASE_URL is a Heroku Postgres Standard-2 in region us (the
                      dynos' region), 19/500 connections — cross-region database latency is ruled out.
                    • Baseline: a trivial request to either Heroku app takes 0.8–1.7 s TTFB from the owner's region.
Root cause:         Memory, not queries: two preloaded Puma workers of this Rails app exceed 512 MB; the dyno swaps.
Relevant files:     config/puma.rb (workers/preload), Procfile; Heroku config WEB_CONCURRENCY / dyno size.
Recommended fix:    Either a Standard-2X dyno (1 GB) for pyn-system, or WEB_CONCURRENCY=1 (5 threads) plus
                    MALLOC_ARENA_MAX=2 / jemalloc, until memory is profiled. Also set `config.log_level = :info` and
                    keep lograge in production so Rails view/db timings reach the logs (today only router totals exist).
Implementation layer: Infrastructure / configuration
Expected benefit:   units.json 1.36 s → ~0.3 s, floorplates.json ≤ 0.2 s consistently; removes the 1–2 s variance seen
                    on identical requests; everything in C1/C2 benefits.
Regression risks:   One worker halves CPU parallelism; with 5 threads and reads that are mostly DB/IO it is adequate for
                    the current traffic (single owner session in the logs). Memory profiling is the real follow-up.
Validation:         `heroku logs --dyno web -a pyn-system | grep R14` is empty for an hour under use; router service
                    times for the five map reads within 2× of local.
```

### C4 — Google Fonts stylesheet blocks the first paint of every hard navigation

```text
Finding:            src/app/layout.tsx links https://fonts.googleapis.com/css2?family=Manrope… as a plain stylesheet in
                    <head>. A stylesheet in <head> is render-blocking: nothing of the app — not even the loading veil —
                    paints until it arrives. The Beans map adds an Inter stylesheet with `precedence`, which React 19 also
                    waits for before revealing the editor.
Affected page/property: Every screen on a full page load (first visit, reload, deep link, Tour Setup → map link that opens
                    a new document); all properties.
Severity:           P1 (environment-sensitive: harmless on a fast link, catastrophic on a stalling one)
Evidence:           • perf-wan.mjs, fonts delayed by 8 s: editor visible at 9,381 ms (8005), 9,391 ms (1412), 9,002 ms (1411)
                      versus 1,334–1,916 ms undelayed; DOMContentLoaded 8,619–8,960 ms.
                    • Progress doc traps 18/22 and the Oct 1 context note record real Google Fonts stalls and resets
                      from the owner's machine ("one navigation ~30 s").
Root cause:         External render-blocking CSS on the critical path; no fallback timing.
Relevant files:     pyn-connect-web/src/app/layout.tsx; pyn-connect-web/src/core/screens/properties/propertyMap.screen.tsx
                    (the Beans `<link rel="stylesheet" precedence>` for Inter).
Recommended fix:    `next/font/google` for Manrope and Inter: the fonts are downloaded at build time and served from the app's
                    own origin with `font-display: swap`; no runtime request to Google, no render-blocking link. (A
                    `media="print" onload` trick is the fallback if self-hosting is not wanted.)
Implementation layer: Next.js
Expected benefit:   Removes a 0.6–1.3 s request from the critical path on a good link, and a multi-second to 30 s stall on
                    the owner's; no change when fonts are cached.
Regression risks:   Font rendering identical (same files); a `swap` flash on the very first paint.
Validation:         perf-wan.mjs "delayed8s" row: editorVisibleMs unchanged by the delay; no fonts.googleapis request in
                    the network panel.
```

### C5 — The map ships every unit with every field, twice

```text
Finding:            Map & Plotting's server loader calls units.json unpaged (every unit, 1.2 KB each) and hands the full
                    InventoryUnit objects to the client screen, so they are serialized into the RSC payload. The map uses
                    roughly ten of the ~35 fields per unit.
Affected page/property: Map & Plotting and Tour Setup, every property; grows with unit count (387 production properties
                    have ≥ 300 units, 98 have ≥ 500, 11 have ≥ 1,000; max 3,208).
Severity:           P1
Evidence:           • units.json raw: 8005 422,647 B (339 units), 1412 321,791 B, 1411 573,706 B, 1618 522,954 B
                      (gzip 13–41 KB); Rails 104–178 ms locally, 1,357 ms in production (8005).
                    • Map document raw 494,982 B (8005), 410,489 B (1412), 716,726 B (1411), 769,662 B (1618);
                      RSC payload 410,323 B raw / 17,383 B gz (8005). Hydration on first open scales with it:
                      1,038 ms (8005) → 1,500 ms (1411).
                    • Fields the map reads (mapLevels/mapNodes generators, pin items): id, marketing_name/display_name,
                      floor, building, floorplate_id, x_plot, y_plot, svg_pointer, plotted, visible, show_on_map,
                      floorplan_id (bedroom colour), door_id, in_stops_list, lock_provider. Not read: lease_terms, buttons,
                      interior_images, secondary_image, description(s), price/market_rent/square_feet, flags, availability.
Root cause:         One serializer for the grid, the dialogs and the map; one loader (`loadPropertyInventory`) for all
                    screens.
Relevant files:     pyn-connect-web/src/core/repository/remote/propertyMap.server.ts, propertyInventory.server.ts
                    pyn-connect-web/src/app/(connect)/properties/[propId]/map/page.tsx (props boundary)
                    app/serializers/connect/unit_serializer.rb, app/controllers/units_controller.rb#render_connect_units
Recommended fix:    Step 1 (Next only): prune the model before it crosses the server→client boundary — a `toMapUnit(unit)`
                    pick in propertyMap.server.ts so the RSC payload carries only the map fields (same for amenities).
                    Step 2 (API, minimal): a read-only `units.json?view=map` branch in `render_connect_units` that uses a
                    slim serializer (no lease matrix, no image URL resolution, no interiors query) — cuts the Rails time and
                    bytes of the heaviest read on the map's critical path. Tour Setup and Unit Detail keep the full shape.
Implementation layer: Next.js (step 1), API/data-reading (step 2)
Expected benefit:   RSC payload −60–70 % raw (hydration/parse proportional); units.json Rails time roughly halved
                    (UploadUrl, lease-term matrix and interiors are per-row work); the production 1.36 s read becomes the
                    smallest of the five instead of the gate.
Regression risks:   Any map code reading a field dropped by the pick fails at runtime — TypeScript catches it if the pick
                    returns a narrower `MapUnit` type; the Wayfinding/Tour Setup screens must keep their own loader.
Validation:         `document.htmlBytes` / `nav.decoded` in perf.mjs; cms-bench.sh units.json?view=map raw bytes and
                    rails_ms; typecheck.
```

### C6 — Two-file floorplates download the floor SVG even when the image layer is shown

```text
Finding:            `usePropertyMap`'s effect loads the floor SVG of the level in view whenever the level has one,
                    regardless of the layer actually displayed (`space`). John Demo's six floorplates open on the image
                    (their stored hallways are raster), yet each visit downloads its 555–563 KB SVG.
Affected page/property: John Demo 1411 (6 × ~555 KB), Jennifer 1865, every two-file floorplate that opens on the image
                    (1,103 production floorplates have both files).
Severity:           P1
Evidence:           perf.mjs john firstOpen: state image=true, svg=false, yet plan-svg?floorplate=1867 fetched
                    (555,588 B, 5.9 s through the proxy); floor switch fetched the next one. Production router: six 1411
                    plan-svg calls of 544–563 KB in the owner's session (473–768 ms each, one 23.7 s).
Root cause:         The effect keys on "level has an SVG", not on "the SVG layer is shown"; Detect Hallways already fetches
                    on demand through `fetchSvgText`.
Relevant files:     pyn-connect-web/src/core/hooks/usePropertyMap.ts (effect after `apScopeLevels`); mapLevels.generator.ts
                    (`plotLayer` / `activeSpace`).
Recommended fix:    Load the SVG only when `activeSpace(level, state) === 'svg'` (or the Auto Plot wizard scope needs it);
                    keep the Detect path's lazy `fetchSvgText`.
Implementation layer: Next.js
Expected benefit:   One large request fewer per image-layer floor (−555 KB × floors visited on 1411); no change for
                    SVG-only properties.
Regression risks:   The Floor SVG / Floor image switch must trigger the load on first switch (it already re-runs the effect
                    when `space` is in its dependencies).
Validation:         perf.mjs john: plan-svg count 0 on first open; 1 after pressing "Floor SVG".
```

### C7 — Unit Detail loads the whole inventory, every unit included, to show one unit

```text
Finding:            /properties/:id/units/:unitId calls loadPropertyInventory with units (four Rails reads, one of them the
                    full units.json) and serializes the four listings into the page to render one unit.
Affected page/property: Unit Detail, every property; worst on large inventories.
Severity:           P1
Evidence:           perf-inventory.mjs: Rails reads floorplates + floorplans + units + amenities per open (units.json
                    142 ms local / 1,357 ms production for 8005); document 488,990 B raw (8005), 676,086 B (1411),
                    642,342 B (1618), 23–58 KB gzipped; hydration 360–392 ms locally.
Root cause:         No single-unit JSON; the dialog's Building and lock lists used to derive from the other units
                    (deferred in progress doc §24/§29).
Relevant files:     pyn-connect-web/src/app/(connect)/properties/[propId]/units/[unitId]/page.tsx,
                    core/utils/generator/inventory/unitDetail.generator.ts, app/queries/connect/unit_listing_query.rb
Recommended fix:    Read one unit through the existing paged listing: add `ids` to `connect_listing_params` /
                    `Connect::UnitListingQuery` (read-only filter, one line each) and call
                    `units.json?page=1&per_page=1&ids=<id>`; the dialog's Building list and lock devices already come
                    from the floorplates meta (`unit_buildings`, `lock_devices`) since October 3, so the other listings
                    are not needed for them.
Implementation layer: API/data-reading (minimal Rails filter) + Next.js loader
Expected benefit:   Four reads → two (floorplates meta + one unit), document −90 %, production open −1.3 s.
Regression risks:   The unit's floor plan name needs `floorplans.json` or the serializer's `floorplan_id` → keep the
                    floorplans read (small, 9–29 KB) if the screen prints the plan name.
Validation:         perf-inventory.mjs unitDetail: rails list has no unpaged units.json; htmlBytes < 100 KB.
```

### C8 — Beans properties resolve and fetch the shared background through the same proxy, serially behind the floor

```text
Finding:            The background (communities.background_svg_image) is loaded by a second effect once the floor is on its
                    SVG; it re-reads floorplates.json a third time and buffers a 380 KB file that is identical for every
                    floor of the property and rarely changes.
Affected page/property: Cypress Terra 8005 and the ~170 is_beans_svg properties.
Severity:           P1 (same fix family as C1/C2)
Evidence:           Production: plan-svg?background=1 → 1,995 ms first time (bytes=380532), 600 ms later; a third
                    floorplates.json per open (17:41:15.4, 1,755 ms). Local: 1,537–1,890 ms, started together with the
                    floor SVG at 1,025 ms.
Recommended fix:    Covered by C1 (gzip + ETag + no `no-store`) and C2 (preload `?background=1` for Beans); cache the
                    background text in sessionStorage keyed by property + file name if a per-property reuse across
                    page mounts is wanted.
Implementation layer: Next.js
Validation:         plan-svg?background=1 count per open = 1, bytes ≈ gzip size, 304 on reload.
```

---

## D. Map & Plotting performance, stage by stage

### D1 — Production timings (Heroku router logs, October 10, 2026, owner's session)

| Stage | Cypress Terra 8005 (first open 17:41) | 8005 (second open 17:44) | Jennifer 1412 | John 1411 |
|---|---|---|---|---|
| CMS: amenities / floorplans / floorplates / automate_plotting | 35 / 84 / 196 / 243 ms | 45 / 58 / 187 / 182 ms | 111–255 / 73–113 / 56–331 / 166–339 ms | 157 / 76 / 62–153 / 196 ms |
| CMS: units.json | **1,357 ms** (13.4 KB gz) | 362 ms | 185–311 ms (17.3 KB gz) | 358 ms (38 KB gz) |
| Next: /properties/:id/map (RSC or document) | **1,410 ms** (15.5 KB gz) | 414 ms | 297–463 ms typical; 4,032 / 9,100 / 12,279 ms outliers | — |
| Gap page-served → first SVG request | **~9 s** (17:41:04.6 → :13.6) | ~1.3 s | — | — |
| Next: plan-svg floor (incl. its floorplates.json + S3) | 398 ms (291,180 B raw) | 472 ms | 3638: 597–3,775 ms (1,412,069 B); 1865: 565–3,600 ms (1,480,467 B); 3659: 463–3,545 ms (160,858 B) | 473–768 ms (543,976–562,858 B) |
| Next: plan-svg background | **1,995 ms** (380,532 B raw) | 600 ms | — | — |
| CMS: floorplates.json re-read per plan-svg | 78 / 1,755 / 843 / 1,390 ms | 121 / 135 / 89 / 66 ms | 56–285 ms | 61–83 ms |
| Outliers (client link stalls; status 200, full bytes) | — | — | 100,657 ms (1865), 127,510 ms (3638) | 6,388 / 6,525 / 23,704 ms |
| Floor switch (floor 2, floor 3) | 1,176 ms, 1,903 ms | 578 ms, 541 ms | — | — |

Heroku's `service` is the time until the last byte reached the client, so the outliers (100–127 s for a 1.4 MB uncompressed body; the two completed within 1 ms of each other with the map page, which points to one stalled HTTP/2 connection) are the owner's link, not the server. They are large because the body is large: compression (C1) shrinks them three-fold, caching makes them one-off.

### D2 — Local open sequence (production build, isolated clone; S3 reached from this Mac, which is slower than Heroku's S3 leg)

| Case | DCL | Hydrated | SVG request start | SVG download (via proxy) | Plan ready | Rails reads per open |
|---|---|---|---|---|---|---|
| 8005 floor 1 (Beans) | 750 ms | 1,038 ms | 1,025 ms | 1,727 ms floor ∥ 1,537 ms background | **2,798 ms** | 7 (floorplates ×3) |
| 1412 floorplate 3638 (1.41 MB) | 773 ms | 1,041 ms | 1,036 ms | 5,929 ms | **7,017 ms** | 6 (floorplates ×2) |
| 1412 floorplate 1865 (image layer) | 780 ms | 1,063 ms | — | — (image 2.3 s from S3) | 2,330 ms | 6 |
| 1411 floorplate 1867 (image layer, SVG fetched anyway) | 1,200 ms | 1,500 ms | 1,489 ms | 5,935 ms (unused) | 70 s (PNG via this Mac's S3 link) | 6 |
| 1618 Hazel floor 1 (image) | 812 ms | 1,102 ms | — | — | 1,472 ms | 5 |

Repeat-load behaviour (same table's cases): **reload** → all Rails reads again and the SVG downloaded again (8005: 2.0 + 1.9 s; 1412: 3.9 s); **mode switch** Plotting ↔ Wayfinding → 0 requests (93–164 ms); **floor switch** → one plan-svg + one floorplates.json (8005: 1.7 s; 1412 1865 → 3638: 10.8 s); **back to the first floor** → 0 requests (kept in hook state); **navigate away and back** → everything again (8005: 1.2 s; 1412: 5.4 s). Client-side navigation from Property Detail to the map (no document load): editor visible 869 ms, plan ready 2,671 ms (8005).

### D3 — Separating the costs (8005 floor 1, local)

| Cost | Measured |
|---|---|
| API wait (five reads, parallel) | 219 ms (gated by the slowest: automate_plotting 219 / units 198 ms) |
| RSC/HTML transfer | 495 KB raw → 25 KB gz; 313 ms to last byte locally |
| JS + hydration | 371 KB on the wire, 23 scripts; hydrated at 1,038 ms (first visit), 324 ms (warm) |
| Asset URL resolution (plan-svg → floorplates.json) | 45–65 ms locally; 78–1,755 ms in production, ×2 for Beans |
| Asset download (S3 → Next → browser) | 291,180 B uncompressed; 1.5–2.0 s here, 398–1,995 ms in production |
| SVG parse + measure + mount (`measureFloorSvg` + `SvgPlanLayer`) | **10 ms** (8005), 14 ms (background), 24–39 ms (1412's 1.4 MB files), 35 ms (1411) — negligible |
| Rendering / interactivity | long tasks: 0 ≥ 50 ms in every run on this machine; markers appear with the plan (`MapCanvas.ready`) |
| Graph / wayfinding data | part of the page's five reads (automate_plotting.json 1.8 KB for 8005; 45 KB for 1411; 109 KB for Hazel) |

### D4 — Under an emulated wide-area link (perf-wan.mjs; browser↔Next throttled, Next↔S3 on this Mac's link)

| Case | 4 Mbps / 300 ms: hydrated → plan ready | 1.5 Mbps / 500 ms: hydrated → plan ready | Fonts delayed 8 s (local link): editor visible |
|---|---|---|---|
| 8005 floor 1 | 2.2 s → **5.8 s** | 4.6 s → **9.8 s** | **9.4 s** (vs 1.9 s) |
| 1412 floorplate 3638 | 2.2 s → **9.6 s** (SVG 7.4 s) | 4.6 s → **18.6 s** (SVG 13.9 s) | **9.4 s** (vs 1.3 s) |
| 1411 floorplate 1867 | 3.1 s → 13.5 s | 5.0 s → 24.6 s | **9.0 s** (vs 1.3 s) |

At 1.5 Mbps, 1,412,069 bytes need ~7.5 s of pure transfer; the gzipped 495,469 bytes need ~2.6 s.

### D5 — Production vs local, explained

| Difference | Production | Local | Effect |
|---|---|---|---|
| Round trip to the servers | 0.8–1.7 s TTFB for a trivial request from the owner's region | ~0 | each of the 3–4 serial steps (page, JS, SVG, background) costs a round trip |
| CMS dyno | R14 swapping; reads 196–1,755 ms | 15–180 ms | multiplies the 5–7 reads per open |
| SVG bytes on the wire | uncompressed, re-downloaded | same (but a fast link hides it) | the 3.6 s / 100 s plan-svg services |
| Google Fonts | fetched per hard load from fonts.googleapis.com | same, but cached locally | first paint blocked while it stalls |
| JS cache | cold after each deploy / in a fresh profile | warm | the 9 s pre-SVG gap |

What is **not** the cause: the SVG files' complexity (813–3,873 elements, ≤ 40 ms to parse), the Rails queries (≤ 57 per read, ≤ 180 ms), duplicate SVG requests (exactly one per floor and one background per open, in production and locally), or cross-region database latency (dynos and Postgres both in Heroku `us`).

---

## E. Inventory and Units performance

Representative configuration **Floorplates 3 · Floorplans 12 · Units 339 · Amenities 0** is **Cypress Terra 8005** — verified on the production database (read-only) on October 11, 2026, and on the clone.

| Step | What happens | Local (8005 / 1411 / 1618 / 4397) | Production (router) |
|---|---|---|---|
| Open Inventory | 3 parallel reads (floorplates, floorplans, amenities); no units | hydrated 1.7 / 1.4 / 0.9† / 1.1 s; document 64 / 94 / 217 / 64 KB raw (12–19 KB gz) | `/properties/8005/inventory?_rsc` 284 ms |
| Units tab | 1 request `/api/…/inventory/units?page=1&per_page=25` | 59–69 ms, 27–48 KB raw; cards in 114–148 ms | 70–134 ms (28.8 KB), 1411: 173 ms (47.8 KB) |
| Typing in the search box | debounced 350 ms + AbortController | typing "201" at 120 ms/key → **1** request at 670 ms; "1024" at 40 ms/key → 1 request; 0 aborted | — |
| Page 2 | 1 request | 50–65 ms Rails | — |
| Floorplates tab → back to Units | **1 request** (page 1 re-read; the listing is not kept) | 44–62 ms | — |
| Unit Detail | **4 reads incl. full units.json**; document 489–676 KB raw | hydrated 360–392 ms | units.json 1,357 ms (8005) |
| Property Detail | 1 read (edit.json) | 24–34 ms, 61 KB raw | — |

† Hazel's first inventory run measured 5.9 s to hydrate; two re-measurements (thumbnails allowed / blocked) gave 885 / 948 ms, so the outlier was not the thumbnails — treat as noise, re-check in production.

**Eagerly fetched but unused:** nothing on the Inventory itself since October 3 (units are paged; the floorplates meta carries counts, buildings, lock devices). **Duplicated:** the Units tab re-requests page 1 after a tab round-trip (small). **Oversized:** Unit Detail (C7); `floorplates.json` meta (`unit_count`, `unit_buildings`, override count, lock devices, markers, 22–28 SQL) is built for every caller, including the SVG proxy that only needs URLs (C1). **Large properties:** the paged listing is bounded (25–100 rows, 27–52 KB); the unpaged `units.json` remains on the Map, Tour Setup and Unit Detail paths and scales linearly (1,169 units ≈ 1.9 MB raw by the 1.25 KB/unit ratio measured) — C5 and C7 address it. Server-side pagination, deduplication and deferred rendering already exist for the Units tab; no new pagination behaviour is proposed.

---

## F. Next.js migration regressions (what changed versus the legacy pages)

Legacy pages measured on the same CMS and session (development mode): `plotexp` (SVG plotting) 8005 → **1,154 ms, 377 SQL, 342 KB HTML (41 KB gz)**; 1412/3638 → 650 ms, 387 SQL; 1411/1867 → 466 ms, 172 SQL; legacy Auto Wayfinding 1411 → 493 ms, 95 SQL, 191 KB; legacy units grid 8005 → 437 ms, 24 SQL, 386 KB; legacy floorplates page → 471 ms. The legacy SVG page then fetches the stored SVG **in the browser from its S3 URL** (`services/svgHandler.js#fetchSVG`), one hop, uncompressed (S3 serves no Content-Encoding) but browser-cacheable through ETag/Last-Modified.

Connect's individual Rails reads are **lighter** than the legacy pages (18–57 SQL, 40–180 ms versus 95–387 SQL, 437–1,154 ms). The regressions are structural:

| Migration choice | Where | Effect | Evidence |
|---|---|---|---|
| One loader for every property screen (`loadPropertyInventory` with every unit, every field) | propertyMap.server.ts, units/[unitId]/page.tsx | 410–770 KB RSC payloads; units.json on the critical path | §C5, §C7 |
| SVG delivered through a Next route that re-reads the listing and buffers the file | plan-svg/route.ts | 2 extra hops, 1–2 extra Rails reads per floor, no gzip | §C1 |
| `cache: 'no-store'` on the browser's SVG fetch | usePropertyMap.ts | the route's `max-age=600` never applies; every mount re-downloads | §C1, D2 |
| SVG fetched from an effect after hydration | usePropertyMap.ts | the download waits for ~370 KB of JS; legacy started it on DOM ready | §C2 |
| SVG loaded for the level, not for the displayed layer | usePropertyMap.ts | 555 KB per image-layer floor on two-file properties | §C6 |
| `force-dynamic` pages with the default router cache (0 s for dynamic) | every property page | back-navigation and reload repeat all reads | D2 "away and back" |
| Render-blocking Google Fonts link in the root layout | layout.tsx | first paint waits for fonts.googleapis.com | §C4 |
| Demo store, demo screens' code and the omni-search bundled into the shell | (connect)/layout.tsx (`StoreProvider`), Sidebar/Navbar | 1.16 MB raw / 324 KB gz JS for the map document, of which the map page chunk is 188 KB raw | §C2, §H P2 |
| Repeated `floorplates.json` inventory meta for callers that only need URLs | plan-svg/route.ts ↔ floorplates_controller.rb | 22–28 SQL per SVG | §C1(4) |

Not regressions (checked): no duplicated API requests on any flow (one of each read per open; Strict Mode double effects exist only in dev); no component remounts across a mode switch (0 requests, 93–164 ms); the floorplate strip and Building row do not refetch; the Properties listing's prefetches stop at `loading.tsx` (≈450 B each, no CMS read).

---

## G. Rails / API findings

Only what measurably affects the target pages:

| Finding | Evidence | Needed? | Recommendation |
|---|---|---|---|
| `units.json` unpaged is the slowest read on the map (104–178 ms local, 1,357 ms prod) and 1.25 KB/unit because of per-row image resolution, lease-term matrix, interiors, buttons | cms-bench.sh; router log | Not strictly — the Next prune (C5 step 1) removes the payload cost; the Rails time stays | Optional `view=map` slim branch in `render_connect_units` (read-only, one serializer) to cut the Rails time too |
| `floorplates.json` builds inventory meta (unit count via UnitFilterQuery, buildings, override sum, `all_locks` with 5 vendor preloads, MapMarkers, tour stop count) for every caller: 22–28 SQL | cms-bench.sh; route.ts calls it per SVG | Not if Next caches the resolved URL (C1(4)); yes otherwise | Optional read-only `only=plan` parameter that skips the meta — or a Next-side short memo |
| No single-unit read | perf-inventory.mjs unitDetail | Yes for C7 | `ids` filter on `Connect::UnitListingQuery` (read-only) |
| `automate_plotting.json` embeds every floorplate's OCR boxes and hallway rows | 109 KB raw for Hazel (8 KB gz); production OCR up to 320 KB chars on one floorplate (1146) | No (gzip hides it); P3 | Lazy OCR read when the Auto Plot wizard opens, if ever measured on the critical path |
| Production Rails timings invisible | `production.rb` log_level :error overrides lograge | Diagnostic | `log_level :info` + lograge in production (no behaviour change) |
| CMS dyno memory | R14 continuous | Yes (C3) | Dyno size or WEB_CONCURRENCY=1; memory profile |
| `Connect::UploadUrl` HEAD probing on `pyn-system` | by design since Oct 10; cached a day in Redis, five minutes for failures | No measured cost in the router log beyond the first resolution | none |
| S3 objects: no Cache-Control, no CORS, no Content-Encoding | curl headers | For the long-term direct delivery (C1(5)) | Bucket CORS rule for the Connect origin, CloudFront with compression — infra |

No business logic, schema, index or association change is required by any of the above.

---

## H. Prioritized optimization plan

| Priority | Optimization | Layer | Expected impact | Complexity | Risk | Validation |
|---|---|---|---|---|---|---|
| P0 | Gzip the plan-svg response, add ETag/304, drop `cache:'no-store'` in the hook (C1 1–3) | Next.js | −65–70 % SVG bytes; repeat views ~0 bytes; 1412 at 1.5 Mbps −5 s | Low | Low (ETag keyed on file name + updated_at) | perf.mjs plan-svg bytes/304; router `bytes` |
| P0 | Preload the initial floor SVG (and Beans background) from the server render (C2) | Next.js | SVG download overlaps JS/hydration: −1 s local, −2–4.5 s WAN, up to −9 s observed | Low | Low | perf.mjs `plan-svg start` ≈ response end |
| P0 | Give the CMS dyno memory or run one Puma worker; enable lograge in production (C3) | Infra | all reads 3–20× faster and stable; per-request timings available | Low | Low–medium (CPU headroom) | no R14 for an hour; router service times |
| P0 | Stop re-reading `floorplates.json` per SVG: memoise the resolved URL per session+property (60 s) or `only=plan` (C1 4) | Next.js (or read-only API) | −1 Rails read per floor, −2 per Beans open; −0.1–1.8 s prod each | Low–medium | Low (per-session key) | Rails log: one floorplates.json per page open |
| P1 | Self-host fonts with `next/font` (C4) | Next.js | removes a render-blocking external request; prevents multi-second stalls | Low | Very low | perf-wan "delayed8s" unchanged |
| P1 | Prune units/amenities to map fields before the client boundary (C5 step 1) | Next.js | RSC/HTML −60–70 % raw; faster hydration | Low | Low (typed pick) | perf.mjs `nav.decoded` |
| P1 | Load the floor SVG only when the SVG layer is shown (C6) | Next.js | −555 KB per image-layer floor | Low | Low | perf.mjs john plan-svg count 0 |
| P1 | Unit Detail reads one unit (`ids` filter) + floorplates meta (C7) | API + Next.js | 4 reads → 2; document −90 %; −1.3 s prod | Low–medium | Low | perf-inventory unitDetail |
| P1 | `units.json?view=map` slim serializer (C5 step 2) | API | units.json Rails time roughly halved on the map path | Medium | Low (new branch, old shape untouched) | cms-bench.sh |
| P2 | Router cache for dynamic property pages (`experimental.staleTimes.dynamic`, 30 s) + `router.refresh()` after saves | Next.js | back-navigation without the five reads | Low | Medium (stale after a save → refresh on save) | perf.mjs awayAndBack rails list empty |
| P2 | Split the demo store/mock data and the wayfinding engine out of the shell bundle (`next/dynamic`) | Next.js | −100–200 KB gz JS before hydration | Medium | Low | build output; perf-wan hydratedMs |
| P2 | Keep the last Units-tab listing in state keyed by its query (no re-read on tab round-trip) | Next.js | −1 request per tab round-trip | Low | Low | perf-inventory backToFloorplates |
| P2 | Direct S3/CloudFront delivery of SVGs with CORS + edge gzip (Phase A of docs/map_load_performance_plan.md) | Infra + Next.js | removes the proxy entirely; edge caching for every user | Medium–high | Medium (bucket policy, signed/public URLs) | network panel: SVG from CDN host |
| P3 | Lazy OCR in automate_plotting.json; sessionStorage cache of the Beans background text | API / Next.js | small | Low | Low | payload size |

Everything in P0–P1 benefits every property; nothing targets a single id.

---

## I. Before-and-after measurement plan

Capture these **before** implementation (baseline values are in `perf_audit/`), then after each P0/P1 item:

| Metric | How | Baseline (this audit) |
|---|---|---|
| Rails time, raw bytes, gzip bytes, SQL count per Connect read (8005, 1412, 1411, 1618, 4397, 1105) | `perf_audit/cms-bench.sh` against :3100 on the clone | `cms-bench.out` |
| Map open: DCL, hydrated, SVG request start, SVG bytes/ttfb/total, plan ready, Rails reads per open; reload, mode switch, floor switch, away-and-back | `perf_audit/perf.mjs` (production build on :3005) | `perf.out` (8005: 2,798 ms; 1412: 7,017 ms) |
| Map open under 4 Mbps/300 ms and 1.5 Mbps/500 ms; fonts delayed | `perf_audit/perf-wan.mjs` | `perf-wan-results.json` |
| Inventory, Units tab, search, paging, tab round-trip, Unit Detail, Property Detail | `perf_audit/perf-inventory.mjs`, `perf-followup.mjs` | `perf-inventory-results.json`, `perf-followup-results.json` |
| SVG parse/mount cost per real export | `perf_audit/parse-cost.mjs` | 10–39 ms |
| Production: service time and bytes of `/properties/:id/map`, `plan-svg`, the five CMS reads; R14 count | `heroku logs --dyno router -a pyn-system-connect`, `-a pyn-system`, `grep R14` | this report §D1 |
| Production: first-paint and SVG-start times | **unavailable** today — add a `Server-Timing` header to the map page and the plan-svg route, or a tiny RUM beacon (`performance.getEntriesByType('resource')` for plan-svg) posted to a Next route; alternatively the owner records a DevTools Performance trace of one open | — |
| Rails view/db split in production | **unavailable** (log level) — enable lograge at :info | — |

Acceptance targets: plan-svg `bytes` ≤ 40 % of the file size; one `floorplates.json` per map open; 304 on reload; `plan-svg start` within 100 ms of the page's last byte; 1412/3638 plan ready ≤ 8 s at 1.5 Mbps/500 ms (from 18.6 s); R14 absent; map RSC raw ≤ 40 % of today's.

---

## J. Risks and remaining unknowns

- **Production could not be profiled inside the processes.** Router `service` totals include the client's download time, and Rails logs nothing per request. The split between S3 fetch and client transfer inside a plan-svg call is inferred (local 45–65 ms listing + S3; production outliers of 100 s are only explainable as client-side transfer of the uncompressed body).
- **The 9 s pre-SVG gap in production was observed once** (one session, one property). Locally it is 1.0 s, 1.8 s at 4 Mbps/300 ms, 4.6 s at 1.5 Mbps/500 ms; a fonts stall reproduces 9 s. Which of JS download, fonts or the client's CPU dominated for the owner is unknown — the RUM beacon above answers it.
- **Local absolute SVG timings overstate the S3 leg**: this Mac reaches S3 at 25–240 KB/s; Heroku's leg to S3 us-west-2 is fast. The relative findings (uncompressed, uncached, serial, duplicated) do not depend on that.
- **The CMS clone ran in development mode** (no lograge, memory cache, file storage so no HEAD probing); Rails production code is faster per request than development, which strengthens, not weakens, the "queries are not the bottleneck" conclusion.
- **The bucket's CORS state** was probed only for four origins; the legacy production CMS origin may have a rule (its JS fetches S3 directly). A direct-delivery design needs the bucket policy checked by the owner.
- **Hazel's 5.9 s inventory hydration** happened once and did not reproduce (0.9 s twice) — re-check in production.
- **`/properties/:id/units` is still the demo screen** — its performance is not measurable until it reads real data.
- **Not measured:** the Tour Setup screen (same loader as the map, so C5 applies), the Tour App, companies/properties listings (already paged), and any screen on the owner's own `pynwheel_prod` puma.
- **Save paths were not exercised** (audit was read-only); the router-cache change (P2) must be validated against them.

Scripts, raw outputs and the captured map document are in `perf_audit/` (no session material is included; the scripts expect a minted session JSON whose path is given by `PERF_SCRATCH`).

---

## K. Implementation (October 11, 2026, branch `performance/nextjs-data-loading-optimization`)

The P0/P1 Next.js items and the one minimal Rails read filter were implemented the same day; PYN_CONNECT_PROGRESS.md §37 carries the full change table, the before → after measurements and the test results; context.md §32 the rules to keep. In short:

| Finding | Status | Change |
|---|---|---|
| C1 SVG proxied uncompressed, re-resolved, uncached | **Done** | gzip + strong ETag + `private, no-cache` + 304 in `plan-svg/route.ts`; the hook's fetches use the default cache; Retry uses `cache: 'reload'` + `fresh=1`; the page loader's listing is remembered per session for a minute (`planListing.server.ts`) |
| C2 SVG requested only after hydration | **Done** | `ReactDOM.preload(…, { as: 'fetch', crossOrigin: 'anonymous' })` from the map page for the first level's SVG and the Beans background |
| C3 CMS dyno memory (R14) | **Open — infrastructure** | dyno size or `WEB_CONCURRENCY=1`; lograge at `:info` in production |
| C4 Google Fonts render-blocking | **Done** | `@font-face` over `public/fonts/` (Manrope, Inter); the `<link>`s removed |
| C5 every unit with every field | **Done (Next part)** | `trimForMapScreen` before the client boundary; the Rails `view=map` serializer is deferred (the production cost is the dyno, not the serializer) |
| C6 SVG fetched on image-layer floors | **Done** | the hook loads the SVG only for the shown layer / the wizard's scope |
| C7 Unit Detail loads every unit | **Done** | one unit as a page of one (`ids` filter on `Connect::UnitListingQuery`, read-only, whitelisted) |
| C8 Beans background re-resolution | **Done** | covered by C1/C2 |
| H P2 Units tab tab-round-trip re-read | **Reverted** | a one-minute page memory was tried and withdrawn: it broke the standing "a revisit reads its page again" expectation and changed data freshness for ~130 ms |
| H P2 router cache (`staleTimes`) | **Deferred** | a save followed by a back-navigation inside the window would show pre-save data unless every save refreshes |
| H P2 demo-store / engine code splitting | **Deferred** | medium effort, no measured user-facing gain locally |
| H P2 direct S3/CloudFront delivery | **Open — infrastructure** | bucket CORS + edge gzip; the proxy now compresses and revalidates, which removes most of the cost |

Measured after (same pair, same scripts): Cypress Terra plan ready 2,798 → 2,000 ms with the SVG requested at 534 ms (before hydration) and 5 Rails reads instead of 7; reload 2,441 → 450 ms (304); Jennifer 3638 7,017 → 1,418 ms with 495,745 bytes on the wire instead of 1,412,369; at 1.5 Mbps / 500 ms, 9,790 → 6,783 ms and 18,557 → 7,794 ms; the 8 s fonts delay no longer delays the first paint (9.4 s → 0.4–0.9 s); Unit Detail documents 489–676 KB → 52–97 KB; John Demo's image-layer floors download no SVG. The dual-map verification of October 10 passes unchanged (31 checks). Production itself was not redeployed by this work; the Heroku numbers in §D1 remain the baseline to compare against after a deploy.
