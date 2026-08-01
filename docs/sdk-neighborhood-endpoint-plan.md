# SDK Neighborhood — Implementation Notes

Lazy-loaded neighborhood for `pyn-map-sdk-v1.js`, served by dedicated partner-maps
endpoints and gated on the **Pynwheel Touch** toggle. Follows the shape set by
[sdk-gallery-endpoint-plan.md](sdk-gallery-endpoint-plan.md).

- **Status:** implemented
- **Scope:** CMS-curated neighborhood pins, the live Google Places nearby search,
  and Google place photos — three independently loadable concerns

---

## 1. How neighborhood was passed before

There are **two** legacy sources, and they were never joined. Any port has to
carry both.

### A. Static config + curated pins — the jbuilder

`app/views/api/v1/communities/data.json.jbuilder:1545-1584`, duplicated verbatim
at `data_group.json.jbuilder:1562-1601`:

```ruby
json.neighborhood do
  if @community.neighborhood.present?
    json.show_neighborhood_page           @community.neighborhood.show_neighborhood
    json.neighborhood_page_name           @community.neighborhood.neighborhood_name
    json.latitude                         @community.latitude  || 0.0   # NB: community, not neighborhood
    json.longitude                        @community.longitude || 0.0
    json.radius                           @community.neighborhood.radius || 5000
    json.zoom                             @community.neighborhood.zoom   || 14
    json.address                          "#{address} , #{city} , #{state} , #{zip}"
    json.display_neighborhood_on_homepage @community.neighborhood.display_neighborhood_on_homepage
    json.listing                          @community.neighborhood.listing if present?

    arr = @community.neighborhood.category.split(',')
    arr.insert(0, 'All')
    json.categories arr.each { |val| json.title val }

    json.locations @community.neighborhood.locations.each do |location|
      json.title    location.title
      json.address  location.address
      json.latitude  location.latitude
      json.longitude location.longitude
      json.category location.category
      json.image    location.standard_image_url.presence || asset_url("no_img.png")
      json.distance location.distance
      json.time     location.time
      json.rating   location.rating || 0
    end
  else
    json.show_neighborhood_page true
    json.neighborhood_page_name "Neighborhood"
    json.display_neighborhood_on_homepage true
  end
end
```

**Data model**

| Piece | Source |
| --- | --- |
| Config | `Community has_one :neighborhood` — `app/models/community.rb:59` |
| Categories | `neighborhoods.category`, a comma string, default `"Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands"` — `app/models/neighborhood.rb:13` |
| Curated pins | `Neighborhood has_many :locations` — `app/models/location.rb` |
| Pin image | `AvatarUploader` (`:thumb` version) + denormalised `standard_image_url` via the `StandardUrl` concern |
| CMS | `NeighborhoodsController` (config), `LocationsController` (pins) |

Category vocabulary is a **closed set of 7** in both CMS forms
(`app/views/neighborhoods/_form.html.haml:103-127`,
`app/views/locations/_add_location.html.haml:38`), which is what makes a clean
slug mapping possible.

### B. Live Google Places — the proxy endpoint

Two implementations exist, and the newer one is not what the field is calling.

**Legacy, still routed at `/api/v1/communities/:id/get_neighbourhood_data`** —
`app/controllers/api/v1/communities_controller.rb:781-833`. Shared secret
`"pynwheeltoken12345"` in a string literal, a hardcoded Google key, a per-community
lifetime counter, `NeighbourhoodLog` row per call, threshold emails, one Google
`nearbysearch` call, and a broken pagination branch.

**Newer, routed at `/api/touch/v1/communities/:id/get_neighbourhood_data`** —
`Api::Touch::V1::CommunitiesController` → `GoogleNeighbourhoodService`
(`app/services/google_neighbourhood_service.rb`). Same behaviour, tidied: ENV for
key and token, and the useful part — a **category → Google types** table
(`#categories`, lines 103-122) that expands `"shopping"` into 10 Google place
types. That table is the one asset worth lifting wholesale.

### Defects that will not be carried forward

| Issue | Where | Impact |
| --- | --- | --- |
| Google API key hardcoded in source | `communities_controller.rb:806,817` | Key is in the repo and in git history. See §9. |
| Shared secret `"pynwheeltoken12345"` as auth | `communities_controller.rb:782` | Anyone can bill our Google account |
| `results = []` runs **after** page 1 is appended | `communities_controller.rb:823` | For restaurant/school/park/bank/atm the client gets page 2 only — page 1 is silently discarded |
| `sleep 2` on the request path | `communities_controller.rb:818`, `google_neighbourhood_service.rb:131` | Holds a Puma thread for 2s per paginated call |
| No caching of any kind | both | Every visitor, every category tab, is a fresh billed Google call |
| Serial fan-out over 10 place types | `google_neighbourhood_service.rb:87-94` | "Shopping" = 10 sequential HTTP round-trips in one request |
| `counter += 1` then `@community.save` per request | `communities_controller.rb:786,829` | A row write per request, and a lost-update race under concurrency |
| Lifetime counter with no automatic reset | `neighborhood_request_counter` vs `_limit` | A property that hits the limit is dead until someone runs `reset_neighborhood_request_counter` by hand |
| `params[:id] == 1 → Community 748` | `communities_controller.rb:785`, `google_neighbourhood_service.rb:36` | Magic test hook in production code |
| `com = Community.find params[:id]` inside the id==1 branch | `communities_controller.rb:792` | Raises for id 1; swallowed by a bare `rescue` |
| Threshold emails to a personal address | `communities_controller.rb:795,801` | `salahudin@pynwheel.com` hardcoded |
| `category.gsub!` mutating in a `before_save` | `neighborhood.rb:26` | Comma string parsed by `split(',')` at read time, every time |
| Synthetic `'All'` pushed into the categories array | jbuilder:1562 | A UI concern baked into the payload |
| `asset_url("no_img.png")` placeholder for missing pin images | jbuilder:1573 | Host cannot tell "no image" from "an image" |
| No S3 Transfer Acceleration on `Location` images | `location.rb` | Every other SDK asset gets it |
| Config block duplicated across two jbuilders | data / data_group | Two places to change |

---


## 2. Design decisions

| Question | Decision | Rationale |
| --- | --- | --- |
| One endpoint or two? | **Two** — `fetch_neighborhood` (DB) and `fetch_neighborhood_places` (Google), plus `neighborhood_photo` for imagery | They have opposite cost profiles. Curated pins are a single indexed query and render the instant the panel opens; Google is billed and slow. |
| Does the places call fetch one category or all? | **All by default**, one by request | The category rail shows a count on every tile before anything is tapped, so the host needs all seven up front — Google has no count-only API, you have to fetch. One round trip beats seven, each category is cached separately, and tab switching afterwards never touches the network. `?category=` stays available for refreshing one tile. |
| Where does the config live? | A `neighborhood` block inside `fetch_data`'s `property_json` | Same contract as `property.gallery`: discovery must be free so the host can render the tab and centre the map with no request and no flicker. Measured cost on the boot path: **2 queries** (one preloaded `has_one`, one `COUNT`). |
| Touch gate | `pynwheel_touch_enabled? && neighborhood.show_neighborhood?` | Mirrors `SdkGalleryBuilderService#enabled?`. `app/models/community.rb:2307` stays the source of truth. |
| Gate failure | 404 via `render_error`; SDK normalises to `[]` | Same as `fetch_gallery`. Unreachable in practice — discovery gates the button. |
| Code placement | **Four new files**, no methods added to `SdkPayloadBuilderService` | That service is on the hot boot path. Neighborhood is cold and independent — the reasoning that produced `SdkGalleryBuilderService`. |
| How many services? | Four, each usable on its own | `SdkNeighborhoodBuilderService` touches only the DB; `SdkNeighborhoodPlacesService` only Google search; `SdkNeighborhoodPhotoService` only Google photos; `SdkNeighborhoodCategories` is the shared vocabulary. The Google services can be tested with no fixtures, reused to replace `GoogleNeighbourhoodService` behind the Touch v1 endpoint, and migrated to Places API (New) without touching DB code. |
| Caching — curated pins | **None**, built fresh per request | Matches `fetch_data` / `fetch_gallery`. One indexed query; the SDK memoises per page. |
| Caching — Google places | **`Rails.cache`, 24h TTL, per community + category + radius** | The biggest win here. Turns *N visitors × 7 categories* into *7 fan-outs per property per day*. Measured: cold 0.86s / 1 call, warm **0.004s / 0 calls**. |
| Caching — resolved photos | 6 days, keyed by handle + width | A googleusercontent URL is stable; resolving it twice is pure waste. |
| Quota guard | A **daily** Redis budget per community, not the legacy lifetime counter | `neighborhood_request_counter` never auto-resets, so a property that trips it stays broken until someone runs the manual reset. A per-day key is self-healing. The legacy columns are untouched, so Touch/iOS keep their behaviour. |
| Budget exhausted | `places: []` with `limited: true`, HTTP 200 — and **not cached** | The panel degrades to curated pins instead of erroring. Caching a budget-limited empty result would lock the category empty for a day. |
| Google result relevance | `rankby=distance`, then drop anything beyond `neighborhood.radius` | `rankby` and `radius` are mutually exclusive in Google's API. Ranking by distance is what makes the panel useful; the legacy proxy passed a radius and got back whatever Google thought prominent, which on a wide radius meant landmarks across town. |
| Multi-type fan-out | Bounded parallel, 5 at a time, cold path only | "Shopping" is 10 place types. Measured on the 9-type "entertainment": **2.59s parallel vs ~4.7s+ serial**, and it happens once per property per day. |
| Pagination | **Dropped** | `rankby=distance` already returns the nearest 20 per type — up to 200 per category before dedupe. Page 2 costs a mandatory 2s `sleep` for results nobody scrolls to. |
| Distance | Computed server-side (haversine) | The host sorts and labels without a second Google call. |
| `'All'` category | Not emitted | The host renders it. The payload stays data. |
| Favoriting places | **Out of scope** | One row in `Favorite::TYPE_COLUMNS` plus a migration, exactly as `gallery_image` was, whenever it is wanted. |
| Legacy jbuilders | **Untouched** | Windows and iOS keep their contract. |

### Place photos — why a handle, not a signed token

Google returns a `photo_reference`, never a URL, and the reference is only
usable with our API key. So photos have to be proxied.

The first cut signed `{ref, width}` into a `MessageVerifier` token. It worked,
but Google's references run to ~500 characters and the resulting token came to
**~2 KB** — at two sizes per place and forty places per category, over half a
megabyte of payload that was nothing but token.

What shipped instead: a 24-hex-character handle, `SHA256(reference)`
truncated, with the mapping held in the cache for 25 hours — an hour longer
than the places payload that carries it, so a cached place always has a live
handle behind it. Registration is one `write_multi` per category on the cold
path; serving is pure hashing with no I/O.

**69 characters instead of ~2000.** The handle is stable, so browser caches
survive the daily refresh, and what it guards is a public photo of a business —
the actual secret, the API key, never leaves the server either way.

---

## 3. Shared category vocabulary

`app/services/sdk_neighborhood_categories.rb` — one table, used by both Google
services and by the CMS-value normaliser.

Three vocabularies had to be reconciled: the CMS stores display strings
("Dining"), Google wants machine types ("restaurant", "shopping_mall"), and the
host needs a stable key to filter and cache on. Type lists are lifted verbatim
from `GoogleNeighbourhoodService#categories:103-122`, so results match what the
Touch apps have always shown.

```ruby
CATEGORIES = {
  "dining"        => { label: "Dining",        types: %w[restaurant] },
  "shopping"      => { label: "Shopping",      types: %w[shopping_mall shoe_store …] },  # 10 types
  "entertainment" => { label: "Entertainment", types: %w[movie_theater bowling_alley …] }, # 9
  "schools"       => { label: "Schools",       types: %w[school] },
  "banks"         => { label: "Banks",         types: %w[bank atm] },
  "parks"         => { label: "Parks",         types: %w[park] },
  "errands"       => { label: "Errands",       types: %w[car_repair car_wash …] }         # 11
}
```

`slug_for` parameterises and underscores, then resolves through an alias index,
so the CMS plurals and the legacy proxy's singulars both land correctly:

```
"Dining"    -> "dining"     "school"     -> "schools"
"Schools"   -> "schools"    "Restaurants"-> "dining"
"Dog Parks" -> "other"      ""           -> nil
```

`Location#category` is a free-text column, so anything outside the vocabulary
becomes `"other"` and keeps its original string as the label rather than being
dropped.

---

## 4. Backend

### 4.1 Routes

`config/routes.rb`, inside `namespace :maps`:

```ruby
get :fetch_neighborhood,        to: 'sdk#fetch_neighborhood'
get :fetch_neighborhood_places, to: 'sdk#fetch_neighborhood_places'
get :neighborhood_photo,        to: 'sdk#neighborhood_photo'
```

### 4.2 `SdkNeighborhoodBuilderService` — the CMS half

Database only. Nothing here talks to Google.

| Method | Used by |
| --- | --- |
| `enabled?` | discovery block + every 404 guard |
| `places_enabled?` | discovery block — feature on, key configured, centre present |
| `location_count` | discovery block — cheap `COUNT`, never loads rows |
| `categories` | discovery block — `[{ id, title }]` from the CMS comma string |
| `discovery_json` | `SdkPayloadBuilderService#property_json` |
| `build` | `fetch_neighborhood` |
| `radius` / `zoom` / `center` / `formatted_address` | shared with the places service |

`fetch_neighborhood` response:

```jsonc
{
  "locations": [
    {
      "id": 481,
      "title": "Blue Bottle Coffee",
      "address": "300 Webster St, Oakland, CA",
      "lat": 37.8021, "lng": -122.2711,
      "category": "dining",          // stable slug — filter on this
      "categoryLabel": "Dining",     // display string
      "imageUrl": "https://…/pin.jpg?v=1720000000",
      "thumbUrl": "https://…/thumb_pin.jpg?v=1720000000",
      "distance": 0.4,               // miles; CMS value, or computed when blank
      "travelTime": "8 min walk",    // CMS free text, null when unset
      "rating": 4.6,                 // null when unset — never a misleading 0
      "source": "curated"
    }
  ],
  "status": "success", "code": 200
}
```

Improvements over the jbuilder:

- **`thumbUrl`** — the `AvatarUploader` `:thumb` version existed and was never
  shipped; the list stops pulling full-size pin photos into 60px tiles.
- **`convert_to_s3_accelerate_url`** + `?v=<updated_at>` on both URLs, matching
  every other SDK asset.
- **`null` instead of `no_img.png`** — the host picks its own placeholder.
- **`null` instead of `0`** for an unset rating, which rendered as zero stars.
- **Slug + label** instead of a renameable display string as the filter key.
- **Computed distance** when the CMS field is blank.
- Rows with no coordinates are **skipped** — the jbuilder shipped them as a pin
  at `(0, 0)`, in the Gulf of Guinea. Verified.

Config is not repeated here; it already travels in `property.neighborhood`.

### 4.3 `SdkNeighborhoodPlacesService` — the Google half

```ruby
SdkNeighborhoodPlacesService.new(community).fetch_all      # every category
SdkNeighborhoodPlacesService.new(community).fetch("dining") # one
```

Pipeline, in order:

1. **Cache read** — `sdk:nbhd:places:<community>:<slug>:<radius>`, 24h. A hit
   costs zero Google calls and zero budget.
2. **Budget reserve** — the whole fan-out is reserved up front against
   `sdk:nbhd:budget:<community>:<date>`, so accounting stays single-threaded.
   Over budget sets `limited` and returns `[]` without caching it.
3. **Bounded parallel fan-out** — one `nearbysearch` per Google type, 5 in
   flight. Each thread is pure IO wait and swallows its own failures, so one bad
   type cannot take a category down.
4. **Normalise** — drop permanently/temporarily closed businesses and anything
   without coordinates, dedupe on `place_id`, compute distance, drop anything
   beyond the CMS radius, sort nearest first, cap at 40.
5. **Register photo references** — one `write_multi` — then **cache**.

Response, uniform whether one category or all:

```jsonc
{
  "categories": [
    {
      "id": "dining", "title": "Dining", "count": 20,
      "places": [
        {
          "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",   // Google place_id
          "title": "Salt + Smoke",
          "address": "6525 Delmar Boulevard, University City",
          "lat": 38.6560854, "lng": -90.305056,
          "category": "dining", "categoryLabel": "Dining",
          "imageUrl": "/api/partner/maps/neighborhood_photo?p=610792bab5faa99e9d48225e&w=800",
          "thumbUrl": "/api/partner/maps/neighborhood_photo?p=610792bab5faa99e9d48225e&w=200",
          "distance": 0.0, "travelTime": null,
          "rating": 4.5, "userRatingsTotal": 4394,
          "isOpenNow": false, "priceLevel": 2,
          "source": "google"
        }
      ]
    }
  ],
  "category": "dining",   // null on the all-categories call
  "limited": false,
  "status": "success", "code": 200
}
```

Item shape matches `location_json` field for field, so a host can concatenate
curated pins and Google results and render both with one component. `source`
tells them apart.

The Google key is read from `ENV['GOOGLE_MAPS_API_KEY']` and never leaves the
server. The HTTP call is one private `#nearby_search(type)` method, so migrating
to Places API (New) is a change to that method and the field mapper.

### 4.4 `SdkNeighborhoodPhotoService`

| Method | Purpose |
| --- | --- |
| `register(refs)` | one `write_multi`, cold path only — remembers references for 25h |
| `handle_for(ref)` | pure `SHA256`, no I/O — safe on the hot path |
| `path(handle, width)` | relative URL for the client's `<img src>` |
| `resolve(handle, width)` | handle → the real googleusercontent URL, cached 6 days |

Widths are restricted to 200 and 800 so the endpoint cannot be driven as a
general-purpose image resizer against our quota. `skip_nil: true` on the resolve
cache so a Google blip is retried on the next view rather than remembered as
"this photo does not exist" for a week.

### 4.5 `Api::Partner::Maps::SdkController`

- `fetch_neighborhood`, `fetch_neighborhood_places` added to `SESSION_ACTIONS`
  and excluded from the heavy boot loader.
- `neighborhood_photo` added to a new `PUBLIC_ACTIONS` list — it is loaded as an
  `<img src>`, which cannot carry an `Authorization` header. It skips both the
  API-key and session-token filters and reads no property data.
- `load_community_for_neighborhood` — `.includes(neighborhood: :locations)` and
  nothing else.
- `fetch_neighborhood` — 404 when disabled, else gzipped JSON,
  `Cache-Control: private, no-store`.
- `fetch_neighborhood_places` — 404 when disabled or unconfigured, **400** on an
  unknown category so a typo fails loudly rather than looking like "nothing
  nearby".
- `neighborhood_photo` — 302 to the resolved URL with
  `Cache-Control: public, max-age=86400`; 404 on an unknown handle, a bad width,
  or a Google failure.

### 4.6 `SdkPayloadBuilderService`

`property_json` gained `neighborhood: neighborhood_discovery_json`, next to the
existing `gallery:` key:

```jsonc
"neighborhood": {
  "enabled": true, "pageName": "Neighborhood", "displayOnHomepage": true,
  "center": { "lat": 38.6560729, "lng": -90.3048462 },
  "radius": 5000, "zoom": 14,
  "address": "6513 Delmar Boulevard, University City, MO, 63130",
  "listing": null,
  "categories": [{ "id": "dining", "title": "Dining" }, …],
  "locationCount": 0,
  "placesEnabled": true
}
```

`center` comes from the **community**, not `neighborhoods.latitude/longitude` —
the jbuilder switched to that years ago (those lines are commented out at
`data.json.jbuilder:1549-1550`) and the CMS keeps the community columns current
on every address change. Copying live behaviour, not dead code.

`load_community_from_session` gained `:neighborhood`, so the discovery block
costs one preloaded association plus one `COUNT` — confirmed by query log.

---

## 5. SDK — `public/sdk/pyn-map-sdk-v1.js`

| Method | Network | Description |
| --- | --- | --- |
| `getPropertyConfig().neighborhood` | none | Gates the tab, centres the map, names the category rail. |
| `getNeighborhood({ force })` | one request, memoised | Curated pins. |
| `getNeighborhoodPlaces()` | one request, memoised per category | Every category with `count` and `places` — enough for the rail plus every tab. |
| `getNeighborhoodPlaces(category)` | none once loaded | That category, from the memo; fetches alone if the bulk call has not run. |
| `isNeighborhoodLimited()` | none | Last places request was cut short by the daily budget. |

Internals mirror the gallery implementation, so there is one pattern to learn.
`_placesLoaded` is a `Set` of slugs rather than a boolean, so a category that
genuinely has nothing nearby is not refetched on every tab switch. Category
arguments are normalised client-side, so `"Dining"` and `"dining"` are
interchangeable. Nothing throws: offline, a 404 and an expired session all
resolve to `[]`.

### Host usage

```js
const { neighborhood } = PynMapSDK.getPropertyConfig();
if (neighborhood.enabled) showNeighborhoodTab(neighborhood.pageName);

// on panel open — instant, DB only:
const pins = await PynMapSDK.getNeighborhood();

// category rail with its badge counts — one request:
const categories = await PynMapSDK.getNeighborhoodPlaces();
categories.forEach(c => renderTab(c.title, c.count));

// on a tab tap — already in memory:
const { places } = await PynMapSDK.getNeighborhoodPlaces("dining");
renderList([...pins.filter(p => p.category === "dining"), ...places]);

if (PynMapSDK.isNeighborhoodLimited()) showCuratedOnlyNotice();
```

Photo URLs travel from the server as relative paths, so one cached payload stays
valid on any environment, and the SDK absolutises them against its own API base
before the host ever sees them. `imageUrl` / `thumbUrl` go straight into an
`<img src>` — no prefixing, no `_apiBase`, cross-origin or not.

See [sdk-neighborhood-frontend-guide.md](sdk-neighborhood-frontend-guide.md) for
the full host integration.

---

## 6. Analytics

| SDK call site | Event name | Server effect |
| --- | --- | --- |
| `getNeighborhood()` | `neighborhood_view` | `VISITED_PAGES` → "Neighborhood Page" |
| `getNeighborhoodPlaces(category)` | `neighborhood_category_view` | counter only, with a `category` metadatum |

`VISITED_PAGES` gained one line. `"Neighborhood Page"` is the exact string
`MetroAnalyticsService:29` and `IpadAnalyticsService:30` already write, so SDK
sessions land in the same bucket as the Windows and iPad apps. (Those two upcase
it — a pre-existing casing inconsistency across `visited_pages`, flagged, not
fixed here.)

Neither event is in `INTERACTION_EVENTS`: browsing the neighborhood is a page
visit, not a billable interaction, consistent with `gallery_view`. Both fire only
when the call reaches the network, so re-renders reading the memo cannot inflate
the counters. The bulk places call fires nothing — it is a prefetch, not a visit.

---

## 7. Files touched

| File | Change |
| --- | --- |
| `config/routes.rb` | +3 routes in `namespace :maps` |
| `app/services/sdk_neighborhood_categories.rb` | **New** — slug ↔ label ↔ Google types |
| `app/services/sdk_geo_distance.rb` | **New** — haversine, used by both services |
| `app/services/sdk_neighborhood_builder_service.rb` | **New** — DB: config, categories, curated pins |
| `app/services/sdk_neighborhood_places_service.rb` | **New** — Google: cache, budget, fan-out, normalise |
| `app/services/sdk_neighborhood_photo_service.rb` | **New** — photo handles and redirect resolution |
| `app/controllers/api/partner/maps/sdk_controller.rb` | 3 actions, loader, `PUBLIC_ACTIONS`, `:neighborhood` include |
| `app/services/sdk_payload_builder_service.rb` | `neighborhood` discovery block in `property_json` |
| `app/services/analytics/sdk_analytics_service.rb` | +1 `VISITED_PAGES` entry |
| `app/models/location.rb` | `include ::S3Acceleration` |
| `public/sdk/pyn-map-sdk-v1.js` | Neighborhood state, 3 public methods, analytics |

**No migration.** **No changes to the existing jbuilders** — Windows and iOS keep
their contract, and both legacy `get_neighbourhood_data` endpoints keep working
exactly as they do today.

---

## 8. Config

| Variable | Default | Purpose |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | set in `config/application.yml` | Nearby search + photos. Unset ⇒ `placesEnabled: false` and no request is attempted. |
| `NEIGHBORHOOD_DAILY_BUDGET` | `200` | Soft per-property daily ceiling on Google calls. |

---

## 9. Risks

**1. The Google key is compromised.** `AIzaSyCOUsWrubjWjFSmsTs68dJT7u9ah7hDGMI`
is hardcoded at `communities_controller.rb:806,817` and committed in
`config/application.yml:11`, so it is in git history and cannot be un-leaked by
editing a file. This work does not make it worse — everything Google-facing is
server-side — but it should be rotated and IP-restricted. **Separate task.**

**2. Legacy Places API deprecation.** `nearbysearch/json` is Google's legacy
endpoint; existing projects keep working, new ones cannot enable it. All Google
traffic is isolated in two private methods, so the migration to Places API (New)
is contained. Worth scheduling.

**3. `NeighbourhoodLog`.** The legacy path writes one row per Google call; the
new path writes none. If anything reports off that table, SDK traffic will not
appear in it — say the word and I will log cache misses there.

**4. Curated pins are Touch-gated.** Matching the gallery and your brief. If the
web map should show curated pins too, the gate splits — pins on
`show_neighborhood`, Google on Touch. One line, but better decided before the
host ships against it.

---

## 10. Verification

Syntax (`ruby -c`, `node --check`) clean, all three routes registered.

**Backend, against community 10 (LOCAL on Delmar):**

| Check | Result |
| --- | --- |
| `fetch_neighborhood` with a valid session token | 200, gzipped |
| No `Authorization` header | 401 |
| Touch disabled → both neighborhood endpoints | 404 |
| `?category=bogus` | 400 "Unknown neighborhood category." |
| `?category=Dining` (CMS casing) | 200, resolved to slug `dining` |
| All categories | 200, all 7 with counts |
| Google cold path, `dining` | 0.86s, **1** Google call, 20 places |
| Same call warm | **0.004s, 0** Google calls, identical URLs |
| 9-type `entertainment` fan-out | 2.59s across 9 calls (serial ≈ 4.7s+) |
| Closed businesses, coordinate-less rows, out-of-radius | dropped (3 stub results → 1 kept) |
| Duplicate `place_id` across types | deduped |
| Sort order | nearest first, all within the 3.11 mi CMS radius |
| `photo_ref` in the response | never — handles only |
| Photo URL length | 69 chars (vs ~2000 with signed tokens) |
| `neighborhood_photo` with a real handle, no auth | 302 → `lh3.googleusercontent.com`, `public, max-age=86400` |
| Second resolve | 0 Google calls |
| Unknown handle / bad width / `../../etc/passwd` | 404, nil |
| Budget exhausted | `limited: true`, `count: 0`, 0 calls, **cache not poisoned** |
| Discovery block query cost on `fetch_data` | 2 (`Neighborhood Load`, `Location Count`) |
| Coordinate-less curated pin | dropped from `locations` |

**SDK — 26/26 automated checks** against the real file (public facade, slug
normalisation, memoisation, concurrent-call dedupe, per-category isolation,
empty-category handling, offline/404 degradation, `limited` propagation).

**Not covered — worth a look on a real property:**

- A property with actual curated `Location` rows. The dev database has none, so
  pin images, `thumbUrl` and S3 acceleration were exercised with a synthetic row
  in a rolled-back transaction, not against real uploads.
- The rendered UI: category rail counts, marker numbering, card layout.
- Behaviour once `NEIGHBORHOOD_DAILY_BUDGET` is tuned for real traffic — 200 is
  a guess sized to leave plenty of headroom above the ~35 calls a full cold
  refresh costs.
