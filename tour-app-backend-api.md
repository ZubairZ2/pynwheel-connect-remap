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
