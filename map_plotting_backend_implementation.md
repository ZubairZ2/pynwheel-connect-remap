# Map & Plotting / Tour Setup / Tour App — backend implementation

Date: October 4, 2026
Brief: `backend_implementation.md`; design: `backend_architecture_plan_report.md` (owner decisions of October 3, 2026)
Scope: the Pynwheel CMS (Rails 7.2.2 + Postgres), the Next.js Connect app in `pyn-connect-web/`, the existing mobile Tour App (`api/self_tour/v1`), and the API the new mobile app will consume.

Every statement below was verified on this machine against the local `pynwheel_development` database (a restored staging copy) unless marked **NOT VERIFIED**. Nothing was run against `pynwheel_prod`, staging or production.

---

## 1. Implementation summary

The legacy system keeps its data model and every one of its screens and actions. The new work is additive:

- **Schema** — eleven reversible migrations: wayfinding columns on `hallways`; new tables `hallway_edges`, `hallway_suppressions`, `hallway_attachments`, `hallway_detection_runs`, `wayfinding_stops`; `kind` / `accessible` / `floor_positions` on `elevators`; `note` on `doors`; `wayfinding_version` / `svg_to_image_transform` / `scale_ft_per_px` on `floorplates` and `sitemaps`; `tour_setup_version` on `tours`; `duration_minutes` on `tour_stops`; indexes `tour_stops(stop_type, stop_id)` and `units(floorplate_id)`. Every column is nullable or defaulted so that every existing row keeps today's meaning (a hallway is a hand-drawn, confirmed, floor-image-pixel node; an elevator is an accessible elevator).
- **Domain** — `Wayfinding::GraphSave` (one transactional save of one level's nodes, edges, links, pins and additional stops, with compare-and-swap versions, detect/edit rules, natural-key idempotency and deletion tombstones), `TourSetup::Save`, `TourStops::Membership` ("Show in Stops List"), `TourStops::Remove` (the legacy stop removal as a service), `Wayfinding::GraphBuilder` + `RouteService` + `Timing` (the routing semantics of the Connect preview, in Rails), serializers for Connect and the Tour App, `PlateTransform` / `ReprojectPlate` / `DetectionUndo`, `GraphVersion`, `VersionBump`, `Connect::Flags`.
- **HTTP** — three Connect write endpoints on the owning legacy controllers (`PUT /communities/:id/wayfinding_graph.json`, `PUT /communities/:id/tours/save_setup.json`, `PUT /communities/:id/tours/stop_list.json`), a from/to branch on the existing `shortest_path.json`, new keys and `meta.versions / csrf_token / writes_enabled / can_edit_map` on the existing map read, and the Tour App API `GET /api/self_tour/v1/communities/:id/wayfinding{,/route,/tour_route}`.
- **Legacy engine** — `ShortestPath` reads `Hallway.routable` at its six load sites and lost an N+1; both edits are proven output-identical by a snapshot harness over nine real properties (web and mobile variants).
- **Next.js** — the save payload builder (`graphDiff.ts`), PUT + CSRF in the network boundary, four route handlers, a Save button on Map & Plotting and on Tour Setup, and "Show in Stops List" persisted from the unit and amenity dialogs (the only field those dialogs persist).
- **Tests** — the Minitest harness repaired (it could not load its own fixtures before) and 103 tests / 336 assertions covering models, services, controllers and the Tour App API; the legacy hallway actions and `display_stop` are pinned.
- **Tooling** — `rake wayfinding:snapshot|compare` (engine regression oracle), `rake wayfinding:repair:*` (data repair, dry-run by default).

### Deviations from the architecture report, and why

| Report said | Implemented | Why |
| --- | --- | --- |
| `hallway_edges` without level columns | `hallway_edges.parent_type/parent_id/community_id` added | one query per level and per property without joining through `hallways` |
| `hallway_attachments` without an anchor | `anchor_x/anchor_y/space` added | Connect's "place at the selected point and link" gives a unit plotted only on the SVG a join point on the image; without it that bridge could not be saved |
| exact-duplicate refusal for `origin: 'edit'` node adds | merged within 1 px, as detect merges within 6 px | a retried save after a timeout must not fail; merging is idempotent and loses nothing |
| audit rows with `item_type: 'WayfindingGraph'` | rows on the real record (`Floorplate` / `Sitemap` / `Tour` / `Unit` / `Amenity`) with events `wayfinding_save`, `wayfinding_detect`, `tour_setup_save`, `stop_list_add/remove` | PaperTrail's polymorphic `item` constantizes `item_type`; a made-up type raises |
| migrations 12–13 (CHECK constraints) in this phase | **not shipped**; repair task written, constraints left for the step after the repair has run (report §31 step 9) | a `NOT VALID` constraint still rejects legacy saves of the 39 rows the repair has to fix first |
| `Procfile` `release:` phase | **not changed** | the owner deploys by hand today (PYN_CONNECT_PROGRESS.md §8); adding a release phase is a deploy-process change to decide separately |
| Tour App gate `auto_wayfinding && tour?` | `tour?` only (Connect::ProductState) | phase 2p already offers Wayfinding to every Self-Guided Tour property; `auto_wayfinding` keeps driving the door-plus markers only. The flag is in the payload |
| per-form CSRF token in a third cookie | the Next.js server fetches the token together with the session cookie it belongs to, per write (`connectWrite.server.ts`) | with the cookie session store the token lives inside the session cookie, so the pair has to come from one response; the sign-in handler is untouched |
| (phase 1 UI) the amenity pill "In Stops List / Hidden from Stops" read the form flag alone | the pill, the State filter and the dialog switch read `in_stops_list` (a visible stop of the main tour whose flag is on), the fact the toggle persists | the flag alone said "In Stops List" for amenities the tour never visits; the read and the write must agree |

The brief's §18 ("only Show in Stops List may persist for Units and Amenities") is read as the unit and amenity **forms**. Plotting a unit or amenity on the map (pins) is Map & Plotting's own function and is saved through the graph save with the legacy plotting actions' semantics, as the report's §11 lists; the inventory dialogs persist nothing but the stops-list toggle. **October 5, 2026:** the screen no longer sends unit and amenity pins (`PLOTTING_SAVE = false` in `graphDiff.ts`) and offers Save in Wayfinding mode only, because a pin saved to the CMS could not yet be removed from the plan; the backend keeps accepting `pins.units` / `pins.amenities` for when that is handled.

---

## 2. Existing backend reused

| Reused as-is | Where |
| --- | --- |
| `hallways` as the node table and `next_points` as the routable adjacency; `Hallway#delete_hallway_point` | every reader, the legacy editor, `GraphSave`'s mirror rule |
| `tour_stops` per tour, `stop_type.classify.constantize`, `display_stop`, `sort` | `TourStops::Membership`, `TourSetup::Save`, the Tour App's `tour.stops` |
| `ToursController#ajaxplottourstoppoint` semantics (create with the record's x/y and name) | `TourStops::Membership.turn_on` |
| `TourStopsController#destroy` steps (paths, `VisitedStop`s, the row) | `TourStops::Remove` |
| `UnitsController#ajaxplotunitforfloorplate`, `#remove_plot_from_floorplate`, `FloorplateAmenitiesController#plot_amenity`, `#remove_amenity`, `ToursController#update_elevator`, `#update_building_starting_point`, `#ajaxplotstartingpoint`, `#add_elevator`, `#building_starting_point`, `UnitsController#plot_unit_door` / `#remove_unit_door_plot` | `Wayfinding::PinWriter`, `Wayfinding::StopWriter` (same columns, same callbacks, with the `stop_type` filter the legacy copies lacked) |
| `ApplicationController#make_sure_one_selected_hallway` rule | `GraphSave#ensure_one_selected!` |
| `check_community`'s role branches | `User#can_access_community?` (the method now delegates) |
| `ShortestPath` nearest-point attachment, door preference, `ordered_doors.first`, elevator bridging by the same record, `Elevator#floors`, building strings | `Wayfinding::GraphBuilder` |
| `Api::SelfTour::V1` token check (`api_access`, `decoded`, `grant_access`) | `Api::SelfTour::V1::TokenAuthorization` (extracted verbatim) |
| `Connect::ResponseEnvelope`, `Connect::ProductState`, `Connect::UploadUrl`, `Connect::WayfindingJson` | all new JSON |
| PaperTrail (`set_paper_trail_whodunnit`, `info_for_paper_trail`) | audit rows |

---

## 3. Backend files changed

| File | Purpose / change | UI relationship | Business logic | DB | Legacy impact |
| --- | --- | --- | --- | --- | --- |
| `app/models/hallway.rb` | constants, validations, `detection_run` / edge / attachment associations, `has_paper_trail`, `inherit_community_id`, `prune_edge_rows_for_removed_links`, `bump_parent_wayfinding_version`, scopes `routable` / `pending` / `confirmed` / `on_level`, `linked_to?`; `delete_hallway_point` untouched | every map read | the node/edge ownership rule | reads the new columns | legacy `create`/`update` fill defaults; one `update_all` per save; a PaperTrail row per edit |
| `app/models/floorplate.rb`, `sitemap.rb` | `has_many :hallways … dependent: :destroy` and the new has_manys | — | destroying a level takes its graph (was orphaning) | — | fix for the 651 orphans' root cause |
| `app/models/elevator.rb` | `KINDS`, `kind` validation, scopes, `position_on`, `before_destroy :destroy_legacy_tour_stops`, version bump | stairs / ramp, Elevators & Locks | vertical connector semantics | `kind`, `accessible`, `floor_positions` | deleting an elevator now also removes its stops in per-visitor tours (a fix) |
| `app/models/building_starting_point.rb` | the same hook and bump | entry gate | — | — | as above |
| `app/models/door.rb`, `unit.rb`, `amenity.rb` | `has_many :hallway_attachments`, version bump on plotting columns | pins, doors | — | — | one `update_all` per plotting save; bulk writes unaffected |
| `app/models/tour_stop.rb` | `LEGACY_STOP_TYPES`, `has_paper_trail`, `bump_tour_setup_version` | Tour Setup | — | — | a PaperTrail row per stop change |
| `app/models/community.rb` | `has_many :wayfinding_stops`, `:hallway_detection_runs` | — | — | — | none |
| `app/models/user.rb` | `can_access_community?`, `can_read_map?`, `can_edit_map?` | who may save | authorization | — | `check_community` now calls the same rule |
| `app/controllers/application_controller.rb` | `check_community` delegates to the User rule (same branches, same redirect); `make_sure_one_selected_hallway` reads `.routable` | — | — | — | identical for every pre-existing row (none is pending or svg) |
| `app/controllers/hallways_controller.rb` | `save_graph`; the five legacy renders read `.routable` | Map & Plotting Save | `Wayfinding::GraphSave` | all graph tables | legacy actions unchanged; they never see pending / svg rows |
| `app/controllers/tours_controller.rb` | `save_setup`, `stop_list` | Tour Setup Save, Show in Stops List | `TourSetup::Save`, `TourStops::Membership` | `tour_stops`, `tours`, `amenities.breezway_lock_visible` | legacy actions unchanged |
| `app/controllers/automate_plotting_controller.rb` | `shortest_path` from/to branch (JSON only) | Test shortest path | `Wayfinding::RouteService` | reads | the legacy shape without `from` is byte-identical |
| `app/controllers/concerns/connect/wayfinding_json.rb` | `meta.versions / csrf_token / writes_enabled / can_edit_map`; `render_connect_route` | map load | — | reads | none |
| `app/controllers/concerns/connect/inventory_json.rb` | `meta.csrf_token` on the inventory reads | the writes' token source | — | reads | none |
| `app/helpers/shortest_path.rb` | `.routable` at 6 load sites; `index_by` instead of a query per edge | legacy Run Algo, `start_tour` | — | reads | output identical (snapshot harness, 9 properties, web + mobile) |
| `app/serializers/connect/wayfinding_serializer.rb` | hallway fields; `hallway_edges`, `hallway_attachments`, `wayfinding_stops`, `levels`, `suppressions`; elevator `kind/accessible/floor_positions`; door `note`; tour `tour_setup_version`; stop `duration_minutes`; `versions`, `tour_setup_json`, row formatters | map / tour reads | — | reads | none (new keys only) |
| `app/serializers/connect/unit_serializer.rb`, `amenity_serializer.rb` | `in_stops_list` | Show in Stops List state | `TourStops::Membership.state_for` semantics | reads | none |
| `config/routes.rb` | `put :wayfinding_graph`; `put :save_setup`, `put :stop_list`; the three self-tour `wayfinding` routes | — | — | — | none |
| `db/schema.rb` | the committed schema plus the eleven migrations' effects (the dev DB's unrelated drift was not dumped in) | — | — | — | — |
| `test/test_helper.rb`, `test/fixtures/*` | fixtures that match the schema; Devise helpers; the staging cookie host; route-helper "tests" filtered | — | — | — | the dead scaffold tests skipped with a reason |

## 4. Models added

| File | Table | Purpose |
| --- | --- | --- |
| `app/models/hallway_edge.rb` | `hallway_edges` | per-edge identity (canonical pair), polyline, kind, review state, detection run; `between!`, `for_pair`, `points_from` |
| `app/models/hallway_suppression.rb` | `hallway_suppressions` | tombstones of user deletions (node geometry, or edge pair + endpoints) |
| `app/models/hallway_attachment.rb` | `hallway_attachments` | stop → hallway link: `explicit` / `detached`, optional anchor |
| `app/models/hallway_detection_run.rb` | `hallway_detection_runs` | one row per Detect run; `client_request_id` unique; stored result for replay |
| `app/models/wayfinding_stop.rb` | `wayfinding_stops` | entry (extra) / exit / blocker / leasing / restroom / mail / parking / waypoint; duck-types the legacy stop interface |

## 5. Services added

| File | Responsibility |
| --- | --- |
| `app/services/wayfinding/graph_save.rb` | the transactional level save (§8, §9 below) |
| `app/services/wayfinding/pin_writer.rb` | the `pins` part: legacy plotting semantics for units, amenities, elevators, entry points, doors, the tour start |
| `app/services/wayfinding/stop_writer.rb` | the `stops` part: create / update / delete across `wayfinding_stops`, `elevators`, `doors`, `building_starting_points` |
| `app/services/wayfinding/suppressions.rb` | tombstone tolerance and matching (6 px raster, 0.4 % of the SVG diagonal) |
| `app/services/wayfinding/graph_builder.rb` | the property's routable graph from the persisted rows |
| `app/services/wayfinding/route_service.rb` | Dijkstra (binary heap) over per-floor copies; from/to and whole-tour modes; the error taxonomy |
| `app/services/wayfinding/timing.rb` | steps and durations (feet only when a scale exists) |
| `app/services/wayfinding/graph_serializer.rb`, `route_serializer.rb` | the Tour App payloads |
| `app/services/wayfinding/graph_version.rb` | the cache key / ETag |
| `app/services/wayfinding/version_bump.rb` | the compare-and-swap counters, with `suspend` for the transactional saves |
| `app/services/wayfinding/plate_transform.rb`, `reproject_plate.rb` | SVG → image transform (derive by aspect; apply) and the one-transaction reprojection of a level's svg-space rows |
| `app/services/wayfinding/detection_undo.rb` | server-side undo of a run's still-pending rows |
| `app/services/wayfinding/error.rb`, `invalid.rb`, `stale_version.rb`, `not_found.rb` | the service errors the concern maps to 422 / 409 / 404 |
| `app/services/tour_setup/save.rb` | the Tour Setup save |
| `app/services/tour_stops/membership.rb` | Show in Stops List |
| `app/services/tour_stops/remove.rb` | `TourStopsController#destroy` as a service |
| `app/services/connect/flags.rb` | `PYN_CONNECT_WRITES` kill switch and allowlist |

## 6. Controllers / APIs added or changed

| Method & path | Purpose | Request | Response | Authorization | Validation | Transaction | DB records | Legacy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PUT /communities/:community_id/wayfinding_graph.json` → `HallwaysController#save_graph` | save one level's graph | `{request_id, level{kind,id}, base_version, space, origin, nodes{add,move,confirm,delete}, edges{add,reshape,delete}, links{set,detach,clear}, pins{units,amenities,elevators,building_starting_points,doors,tour_start}, stops{create,update,delete}}` | 200 envelope `{data: level graph + key_map, skipped, replayed, counts; meta: versions, csrf_token}`; 409 `stale_version` with the current level graph; 422 per-item `errors[{path,code,message}]`; 403 `csrf` / `forbidden`; 404 `not_found` / `disabled` / `unknown_level`; 401 Devise | Devise session + `User#can_edit_map?` + CSRF token (`verified_request?`) + `Connect::Flags` | everything before the first write (§8) | one `ApplicationRecord.transaction` with the level row locked | `hallways`, `hallway_edges`, `hallway_suppressions`, `hallway_attachments`, `hallway_detection_runs`, `wayfinding_stops`, `units`, `amenities`, `elevators`, `building_starting_points`, `doors`, `tours`, `tour_stops`, `floorplates/sitemaps.wayfinding_version`, `versions` | legacy actions untouched; their rows are read by the save and vice versa |
| `PUT /communities/:community_id/tours/save_setup.json` → `ToursController#save_setup` | Tour Setup save | `{base_version, stops{add,remove,visibility,order,duration}, elevators{delete}}` | 200 `{data: {tour, key_map, counts}}`; 409 / 422 / 403 / 404 / 401 as above | same | per item; `stop_type` unit/amenity only in phase 1 | one transaction, tour row locked | `tour_stops`, `tours.tour_setup_version`, `elevators`, `versions` | legacy `sort_stops`'s `sort_hash` is left to the legacy page (D1) |
| `PUT /communities/:community_id/tours/stop_list.json` → `ToursController#stop_list` | Show in Stops List | `{stop_type, stop_id, show}` | 200 `{data: {in_stops_list, show_in_stops, tour_stop, changed}}`; 422 `tour_disabled` / `invalid`; 404; 403; 401 | same | tour-enabled property; unit or amenity of the property | one transaction, tour row locked | `tour_stops`, `amenities.breezway_lock_visible` (`update_column`), `tours.tour_setup_version`, `versions` | the same rows the legacy Tour Setup dropdown and the amenity form write |
| `GET /automate_plotting/shortest_path.json?community_id=&from=&to=&step_free=&avoid_blockers=&from_floor=&to_floor=` | route preview on saved data | query | 200 / 422 envelope with `Wayfinding::RouteSerializer` | existing (`check_community`) | — | read-only | — | without `from` the legacy shape is unchanged |
| `GET /automate_plotting.json?community_id=` | map read (existing) | — | new keys and `meta.versions / csrf_token / writes_enabled / can_edit_map` | existing | — | read-only | — | none |
| `GET /api/self_tour/v1/communities/:community_id/wayfinding.json` | the Tour App graph | `token`, `tour_user_id` | §14 | legacy token scheme (`TokenAuthorization`); 422 `wayfinding_disabled` without the tour | — | read-only, ETag, `Rails.cache` by version | — | `start_tour` unchanged |
| `GET …/wayfinding/route.json?from=&to=&step_free=&from_floor=&to_floor=` | a route | query | §14 | same | — | read-only | — | — |
| `GET …/wayfinding/tour_route.json?step_free=` | the whole tour | query | §14 | same | — | read-only | — | — |

## 7. Database changes

Each migration is additive and has a `down`. None rewrites existing values; the only data write is the `community_id` backfill on `hallways` from the parent level (orphans stay NULL).

| Migration | Purpose | Existing data | Backfill | Default behaviour | Legacy compatibility | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| `20261003100001_add_wayfinding_columns_to_hallways` | provenance, review, space, community, run, confirmed_at, author + 3 indexes | untouched | `community_id` from floorplates / sitemaps | manual / confirmed / raster | `render json:` carries extra keys `maps.js` ignores | remove columns / indexes |
| `…02_create_hallway_edges` | per-edge rows (FKs cascade; `CHECK from < to`; unique pair) | — | — | no rows: every adjacency is a legacy straight edge | never read by legacy | drop table |
| `…03_create_hallway_suppressions` | deletion tombstones | — | — | — | never read | drop table |
| `…04_create_hallway_attachments` | stop → hallway links (unique per attachable + level; mode CHECK) | — | — | no row = nearest point | never read | drop table |
| `…05_create_hallway_detection_runs` | idempotent Detect runs | — | — | — | never read | drop table |
| `…06_create_wayfinding_stops` | the new stop kinds | — | — | — | never read; no `tour_stops` row is written for them | drop table |
| `…07_add_kind_accessible_floor_positions_to_elevators` | elevator / stairs / ramp | every row `elevator`, accessible | — | elevator | legacy sees elevators only; stairs/ramps get no `tour_stops` row | drop columns |
| `…08_add_note_to_doors` | gate instruction | untouched | — | nil | — | drop column |
| `…09_add_wayfinding_version_transform_scale_to_floorplates_and_sitemaps` | CAS version, SVG→image transform, scale | untouched | — | 0 / nil / nil | — | drop columns |
| `…10_add_tour_setup_version_to_tours_and_duration_to_tour_stops` | CAS version, dwell time | untouched | — | 0 / nil | — | drop columns |
| `…11_add_plotting_indexes` | `tour_stops(stop_type, stop_id)`, `units(floorplate_id)`, concurrently | — | — | — | — | drop indexes |

Run on `pynwheel_development` on October 3, 2026 (all eleven, 0.5 s total); `db/schema.rb` was then rebuilt as the committed schema plus exactly these additions, so the restored database's unrelated drift (e.g. `communities.map_analytics_settings` missing there) is not in the dump.

**Not shipped** (report §26 #12–13): the `CHECK` constraints on `hallways` wait for `rake wayfinding:repair:all APPLY=1` to have run on staging and production.

## 8. Detect Hallways persistence design

The browser still detects; Rails is the gate. A run is a `save_graph` with `origin: 'detect'` and a client `request_id`:

- **A — existing paths**: a detect payload may only `nodes.add`, `edges.add`, `links.set`; any move / delete / reshape / detach / pin / stop update answers 422 `detect_may_only_add` and writes nothing. Stored rows are never moved or removed by a run.
- **B — additions**: nodes get `source` (inferred / vector), `review_status: 'pending'` (or `confirmed` when the client confirmed them), `confidence`, `detection_run_id`; edges `kind` (traced / inferred / bridge / knn), `auto_generated`, `detection_run_id`; an edge is `confirmed` only when both ends are confirmed, and only then mirrored into `next_points`. A pending node is invisible to the legacy pages (`routable`) and to routing.
- **C — re-run**: a node proposal within 6 px (raster) / 0.4 % of the SVG diagonal of an existing node of the same space merges onto it (`key_map` says so); an edge whose pair is already adjacent on either side, or has a row, is `skipped: duplicate`; a replayed `request_id` returns the stored result without applying anything.
- **D — user edits a detected item**: `nodes.move` / `nodes.confirm` set `confirmed` + `confirmed_at`, keep `source` and the run; incident pending edges re-derive and are mirrored.
- **E — user deletes**: hard delete plus a `hallway_suppressions` row (node geometry, or edge pair + endpoints). A later detect proposal within tolerance of a tombstone is `skipped: suppressed`; a hand re-creation (`origin: 'edit'`) at that geometry deletes the tombstone.

Verified on 1411 / floorplate 1867 (§18): detect, replay, second run (3 merged, 2 skipped, counts unchanged), delete-then-detect at the spot (suppressed), detect-delete refused.

## 9. Graph persistence design

One source of truth per fact: existence-for-legacy-routing in `hallways.next_points` (unchanged meaning), everything an adjacency cannot hold in `hallway_edges` (canonical `from < to`, polyline interior points in the stored frame, kind, review, run). Rules kept consistent by code:

| Direction | Mechanism |
| --- | --- |
| Connect confirms an edge | `GraphSave#mirror_adjacency`: `to` appended to the lower-id node's `next_points` unless present on either side |
| Connect deletes an edge | removed from both sides, row deleted, tombstone |
| Connect deletes a node | removed from every `next_points` on the level (in memory, one `save!` per touched row), tombstone, FK cascade for edges / attachments, `wayfinding_stops.hallway_id` nullified |
| Legacy drops an adjacency | `Hallway#prune_edge_rows_for_removed_links` deletes the pair's row (one DELETE per dropped id; never the other way) |
| Legacy destroys a node | FK `ON DELETE CASCADE` + `dependent: :delete_all` |
| Legacy adds an adjacency | nothing to do: an undecorated adjacency is a legacy straight edge |

Coordinates are stored in the legacy frame: floor-image pixels, icon top-left for hallways and the legacy icon records (the client subtracts `NODE_ANCHOR_OFFSET`), the point itself for `wayfinding_stops`; `space: 'svg'` rows keep viewBox units, are non-routable and hidden from legacy until `Wayfinding::ReprojectPlate` converts them with a stored `svg_to_image_transform`.

Transaction: `VersionBump.suspend { ApplicationRecord.transaction { lock level; replay?; CAS check; load level graph; validate everything; apply edges.delete → nodes.delete → nodes.add → nodes.move/confirm → edges.add → edges.reshape → re-derive → flush → links → pins → stops; one selected node; version +1 (CAS UPDATE); run row; audit row } }`. Any exception rolls everything back (tested with a stub that raises after the first write). Payload caps: 2,000 node ops, 4,000 edge ops, 2,000 links, 2,000 pins, 500 stops, 500 points per edge.

## 10. Tour Stop persistence design

Hybrid, as the report decided: physical records once per property (`elevators` with `kind`, `building_starting_points`, plate-attached `doors`, `wayfinding_stops`), tour membership in `tour_stops` with phase 1 writing no new `stop_type`. `StopWriter` maps the dialog's kinds: elevator → `elevators` (+ the main tour's `tour_stops` row the legacy "Add Elevator" creates, tour-enabled properties only); stairs / ramp → `elevators` (`kind`, `accessible`, never a tour stop); door → plate `doors` (`name_overrided`, `note`); entry → the building's `building_starting_points` row when it has none (+ its tour stop), else a `wayfinding_stops` entry; everything else → `wayfinding_stops`.

`TourSetup::Save` writes `tour_stops.sort` 1..n in the given order (`tours.sort_hash` stays the legacy page's, D1), `display_stop` absolutely, `duration_minutes`, adds through `Membership.turn_on` (never a second row), removes through `TourStops::Remove` (the elevator / entry point record stays; "Delete elevator" is `elevators.delete` and `Elevator#before_destroy` then removes its stops in every tour).

## 11. Unit / Amenity "Show in Stops List" flow

```
Unit or Amenity dialog → Save (only when the switch changed)
  → PUT /api/properties/:id/stop-list {stopType, stopId, show}      (Next route handler; fetches a fresh CSRF token + session)
  → PUT /communities/:id/tours/stop_list.json                         ToursController#stop_list (Connect::WritesJson)
  → TourStops::Membership.set!                                        tour row locked
       ON : find-or-create TourStop(main tour, stop_type, stop_id) as ajaxplottourstoppoint does; display_stop true; amenity → breezway_lock_visible = true (update_column)
       OFF: TourStops::Remove for the record's rows in the main tour; amenity → breezway_lock_visible = false
  → tours.tour_setup_version +1 only when something changed; audit row stop_list_add / stop_list_remove on the Unit / Amenity
  → Tour Setup (tour_stops) · Map & Plotting (`tour_stops`, `in_stops_list`) · Wayfinding (visible stops) read the same row
```

Idempotent (ON ON ON → one row; OFF OFF → no error), type-filtered, and nothing else on the record changes (the unit row is compared column by column in the service test and in the live check).

The Inventory pill ("In Stops List" / "Hidden from Stops"), its State filter and the dialog switch read `in_stops_list`; the legacy flag alone stays available as `show_in_stops`. On Bowers Residences (2157) that is 7 of 19 amenities outside the list (one with the flag off, six never added as stops of the main tour); `tests/e2e/amenities.spec.ts` expected the flag's count (1) and now expects 7.

## 12. Elevator / stairs / cross-floor design

`elevators` is reused; a row stands on every floor of `floorplate_covering_range` on every level it overlaps (or whose `floorplate_id` it names), unless it is named for another level's building. `GraphBuilder` makes one per-floor copy per (record, level, floor), qualified by the level, and links the copies of one record with weights `(50 + 10·Δfloors)·unit` (elevator, ramp) or `90·Δ·unit` (stairs), `unit` = the level's image diagonal ÷ √(760²+470²); step-free skips stairs and `accessible: false` connectors. Cross-building: gates (entry points, the tour start, entry/exit `wayfinding_stops`) of different buildings are joined by one `500·unit` outdoor edge. The legacy engine is untouched: stairs and ramps have no `tour_stops` row, so `ShortestPath` and the current app never see them.

## 13. Shortest path design

Option A of the report: Rails is authoritative. `RouteService#call` resolves `from` / `to` (`unit:ID`, `amenity:ID`, `elevator:ID`, `bsp:ID`, `tour_start:ID`, `stop:ID`, `hallway:ID`, with `from_floor` / `to_floor` for records standing on several floors), checks both ends are linked, runs Dijkstra over the copies, and returns legs (walk legs with centre-pixel points along each edge's polyline, elevator / stairs / ramp / outdoor transitions with floors) and `Timing`'s steps. Errors: `unknown_endpoint`, `same_endpoint`, `ambiguous_floor`, `not_linked`, `blocked` (the route exists without blockers), `no_step_free`, `no_vertical_link`, `no_building_link`, `no_path`, `no_start`. `#tour` chains start → visible stops ordered by building order, floor, `sort` → start, adding `arrive` steps with `dwell_s` from `duration_minutes`. `ShortestPath` keeps serving `start_tour` and the legacy Run Algo.

## 14. Tour App API

`GET /api/self_tour/v1/communities/:id/wayfinding.json` (same `token` / `tour_user_id` as `start_tour`; `.json` required by the namespace's format constraint) answers `{success, version, community_id, is_sitemap, auto_wayfinding, scale, levels[{id, kind, name, building, floors, image, svg, width, height, space, scale_ft_per_px, version}], buildings, nodes[…], edges[{from, to, kind: 'walk', path_kind, level, length_px, polyline}], vertical_connections[{id, kind, floors, accessible, levels}], gates[{id, building, kind}], tour{id, start, starting_floor, building, building_order, version, stops[{tour_stop_id, node, stop_type, name, sort, visible, duration_minutes, on_map}]}}`. `nodes` are unique by `(id, level)`: a record standing on two levels appears once per level with the hallway it joins there; every node says `anchor` (`icon_top_left` for the legacy icon records, `door` / `point` otherwise) so the app can draw stored coordinates without knowing the Rails tables. `floor` is concrete whenever it can be (the node's own floor, else the level's only floor) and null only on a stacked level for a node that stands on every floor of it (a hallway, an elevator). No `access_code` is ever emitted. ETag = `Wayfinding::GraphVersion`, `Cache-Control: private, max-age=0, must-revalidate`, body cached in `Rails.cache` per version; the version string also hashes `GraphVersion::PAYLOAD_FORMAT`, to bump when the payload changes shape, so neither a Redis-cached body nor a client's ETag from before a deploy stays current. `…/wayfinding/route.json` and `…/wayfinding/tour_route.json` answer the `RouteSerializer` shape (`legs`, `steps`, `length_px`, `length_ft`, `duration_s`, `warnings`; 422 with `error{code, message}` from the taxonomy). No after_action, nothing written (verified: `communities.deleted_ids` unchanged by the reads).

## 15. Legacy compatibility verification

| Check | Result |
| --- | --- |
| `rake wayfinding:compare` after the `ShortestPath` edits | **identical** for 1411, 2934, 1468, 1839, 2919, 1105, 1234 (floorplate, single and multiple buildings) and 1786, 2935 (sitemap): web `sorting` and `actual shortest` and the mobile `sorting` variant, including the variants that raise inside the engine (same exception before and after). The mobile path arrays were also compared field by field against the pre-change files before the harness was re-baselined (the first baseline had serialised the engine's stop list as Ruby object addresses). Timings fell (Alderwood 4.87 s → 1.34 s, Trestle 3.74 s → 0.82 s) |
| Legacy HTML pages with the signed-in session on :3100 | `/automate_plotting?community_id=1411`, `/communities/1411/floorplates/1867/plotexp`, `/communities/1411/tours`, `/communities/1411/tours/starting_point`, `/communities/1411/floorplates` → 200 |
| Legacy editor actions (with the page's CSRF header) | `save_hallways_point` 200 (25 rows, chained from the previous point, defaults `manual/confirmed/raster/1411`, JSON keys = the old nine plus the new columns); `update_hallways_point` 200; `connect_leaf_point` 200; `delete_hallways_point` 200 (count back to 24, exactly one `selected`); `display_stop` pinned in the controller test |
| Legacy pages hide pending / svg rows | controller test `legacy renders hide pending and svg-space nodes` |
| Existing mobile app | `DELETE /api/self_tour/v1/communities/1411/start_tour.json` → 200 in 0.73 s, 25 KB, the `tours` key as before |
| Rails test suite | 103 runs, 336 assertions, 0 failures, 0 errors, 7 skips (the pre-existing scaffold tests of `schedual_tours`, which need a session and parameters they never sent; they could not run before either: the fixtures did not load) |

## 16. Real properties tested

| Property | Tour | Map data | Paths | Stops | Cross-floor | What ran |
| --- | --- | --- | --- | --- | --- | --- |
| 1411 John Pynwheel Demo (4 image floorplates, 74 hallways, 230 units, 1 elevator) | enabled | read ✔; Tour App graph 311 nodes / 75 edges / 1 vertical connection on 4 levels / 1 gate, 72 KB, 304 on `If-None-Match`, every node with a concrete floor | detect / edit / delete / replay ✔ | stop_list unit + amenity ✔, save_setup ✔, UI add stop ✔ | route via Elevator 1 to floor 3 ✔ (`walk, elevator, walk`, 1,707 px); a unit on 1867's disconnected 5-node piece correctly answers `no_path` | backend cycle, browser flows, Tour App API |
| 1412 Jennifer Demo FP | enabled | Tour App graph: 4 levels, 247 nodes, 10 edges, 1 vertical, 49 KB in 0.16 s | tour_route 200: 5 legs, 5 warnings (stops the 10 stored paths do not reach) | — | — | Tour App API |
| 1618 Hazel (31 floorplates, 220 hallways) | enabled | Tour App graph: 31 levels, 552 nodes, 194 edges, 3 vertical, 174 KB in 0.29 s | tour_route 200: 17 legs (walk, elevator), no warnings | — | elevator legs between the levels ✔ | Tour App API |
| 2919 Sofia (7 floorplates, 367 hallways) | enabled | snapshot ✔; Tour App graph: 7 levels, 573 nodes, 359 edges, 1 vertical, 171 KB in 0.26 s | tour_route 200: 27 legs, no warnings | — | ✔ | engine harness, Tour App API |
| 1105 Trestle (floorplates "1" = building 1, floor 1 and "2" = building 2, floors 2–4; unit buildings N, N-1…N-4, S) | enabled | snapshot ✔; Tour App graph: 2 levels, 318 nodes, 96 edges, 3 vertical, 78 KB in 0.18 s | tour_route 200: 18 legs, no warnings | — | the two levels are joined by "Building 1 Stairs" (floors 1–4, building N-1) — see §21 on how the legacy engine partitions connectors by unit building | engine harness, Tour App API |
| 2934 Dummy-High-Rise (SVG mode, 20 stops) | enabled | snapshot ✔; Tour App graph: 3 levels, 74 nodes, 44 edges, 4 vertical, 26 KB in 0.14 s | tour_route 200: 29 legs, no warnings | — | ✔ | engine harness, Tour App API |
| 1839 Oeuvre (stacked 1-6 and 7-10) | enabled | snapshot ✔; Tour App graph: 2 levels, 325 nodes, 35 edges, 2 vertical, 68 KB in 0.21 s | tour_route 200: 6 walk legs, no warnings | — | — | engine harness, Tour App API |
| 1468, 1234, 1786, 2935 | enabled | snapshot ✔ | — | — | — | engine harness |
| 557 The Ogden | **disabled** | — | — | `stop_list` → 422 `tour_disabled` ✔; Tour App → 422 `wayfinding_disabled` ✔ | — | backend cycle |
| "Testing 123" | **not found** in the development dump (the closest names are `Jake Testing` 1329, `Testing 2/25` 3737, `Testing SVG` 3770); **NOT VERIFIED** | | | | | |

## 17. Automated tests

`test/models/hallway_test.rb` (9), `user_test.rb` (6), `wayfinding_stop_test.rb` (3), `elevator_test.rb` (4); `test/services/wayfinding/graph_save_test.rb` (21: A–E, replay, idempotent re-run, mirror / prune invariants, links, pins with the typed tour-stop copy, stops of every kind, rollback, cross-level ids, svg space), `route_service_test.rb` (10: attachment rules, cross-floor legs, two single-floor levels through the shared elevator, step-free, blockers, detached, explicit link, errors, tour mode, serializer without access codes), `tour_stops/membership_test.rb` (7), `tour_setup/save_test.rb` (5); `test/controllers/hallways_controller_test.rb` (15: auth matrix, CSRF on, 409, 422, 404s, kill switch, replay, the five legacy actions pinned, legacy renders), `tours_controller_test.rb` (7), `automate_plotting_controller_test.rb` (4), `api/self_tour/v1/wayfinding_controller_test.rb` (5). Fixtures added: users, community_users, floorplates, hallways, tours, tour_stops, elevators, building_starting_points, doors, plus rows in communities / units / amenities / sitemaps.

Next.js: `npm run typecheck` clean. Playwright against the verify pair — the pure specs `wayfindingLogic.spec.ts` and `hallways.spec.ts`, the real-data specs `tourSetup.spec.ts`, `amenities.spec.ts`, `wayfinding.spec.ts`: 59 tests, 57 passed on the first run and 2 failed on expectations this phase overtook (the Plotting toolbar now starts with the Save button; the amenity pill reads the tour's real stop list, 7 hidden on Bowers instead of 1); both specs updated to the new facts and passing, 59 / 59.

**`.gitignore` used to ignore `test/`** (its line 26), which hid the 22 new test and fixture files from `git status`. At the owner's request the rule was dropped on October 5, 2026; the new files now show as untracked beside the modified pre-existing ones (`test_helper.rb`, the cleaned fixtures, `schedual_tours_controller_test.rb`).

## 18. Manual UI → backend tests

Backend cycle on 1411 / floorplate 1867 (`verify-backend.py`, signed-in super admin, the server on :3100 with `pynwheel_development`): baseline 25 hallways / 0 edges / 0 tombstones / 39 tour stops; no token → 403 `csrf`; stale → 409 with the 25-row current graph; invalid → 422 `out_of_bounds` + `unknown_node`, nothing written; edit (node + polyline edge + restroom stop + explicit link) → version 1, node `manual/confirmed/raster/1411/1854`, edge row with `[[732,435]]`, adjacency mirrored once on the lower id, stop and attachment rows, exactly one `selected`, audit row `wayfinding_save`; detect (3 proposals, 2 edges) → 2 added, 1 merged onto a stored node; replay → `replayed: true`, same `key_map`, counts unchanged; second run → 3 merged / 2 skipped, counts unchanged; pending node invisible to `routable` (26 of 28); detect-delete → 422; move pending → confirmed, its edge confirmed; delete node → gone from the neighbour's `next_points`, 1 tombstone; detect at that spot → `suppressed`; cleanup → counts back to baseline, 7 versions moved, no other table changed. Stop list: unit ON/ON/OFF/OFF → 1/1/0/0 rows, `changed` true/false/true/false, unit row unchanged apart from `updated_at`; amenity ON/OFF → row + flag true, then row gone + flag false; 557 → `tour_disabled`. Tour setup: hide + 5 min → version 3→4, `display_stop f`, `duration 5`; stale → 409; restore → `t`.

Browser flows on :3005 (`verify-ui.mjs`, headless Chrome, minted session): Map & Plotting → Wayfinding → one click on the plan → "Save changes · 2" → Save → toast "Saved to the CMS" → `automate_plotting.json` 24 → 25 hallways, the new node `manual/confirmed` and linked from its nearest stored node (4224), the page re-read with 25 nodes drawn and the button back to "Save changes" disabled; Tour Setup → Hide → "Save changes · 1" → Save → `display_stop f`, tour version 6 → Show → Save → `t`; Inventory → Edit amenity "Business Center" → Show in Stops List → Save amenity → toast → main-tour stop rows 0 → 1, flag `t` (reverted through the API afterwards). The browser sent exactly four non-GET requests (the three route handlers) and raised 0 page errors.

## 19. DB integrity verification

Captured before and after every write in §18: `units` 230, `amenities` 7, `elevators` 1, `doors` 6, `tour_stops` 39 (and back to 39 after the stop-list and tour-setup round trips), `hallway_edges`, `hallway_attachments`, `wayfinding_stops`, `hallway_suppressions` all back to 0 on floorplate 1867 after the cleanup save; the only lasting differences are the floorplate's `wayfinding_version` (0 → 7, then the legacy editor's own bumps) and the audit rows in `versions`. The toggled unit's row was compared column by column: nothing but `updated_at`.

## 20. Performance results

Engine harness on the dev DB: Alderwood 4.87 s → 1.34 s, Trestle 3.74 s → 0.82 s, Sofia 1.58 s → 0.56 s after the `index_by` fix (one query per level instead of one per edge).

Tour App API on the verify server (development mode, cold `Rails.cache`, first request per property):

| Property | Graph (levels / nodes / edges) | Body | Graph time | tour_route time |
| --- | --- | --- | --- | --- |
| 1411 | 4 / 311 / 75 | 72 KB | — (first call); 304 afterwards | 0.08 s |
| 2919 Sofia | 7 / 573 / 359 | 171 KB | 0.26 s | — |
| 1105 Trestle | 2 / 318 / 96 | 78 KB | 0.18 s | — |
| 2934 Dummy-High-Rise | 3 / 74 / 44 | 26 KB | 0.14 s | — |
| 1839 Oeuvre | 2 / 325 / 35 | 68 KB | 0.21 s | — |
| 1618 Hazel | 31 / 552 / 194 | 174 KB | 0.29 s | — |
| 1412 Jennifer Demo FP | 4 / 247 / 10 | 49 KB | 0.16 s | — |
| 1411 `route.json` 229 → 315 | | | | 0.09 s |
| 1411 legacy `start_tour` | | 25 KB | 0.73 s | |

The graph body is served from `Rails.cache` while the version holds; the save endpoints answered in well under a second throughout the cycle (§18).

## 21. Known gaps / limitations

- `wayfinding_stops` are not yet `tour_stops` (phase 2, gated: the three legacy guards of report §13 are not in place); the Tour App's `tour.stops` lists the legacy stop types only.
- svg-space rows (detected on a floor SVG) stay non-routable until a `svg_to_image_transform` exists; `PlateTransform.derive` needs the SVG text, and no rake task downloads SVGs yet.
- `TourSetup::Save` writes `sort`, not `sort_hash` (D1); the legacy mobile ordering (`CustomizeTourService`) still reads `sort_hash`.
- `ReprojectPlate` and `DetectionUndo` have no endpoint yet (services + model hooks only).
- The CHECK constraints and the data repair have not been applied anywhere; `rake wayfinding:repair:report` on the dev copy reproduces the report's counts exactly.
- Legacy per-property authorization on `HallwaysController` & co. is unchanged (owner decision: separate ticket); the new endpoints enforce it.
- `SECRET_KEY_BASE` is unset on this machine, so the Tour App token path was exercised with the legacy `API_ACCESS=true` bypass locally; the JWT branch is covered by the controller test's pinned refusal only.
- No Playwright spec clicks Save yet (the existing specs keep their "no non-GET request" guard); the three flows were driven by `verify-ui.mjs`.
- Unit and amenity plotting is page state again (October 5, 2026): `PLOTTING_SAVE = false` keeps pins out of the payload and out of `clearSavedLevel`, and the Save button renders in Wayfinding mode only, because a saved pin could not be removed from the plan. `Wayfinding::PinWriter` stays in place.
- The page's Test shortest path still previews locally (`stopRoute.ts`, so unsaved edits count); the server route (`/api/properties/:id/wayfinding-path` → `shortest_path.json?from=&to=`) is wired but not yet the preview's source.
- Connectors across buildings: the legacy multi-building flow uses an elevator only inside the unit building it is named for (`Floorplate#fetch_elevators(floor, building)` with strict equality), while `GraphBuilder` places a connector on every level whose floors it covers unless its `building` names another level's building. On Trestle (1105), whose floorplates are buildings "1" and "2" but whose units and elevators use N, N-1…N-4 and S, the new engine joins the two levels through "Building 1 Stairs" for every unit; the legacy engine would do so only for building N-1's stops. This is M19's floorplate-vs-unit building question and is left as is until the owner decides which building a connector belongs to.

## 22. Rollback / safety notes

Order: `PYN_CONNECT_WRITES=off` on the CMS (the three write endpoints answer 404 `disabled`; the Save buttons then say so) → revert the Rails release → `rails db:rollback STEP=11`. Nothing legacy reads the new tables or columns; the `.routable` filters and the `index_by` are the only lines touching legacy reads (grep `routable`). The repair tasks export CSVs before mutating and are dry-run unless `APPLY=1`.
