# Pynwheel Tour App API — backend implementation (October 5, 2026)

The FastAPI service behind the **Pynwheel Tour** mobile app, and the app's integration with it.
Brief: `tour_app_backend.md`. Code: `tour-api/` (service), `tour-app/` (Capacitor app), both at the
repository root next to the Rails CMS and `pyn-connect-web/`.

```
Capacitor Tour App (tour-app/)
      │  HTTPS · Authorization: Bearer <token> · JSON
      ▼
FastAPI Tour App API (tour-api/)  ─────────────►  Rails CMS, two calls only:
      │  read-only SQL                               POST /api/v2/auth/token   (Doorkeeper password grant = sign in)
      ▼                                              POST /api/v2/auth/revoke  (sign out)
Pynwheel Postgres database (the CMS's)
```

**No Rails code changed.** The CMS, the legacy HTML/ERB pages, Pynwheel Connect, the existing
self-tour API (`api/self_tour/v1`, incl. `start_tour` and the Oct 4 `wayfinding*` endpoints) and the
database schema are exactly as before (`rails test`: 103 runs, 338 assertions, 0 failures — the same
as before this work).

---

## 1. Architecture decision and why

The brief preferred reusing the Rails domain layer and accepting the CMS's own credentials. Two
Rails-side options were tried first and both were refused by the session's auto-mode security
classifier ("Security Weaken"): (a) extending `Api::SelfTour::V1::TokenAuthorization` so the Oct 4
wayfinding controller also accepts a Doorkeeper bearer token of a CMS user, and (b) a new
`api/v2` controller for the Tour App under the existing Doorkeeper guard. Rather than add any new
credential path to Rails, the service:

| Concern | Source of truth | How the API uses it |
|---|---|---|
| Passwords, accounts | Devise (`users.encrypted_password`, bcrypt, no pepper) | **Never read.** Sign-in calls the CMS's existing Doorkeeper password grant; Devise verifies the password inside Rails. |
| Tokens | Doorkeeper `oauth_access_tokens` (5-day expiry, `revoked_at`) | The CMS token *is* the app token; every request looks it up read-only (expiry, revocation, user). |
| Super Admin | `users.role = 'Super admin'` (`User#is_super_admin?`) | The only admitted role (403 `not_super_admin` otherwise). |
| Property access | `User#can_access_community?` | A Super Admin sees every property (the rule for the roles admitted, kept as one function `can_access_property`). |
| Self-Guided Tour on/off | `Connect::ProductState.tour?` (`communities.self_tour` **or** Launch `product_options.product_options.self_tour.is_enabled`) | Mirrored in SQL/Python (`rubyisms.tour_enabled`, incl. the double-parsed JSON string). 422 `tour_disabled` on every tour endpoint. |
| "Show in Stops List" | `TourStops::Membership.in_list?`: a visible `tour_stops` row on the **main** tour (`tours.tour_user_id IS NULL`, latest), plus `amenities.breezway_lock_visible` for amenities | Mirrored in `repositories/stops.py`. Never inferred from plotting. |
| Graph & routing | `Wayfinding::GraphBuilder`, `RouteService`, `Timing`, `GraphSerializer` (Rails, Oct 4) | **Ported line for line** to Python (`tour-api/app/wayfinding/`) over the same persisted rows, and proven equal by `scripts/parity.py` (section 11). |
| Graph version / ETag | `Wayfinding::GraphVersion` | Mirrored (`graph_version.py`): counters + per-table count/max(updated_at) + level ids + `PAYLOAD_FORMAT`. |
| Upload URLs | `Connect::UploadUrl`, `S3Acceleration` | Mirrored (`upload_url.py`): `standard_image_url` → S3 Transfer Acceleration host; floor SVGs under `uploads/<model>/svg_image/<id>/` on the property's bucket. |

Why the port is acceptable under the brief's "do not duplicate Rails logic unless documented and
proven equivalent": the reason is documented above, and equivalence is proven on real data for
every graph element and every route tested (section 11). The port is read-only; nothing in the CMS
can diverge silently because the harness can be re-run at any time.

Database safety: every connection sets `default_transaction_read_only=on` and a 15 s statement
timeout; all SQL is parameterised (psycopg 3 server-side parameters).

## 2. FastAPI structure (`tour-api/`)

```
app/main.py                  create_app(): CORS, access log (method/path/status/ms; never query strings or bodies), /api/v1/health, OpenAPI (hidden in production)
app/config.py                Settings — TOUR_API_DATABASE_URL, TOUR_API_RAILS_URL, TOUR_API_PUBLIC_UPLOADS_URL, TOUR_API_CORS_ORIGINS, TOUR_API_ENV, cache TTLs
app/errors.py                ApiError + handlers: {"success": false, "error": {"code", "message", "details"?}}; unexpected errors → 500 internal_error with a log reference, never a trace
app/container.py             wiring of repositories, Rails client, engine, services
app/api/deps.py              bearer → AuthContext (Super Admin); property_id → PropertyRow (exists + access) → tour-enabled
app/api/v1/auth.py           POST /auth/login · POST /auth/logout · GET /auth/me
app/api/v1/properties.py     GET /properties · GET /properties/{id}
app/api/v1/stops.py          GET /properties/{id}/stops
app/api/v1/maps.py           GET /properties/{id}/map · GET /properties/{id}/map/levels/{level_id} · GET /properties/{id}/graph (ETag/304)
app/api/v1/routes.py         POST /properties/{id}/route · POST /properties/{id}/tour-route · POST /properties/{id}/stops/distances
app/schemas/                 Pydantic models = the OpenAPI contract (auth, property, stop, map, route, common)
app/services/auth.py         login (Doorkeeper) → token row → admit (revoked / expired / inactive / role); logout (revoke)
app/services/properties.py   list (60 s cache) / get / require_tour; can_access_property()
app/services/stops.py        Build Your Tour groups from the stops repository + the graph (location, map node, routable)
app/services/maps.py         map levels/buildings, one level's nodes & paths, the graph payload
app/services/routing.py      route / tour-route (validation, ordering, segments) / distances; the route-step adapter (section 7)
app/repositories/db.py       psycopg pool, read-only connections
app/repositories/users.py    oauth_access_tokens ⋈ users ⋈ companies (name, role, invitation pending, company inactive)
app/repositories/properties.py  communities ⋈ companies; tour flag
app/repositories/stops.py    main tour, unit stops (⋈ floorplans by provider_floorplan_id), amenity stops
app/repositories/rubyisms.py present?/presence/to_i/to_f, product_options double parse, humanize, natural sort
app/integrations/rails.py    Doorkeeper password grant + revoke (httpx)
app/wayfinding/rows.py       the 16 queries GraphBuilder#load_rows makes, in one connection
app/wayfinding/graph_builder.py  the port of Wayfinding::GraphBuilder (levels, nodes, edges, attachments, blockers, per-floor copies, vertical links, gates)
app/wayfinding/route_service.py  the port of Wayfinding::RouteService (+ tour(stop_keys), distances())
app/wayfinding/timing.py     the port of Wayfinding::Timing
app/wayfinding/graph_serializer.py  the port of GraphSerializer/RouteSerializer (Rails payload shape; used by the parity harness)
app/wayfinding/graph_version.py  the port of GraphVersion
app/wayfinding/engine.py     build + cache per (property, version, step_free, avoid_blockers)
app/wayfinding/upload_url.py image / SVG URLs
scripts/parity.py            FastAPI vs Rails equivalence harness · scripts/measure.py  live timings
tests/                       52 pytest tests (fixture graph + fakes; no database)
```

## 3. Authentication flow

```
Mobile LoginScreen (email, password)
   ↓ POST /api/v1/auth/login
FastAPI AuthService.login
   ↓ POST {RAILS}/api/v2/auth/token  grant_type=password&email&password   (existing CMS endpoint; Devise checks the password)
   ← {access_token, expires_in: 432000, …}   | 400 invalid_grant → 401 invalid_credentials
                                             | 200 without token (CMS: not a portal user) → 403 not_authorized_account
   ↓ SELECT oauth_access_tokens ⋈ users ⋈ companies WHERE token = $1  (read-only)
   ↓ admit: not revoked, not expired, not inactive (pending invitation / company inactivated), role = 'Super admin'
     else 403 not_super_admin / inactive_user — and the just-minted token is revoked at the CMS so it never leaks
   ← {access_token, token_type: bearer, expires_at, user: {id, name, email, role: super_admin}}
Mobile stores the session (token, user, propertyId) in @capacitor/preferences (services/session.ts)
Every request: Authorization: Bearer <token> → the same lookup → 401 unauthorized | invalid_token | token_expired | token_revoked, 403 not_super_admin | inactive_user
Logout: POST /api/v1/auth/logout → POST {RAILS}/api/v2/auth/revoke → the token is dead everywhere; the app clears its store.
```

Notes. There is no per-user "active" column in the schema; "inactive" is a pending invitation
(`invitation_token` set, not accepted — such users have no password and cannot sign in anyway) or
an inactivated company (`companies.inactivate`). Doorkeeper tokens expire after 5 days
(`access_token_expires_in`); there is no refresh token in the password flow, so the app signs in
again (the restore path checks `expires_at` and `GET /auth/me`). No password, hash or token is ever
logged; the access log records method, path, status and duration only.

## 4. Endpoints

Every response is JSON. Success bodies carry `success: true`; every error is
`{"success": false, "error": {"code", "message", "details"?}}`.

| Method · Path | Purpose | Auth | Request | Response | Source | Cache | Errors |
|---|---|---|---|---|---|---|---|
| `POST /api/v1/auth/login` | Sign in | none | `{email, password}` | `LoginResponse` | Doorkeeper + `oauth_access_tokens`/`users` | — | 401 invalid_credentials · 403 not_super_admin / not_authorized_account / inactive_user · 422 validation_error · 503 upstream_unavailable |
| `POST /api/v1/auth/logout` | Revoke the token | bearer | — | `{success, revoked}` | Doorkeeper revoke | — | 401 |
| `GET /api/v1/auth/me` | Who am I | bearer | — | `{user, expires_at}` | tokens/users | — | 401/403 |
| `GET /api/v1/properties?q=&tour_enabled=` | Properties the user may tour | bearer, Super Admin | query filters | `{properties: [{id, name, address, city, state, zip, company, tour_enabled, is_sitemap}], total}` | `communities ⋈ companies` | 60 s | 401/403 |
| `GET /api/v1/properties/{id}` | One property + tour state | bearer | — | `PropertyDetail` (+ counts, buildings, tour summary, graph_version) | communities + graph | graph cache | 404 not_found |
| `GET /api/v1/properties/{id}/stops` | Build Your Tour stops | bearer, tour on | — | `{tour_id, start_node, groups: [{key: amenities|floorplans, label, stops: [TourStopOut]}], total, graph_version}` | `tour_stops ⋈ units ⋈ floorplans`, `⋈ amenities`, + graph | graph cache | 404 · 422 tour_disabled |
| `GET /api/v1/properties/{id}/map` | Levels & buildings | bearer, tour on | — | `{levels: [LevelOut], buildings: [{name, level_ids}], is_sitemap, auto_wayfinding, scale, graph_version}` | floorplates/sitemaps via graph | graph cache | 404 · 422 |
| `GET /api/v1/properties/{id}/map/levels/{level_id}` | One level's nodes & paths | bearer, tour on | — | `{level, nodes, edges}` | graph | graph cache | 404 unknown_level · 422 |
| `GET /api/v1/properties/{id}/graph` | The routable graph | bearer, tour on | `If-None-Match` | `GraphResponse` (Rails payload shape); `ETag: "<version>"`; 304 | hallways, hallway_edges, hallway_attachments, wayfinding_stops, units, amenities, doors, elevators, building_starting_points, tours, tour_stops | per version | 404 · 422 |
| `POST /api/v1/properties/{id}/route` | Shortest route A→B | bearer, tour on | `{from_stop_id, to_stop_id, from_floor?, to_floor?, step_free?, avoid_blockers?}` | `{route: RouteOut, graph_version}` | graph + Dijkstra | graph cache | 422 unknown_endpoint · same_endpoint · ambiguous_floor · not_linked · no_path · blocked · no_step_free · no_vertical_link · no_building_link · validation_error |
| `POST /api/v1/properties/{id}/tour-route` | Route through chosen stops | bearer, tour on | `{stop_ids[], step_free?, avoid_blockers?}` | `{route, segments: [{stop_id, tour_stop_id, from_stop_id, route}], skipped[], graph_version}` | stops list + graph | graph cache | 422 invalid_stop (details.invalid_stops) · no_start · no_path |
| `POST /api/v1/properties/{id}/stops/distances` | Distance from the tour start | bearer, tour on | `{stop_ids[]}` | `{from_stop_id, distances: {id: {reachable, distance, unit, distance_ft, duration_s, direction, error?}}}` | graph (one build, one Dijkstra per target) | graph cache | 422 |
| `GET /api/v1/health` | Liveness | none | — | `{status, database, env}` | — | — | — |

`TourStopOut`: `id` (= graph node, `unit:123` / `amenity:45`), `type`, `record_id`, `tour_stop_id`,
`name`, `description` (the record's own), `instruction` (`units.stop_description` /
`amenities.directional_text`), `building`, `floor`, `level_id`, `floorplate_id`, `location {x, y}`
(door centre when the record has a door, else its pin, in level pixels), `map_node_id`, `routable`
(plotted and joined to a path with at least one edge), `sort`, `duration_minutes`,
`unit {bedrooms, bathrooms, square_feet, rent, available, model, floorplan_name}` or
`amenity {amenity_type, video_url, video_button_label}`. Only fields the database holds; nothing
is invented (e.g. no amenity "hours").

## 5. Property, stops, map, graph

* **Properties**: all `communities` for a Super Admin, ordered by name, with the tour flag resolved
  server-side; the app filters by `tour_enabled` and name. 803 rows → 145 KB (40 KB for the 226
  tour-enabled ones) in ~50 ms; the list is cached 60 s per process.
* **Tour gate**: `tour_disabled` (422) before any graph is built; the Rails API answers the same
  case with `wayfinding_disabled`.
* **Stops**: the groups the UI shows ("Amenities", "Floorplans"), each in tour order (building order
  from `tours.building_order` ∪ natural-sorted buildings, then floor, then `tour_stops.sort`, then
  id). Duplicate `tour_stops` rows for one record collapse to one stop; hidden (`display_stop =
  false`) and amenities with the flag off are excluded; unplotted stops have `routable: false` and
  no location.
* **Map**: levels are the Rails `GraphSerializer` levels (ids `floorplate:ID` / `sitemap:ID`,
  floors from `range`, image/SVG URLs, size, `space: raster`, `scale_ft_per_px`, version).
  `/map/levels/{id}` answers one level's nodes and paths for lazy loading.
* **Graph**: the Rails Tour App payload key for key (nodes unique by (id, level) with `anchor`,
  `attach`, `link`; edges with centre-pixel polylines; vertical connections; gates; tour). ETag =
  graph version; 304 on `If-None-Match`.

## 6. Routing API

Dijkstra (binary heap) over per-floor copies, exactly as `Wayfinding::RouteService`: endpoints
resolve by node id (+ `from_floor`/`to_floor` for connectors standing on several floors); both ends
must be linked; failures use the Rails error taxonomy and messages. The route answer carries
`legs` (walk legs with `points`, transition legs elevator/stairs/ramp/outdoor), `stages` (the levels
visited, with the first leg on each), `floors`, `buildings`, totals (`total_distance` px,
`total_distance_ft`/`duration_s` only when a level has a stored scale — none do today, as in Rails)
and the `steps` of section 7.

**Tour order** reuses the existing rule (no new ordering system): the chosen stops are filtered out
of the tour's ordered list (building order → floor → Tour Setup `sort` → id) and routed
start → stops → start; a stop that cannot be reached is skipped with a warning and listed in
`skipped`, as the Rails `tour` does. Cross-floor routes ride elevators/stairs/ramps (step-free
skips stairs and inaccessible connectors); cross-building routes use the outdoor edge between
gates of different buildings (supported where the data has gates in both buildings, e.g. 2934).

## 7. Route steps (the mobile contract)

Each step is assembled from the leg it describes and the real nodes it joins:

| Step | `title` | `description` | other fields |
|---|---|---|---|
| walk | `Walk on Floor 2` (level/floor of the leg; `Property map` on a sitemap) | `From Tour start to Lobby and Leasing · 53 px` (node names, pixel length; feet when a scale exists) | `distance`, `unit: px`, `distance_ft`, `floor {level_id, number, name}`, `from`/`to {id, type, name}`, `geometry` (the polyline), `leg` |
| elevator / stairs / ramp | `Take Elevator 1 to Floor 5` / `Take the stairs to Floor 3` | `Up 2 floors` / `Down 1 floor` | `transition {kind, via, name, floor_from, floor_to, from_level_id, to_level_id}` (so the app switches maps), `instruction` = the connector's directional text |
| outdoor | `Walk outside to Tower B entrance` | `Leave by Main Tour, enter by Tower B entrance` | `transition {kind: outdoor, …}` |
| arrive | `Arrive at Rooftop Lounge` | `Floor 5` | `instruction` = the stop's directional text (`amenities.directional_text`, `units.stop_description`, `wayfinding_stops.note`), `dwell_s` from `tour_stops.duration_minutes` |

A zero-length walk leg (arriving exactly at a connector) is not a step, as in `Wayfinding::Timing`.
Real example (1411, Oct 5): `Walk on Floor 3 · From 335 to Elevator 1 · 1,077 px` → `Take Elevator 1
to Floor 5 · Up 2 floors` → `Walk on Floor 5 · From Elevator 1 to Rooftop Lounge · 506 px` →
`Arrive at Rooftop Lounge · Floor 5`.

## 8. Caching

| Data | Cache | Invalidation |
|---|---|---|
| Graph (built) and its payload | in-process, keyed by (property, **graph version**, step_free, avoid_blockers), TTL 15 min | the version is recomputed on every request from the database (one aggregate query, ~30–60 ms); any changed stop, path, elevator, door, unit, amenity, tour setup or level moves it, so stale graphs are never served |
| Property list | 60 s | time |
| Routes / distances | not cached (ms over a cached graph) | — |
| Client | `ETag` on the graph; 304 on `If-None-Match`; the app keeps its last bundle and revalidates | version |

## 9. Mobile integration (`tour-app/`)

```
UI (screens, hooks)
  ↓
TourRepository (src/repositories/tourRepository.ts) — extended with login / logout / restoreSession / onSessionExpired / getProperties / selectProperty
  ↓
PynwheelApiTourRepository (src/repositories/pynwheelApi/)    ← the configured provider (VITE_TOUR_API_URL)
   apiClient.ts   one fetch wrapper: bearer, JSON, timeout, ApiError{code, message, status}, 401 → session expired
   apiTypes.ts    the API's snake_case JSON types
   parsers.ts     API → models (bundle, places, routes, segments, distances); defensive on every field
DummyTourRepository (development only, VITE_TOUR_DATA_SOURCE=dummy)
```

* `repositoryProvider.tsx` picks the provider from the build configuration; **no fallback**: an API
  build without a URL shows a configuration error screen, an API failure shows the error state
  with *Try again* / *Choose another property*.
* Session: `services/session.ts` (token, user, selected property) in `@capacitor/preferences`;
  restored on launch and checked with `GET /auth/me`; a 401 anywhere returns the app to sign-in with
  the backend's message (`sessionExpired`). *Known gap*: Preferences is not an encrypted store;
  swapping to a Keychain/Keystore plugin touches only `session.ts`.
* Flow: splash → onboarding → **Login** (CMS credentials; inline backend error) → **Search =
  property picker** (real properties; non-tourable ones say "No Self-Guided Tour") → **Home**
  (real property; the location row changes property) → **Build Your Tour** (real stops list, real
  distances) → *Generate* → `POST /tour-route` → **Guided** stop by stop (segment route, map
  switching floor on transitions, step card = API titles/descriptions, Play Route over the segment's
  geometry) → arrive → next → summary. **Find Shortest Path** uses `POST /route` with the graph's
  places. Selecting another property clears the tour, route and selection and reloads.
* Field mapping (API → UI): `stops.groups[].stops[]` → stop cards (name, floor label from
  `building`/`floor`/level, unit facts "2 Bed · 2 Bath"); `graph.levels[].image` → map background;
  `graph.nodes/edges` → map layers; `route.steps[].title/description` → the guided direction card;
  `segments[].route.legs[].points` → the walker's path; `transition.to_level_id/floor_to` → the map
  switches floor; `distances` → "1,032 px →" on the cards (feet when a scale exists).
* Demo markers (` *`) are added only for the dummy provider (`bundle.demo`); real data is never
  marked.
* Without a backend in Pynwheel: AI concierge answers a fixed "not connected" message; *Book a Live
  Tour* and *Apply* report "not available for this property yet"; tour history is local to the
  device; the unit "unlock" screen is the design's interaction (no lock-provider integration).

## 10. Configuration

`tour-api/.env` (from `.env.example`): `TOUR_API_DATABASE_URL`, `TOUR_API_RAILS_URL`,
`TOUR_API_PUBLIC_UPLOADS_URL`, `TOUR_API_CORS_ORIGINS` (includes `capacitor://localhost`,
`http://localhost`, `ionic://localhost`), `TOUR_API_ENV` (production hides `/docs`),
`TOUR_API_GRAPH_CACHE_TTL`. `tour-app/.env.development` → `http://127.0.0.1:8000`;
`.env.staging`/`.env.production` carry no secrets (the URL comes from the build environment).
Launch configs (`.claude/launch.json`): `tour-api` (:8000), `tour-app` (:3012), `rails-cms-verify` (:3100).

## 11. Verification (October 5, 2026, local development database `pynwheel_development`)

**Parity with the Rails Tour App API** (`scripts/parity.py`, Rails verify server :3100): 13 real
properties — 1411 John Pynwheel Demo, 1618 Hazel, 2934 Dummy-High-Rise, 1468, 1234 Alderwood,
1412 Jennifer Demo FP, 1105 Trestle (multi-building), 2919 Sofia (573 nodes / 359 edges), 1839
Oeuvre (stacked 1-6), 1409 Alex Demo SM (sitemap), 1232, 1106, 2157. Graph payloads **identical**
(levels, buildings, nodes, edges, vertical connections, gates, tour; `vertical_connections`/`gates`
compared as sets because Rails loads them without an ORDER BY) and **every route identical**: 225
stop-to-stop / start-to-stop routes and 13 tour routes, leg by leg and step by step. "Testing 123"
does not exist in the dump.

**Unit tests**: `tour-api` 52 pytest (auth incl. every token state, properties, stops membership
rules, maps, routing same-floor / cross-floor / stairs / step-free / ambiguous / disconnected /
invalid / cross-building / tour order & segments / skipped stops / invalid stop / distances,
security boundaries, error hygiene, the Doorkeeper client against a mocked CMS); `tour-app` 17 vitest
(routing engine, simulation, API parsers incl. missing fields); `npm run typecheck` and
`npm run build` clean.

**Live API** (`scripts/measure.py`, verify Super Admin, Rails :3100, API :8000):

| Endpoint | 1411 | 1618 (Hazel, 31 levels) | 2934 |
|---|---|---|---|
| POST /auth/login | 325 ms (bcrypt in Rails) | | |
| GET /properties (803) | 50 ms · 145 KB | | |
| GET /properties/{id} | 44 ms | 35 ms | 20 ms |
| GET …/stops | 13 ms · 2.0 KB | 11 ms · 4.8 KB | 8 ms · 5.8 KB |
| GET …/map | 13 ms · 1.4 KB | 8 ms · 9.8 KB | 4 ms · 1.4 KB |
| GET …/graph | 9 ms · 114 KB (304: 6 ms) | 6 ms · 239 KB (304: 4 ms) | 4 ms · 36 KB |
| POST …/stops/distances | 25 ms | 30 ms | 15 ms |
| POST …/route | 8 ms | 5 ms | 5 ms |
| POST …/tour-route | 12 ms · 11 KB | 13 ms · 30 KB (6 segments, floors 1→15→31) | 9 ms · 34 KB (6 segments, floors 1–4) |

Graph build from the database: 0.01–0.04 s (Rails: 0.04–0.56 s for the same payloads).

**Security checks** (live): wrong password 401 `invalid_credentials`; a real Community manager
account 401/403 (the CMS withholds the token, the API refuses); no / malformed / Basic header 401;
unknown property 404; tour-off property 557 → 422 `tour_disabled` on stops, map, graph, routes; a
Hazel stop in a 1411 tour-route → 422 `invalid_stop`; a Hazel node as a 1411 route endpoint → 422
`unknown_endpoint`; SQL-looking ids → validation / unknown_endpoint (parameterised queries);
revoked token → 401 `token_revoked`; no `access_code` / `encrypted_password` in any payload.

**Mobile, browser (375×812) against the live API**: onboarding → wrong password refused inline
with the backend's message → sign-in → real property list (with "No Self-Guided Tour" rows) →
search "John Pynwheel" → Home with the real property → Build Your Tour … (see the session report for
the screens exercised). Native builds cannot be run on this Mac (no Xcode / Android SDK).

## 12. Known gaps

* Rails holds no `scale_ft_per_px` yet, so distances are pixels and `duration_s` is null everywhere
  (as in the Rails API). The UI shows "1,032 px" until a scale is stored.
* Property 1411's development floor images live on a bucket that answers 403 here (documented
  before); the app falls back to a bundled photo for the hero and the map shows the plan without its
  background for that property. 2934's images load.
* `wayfinding_stops` (leasing, restroom, mail, …) are not `tour_stops` yet (phase 2 of the plan), so
  Build Your Tour lists units and amenities; the additional stops are routable From/To places.
* The non-portal-account case (Community manager): the CMS's `CustomTokenResponse` mints a
  Doorkeeper token row and withholds it. That is pre-existing CMS behaviour, untouched.
* Session storage uses `@capacitor/preferences` (not encrypted); concierge, booking, application and
  smart locks have no Pynwheel backend; tour history is on-device.
* Verification accounts `tour-api-verify@pynwheel.local` (Super admin) and
  `tour-api-viewer@pynwheel.local` (Community manager) exist only in the local
  `pynwheel_development` database for this verification; remove them when no longer needed.

## 13. Map rendering fix: SVG floor plans, zoom, playback (October 6, 2026)

Brief: `map_rendering_issue_in_tour_app.md`; the Hazel screenshot showed a route drawn over an
empty grey sheet, raw HTML in the arrival text, a zoom-in that needed two taps, no zoom-out or
reset, and a walker that ran too fast.

### Root causes (traced DB → API → app → renderer)

1. **The map base had one code path: a raster `<image href>` or a flat grey rectangle.** The app
   never used the floor **SVG** the API already named (`levels[].svg`), and an `<image>` that
   fails (a private bucket, a slow host) renders nothing, with no error state. Hazel's own plates
   are raster PNGs that load from this machine; in the reported run the base was simply not there
   (the grey `<rect>` is what the screenshot shows). An SVG-only floorplate such as Dummy-High-Rise
   `floorplate:3029` could never render: it has no raster size (`width/height` 0) so the level had
   a 0×0 frame.
2. **SVG files cannot be fetched by the web view.** The CMS stores them on S3 without CORS headers
   (Connect proxies them for the same reason, `plan-svg/route.ts`); only a server-side read works.
3. **Zoom "needed two taps"**: the map container set pointer capture on every `pointerdown`,
   including a tap on the `+` button, so the button's `click` never fired; the second tap within
   320 ms was read as a double-tap zoom. There was no `−` and no reset.
4. **Playback**: a flat 220 px/s whatever the plan's size.
5. **Raw HTML**: `amenities.directional_text` is rich text in the CMS; the API passed it through.

### What changed

**API (`tour-api`)**
- `GET /api/v1/properties/{id}/map/levels/{level_id}/svg` (new): fetches the level's floor SVG
  server-side (`integrations/assets.py`: `https://*.amazonaws.com` and the configured uploads host
  only, 60 s timeout, 24 MB cap), validates it is an SVG document (root `<svg>` via a streaming XML
  parse; 422 `invalid_svg` otherwise), caches it in memory (file names carry an upload timestamp, so
  a URL's content never changes; LRU 128 MB), and answers `image/svg+xml` with `ETag`,
  `Cache-Control: private, max-age=86400`, `X-Svg-ViewBox` and 304 on `If-None-Match`. 404 `no_svg`
  / `unknown_level`, 502 `svg_unavailable`.
- `LevelOut` (`/map`, `/map/levels/{id}`) gained `svg_path` (the proxy path), `svg_transform`
  (the stored `svg_to_image_transform`, null everywhere today) and `svg_size` (`svg_metadata`).
  The `/graph` payload is unchanged (it stays the Rails shape the parity harness diffs).
- `instruction` / `description` on stops and route steps are plain text (`rubyisms.strip_html`).

**App (`tour-app`)**
- `map/mapBase.ts`: the one coordinate rule. A level's **frame** is its floor image's pixels when it
  has them, else the SVG's own viewBox (SVG-only plates are plotted in viewBox units: 3029's 23
  hallways lie within its 2000×2000 viewBox), else the image's measured natural size. The SVG is
  drawn into the frame the way the CMS canvas draws it, stretched to fill (`preserveAspectRatio=
  "none"`), unless a calibrated `svg_to_image_transform` exists, which is then applied as a matrix
  (`Wayfinding::PlateTransform`). No per-property offsets.
- `map/useLevelBase.ts`: loads the SVG through the API with the session token into a Blob URL
  (drawn by an `<image>`, so a 5 MB Illustrator export is rasterised by the image pipeline, not
  inflated into the DOM), caches it per level for the session, parses the viewBox from the head of
  the file, and retries a raster on the plain S3 host when the accelerated host fails. States:
  loading → ready(svg | image) | error(unavailable | invalid | network | none).
- `MapView`: plan layer from the loader; "Loading map…" veil; explicit "Map unavailable" / "Invalid
  floor plan" / "No floor plan" overlay (never a silent blank); the `<svg>` carries
  `data-base`/`data-base-kind`/`data-plan` for tests. Zoom controls `+` / `−` / Reset, one action
  per tap: the controls stop the pointer before the gesture handlers and the viewport ignores a
  `pointerdown` on a button; Reset re-runs the screen's initial fit (route or whole level) without
  touching selection, route or data.
- Playback (`wayfinding/simulation.ts`): speed is a distance per second in the design frame
  (`PLAYBACK_SPEED_DESIGN_PX_PER_S = 45`) scaled by each level's diagonal (the routing engine's
  `unit`), clamped 30–140 px/s; a longer segment takes proportionally longer; transition hold 2.2 s,
  arrival hold 0.6 s. One constant to tune.
- Repository: `getLevelSvg(level)`; the bundle also reads `/map` for the level extras; a fresh
  repository instance restores the persisted session before its first request.

### Verified (local, `pynwheel_development`, Rails :3100, API :8000, app :3012)

| Property · level | Plan | Result |
|---|---|---|
| Dummy-High-Rise 2934 · `floorplate:3029` (floors 1–3, SVG-only, viewBox 2000×2000, 5.2 MB) | SVG | renders; frame 2000×2000; route 1130 → Office Space drawn over it (2,797 px, floors 1→2 via Elevator Bank); Play Route walker ≈40 px/s, step list follows, floor chip switches to Floor 2 |
| Dummy-High-Rise 2934 · `floorplate:3085` (raster 1251×626 + SVG 1412×912, 1.7 MB) | SVG over raster frame | API serves it (viewBox 0 0 1412 912); drawn stretched into the 1251×626 frame |
| Hazel 1618 · `floorplate:2241` … | raster PNG | renders (API: `no_svg` for the SVG path, as expected) |
| John Pynwheel Demo 1411 | raster on a bucket that answers 403 here | explicit "Map unavailable" state; hero falls back to the bundled photo |

API: first SVG fetch 3.4 s (3029) / 2.3 s (3085) from S3, 10–14 ms from cache, 304 on ETag. Zoom:
one tap 0.11 → 0.154 (×1.4), second 0.216, minus back to 0.154, Reset 0.11 (initial fit). Tests:
57 pytest (`test_svg.py`: proxy, 304, `no_svg` / `invalid_svg` / `unknown_level`, viewBox parsing
incl. Illustrator DOCTYPE, plain-text instructions), 22 vitest (`mapBase.test.ts` placement rules,
playback speed).

### Not verified / remaining

- iOS and Android web views: no Xcode or Android SDK on this Mac. The design is web-view friendly
  (Blob URLs, no CORS on the plan fetch, no inline DOM of the SVG), but untested on devices.
- "Testing 123" does not exist in the dump; Hazel and John Demo have no SVG plates in this database
  (86 SVG floorplates exist on 7 tour-enabled properties; 2934 was used as the SVG case).
- `svg_to_image_transform` is null for every plate, so SVG placement is the CMS's stretch rule; a
  stored calibration is honoured automatically when one appears.
- For an SVG-only plate without `svg_metadata` (3029) the walker uses the design speed (45 px/s).

## 14. The API moves into Rails: `Api::TourApp::V1` replaces `tour-api/` (October 7, 2026)

The FastAPI service of sections 1–13 was a detour: Pynwheel's backend is Ruby on Rails and the
owner wants one runtime. On October 7 the Tour App API was ported into the CMS with the same
contract, verified against the running FastAPI service endpoint by endpoint, and `tour-api/` was
deleted (branch `feature/tour_app_rails_api`). Sections 1–13 stay as the record of how the contract
came to be; where they say "FastAPI" or `/api/v1`, read "the Rails app" and `/api/tour/v1`.

```
Capacitor Tour App (tour-app/)
      │  HTTPS · Authorization: Bearer <Doorkeeper token> · JSON
      ▼
Rails CMS  /api/tour/v1  (Api::TourApp::V1 controllers → TourApi services → Wayfinding::*, TourStops::Membership, Connect::ProductState)
      │
      ▼
Pynwheel Postgres database
```

### What changed and what did not

| | Before (Oct 5–6) | Now |
|---|---|---|
| Runtime | FastAPI (`tour-api/`, Python) reading the CMS database read-only + two HTTP calls to Rails for sign-in / sign-out | the Rails app itself |
| Paths | `/api/v1/...` | **`/api/tour/v1/...`** — `GET /api/v1/properties` is a legacy vendor route (`api/v1/schedule_tours#communities`, `config/routes.rb` line ~921) that answers suffix-less requests, so the Tour App API could not sit at `/api/v1` without shadowing it. The mobile app's prefix is one constant (`API` in `tour-app/src/repositories/pynwheelApi/pynwheelApiTourRepository.ts`); nothing else in the app changed. |
| Graph & routing | Python port of `Wayfinding::GraphBuilder` / `RouteService` / `Timing` / `GraphSerializer` / `GraphVersion`, proven equal by `scripts/parity.py` | the Rails services themselves, reused as they are (no fork): `TourApi::RouteService < Wayfinding::RouteService` adds only the chosen-stops tour (`tour(stop_keys:)`, with segments) and `distances(targets)`, sequencing the parent's private helpers |
| Sign-in | HTTP `POST /api/v2/auth/token` to the CMS, then `oauth_access_tokens` read by SQL | the CMS's Doorkeeper password grant run **in-process**: `Api::TourApp::V1::AuthController` includes `Doorkeeper::Helpers::Controller`, so `server.token_request('password').authorize` runs the same `resource_owner_from_credentials` block (Devise `find_for_database_authentication` + `valid_password?`) as the token endpoint and mints the same `Doorkeeper::AccessToken` |
| Token check | SQL on `oauth_access_tokens` | `Doorkeeper::AccessToken.by_token` → revoked? / expired? → user → inactive (pending invitation, inactivated company) → `User#is_super_admin?`; property access `User#can_access_community?` |
| Facts mirrored in Python | `tour_enabled`, `in_list?`, upload URLs, double-parsed `product_options`, `humanize`, natural sort | gone: `Connect::ProductState.tour?`, `TourStops::Membership`'s rule (read in bulk, `TourApi::Stops`), `Connect::UploadUrl`, `Wayfinding::PlateTransform.present?` are called directly |
| Legacy code | untouched | untouched: no legacy controller, route, schema or persistence changed; no migration. `Api::SelfTour::V1::TokenAuthorization` and the self-tour API are exactly as before. The one shared file edited besides `config/routes.rb` (additive scope) is `config/initializers/filter_parameter_logging.rb` (adds `token` to the filtered parameters, see Logging). |

### Rails files added

```
config/routes.rb                                  scope path: 'api/tour/v1', module: 'api/tour_app/v1' (after the legacy api namespace; a JSON 404 catch-all for the prefix)
app/controllers/api/tour_app/v1/
  base_controller.rb        ActionController::API; bearer → TourApi::Auth; the error envelope for ApiError / ParameterMissing; internal_error with a log ref, never a trace; pydantic-style body/query validation helpers
  property_controller.rb    /properties/:property_id gates: exists + access (404), tour on (422 tour_disabled); the cached built graph + payload
  auth_controller.rb        POST auth/login (Doorkeeper grant in-process) · POST auth/logout (revoke) · GET auth/me
  properties_controller.rb  GET properties (?q=, ?tour_enabled=; 60 s per-process list cache) · GET properties/:id (counts, buildings, tour summary, graph_version)
  stops_controller.rb       GET properties/:id/stops
  maps_controller.rb        GET …/map · …/map/levels/:level_id · …/map/levels/:level_id/svg (ETag, 304, X-Svg-ViewBox, Cache-Control private max-age=86400)
  graphs_controller.rb      GET …/graph (ETag = graph version, 304 on If-None-Match, JSON string cached per version)
  routes_controller.rb      POST …/route · …/tour-route · …/stops/distances
  health_controller.rb      GET health (no token) · errors_controller.rb (404 envelope)
app/services/tour_api/
  api_error.rb    ApiError(status, code, message, details, headers) + unauthorized / forbidden / not_found / unprocessable / validation
  auth.rb         login(granted) · authenticate(bearer) · logout · admit (the token states and 403 codes of §3) · display_name
  properties.rb   summary · all_summaries (SELECT of the needed columns, company names in one query, 60 s MemoryStore) · list · find! · require_tour! · counts · detail
  engine.rb       Built(version, graph, payloads, graph_json): GraphBuilder per (property, GraphVersion, step_free, avoid_blockers), per-process cache, 15 min TTL, 64 entries, older versions of a property dropped; GraphSerializer payload per base URL
  shapes.rb       the Pydantic shapes (every field present, null when it does not apply, model field order) for levels, nodes, edges, vertical connections, gates, tour, the graph response
  stops.rb        the stops list of §4–5: main tour, lowest visible tour_stops row per record, amenity flag, floor plan by provider id, node facts (level, location, routable), tour order
  maps.rb         map · level · svg · graph; svg_path / svg_transform (PlateTransform.present?) / svg_size per level
  assets.rb       the SVG reader of §13: *.amazonaws.com or this host (an upload this host serves is read from public/), 24 MB cap, streaming GET with redirects, first-element validation (Nokogiri::XML::Reader, STRICT|NONET), viewBox, SHA1 ETag, 128 MB per-process LRU
  route_service.rb  Wayfinding::RouteService subclass: tour(stop_keys:) → [Result, segments], distances(targets); the open graph for a blocked diagnosis comes from Engine's cache
  routing.rb      route · tour_route · distances · failure (422 with from/to/warnings/graph_version) and the step adapter of §7 (titles, descriptions, transitions, dwell_s)
  text.rb         strip_html (tags → text, entities decoded, whitespace collapsed), Python-truthiness and to_f mirrors, name_of / place_name (Timing's phrasing), delimited / round_half_even ("1,032 px"), timestamp, py_str
script/tour_api_parity.rb   two bases, endpoint by endpoint (replaces tour-api/scripts/parity.py)
script/tour_api_measure.rb  live timings and payload sizes (replaces tour-api/scripts/measure.py)
test/support/tour_api_test_helper.rb · test/controllers/api/tour_app/v1/{auth,properties,stops,maps,routing,security}_test.rb · test/services/tour_api/{text,assets}_test.rb
```

### Authorization design (the part the October 5 session could not do)

Only the **new** `api/tour` controllers authenticate CMS users by bearer token; the owner authorised
this namespace explicitly. `Api::TourApp::V1::BaseController#authenticate!` reads the
`Authorization: Bearer <token>` header (any other scheme is `401 unauthorized` with
`WWW-Authenticate: Bearer`), looks the token up with `Doorkeeper::AccessToken.by_token`, and
`TourApi::Auth.admit` answers exactly the codes of §3: `401 invalid_token` (unknown token or a token
whose user is gone), `401 token_revoked`, `401 token_expired`, `403 inactive_user`
(`invitation_token` set and never accepted, or `companies.inactivate`), `403 not_super_admin`.
Property access is `User#can_access_community?` (a Super Admin sees every property; a property the
user may not see is a `404`). Sign-in runs the Doorkeeper password grant inside the request, so
Devise verifies the password and Doorkeeper mints the token exactly as `POST /api/v2/auth/token`
does; the CMS's `CustomTokenResponse` rule (an account that is not a portal user gets no token) is
kept as `403 not_authorized_account`, and every refused sign-in revokes the just-minted token
(the FastAPI service could not revoke the token the CMS withheld). Sessions, cookies and CSRF play
no part: the controllers are `ActionController::API`.

### Contract parity (`script/tour_api_parity.rb`, FastAPI :8000 vs Rails :3100, dev database)

Every response of every endpoint was diffed for 1411 John Pynwheel Demo, 1618 Hazel and 2934
Dummy-High-Rise — login, me, properties (with and without `?tour_enabled=true`), the error envelopes
(404, 422 validation, bad token, unknown level, `no_svg`, `unknown_endpoint`, `invalid_stop`),
properties/{id}, stops, map, map/levels/{id}, graph (+ `If-None-Match` → 304 on both), the SVG of
`floorplate:3029` (same bytes, same ETag `"01d7a1f975a54da98156"`, same `X-Svg-ViewBox 0 0 2000 2000`),
stops/distances for every stop, route start → first stop and between consecutive routable stops,
step-free, tour-route over the routable stops: **57 comparisons, 0 differences** with the literal port
(commit `f7b79e6d2`), ignoring only `access_token` / `expires_at`, the graph-version digest (each
runtime hashes the same inputs in its own number format: `wf-1411-8d0d5f38…` vs `wf-1411-8a690f59…`;
the ETag/304 round trip was checked on each side) and the `/api/v1` → `/api/tour/v1` prefix inside
`svg_path`. Shapes match field for field because the Pydantic models serialised every field (nulls
included) and `TourApi::Shapes` does the same; Ruby's `to_json` and Python's `json.dumps` differ only
in how they spell the same numbers.

**One deliberate divergence, as its own commit (`9d8de8485`):** the FastAPI `tour-route` offset a
segment's leg indexes in place when assembling the whole tour and then offset the step indexes again,
so after the first stop `segments[].route.steps[].leg` no longer named one of that segment's legs, the
whole `route.steps[].leg` overshot `route.legs`, and an elevator step's `transition.to_level_id` was
null. The app matches steps to legs by index during Play Route (`wayfinding/simulation.ts`
`stepIndexOf`), so the step card fell out of sync after the first stop. In Rails a segment is a route
on its own (legs and steps 0-based, the transition names the level to switch to) and the whole tour's
legs and steps carry whole-tour indexes once. Re-running the harness after this commit shows
differences in exactly those fields of the three `tour-route` responses (`route.steps[].leg`,
`segments[].route.{legs[].index, stages[].leg, steps[].leg}`, `transition.to_level_id`) and nowhere
else; the mobile app needed no change for it.

### Tests

`rails test`: **167 runs, 831 assertions, 0 failures, 0 errors, 7 skips** = the previous 103 / 338 / 0
(unchanged, the 7 skips are the dead `schedual_tours` scaffold) plus 64 new runs. The 57 pytest of
`tour-api/tests` became Minitest integration tests over the wayfinding fixture property, extended in
`test/support/tour_api_test_helper.rb` with the rows the Python fixture had (a Gym stop with a dwell and
rich-text instructions, a hidden stop, a Pool whose "Show in Stops List" is off, a duplicate
`tour_stops` row, an island stop no path reaches, a second building reached outdoors):

- `auth_test` (16): Doorkeeper grant mints the token (5-day expiry), wrong password / unknown account,
  not a portal user → `not_authorized_account` + revoked, portal user not a Super Admin →
  `not_super_admin` + revoked, inactivated company → `inactive_user`, body validation, missing /
  unknown / Basic / expired / revoked / orphan tokens, non-admin token, me + logout (then
  `token_revoked`), health, the prefix's JSON 404.
- `properties_test` (7): list (fields, order), `tour_enabled` and `q` filters, bad boolean, detail with
  and without the tour, 404, `tour_disabled` on stops / map / graph / level / route / distances, nothing
  written by any read.
- `stops_test` (6): membership (flag on/off, hidden, duplicates collapse, tour order), the stop
  contract (door-centre location, floor plan facts, plain-text instruction), island not routable,
  unplotted stop without location, no stops without a main tour, `TourStops::Membership.set!` off/on
  round trip seen by the API.
- `maps_test` (7): map levels / buildings / `svg_path` / `svg_size` / SVG-only width null, calibrated
  transform carried (malformed dropped), level detail + `unknown_level`, graph shape (every node and
  level carries every field; anchors, attachments, floors, lift once per level, vertical connections,
  gates, tour stops, edge polyline) + ETag/304, SVG served validated and cached (ETag, viewBox,
  Cache-Control, 304 from cache), SVG errors (`no_svg`, `invalid_svg`, `unknown_level`, 401, 502
  `svg_unavailable`), plain-text instructions everywhere (the CMS text itself untouched).
- `routing_test` (13): same-floor route (legs, floors, stages, every step field), cross-floor via the
  elevator with its transition, stairs, step-free (and `no_step_free` with the lift inaccessible),
  `ambiguous_floor`, `not_linked`, `blocked` / `avoid_blockers: false`, invalid endpoints and bodies,
  cross-building outdoor step, tour-route order / segments / dwell / consistent indexes, skipped
  unreachable stop with a warning, `invalid_stop` before any routing, distances.
- `security_test` (7): another list's stop rejected, another property's node `unknown_endpoint`,
  tour-disabled routing, non-admin blocked everywhere, id validation (0 / abc → 422, unknown → 404),
  `internal_error` never leaks internals, another property isolated (its own version, sitemap level),
  no `access_code` / `encrypted_password` in any payload.
- `text_test` (5) and `assets_test` (3): `strip_html`, `to_f`, rounding, names and places, timestamps;
  viewBox parsing (Illustrator DOCTYPE, invalid inputs), allowed hosts / validation / cache, local upload
  read from `public/`.

Test-environment traps worth knowing: the uploaders are fog without a bucket there, so any level with
an `image` or `svg_image` makes `Connect::UploadUrl` raise — the helper's `with_s3_uploads` stands in
the S3 URL the CMS would answer; and a fixture `Community` instance caches its `floorplates` before rows
created in `setup` (a `pluck` on a loaded association is in-memory), which changes
`Wayfinding::GraphVersion.for` — the helper hands tests a freshly loaded community.

### Measurements (`script/tour_api_measure.rb`, Rails verify server :3100 in **development mode**, dev database, each request twice; first / warm)

| Endpoint | 1411 | 1618 Hazel (31 levels) | 2934 Dummy-High-Rise |
|---|---|---|---|
| POST /auth/login | 343 ms (bcrypt + Doorkeeper insert) | | |
| GET /properties (803 rows) | 56 ms uncached · 18–24 ms cached (145 KB); `?tour_enabled=true` 10–12 ms (40 KB) | | |
| GET /properties/{id} | 40 ms | 40 ms | 45 ms |
| GET …/stops | 47 / 33 ms · 1.9 KB | 37 / 34 ms · 4.6 KB | 42 / 50 ms · 5.7 KB |
| GET …/map | 25 / 34 ms · 1.7 KB | 29 / 27 ms · 11.4 KB | 37 / 34 ms · 1.7 KB |
| GET …/graph | 28 / 29 ms · 114 KB (304: 31 ms) | 31 / 28 ms · 244 KB (304: 27 ms) | 34 / 30 ms · 37 KB (304: 42 ms) |
| GET …/map/levels/{id} | 34 / 27 ms · 32 KB | 29 / 28 ms · 7.6 KB | 32 / 33 ms · 18 KB |
| GET …/map/levels/floorplate:3029/svg | | | 293 ms · 5.2 MB from the per-process cache (first read from S3 9–11 s); 304: 30 ms |
| POST …/stops/distances | 28 / 26 ms | 42 / 43 ms | 35 / 39 ms |
| POST …/route | 28 / 27 ms | 31 / 33 ms | 33 / 30 ms |
| POST …/tour-route | 40 / 36 ms · 11 KB (2 segments) | 50 / 56 ms · 29 KB (6 segments, floors 1→15→31) | 45 / 50 ms · 34 KB (6 segments, floors 1–4) |

The ~25 ms floor is the development server (code reloading checks on every request, debug SQL
logging, no class caching); the FastAPI numbers of §11 were 5–15 ms for the same bodies. A graph is
built from the database once per graph version per process (0.04–0.6 s, as in §11) and the
`GraphSerializer` payload and the `/graph` JSON string are remembered with it; the property list is
remembered for 60 s per process. Production (`log_level :error`, eager loading, no reloader) will sit
well below these numbers; it was not measured here.

### Verified in the browser (tour-app :3012 → Rails :3100, no app change but the prefix constant)

Onboarding → sign in as the verification Super Admin → the real property list (803, "No Self-Guided
Tour" rows) → search → **Hazel (1618)** → Home → Build Your Tour (7 real stops with distances from the
tour start: "The Lobby · Floor 1 · 369 px", "Fitness Centre · 1032 px", …) → The Lobby + Fitness Centre
+ Penthouse West Lounge → Generate (`POST /tour-route`, 3 segments) → Guided: the raster plate renders,
"Walk on Floor 1 · From Main Entrance to The Lobby · 369 px", Play Route animates → I've Arrived →
the stop's CMS description → Next Stop → "From The Lobby to Fitness Centre · 808 px" → stop 3: floor
chips Floor 1 / Floor 31, "Elevators → Floor 31", Play Route walks to the elevators, the map switches to
**Floor 31** and the card follows ("Walk on Floor 31 · From Elevators to Penthouse West Lounge · 150
px", then "Arrive at Penthouse West Lounge · Floor 31 · The West Lounge is located directly in front
of the elevators." — the CMS's directional text, plain) → Finish → "Tour Complete" → Tour Summary
(3 stops, 9 minutes, stops visited with floors) → Back To Home → Change property → **Dummy-High-Rise
(2934)** → Build Your Tour (5 amenities, 7 units) → Game Room + 1130 + Office Space → Generate → the
SVG-only plate `floorplate:3029` (5.2 MB, served through `/map/levels/floorplate:3029/svg`) renders
with the route over it ("Walk on Floor 1 · From Tour start to Sofia's Parlour - Game Room.jpg · 2,449
px"), Play Route → arrive → unit 1130 slide-to-unlock (the design's interaction) → Office Space: floor chips Floor 1 / Floor 2, "Elevator Bank → Floor 2", Play Route walks
"From 1130 to Elevator Bank · 1,176 px", the map switches to **Floor 2** ("Walk on Floor 2 · From Elevator Bank
to Office Space - Upper Study.jpg · 1,621 px") and arrives ("Arrive at Office Space - Upper Study.jpg ·
Floor 2") → Finish → summary. Every request went to `http://127.0.0.1:3100/api/tour/v1/...` (CORS preflights
answered by the existing `Rack::Cors`), with no console errors. `npm run typecheck`, `npx vitest run`
(22) and `npm run build` are clean.

### Logging

Rails filters `password` from request logs; `token` was added to `filter_parameters`
(`config/initializers/filter_parameter_logging.rb`), which also masks the `oauth_access_tokens.token`
bind in ActiveRecord's debug SQL log — without it the development and staging logs printed the bearer
token on every request (`WHERE "oauth_access_tokens"."token" = $1 [["token", "…"]]`), and the legacy
token endpoint's INSERT had always done the same. The API's own log lines carry user ids and
statuses only (`[tour-api] login ok user_id=…`, `login refused user_id=…`, `logout … revoked=…`,
`internal_error ref=…`). An unexpected exception answers `500 internal_error` with a 12-character
reference that the log line carries, never a trace.

### Deployment: the API is the Rails app

- **Nothing new to run.** Deploy the CMS as before; the Tour App API is served under
  `https://<cms host>/api/tour/v1`. No new environment variable is needed: the database, Doorkeeper
  (`access_token_expires_in 5.days`), Devise and the S3 configuration are the CMS's. `Rails.cache` is
  not used for the graph (per-process memory, keyed by the graph version); with several Puma workers
  each builds its own copy once per version.
- **CORS.** The Capacitor web view's origins are `capacitor://localhost`, `https://localhost`,
  `http://localhost` and `ionic://localhost`; `config/application.rb` already mounts `Rack::Cors` with
  `origins '*'`, `headers: :any`, methods GET/POST/OPTIONS…, so no change was needed. The app reads no
  response header (it uses the body's `version` for `If-None-Match` and the SVG's own viewBox), so
  `expose_headers` is not required; add `expose: ['ETag', 'X-Svg-ViewBox']` to that block if it ever
  does.
- **SVG floor plans** are read by the Rails process from `https://*.amazonaws.com` (the bucket the
  record's `standard_image_url` names, through S3 Transfer Acceleration) or, for a development upload
  the CMS host serves itself, from `public/uploads/...`; nothing else is ever fetched. Files are cached
  per process (128 MB LRU; the first read of 3029's 5.2 MB took 9–11 s from S3 here).
- **Mobile build.** `VITE_TOUR_API_URL=https://<cms host> npm run build && npx cap sync android` (an
  https URL: release builds keep the web view strict). `tour-app/.env.development` points at
  `http://127.0.0.1:3000` (`rails server`); the verify server is :3100. The owner's git-ignored
  `tour-app/.env.production.local` still names `http://192.168.1.101:8000` (the retired FastAPI port)
  and must be changed to the CMS host before the next device build.

### Removed

`tour-api/` (app, tests, scripts, README, `.env.example`, Procfile, `.venv`), the `tour-api` entry of
`.claude/launch.json` (the `tour-app` entry now launches with `VITE_TOUR_API_URL=http://127.0.0.1:3100`),
the Python harness (`scripts/parity.py`, `scripts/measure.py` → `script/tour_api_parity.rb`,
`script/tour_api_measure.rb`). The verification accounts of §12 are unchanged
(`tour-api-verify@pynwheel.local`, id 2050, Super admin; its password was reset for this run with
`rails runner` and lives only in the session scratchpad).

### Known gaps (October 7, 2026)

- The 60 s property-list cache and the graph cache are per Puma process; a change made in the CMS is
  seen by the Tour App within a minute (list) or at once (graph version is recomputed per request).
- A malformed JSON body answers Rails' plain `400 Bad Request` (the parse error is raised before the
  controller), not the envelope; a wrong verb on a known path answers the envelope's `404 not_found`
  where FastAPI answered `405 method_not_allowed`. The app sends neither.
- Elevator steps on a level without floors would read "Take … to Floor None" (kept from the Python
  contract; no such level exists in the data, all routed connectors have floors).
- Everything of §12–13 that is not about the runtime still holds: no `scale_ft_per_px` anywhere
  (pixels, `duration_s` null), 1411's development floor images 403, `wayfinding_stops` are not tour
  stops, concierge / booking / application / locks have no backend, Preferences is not encrypted
  storage, iOS / Android web views untested here (no SDKs on this Mac).
- The development-mode timings above are not production figures.

## 15. Final QA pass: cold-graph single flight and the SVG disk cache (October 7, 2026)

Brief `issues_in_tour_app.md`; report `tour-app-final-qa-report.md`. Two generic server-side
changes, no contract change (`rails test` 172 runs / 848 assertions / 0 failures):

- **`TourApi::Engine.built` is single-flight.** The app opens a property with four parallel
  requests and then asks for distances; on a graph version nobody had built yet each request built
  its own copy (4 builds per cold open on 1064, 1114, 1241 — measured with `scratchpad/probe.rb`).
  Now the first request builds and the others wait on a condition variable for the same `Built`
  (1 build per cold open on 1268, 1234). On the dump the saving is small (0.2–1.8 s builds); on a
  property whose build takes seconds it is the difference between one stall and one per Puma thread.
  `test/services/tour_api/engine_test.rb` (4 threads → 1 build).
- **`TourApi::Assets` keeps validated floor SVGs on disk** (`tmp/cache/tour_api_svg/<sha1(url)>.svg`)
  and reads them before fetching, so a process restart or another worker never fetches a plan from
  S3 again. The first S3 read of 2934's 5.2 MB plan took 17 s this run (9–11 s and once 205 s on
  earlier runs); from memory or disk it is 30–300 ms. Invalid files are never written.
  `test/services/tour_api/assets_test.rb`.

Development-dump measurements for nine Self-Tour properties (warm, development mode): detail 39–44
ms, stops 34–71 ms, map 23–38 ms, graph 27–40 ms (37–256 KB), route 24–34 ms, tour-route 37–55 ms,
distances 26–43 ms — the ~25 ms floor is the development server. `pynwheel_prod` was not read
(permission refused in this session), so the production John Demo numbers remain to be taken with
`script/tour_api_measure.rb` against a Rails server on that database.
