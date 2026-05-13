# SVG Gzip-at-Upload Performance Plan

**Goal:** Sub-1-second first-ever load.  
**Constraint:** No structural changes to SVG content. No SDK parsing changes. No image separation.  
**Approach:** Compress SVGs before storing on S3, backfill existing uploads, fix the fetch pipeline to handle pre-compressed files.  
**Date:** 2026-04-28

---

## Why compression at upload is the right lever here

The current pipeline compresses SVG **at request time** inside `SvgCacheService.compress()` — this only helps the Rails → Redis store and the Rails → browser response. It does nothing for the S3 file itself.

`SiteMapUploader` has no `fog_attributes` for `Content-Encoding`. Every SVG on S3 today is stored as raw uncompressed XML. `SvgCacheService.fetch_raw` calls `URI.open(url).read`, which downloads the full uncompressed file from S3 on every Redis cache miss.

If we store SVGs on S3 with `Content-Encoding: gzip` and a pre-compressed body:
- S3 stores and serves the gzip bytes directly — no runtime compression
- `fetch_raw` picks up gzip bytes, skips re-compression, stores in Redis
- `fetch_svg_image` sends those bytes with `Content-Encoding: gzip` → browser decompresses automatically
- On first load the browser downloads compressed bytes, not 2.6 MB of raw XML

---

## Measure before building

Run this against the actual SVG to know the realistic compression ratio before writing code:

```bash
# Download raw file and check real gzip size
curl -s "https://images-pynwheel-cms-v2.s3.us-west-2.amazonaws.com/uploads/floorplate/svg_image/3888/1763584625-2362_N_Green_Valley_Pkwy__Henderson__NV_Floor-3_standardizedId-poly.svg" \
  -o /tmp/floor.svg

wc -c /tmp/floor.svg                       # raw size (expect ~2.6 MB)
gzip -9 -k /tmp/floor.svg && wc -c /tmp/floor.svg.gz   # gzip-9 size
```

**Expected results:**
- If SVG is mostly polygon XML (no large embedded image): 2.6 MB → 300–600 KB (gzip works well on repetitive XML)
- If SVG contains a large base64-encoded PNG background: 2.6 MB → 1.8–2.2 MB (base64 resists gzip — PNG is already compressed)

**If gzip alone gives >70% reduction → this plan is sufficient for sub-1s first load.**  
**If gzip gives <40% reduction → compression alone won't reach the goal; the prior image-separation plan is also needed.**

---

## Also run SVGO first (before gzip)

The SVG has coordinates like `638.697,193.601` — 3 decimal places on every polygon vertex. Hundreds of units × 18 points each × 6 coordinate values = thousands of floats. SVGO can safely truncate to 1 decimal place and strip other redundant markup.

```bash
# Install SVGO if not present
npm install -g svgo

# Optimize and compare
svgo --precision=1 /tmp/floor.svg -o /tmp/floor_opt.svg
wc -c /tmp/floor_opt.svg                   # post-SVGO size
gzip -9 -k /tmp/floor_opt.svg && wc -c /tmp/floor_opt.svg.gz   # post-SVGO + gzip
```

SVGO typically reduces SVG markup by 20–40% before gzip even runs. Combined, SVGO + gzip on polygon-heavy SVGs regularly achieves 80–90% reduction.

---

## Implementation Plan

### Step 1 — Fix `SvgCacheService.fetch_raw` to get raw bytes without auto-decompression

**File:** [app/services/cache/svg_cache_service.rb](../app/services/cache/svg_cache_service.rb)

**Problem:** `URI.open(url).read` auto-decompresses `Content-Encoding: gzip` responses. Once S3 stores gzip, `fetch_raw` will return *decompressed* XML text — then `compress()` re-gzips it, wasting CPU on every Redis miss.

**Fix:** Replace `URI.open` with `Net::HTTP` without `Accept-Encoding`, so we get the raw gzip bytes directly. Then detect magic bytes to skip double-compression:

```ruby
require 'zlib'
require 'net/http'

class SvgCacheService
  GZIP_MAGIC = "\x1F\x8B".b.freeze

  private_class_method def self.fetch_raw(url)
    return nil unless url
    if Rails.env.development?
      File.read(url)
    else
      uri = URI.parse(url)
      # Net::HTTP without Accept-Encoding → S3 returns raw bytes as stored
      # (gzip bytes if Content-Encoding: gzip is set on the object)
      Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', read_timeout: 15) do |http|
        http.get(uri.request_uri).body
      end
    end
  rescue StandardError
    nil
  end

  private_class_method def self.compress(raw)
    return nil unless raw
    return raw if raw.b[0, 2] == GZIP_MAGIC   # already gzip — skip double-compression
    buf = StringIO.new.binmode
    gz  = Zlib::GzipWriter.new(buf)
    gz.write(raw)
    gz.close
    buf.string
  end
end
```

This is backwards-compatible: SVGs not yet re-uploaded will still be raw XML, `compress()` will gzip them as before. Once backfilled, the magic-byte check kicks in.

**`decompress` is unaffected** — `Zlib::GzipReader` works correctly whether the bytes came from S3 directly or were compressed by us.

---

### Step 2 — Gzip-compress SVG at upload time in `SiteMapUploader`

**File:** [app/uploaders/site_map_uploader.rb](../app/uploaders/site_map_uploader.rb)

Two things to add:
1. A `process` step that rewrites the cached file with gzip bytes before CarrierWave hands it to fog.
2. `fog_attributes` that sets `Content-Encoding: gzip` on the S3 object.

```ruby
require 'zlib'

class SiteMapUploader < CarrierWave::Uploader::Base
  include CarrierWave::RMagick
  include Sprockets::Rails::Helper

  process :set_file_dimensions
  process :gzip_svg_content, if: :svg?   # <-- add this

  storage Rails.env.development? ? :file : :fog

  # Rewrites the locally cached file with gzip bytes before fog uploads to S3.
  # Only runs for SVG uploads. The original_content_type is preserved via fog_attributes.
  def gzip_svg_content
    return unless svg?(file)
    raw = File.binread(current_path)
    return if raw.b[0, 2] == "\x1F\x8B".b   # already gzip, skip
    compressed = StringIO.new.binmode
    Zlib::GzipWriter.wrap(compressed) { |gz| gz.write(raw) }
    File.open(current_path, 'wb') { |f| f.write(compressed.string) }
  end

  # Sets S3 object metadata so browsers and fetch_raw treat bytes correctly.
  def fog_attributes
    return {} unless svg?(file)
    {
      'Content-Encoding' => 'gzip',
      'Content-Type'     => 'image/svg+xml',
      'Cache-Control'    => 'public, max-age=86400'
    }
  end

  # existing code below unchanged ...
  version :svg_for_metro, if: :image? do
    # ...
  end
end
```

**Important:** `process :gzip_svg_content` must run **after** `set_file_dimensions` because dimension extraction reads the raw XML. Order in CarrierWave is top-to-bottom so put `gzip_svg_content` after `set_file_dimensions`.

**The `svg_for_metro` version** only runs `if: :image?` (PNG/JPG). SVGs never enter that branch. No conflict.

---

### Step 3 — SVGO optimization at upload (optional but recommended)

Add an SVGO pass before the gzip step. Requires the `svgo` Node.js binary to be available on the dyno (add to `package.json`) or use a Ruby SVGO wrapper.

Simplest approach — call SVGO via shell during upload processing:

```ruby
def optimize_svg_content
  return unless svg?(file)
  return unless system("which svgo > /dev/null 2>&1")   # skip if svgo not installed
  system("svgo --precision=1 --quiet #{current_path} -o #{current_path}")
end

# Process order: set_file_dimensions → optimize_svg_content → gzip_svg_content
process :set_file_dimensions
process :optimize_svg_content, if: :svg?
process :gzip_svg_content,     if: :svg?
```

If adding Node.js to the dyno is not acceptable, skip SVGO for now — gzip alone still compresses the XML structure well.

---

### Step 4 — Backfill worker for existing SVGs on S3

**New file:** [app/workers/svg_gzip_backfill_worker.rb](../app/workers/svg_gzip_backfill_worker.rb)

This worker:
1. Downloads the existing raw SVG from S3.
2. Gzip-compresses it.
3. Re-uploads to the **same S3 key** using the AWS SDK `put_object` (preserves the URL in the DB — no DB changes needed).
4. Invalidates the Redis cache so `fetch_svg_image` re-reads from S3 on next request.

```ruby
require 'zlib'
require 'net/http'

class SvgGzipBackfillWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'low', retry: 2

  GZIP_MAGIC = "\x1F\x8B".b.freeze

  def perform(resource_type, resource_id)
    resource = find_resource(resource_type, resource_id)
    return unless resource&.svg_image&.present?

    s3_url = resource.svg_image.url
    return unless s3_url.present?

    raw = download_raw(s3_url)
    return if raw.nil?
    return if already_gzip?(raw)   # already compressed — skip

    compressed = gzip(raw)
    s3_key     = extract_s3_key(s3_url)

    s3_client.put_object(
      bucket:           ENV['S3_BUCKET_NAME'],
      key:              s3_key,
      body:             compressed,
      content_type:     'image/svg+xml',
      content_encoding: 'gzip',
      cache_control:    'public, max-age=86400',
      acl:              'public-read'
    )

    # Blow away the Redis cache so next request picks up the compressed S3 file
    map_type = resource_type == 'sitemap' ? 'sitemap' : 'floorplate'
    SvgCacheService.delete(resource_id, map_type)

    Rails.logger.info "[SvgGzipBackfillWorker] #{resource_type}##{resource_id}: #{raw.bytesize} → #{compressed.bytesize} bytes"
  rescue StandardError => e
    Rails.logger.error "[SvgGzipBackfillWorker] #{resource_type}##{resource_id} failed: #{e.message}"
    raise
  end

  private

  def find_resource(type, id)
    case type
    when 'sitemap'    then Sitemap.find_by(id: id)
    when 'floorplate' then Floorplate.find_by(id: id)
    end
  end

  def download_raw(url)
    uri = URI.parse(url)
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', read_timeout: 30) do |http|
      http.get(uri.request_uri).body
    end
  rescue StandardError
    nil
  end

  def already_gzip?(data)
    data.b[0, 2] == GZIP_MAGIC
  end

  def gzip(raw)
    buf = StringIO.new.binmode
    Zlib::GzipWriter.wrap(buf) { |gz| gz.write(raw) }
    buf.string
  end

  def extract_s3_key(url)
    # Strip the bucket hostname to get the S3 object key
    # e.g. "https://bucket.s3.us-west-2.amazonaws.com/uploads/floorplate/svg_image/3888/file.svg"
    #   → "uploads/floorplate/svg_image/3888/file.svg"
    URI.parse(url).path.sub(%r{^/}, '')
  end

  def s3_client
    @s3_client ||= Aws::S3::Client.new(
      region:            'us-west-2',
      access_key_id:     ENV['AWS_ACCESS_KEY_ID'],
      secret_access_key: ENV['AWS_SECRET_ACCESS_KEY']
    )
  end
end
```

**New rake task to enqueue all existing SVGs:**

Add to [lib/tasks/svg_cache.rake](../lib/tasks/svg_cache.rake):

```ruby
desc "Enqueue gzip backfill for all existing SVG uploads on S3"
task svg_gzip_backfill: :environment do
  floorplate_ids = Floorplate
    .joins(:community)
    .merge(Community.active_client_properties.where(enable_svg_mode: true))
    .where.not(svg_image: [nil, ''])
    .pluck(:id)

  sitemap_ids = Sitemap
    .joins(:community)
    .merge(Community.active_client_properties.where(enable_svg_mode: true))
    .where.not(svg_image: [nil, ''])
    .pluck(:id)

  floorplate_ids.each { |id| SvgGzipBackfillWorker.perform_async('floorplate', id) }
  sitemap_ids.each    { |id| SvgGzipBackfillWorker.perform_async('sitemap', id) }

  puts "Enqueued #{floorplate_ids.size} floorplate + #{sitemap_ids.size} sitemap SVG backfill jobs"
end
```

Run once:
```bash
heroku run rake svg_gzip_backfill -a pynwheel-cms
```

---

### Step 5 — Re-warm Redis immediately after SVG upload

**File:** [app/models/floorplate.rb:150](../app/models/floorplate.rb#L150)

The `after_commit :invalidate_sdk_cache` deletes Redis but the scheduler re-warms only every 20 minutes. After an upload there is a 0–20 minute cold window.

```ruby
def invalidate_sdk_cache
  SdkCacheService.invalidate_map(community_id, id, 'floorplate')
  SvgCacheWarmingWorker.perform_async(community_id) if community.enable_sdk_map_cache? && community.enable_svg_mode?
end
```

Same change in `Sitemap` model's equivalent callback. Cold window drops from up to 20 minutes → seconds (Sidekiq queue latency).

---

## What changes where — summary

| File | Change | Why |
|------|--------|-----|
| [app/services/cache/svg_cache_service.rb](../app/services/cache/svg_cache_service.rb) | Replace `URI.open` with `Net::HTTP`, add gzip magic-byte detection in `compress()` | Prevent auto-decompression; avoid double-gzip |
| [app/uploaders/site_map_uploader.rb](../app/uploaders/site_map_uploader.rb) | Add `gzip_svg_content` process + `fog_attributes` | Store gzip on S3 at upload time |
| [app/workers/svg_gzip_backfill_worker.rb](../app/workers/svg_gzip_backfill_worker.rb) | New worker | Re-compress existing S3 SVGs |
| [lib/tasks/svg_cache.rake](../lib/tasks/svg_cache.rake) | Add `svg_gzip_backfill` task | Trigger backfill for all existing SVGs |
| [app/models/floorplate.rb](../app/models/floorplate.rb) | Re-enqueue warming after invalidation | Close the 20-min cold window |
| Sitemap model | Same warming re-enqueue | Same reason |

**No SDK changes. No DB migrations. No SVG structural changes. URLs stay the same.**

---

## Deployment order

1. **Deploy Step 1** (`SvgCacheService` fetch fix) first — safe, backwards-compatible, works for both old uncompressed and new compressed S3 files.
2. **Deploy Steps 2 + 5** (`SiteMapUploader` gzip + model warm-on-upload) — new uploads will be compressed from this point forward.
3. **Deploy Step 4** (backfill worker) — run `rake svg_gzip_backfill` to compress all existing files.
4. **Optional Step 3** (SVGO) — add later once Node.js is confirmed available on dynos.

---

## Risk notes

- **S3 `put_object` in backfill overwrites the object in place** — the URL in the database does not change. If the backfill fails mid-way, the file is still the original uncompressed SVG. Retry is safe (idempotent — `already_gzip?` check prevents re-compressing).
- **CarrierWave re-reads `current_path` in some processing chains.** The `gzip_svg_content` process runs last and only rewrites the bytes; CarrierWave's fog adapter reads `current_path` to upload — it will get the gzip bytes.
- **`set_file_dimensions`** runs first and reads raw XML — correct order is `set_file_dimensions` → `gzip_svg_content`.
- **Compression ratio is not guaranteed.** If the SVG contains a large base64-encoded JPEG background (JPEG is already compressed — its base64 encoding resists gzip), final size may only reduce 20–30%. Measure first (Step 0 above) before declaring this sufficient.
