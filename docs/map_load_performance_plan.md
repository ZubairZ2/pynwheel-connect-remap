# Map Load-Time Performance — Review & Plan

Focus: **first-time (cold) load** of the map SDK — first visit, hard
refresh, new browser, expired session. Covers `pyn-map-sdk.js` (client
integrations) and `pyn-map-sdk-v1.js` (our new SDK maps), plus the Rails
serving path behind them.

The SVG Optimizer (see `svg_optimizer_plan.md`) already attacks the single
biggest factor — oversized embedded rasters. This doc covers **everything
else** still standing between a cold visitor and an interactive map.

---

## 1. What actually happens on a cold load

Both SDKs run the same critical chain. Nothing renders until all of it
finishes, and every hop goes to the Rails origin:

```
  ┌── SDK <script> download + parse (3,886 lines, unminified) ──┐
  │                                                             │
  ▼                                                             ▼
[1] GET /authorized      (X-API-Key → session token)      ~1 RTT + DB
        │  (serial)
        ▼
[2] GET /fetch_data      (Bearer token → full JSON config) ~1 RTT + DB + serialize
        │  (serial — needs config to know which map is "active")
        ▼
[3] GET /fetch_svg_image (Bearer token → the big SVG)      ~1 RTT + S3 download + gzip
        │
        ▼
   DOMParser(multi-MB text) → cloneNode(true) → panzoom → paint
```

Three **strictly serial** origin round-trips before the first paint, the
third of which drags a multi-megabyte body through Rails. The waterfall,
not just the file size, is the problem.

### What v1 already does well (keep, don't redo)
- **Token cache** (`_readCachedToken`) skips step [1] on warm loads.
- **panzoom loaded in parallel** with the auth/config chain (`panZoomReady`).
- **`_prefetchRemainingMaps()`** after boot → floor switches feel instant.
- **localStorage SVG cache** (v1 only) → warm reloads skip step [3].

None of those help the **cold** path, which is the stated problem. The
older `pyn-map-sdk.js` deliberately has **no** localStorage SVG cache
(large base64 SVGs truncate silently past quota) and loads panzoom/SVG
more serially — so client integrations are worse off than our own maps.

---

## 2. The findings, ranked by impact-per-effort

### 🔴 F1 — Rails proxies the whole SVG through Puma, with zero caching
`SdkController#fetch_svg_image` → `SvgFetchService.fetch` does, **on every
single request**:

```ruby
URI.open(url).read           # download the ENTIRE multi-MB SVG from S3 into memory
Zlib::GzipWriter … gz.write  # re-gzip it from scratch, every time
send_data compressed         # stream it back through the web thread
```

Consequences:
- A Puma worker thread is **blocked for the full S3 download + gzip** of a
  multi-MB file — under any concurrency this starves the thread pool and
  inflates TTFB for *every* request, not just map requests.
- **No CDN / edge caching.** Every visitor in every region pulls from the
  origin, which itself re-pulls from S3. Two serial hops, cold every time.
- **Re-gzips identical bytes on every hit** — pure wasted CPU. And gzip of
  a base64-encoded JPEG barely compresses (~1.1–1.3×), so we pay the CPU
  and get little back on exactly the files that hurt most.

This is the highest-leverage fix and it's **infrastructure, not SDK**.

### 🔴 F2 — Serial 3-request waterfall to origin
Steps [1]→[2]→[3] cannot currently overlap because [3] needs [2]'s config
to pick the active map. On a cold, distant client that's ~3× the base
latency before anything is on screen.

### 🟠 F3 — The raster lives *inside* the parsed SVG DOM
Even after WebP optimization, the background image is still base64-inlined
in the SVG text. That means:
- The browser must download the **entire** raster before it can `DOMParser`
  and paint *anything*, including the interactive unit polygons.
- `DOMParser(multi-MB)` + `cloneNode(true)` run on the **main thread** and
  block interactivity — cost scales with the inlined raster, not the vector.

The vector layer (unit polygons, labels — the actually-interactive part) is
tiny. It's held hostage by the raster.

### 🟠 F4 — `fetch_data` rebuilds the full payload every request
`build_sdk_payload` runs fresh on every call (comment: "no caching layer"),
after `load_community_from_session` eager-loads **9 associations**. For the
cold path this DB + serialization work sits directly in the critical
waterfall.

### 🟡 F5 — The client SDK file itself is heavy and unminified
`pyn-map-sdk-v1.js` is 3,886 lines of readable source with panzoom bundled
inline, served from `asset_host = ENV['HOST_URL']` (the origin, not clearly
a CDN). No evidence of minification or a build step. First-load must
download + parse all of it before step [1] can even start.

### 🟡 F6 — No perceived-performance treatment
Cold load shows text spinners ("Verifying partner…", "Loading SVG maps…").
There's no skeleton, no low-quality placeholder (LQIP), no progressive
reveal — the user stares at a spinner for the whole waterfall.

---

## 3. Recommended plan (phased)

### Phase A — Stop proxying SVGs through Rails  *(biggest win, infra)*
Pick one of these, in preference order:

1. **Signed-URL redirect (best).** `fetch_svg_image` keeps doing the cheap
   token + ownership check, then returns a **short-lived signed
   CloudFront/S3 URL** (or a 302 to it) instead of the bytes. The browser
   pulls the SVG straight from the edge. Rails never touches multi-MB
   bodies; the CDN handles caching, gzip/brotli, and geo-distribution.
   Requires a small SDK change (follow the URL) — worth it.
2. **CDN in front of the existing endpoint.** Put CloudFront ahead of
   `/fetch_svg_image`, honoring the `ETag` already emitted. Cuts origin
   hits dramatically with **no SDK change**, but Rails still serves cold
   misses through Puma.
3. **At minimum, cache the compressed bytes.** Store the gzipped SVG in
   `Rails.cache`/S3 keyed by `map_id + updated_at` so Puma stops
   re-downloading and re-gzipping identical files. Cheapest, smallest win.

> Do Phase A **and** finish the SVG Optimizer — they multiply: smaller file
> *and* served from the edge.

### Phase B — Collapse the waterfall
- **Combined bootstrap endpoint**: one authenticated call returns config +
  the primary map's SVG URL (post-Phase-A) in a single response, so [2] and
  the *resolution* of [3] happen together. Client then makes one edge fetch
  for the SVG.
- **Or** parallelize with what exists: the server already knows the default
  map, so it can hand the SDK the active `mapId` in the `authorized`
  response — letting [3] start against the CDN in parallel with [2].
- Backport v1's token cache + parallel panzoom load to the legacy
  `pyn-map-sdk.js` so client integrations get the warm-path wins too.

### Phase C — Split the raster out of the SVG  *(structural, high value)*
Extend the optimizer: instead of re-encoding the base64 raster **in place**,
**extract** it to a standalone WebP/AVIF on the CDN and replace the inline
`data:` URI with an `href` to it. Result:
- The SVG text shrinks to ~the vector layer — parses and paints in a blink.
- Unit polygons are interactive immediately; the background raster streams
  in separately (and can be an LQIP first, then the full image).
- Offloads the heaviest bytes to the CDN as a cacheable image, not markup.

This is the natural Phase-2 evolution of the optimizer and pairs with F3/F6.

### Phase D — Payload + delivery hygiene
- Cache the `fetch_data` payload (minus per-session favorites, which merge
  in memory) keyed by `community + updated_at`. Removes F4 from the cold
  path.
- Add a **build step** for the client SDK: minify + brotli, far-future
  `immutable` cache headers, served from a real CDN. Ship a `.min.js` to
  integrators.
- Offload `DOMParser`/clone work or chunk it so it doesn't jank the main
  thread (less critical once Phase C shrinks the SVG).

### Phase E — Perceived performance
- Skeleton/blurred LQIP of the map immediately on init.
- Progressive reveal: vector layer first (interactive), raster fades in.
- Replace text spinners with a real loading state tied to the phases above.

---

## 4. Suggested sequencing

| Order | Item | Effort | Impact on cold load |
|---|---|---|---|
| 1 | **Phase A.1** signed-URL / CDN for SVG | M | 🔴 Huge |
| 2 | Finish SVG Optimizer rollout | (in progress) | 🔴 Huge |
| 3 | **Phase B** combined/parallel bootstrap | M | 🟠 High |
| 4 | **Phase C** extract raster from SVG | M–L | 🟠 High |
| 5 | **Phase D** payload cache + minified CDN SDK | S–M | 🟡 Medium |
| 6 | **Phase E** LQIP / progressive reveal | S–M | 🟡 Perceived |

Phases A, B, D are backend/infra and **independent of the SVG content** —
they help every property immediately, including `is_beans_svg?` ones the
optimizer skips. Phases C and E are the deeper structural wins.

---

## 5. Open questions for review
1. Is there already a CDN (CloudFront) in the stack, or is `HOST_URL` the
   bare origin? Determines whether Phase A is "configure" or "introduce."
2. Are integrators pinned to an exact SDK filename/URL, or can we ship a
   versioned `.min.js` without breaking them?
3. Acceptable to change the SDK's SVG fetch to **follow a redirect / URL**
   (Phase A.1), or must the byte-proxy contract stay (→ Phase A.2/A.3)?
4. Any constraint on the combined bootstrap endpoint (Phase B), or is the
   3-call contract something partners depend on directly?
