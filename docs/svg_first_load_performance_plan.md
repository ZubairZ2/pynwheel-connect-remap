# SVG First Load Performance Plan

**Goal:** Sub-1-second first-ever load, matching subsequent loads.  
**Current state:** 40s first load, ~1s subsequent loads (localStorage cache hit).  
**Date:** 2026-04-28

---

## Why the warm-cache server did not fix it

The Redis warm-cache approach (`SvgCacheWarmingWorker`) was built on a wrong assumption: that the bottleneck was the Rails → S3 round trip at request time. The real bottleneck is the SVG file itself is **2.6 MB** of uncompressed XML stored on S3. Even when Redis is warm, the browser must download and parse 2.6 MB of text on first ever load (localStorage is empty). The Redis cache only helps the Rails → S3 leg; it does nothing for the browser → Rails leg.

Subsequent loads are fast because the SDK stores the raw SVG text in `localStorage` keyed by `updatedAt`. The browser never fetches it again until the SVG changes. The fix must make the **first** browser download fast too.

---

## Root Cause: Embedded Raster Image in SVG

The SVG at `c.floorplates.first.svg_image.url` is 2.6 MB. The SVG code contains:

```xml
<rect fill="url(#pattern2_0_1)" />
```

This `pattern2_0_1` definition (inside `<defs>`) almost certainly contains a base64-encoded raster floor plan image (PNG/JPG) embedded directly inside the SVG file. That embedded image accounts for nearly all of the 2.6 MB. The actual polygon overlays (unit outlines, text labels) are only tens of kilobytes.

**Verify this:**
```bash
# Download and check how large the <defs> section is
curl -s "https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com/uploads/floorplate/svg_image/3888/1763584625-..." \
  | grep -o '<defs>.*</defs>' | wc -c
```

---

## The Fix: Three Layers (implement in order)

### Layer 1 — Separate the background image from the SVG overlay [HIGHEST IMPACT]

**What to do:**  
During SVG upload processing, split the file into two parts:
1. **Background image** — extract the raster image from `<defs>/<pattern>`, upload it as a separate PNG/WebP asset to S3, store the URL in a new `background_image_url` column on `floorplates`/`sitemap`.
2. **SVG overlay** — remove the `<defs>/<pattern>` block and the `<rect fill="url(...)">` background element. Keep only the unit polygons, text labels, and amenity elements. This file drops to ~50–100 KB.

**Result:** The SVG the SDK downloads goes from 2.6 MB → ~80 KB. Even uncompressed, 80 KB loads in well under 1 second.

**Where to implement:**

- [app/helpers/svg_upload_helper.rb](../app/helpers/svg_upload_helper.rb) — add `extract_and_separate_background(doc)` that:
  1. Finds `<image>` or `<pattern>` nodes in `<defs>` that contain a base64 data URI.
  2. Decodes and uploads the image as `background_image_url` via CarrierWave or direct S3 SDK.
  3. Removes the pattern node and the `<rect fill="url(#pattern...)">` from the SVG.
  4. Returns the stripped SVG XML.
- [app/uploaders/site_map_uploader.rb](../app/uploaders/site_map_uploader.rb) — call the extraction before storing.
- Schema: add `background_image_url :string` to `floorplates` and `sitemaps` tables.
- SDK: load the background image as a plain `<img>` or CSS `background-image` underneath the SVG overlay. These load independently and the browser caches the background separately.

**Migration path for existing uploads:**  
Write a rake task that iterates all floorplates/sitemaps with `enable_svg_mode: true`, extracts the background from the existing SVG, re-uploads the stripped SVG, and populates `background_image_url`.

---

### Layer 2 — Store SVG gzip-compressed on S3 [MEDIUM IMPACT]

**Current problem:**  
`SiteMapUploader` uploads SVGs as raw uncompressed XML with no `Content-Encoding` header. CarrierWave has no compression configured. The file is 2.6 MB on S3.

**Fix:**  
In `SiteMapUploader`, add `fog_attributes` to set gzip metadata on SVG uploads:

```ruby
# app/uploaders/site_map_uploader.rb
def fog_attributes
  return {} unless svg?(file)
  {
    'Content-Encoding'  => 'gzip',
    'Content-Type'      => 'image/svg+xml',
    'Cache-Control'     => 'public, max-age=31536000'
  }
end

def store!(new_file)
  if svg?(new_file)
    # Gzip-compress the SVG content before handing to CarrierWave/fog
    compressed = Zlib::GzipWriter.wrap(StringIO.new.binmode) { |gz| gz.write(new_file.read) }.string
    # Wrap in a tempfile with compressed bytes
    # ... (see implementation notes below)
  end
  super
end
```

When S3 stores the file with `Content-Encoding: gzip`, it decompresses automatically for browsers that do not send `Accept-Encoding: gzip`. For browsers that do (all modern browsers), S3 sends the gzip bytes directly.

**Result:** `URI.open(url).read` in `SvgCacheService.fetch_raw` gets the pre-compressed bytes from S3 directly — no runtime compression needed. `SvgCacheService.compress()` can be bypassed for S3-stored SVGs.

**Implementation note:** CarrierWave does not support pre-compression natively. The cleanest approach is to override `cache!` in the uploader to replace the file content with gzip bytes before the fog upload kicks in.

---

### Layer 3 — Include SVG inline in fetch_data response [ELIMINATES SECOND HTTP REQUEST]

**Current flow:**
```
Browser → fetch_data (JSON)  ~200ms
Browser → fetch_svg_image    ~40,000ms (cold)  or  ~300ms (warm Redis)
```

**Fixed flow:**
```
Browser → fetch_data (JSON + svgContent embedded)  ~500ms total
```

**`SvgCacheService.fetch_raw_text`** already exists and does exactly this. It is not wired up.

**Where to implement:**  
In [app/services/sdk_payload_builder_service.rb](../app/services/sdk_payload_builder_service.rb), `sitemap_json` and `floorplates_json` methods — add an optional `svgContent:` field for the primary map:

```ruby
def sitemap_json
  return nil unless @community&.is_sitemap?
  sitemap = @community.sitemap
  return nil unless sitemap
  svg_url = Rails.env.development? ? sitemap.svg_image.path : sitemap.validated_svg_image_url
  {
    mapId:      sitemap.id,
    mapType:    'sitemap',
    updatedAt:  sitemap.updated_at.to_i,
    svgContent: SvgCacheService.fetch_raw_text(sitemap.id, 'sitemap', svg_url: svg_url)
  }
end
```

In the SDK ([public/sdk/pyn-map-sdk-v1.js](../public/sdk/pyn-map-sdk-v1.js)), check `this.data.sitemap.svgContent` before making the `fetch_svg_image` HTTP request:

```js
async _loadSVG(mapId, mapType) {
  // Check if fetch_data already included the SVG inline
  const entry = this._findMapEntry(mapId, mapType);
  if (entry?.svgContent) {
    const svgElement = this._parseSVG(entry.svgContent);
    if (svgElement) {
      try { localStorage.setItem(this._svgCacheKey(mapId), entry.svgContent); } catch {}
      return svgElement;
    }
  }
  // ... fall through to existing fetch_svg_image logic
}
```

**Only inline the primary (first) map.** Additional floorplates continue to use the existing `_prefetchRemainingMaps` lazy-load approach (which is already fast because of localStorage caching after the first tab switch).

**Payload size concern:** After Layer 1 strips the background, each SVG is ~80 KB. Gzip-compressed JSON payload grows by ~20–30 KB per inlined SVG — acceptable.

---

## Supporting Fix — Trigger cache warm on SVG upload

**Current problem:**  
When an SVG is uploaded/updated, `SdkCacheService.invalidate_map` deletes the Redis entry. The `SvgCacheWarmingWorker` only runs via Heroku Scheduler (every 20 min). In the window between upload and next scheduler run, all first loads are cold.

**Fix:** In [app/models/floorplate.rb](../app/models/floorplate.rb) `after_commit :invalidate_sdk_cache`, immediately re-enqueue the warming worker:

```ruby
def invalidate_sdk_cache
  SdkCacheService.invalidate_map(community_id, id, 'floorplate')
  SvgCacheWarmingWorker.perform_async(community_id)  # re-warm immediately
end
```

Same change in the `Sitemap` model. This means the cache is cold for at most seconds (worker queue latency), not up to 20 minutes.

---

## Compression check on current upload

The user noted compression may not be working. To verify:

```bash
# Check the actual Content-Encoding header S3 returns
curl -sI "https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com/uploads/floorplate/svg_image/3888/1763584625-..." \
  | grep -i "content-encoding\|content-length\|content-type"
```

Expected (broken): `Content-Type: image/svg+xml` with no `Content-Encoding` header — confirms the file is stored uncompressed.

The `SvgCacheService.compress()` runs gzip on the Rails server side **at request time**, not at upload time. So S3 always has the raw uncompressed file. The gzip in the service only compresses the Redis-cached copy and the HTTP response. It does **not** compress the file on S3.

---

## Implementation Priority

| # | Change | Files | Impact | Effort |
|---|--------|-------|--------|--------|
| 1 | Strip embedded raster from SVG on upload | `svg_upload_helper.rb`, `site_map_uploader.rb`, new migration | **10x** size reduction | 3–4 days |
| 2 | Re-warm Redis immediately after SVG upload | `floorplate.rb`, `sitemap.rb` | Eliminates cold-cache window | 30 min |
| 3 | Inline primary SVG in `fetch_data` response | `sdk_payload_builder_service.rb`, `pyn-map-sdk-v1.js` | Eliminates second HTTP request | 1–2 days |
| 4 | Store SVG gzip-compressed on S3 at upload time | `site_map_uploader.rb` | Eliminates runtime compression | 1 day |
| 5 | Migrate existing SVGs (rake task) | New rake task | Fixes existing data | 2–3 hours |

Implement in order: **2 → 3 → 1 → 5 → 4**. Fix #2 is a 30-minute change that stops the cold-cache window immediately. Fix #3 eliminates the sequential request problem and will show a significant improvement once SVG size is reduced. Fix #1 is the biggest win but requires careful SVG processing logic.

---

## What NOT to do

- **Do not increase the Redis TTL further.** The issue is not TTL expiry — it is the SVG being too large and the file not being served efficiently.
- **Do not add more warming workers or run the scheduler more often.** That only reduces the cold window; it does not fix the fundamental size problem.
- **Do not add CloudFront in front of the `fetch_svg_image` API endpoint.** API endpoints with Authorization headers are not CDN-cacheable without custom Lambda@Edge work. Focus on reducing the payload first.
