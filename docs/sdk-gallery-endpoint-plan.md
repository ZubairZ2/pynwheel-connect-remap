# SDK Gallery — Implementation Notes

Lazy-loaded property gallery for `pyn-map-sdk-v1.js`, served by a dedicated
partner-maps endpoint and gated on the **Pynwheel Touch** toggle.

- **Status:** implemented
- **Scope:** property gallery (amenity galleries already shipped in the SDK payload)

---

## 1. How galleries were passed before

Two distinct gallery concepts live in the legacy jbuilders.

### A. Property gallery — the one that was ported

`app/views/api/v1/communities/data.json.jbuilder:1598-1629`, with an identical
block at `app/views/api/v1/communities/data_group.json.jbuilder:1614-1645`:

```ruby
json.gallery do
  json.show_gallery_page           @community.show_gallery
  json.gallery_page_name           @community.gallery_page_name
  json.display_gallery_on_homepage @community.display_gallery_on_homepage

  if @community.gallery_images.present?
    json.categories @community.galleries.order(:sort).pluck(:name).each do |name|
      json.title name
    end

    json.images @community.gallery_images.each do |img|
      unless params[:action] == "ios_data"
        if img.standard_image_url.include?(".mp4") || img.standard_image_url.include?(".MP4")
          json.url    (img.video.url || img.standard_image_url)
          json.video  true
          json.poster "https://…/124-1518624577-video-placeholder.jpg"
        else
          json.url   img.large_image_url + (img.crop_x.present? ? "?temp/#{img.crop_x}#{basename}" : "")
          json.video false
        end
        json.type img.gallery.name   # N+1
        json.id   img.id
      else
        # ios_data variant: skips videos, ships ios_image_url instead
      end
    end
  end
end
```

**Data model**

| Piece | Source |
| --- | --- |
| Categories | `Community has_many :galleries` — `app/models/community.rb:26`, ordered by `sort` |
| Images | `Community has_many :gallery_images, -> { order(:sort) }` — `app/models/community.rb:27` |
| Image versions | `app/uploaders/gallery_uploader.rb` — `:large` (1920×1080), `:thumb` (640×360), `:ios` (1024×768), `:video_thumbnail` |
| URL columns | `standard_image_url`, `large_image_url`, `ios_image_url`, populated on create |

### B. Amenity galleries — already done

`json.gallery amenity.amenity_galleries` repeats four times in
`data.json.jbuilder` (lines 1336, 1436, 1461, 1529). Already exposed in the SDK
as `additionalImages` — `app/services/sdk_payload_builder_service.rb:305-311`.
Untouched.

### Defects in the jbuilder that were not carried forward

| Issue | Impact |
| --- | --- |
| Only `large_image_url` (1920×1080) shipped | Grid downloaded full-res for every tile |
| `img.gallery.name` inside the loop | N+1 query per image |
| Hardcoded 2018 video placeholder | The `video_thumbnail` version existed and was ignored |
| `img.standard_image_url.include?` with no nil guard | `NoMethodError` on a half-uploaded row |
| `?temp/<crop_x><filename>` cache-buster | Malformed query string |
| Hardcoded dev IP `192.168.101.77` | Environment leak |
| No S3 Transfer Acceleration | Every other SDK asset gets it via `S3Acceleration` |

---

## 2. Design decisions

| Question | Decision | Rationale |
| --- | --- | --- |
| Where does the gallery live? | Its own endpoint `GET /api/partner/maps/fetch_gallery` — **not** in `fetch_data` | Click-triggered load. A 300-image property would add ~150 KB to every map boot for a panel most visitors never open. |
| How does the host know to show the Gallery button? | A small `gallery` block inside `fetch_data`'s `property_json` (`enabled`, `pageName`, `displayOnHomepage`, `imageCount`) | Discovery must be free: one `COUNT(*)`, no image rows. Avoids a "click → 404 → hide button" flicker. |
| Touch gate | `@community.pynwheel_touch_enabled? && @community.show_gallery?` | `app/models/community.rb:2307` is the source of truth (`touchscreen_app`). The v2 API's `product_options` JSON writes through to that column. |
| Gate failure | `fetch_gallery` → **404** via existing `render_error`; SDK normalises to `{ enabled: false }` | Matches `Api::V1::CalculatorConfigsController`. Should-never-happen path, since discovery gates the button. |
| Code placement | `SdkGalleryBuilderService` — **not** a method on `SdkPayloadBuilderService` | That service is 537 lines and on the hot boot path. Gallery is a cold, independent concern. |
| Caching | **None.** Built fresh per request, same as `fetch_data` | Explicit call: no `Rails.cache` layer, no ETag. The SDK memoises per page instead. |
| Response size | All images in one response | Even 300 images gzip to roughly 15 KB of JSON. Pagination would add round-trips for no measurable gain. |

---

## 3. Backend

### 3.1 Route

`config/routes.rb`, inside `namespace :maps`:

```ruby
get :fetch_gallery, to: 'sdk#fetch_gallery'
```

Registers as `api_partner_maps_fetch_gallery` → `/api/partner/maps/fetch_gallery`.

### 3.2 `app/services/sdk_gallery_builder_service.rb`

Single query, no N+1:

```ruby
@community.galleries.order(:sort).includes(:gallery_images)
```

Public surface:

| Method | Used by |
| --- | --- |
| `enabled?` | discovery block + the endpoint's 404 guard |
| `image_count` | discovery block (cheap `COUNT`, never loads rows) |
| `build(fav_ids = Set.new)` | `fetch_gallery` |
| `favorites_json(fav_ids)` | `get_favorites` — reuses `build`, so URL/video/order rules live in one place |

Response shape — images nested under the gallery they belong to. Config
(`enabled` / `pageName` / `imageCount`) is **not** repeated here; it already
travels in `property.gallery` on the map payload.

```jsonc
{
  "galleries": [
    {
      "id": 12,
      "title": "Apartments",
      "count": 9,
      "coverUrl": "https://…/thumb/…?v=1720000000",  // first image, for the list
      "images": [
        {
          "id": 991,
          "categoryId": 12,
          "type": "Apartments",
          "name": "kitchen.jpg",
          "url": "https://…/large/kitchen.jpg?v=1720000000",    // full-res, lightbox
          "thumbUrl": "https://…/thumb/kitchen.jpg?v=1720000000", // 640×360, grid
          "posterUrl": null,          // video_thumbnail; null for images
          "posterFallbackUrl": null,  // legacy placeholder, for posterUrl onerror
          "isVideo": false,
          "isFavorite": false
        }
      ]
    }
  ],
  "status": "success",
  "code": 200
}
```

Galleries with nothing renderable are omitted entirely. `categoryId` / `type`
are redundant while nested, but carry the gallery context when images appear
flat — as they do in `get_favorites`.

Improvements over the jbuilder:

- **`thumbUrl`** — the grid stops pulling 1920px originals. Largest single win.
- **`coverUrl`** per category — first image in sort order, so the CMS drag handle
  doubles as cover-image control with nothing new to configure.
- **`categoryId`** — host filters on a stable key, not a renameable name string.
- **Real video posters** from `video_thumbnail`, with `posterFallbackUrl` carrying
  the legacy placeholder for the client's `onerror`. Most rows never got a
  `video_thumbnail` generated, because `GalleryUploader#video?` tests for an
  `application/*` content type that mp4 uploads rarely report — hence two fields
  rather than one guess.
- **`?v=<updated_at>`** replaces the malformed `?temp/…` buster. It matters
  because `GalleryUploader` reuses the original filename once a crop is set.
- **`convert_to_s3_accelerate_url`** on every URL.
- Rows with nothing renderable are **skipped**, not exploded on.
- Categories ordered by `sort`; images ordered by `sort` within category, with
  unsorted rows last (`Gallery#gallery_images` carries no order scope, unlike the
  community-level association).
- Video detection reads the stored filename off the columns rather than calling
  `GalleryImage#is_video?`, which instantiates the file object and returns `true`
  whenever that raises — mislabelling every broken row as a video.

### 3.3 `app/models/gallery_image.rb`

```ruby
include ::S3Acceleration
```

### 3.4 `app/controllers/api/partner/maps/sdk_controller.rb`

- `:fetch_gallery` added to `SESSION_ACTIONS`.
- `load_community_for_gallery` — plain `find_by`, no includes: the builder
  eager-loads galleries under its own ordering, so anything preloaded here would
  be queried again.
- `fetch_gallery` — 404 when disabled, otherwise gzipped JSON with
  `Cache-Control: private, no-store`, favorites merged in via the existing
  `favorite_record` / `favorite_ids` helpers.
- `valid_ids_for_type` — new `gallery_image` scope.
- `get_favorites` — returns `gallery_images` + `gallery_image_ids`, and only
  walks the galleries when something in them is actually favorited.
- `clear_all_favorites` — already iterated `Favorite::TYPE_COLUMNS`, so it picked
  up the new type for free.

### 3.5 `app/services/sdk_payload_builder_service.rb`

`property_json` gained `gallery: gallery_discovery_json`:

```ruby
{
  enabled:           builder.enabled?,
  pageName:          @community.gallery_page_name.presence || SdkGalleryBuilderService::DEFAULT_PAGE_NAME,
  displayOnHomepage: @community.display_gallery_on_homepage,
  imageCount:        builder.image_count
}
```

### 3.6 Favorites — new `gallery_image` type

Migration `20260801000000_add_gallery_image_ids_to_favorites.rb`, following the
existing `20260702000000` precedent:

```ruby
add_column :favorites, :gallery_image_ids, :jsonb, default: []
```

`Favorite::TYPE_COLUMNS` gained `"gallery_image" => :gallery_image_ids`. Because
save / delete / clear all route through that constant, the whole write path came
along with the one entry.

---

## 4. SDK — `public/sdk/pyn-map-sdk-v1.js`

The SDK is a data provider plus map renderer; the React host owns the UI.

### Public surface — one method

Config comes from the existing `getPropertyConfig()`; there is no separate
gallery-config call. Content comes from a single `getGalleries()`.

| Method | Network | Description |
| --- | --- | --- |
| `getPropertyConfig().gallery` | none | `{ enabled, pageName, displayOnHomepage, imageCount }`. Gates the Gallery button. |
| `getGalleries({ force })` | one request, memoised | Every gallery with images nested. Dedupes concurrent calls, never throws — `[]` on failure. |

Favoriting a photo uses the existing generic methods with the new type:
`saveFavorite(id, communityId, sessionId, "gallery_image")`.

### Internals

- `data.galleries`, `_galleriesPromise` and `_galleriesLoaded` added to state,
  reset in `destroy()`. The `_galleriesLoaded` flag exists so a genuinely empty
  gallery is not refetched on every call.
- `_fetchGalleries()` mirrors `_fetchConfig()` — `Bearer` token + `X-SDK-Session-Id`.
- `_favoriteGalleryImages` Set; `_favState` gained a `gallery_image` case
  (`idKey: "id"`, list flattened from `data.galleries`).
- `_hydrateFavorites(type)` — new shared helper that rebuilds a favorite Set from
  the `isFavorite` flags the server already stamped. Replaces three copy-pasted
  blocks in `_storeConfig`, and `getGalleries` reuses it once the data arrives.
- `_FAVORITE_TYPES` constant replaces the inline `["unit","amenity","floorplan"]`
  literal in `clearAllFavorites`.
- `getAllFavorites` / `getFavorites` return `galleryImages`.
- `getGalleries` exported in the **GLOBAL EXPOSED API** block.

### Host usage

```js
const { gallery } = PynMapSDK.getPropertyConfig();
if (gallery.enabled && gallery.imageCount > 0) showGalleryTab(gallery.pageName);

// on click:
const galleries = await PynMapSDK.getGalleries();
galleries.forEach(g => renderCategory(g.title, g.count, g.coverUrl, g.images));

// heart on a tile:
await PynMapSDK.saveFavorite(image.id, communityId, sessionId, "gallery_image");
```

---

## 5. Analytics

`Analytics::SdkAnalyticsService` already recognised several event names the SDK
never emitted. The new events use those exact names so they land in the right
buckets — the server builds its key as `"#{name}_#{type}"`.

| SDK call site | Event name | Server effect |
| --- | --- | --- |
| `getGalleries()` | `gallery_view` | `VISITED_PAGES` → "Gallery view" |
| `saveFavorite()` | `save_favorite` | `save_favorite_click` is in `INTERACTION_EVENTS` — counts as a billable interaction |
| `deleteFavorite()` | `remove_favorite` | counter only |
| `clearAllFavorites()` | `clear_favorites` | counter only |
| `getAllFavorites()` | `view_favorites` | `VISITED_PAGES` → "Favorites page" |
| `shareFavoritesEmail()` | `share_email` | `share_email_click` is in `INTERACTION_EVENTS` (web_map) |

All routed through one `_captureFavorite(name, favoriteType, ids)` helper, which
holds the `_analytics` guard so call sites stay clean. Metadata is scalars only —
the client-side `_sanitize` drops arrays — so ids travel as a joined
`favorite_ids` string alongside `favorite_count`.

Events fire after the server confirms, and before the host's `onFavoriteChange`
callback so a throwing callback cannot swallow them. `view_favorites` fires up
front: opening the screen is the visit whether or not the request succeeds.

`gallery_view` fires only when `getGalleries()` actually reaches the network, so
re-renders reading the memo cost nothing and cannot inflate the counter.

---

## 6. Files touched

| File | Change |
| --- | --- |
| `config/routes.rb` | +1 route |
| `app/controllers/api/partner/maps/sdk_controller.rb` | `fetch_gallery` + loader, `gallery_image` id scope, `get_favorites` extension |
| `app/services/sdk_gallery_builder_service.rb` | **New** |
| `app/services/sdk_payload_builder_service.rb` | `gallery` discovery block in `property_json` |
| `app/models/gallery_image.rb` | `include ::S3Acceleration` |
| `app/models/favorite.rb` | `gallery_image` type + annotation |
| `db/migrate/20260801000000_add_gallery_image_ids_to_favorites.rb` | **New** |
| `public/sdk/pyn-map-sdk-v1.js` | Gallery state + 4 public methods, gallery-image favorites, analytics |

No changes to the existing jbuilders — the Windows and iOS apps keep their
contract untouched.

---

## 7. Verification

Syntax checked (`ruby -c`, `node --check`), route registered, migration applied.
Functional testing is on the property owner.

Worth covering:

- `fetch_gallery` with a valid session token on a Touch-enabled property with
  images → 200, gzipped, categories carry `coverUrl`.
- Touch-disabled property → 404, and `getPropertyConfig().gallery.enabled === false`.
- Touch-enabled with zero images → `imageCount: 0`, button hidden.
- A video row → `isVideo: true`, `posterUrl` plus `posterFallbackUrl`.
- A row whose upload never finished → absent from `images` rather than broken.
- Heart a photo, reload → `isFavorite: true` survives; the photo appears in
  `getAllFavorites().galleryImages`.
- Double-click the Gallery button → exactly one network request.
