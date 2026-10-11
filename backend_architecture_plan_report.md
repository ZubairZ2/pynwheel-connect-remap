# Backend Architecture Investigation Report — Map & Plotting / Wayfinding Persistence and Tour App API

Date: October 3, 2026
Brief: `backend_architecture_plan_for_ploting.md`
Scope: the Pynwheel CMS (this Rails 7.2.2 + Postgres application), the Next.js Connect app in `pyn-connect-web/`, the existing mobile Tour App (`api/self_tour/v1`), and the new mobile Tour App to be built from scratch.
Status: **investigation and plan only.** No code, migration, model, controller, service, React or data change has been made. Every statement below was verified against the repository and the local `pynwheel_development` database (a restored staging copy). File references are `path:line`.

Decisions taken with the product owner on October 3, 2026, which this report follows:

1. The full additive schema set proposed here is approved for planning.
2. Full new routing semantics (explicit stop links, stairs, blockers, step-free, polylines, new stop kinds) are delivered through a **new** route service and Tour App API that the new mobile app will consume. The existing `start_tour` endpoint and `ShortestPath` engine stay byte-identical for the current app.
3. Authorization hardening applies to the **new** endpoints only. The pre-existing legacy gap is filed as a separate security ticket.
4. This report lives in the repository as markdown.

---

## 1. Executive Summary

**What exists.** Hallways are already a persisted graph: each `hallways` row is a node with floor-image pixel coordinates (icon top-left), and `next_points int[]` holds its one-way adjacency to other nodes on the same Floorplate or Sitemap. Tour stops are `tour_stops` rows per tour pointing at a unit, amenity, elevator or building starting point by lowercase `stop_type` + `stop_id`. Routing is `ShortestPath` (`app/helpers/shortest_path.rb`, 2,410 lines, Dijkstra) which attaches each visible stop to its single nearest hallway point and bridges floors through the same Elevator record. The Next.js Connect app reads all of this through `format.json` branches on existing controllers and holds every edit in one in-memory `LocalMapState`; nothing is written back ("Nothing is sent to the CMS"). The existing mobile app gets a whole-tour route from `DELETE /api/self_tour/v1/communities/:id/start_tour`.

**What the schema cannot hold today.** Edge identity, polylines and edge kind; detection provenance and review state; memory of a user deletion; which hallway a stop joins (or that it joins none); a coordinate frame flag or SVG→image transform; any stop type other than unit/amenity/elevator/building starting point; a real-world scale; a version for stale-write detection; any audit of hallway edits.

**Recommendation (conservative, additive).**

- Keep `hallways` + `next_points` as the node table and the legacy-routable adjacency. Add `hallway_edges` for per-edge identity/kind/polyline/review, `hallway_suppressions` for deletion memory, `hallway_attachments` for stop→hallway links, `hallway_detection_runs` for idempotent Detect runs, `wayfinding_stops` for stop kinds with no legacy home, and columns on `hallways`, `elevators` (`kind`, `accessible`), `doors` (`note`), `floorplates`/`sitemaps` (`wayfinding_version`, `svg_to_image_transform`, `scale_ft_per_px`), `tours` (`tour_setup_version`), `tour_stops` (`duration_minutes`). Everything nullable or defaulted; every default reproduces today's behaviour; all reversible.
- One transactional save per level for Connect (`PUT /communities/:id/wayfinding_graph.json` → `Wayfinding::GraphSave`) and one for Tour Setup (`PUT /communities/:id/tours/save_setup.json` → `TourSetup::Save`), as new actions on the owning controllers, in the established Connect concern/serializer/envelope pattern, with compare-and-swap versions, natural-key idempotency and scoped CSRF.
- A new `Wayfinding::GraphBuilder` + `Wayfinding::RouteService` in Rails carrying the full semantics, exposed to the new mobile app at `GET /api/self_tour/v1/communities/:id/wayfinding`, `…/wayfinding/route` and `…/wayfinding/tour_route`, side-effect free, versioned and cacheable. `ShortestPath` is wrapped, never modified, except two output-neutral edits (a `.routable` filter and an N+1 fix) guarded by a snapshot harness.
- No soft delete, no draft/published gate (atomic saves + versions give the Tour App either the old or the new graph), no dual-write, no business logic in Next.js or mobile.

**Confirmed data problems to repair first:** 651 orphan hallways, 38 self-loops, 4 dangling edges, 11 maps with the wrong number of `selected` nodes, 134 orphan tour stops, roughly 776 stale stop coordinates.

---

## 2. Existing DB / Data Model

All columns from `db/schema.rb`. No `buildings` table exists: "building" is a free-text string on `units`, `amenities`, `floorplates`, `elevators`, `building_starting_points` and `tours`; the ordered list lives in `tours.building_order text[]` and the set is derived from units and amenities (`app/services/buildings.rb:6-12`, `Community#fetch_building_list`).

| Table                                                                                                | Purpose                                                                   | Important columns                                                                                                                                                                                                                                          | Relationships                                                                                                                                                       | Current writer                                                                                                                                                                                                                                               | Current readers                                                                                        | Can represent new requirement?                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hallways` (`db/schema.rb:1257`)                                                                     | pathway graph nodes; edges inside `next_points`                           | `x_plot float, y_plot float` (natural floor-image pixels, icon top-left), `parent_type/parent_id` (Floorplate or Sitemap), `next_points int[] default '{}'`, `selected bool`; index `(parent_type, parent_id)` (`:1266`); `id` is `integer serial`         | polymorphic `belongs_to :parent`; `Floorplate`/`Sitemap has_many :hallways, as: :parent` with **no** `dependent`                                                    | `HallwaysController#point_save/update_point/remove_point/connect_leaf_point/save_selected_point`; `ApplicationController#make_sure_one_selected_hallway` (writes on GET, `application_controller.rb:169`)                                                    | `ShortestPath` (8 load sites), `maps.js`, 5 HAML views, `Connect::WayfindingSerializer#hallways`       | Partly. Nodes and straight undirected edges only. No polyline, edge identity or kind, provenance, review state, deletion memory, coordinate frame, community scope, version |
| `paths`, `path_points`, `neighbour_units`                                                            | legacy hand-drawn stop-to-stop lines, used when `auto_wayfinding` is off  | `paths`: polymorphic `map_path`, `map_path_from`, `map_path_to`; `path_points`: `x_plot int, y_plot int, path_id, order (null on all 15,837 rows), reordered`                                                                                              | `Unit`/`Elevator`/`BuildingStartingPoint has_many :paths, as: :map_path`; `PathPoint default_scope` excludes null coords                                            | `ToursController#draw_map_line/point_save/point_update/point_delete` (routes `config/routes.rb:671-679`)                                                                                                                                                     | `start_tour.json.jbuilder` non-auto branch; `TourStop#path_data`                                       | No. Deprecated; leave read-only (490 empty paths, hundreds of dangling targets, last write Feb 2025)                                                                        |
| `tour_stops` (`:2249`)                                                                               | ordered stops of a tour                                                   | `tour_id, stop_type` (lowercase `unit`/`amenity`/`elevator`/`building_starting_point`), `stop_id, latitude/longitude` (decimal copies of the target's x/y, often stale), `name, sort, display_stop default true`; only index `tour_id` (`:2260`)           | `belongs_to :tour`; `belongs_to :stop, polymorphic` **never resolves** (lowercase type), code uses `stop_type.classify.constantize`; `belongs_to :unit` (no column) | `ToursController#ajaxplottourstoppoint/sort_stops/display_stop`, `TourStopsController#destroy`, `Api::V1::FloorplansController#update_tour_stops_list`, `Api::V2::ToursController`, `AutomateUnitStop` job, `UpdateTourStopsSortingOrder` (from mobile GETs) | `ShortestPath`, Tour Setup HAML, `CommunityTour`, `CustomizeTourService`, jbuilder, Connect serializer | Membership and order: yes. Physical infrastructure: no (per tour; 585 per-visitor copies in dev)                                                                            |
| `tours` (`:2308`)                                                                                    | one main tour per community (`tour_user_id NULL`) plus per-visitor copies | `x_plot int, y_plot int, starting_floor int, building` (the tour start), `sort_hash json {"building,floor" => [ids]}`, `copy_sort_hash json`, `building_order text[]`, `floor_elevator json` (unused)                                                      | `has_many :tour_stops`; `Community#community_tour`                                                                                                                  | `save_starting_point`, `ajaxplotstartingpoint` (`Tour.where(community_id:).update_all`), `sort_stops`; mobile `restore_sort_hash`                                                                                                                            | all tour code                                                                                          | Start point: yes. Needs `tour_setup_version`                                                                                                                                |
| `units` (`:2461`)                                                                                    | inventory + pins                                                          | `provider_unit_id` (what plotting URLs use as `:id`), `floor int, building, floorplate_id int` (no index), `x_plot int default 0, y_plot int default 0`, `pointer_data jsonb {x_plot,y_plot,tag,id,selector}` (SVG units), `modal_unit`, `manual_override` | `belongs_to :floorplate`; `has_one :door, as: :attached_with`; `has_one :tour_stop, as: :stop` (never matches)                                                      | `UnitsController#ajaxplotunitforfloorplate/ajaxplotunit/remove_plot*/adjust_position`, grid `adjust_marker_positions` (units only), `ProvidersDataUpdationService` upserts (all columns but `pointer_data`), swap services (`delete_all`/`destroy_all`)      | every map page, `ShortestPath` (`x_plot/y_plot` only — **never** `pointer_data`)                       | Pins: yes. No stop→hallway link, no frame flag                                                                                                                              |
| `amenities` (`:70`)                                                                                  | amenities + pins                                                          | `amenityable_type/id` (Floorplate, Sitemap, Unit, Floorplan), `x_plot int, y_plot int, floor, building, sort, directional_text, lock_provider, pointer_data jsonb`                                                                                         | `has_many :doors, as: :attached_with`; `has_paper_trail on: [:create, :destroy]`                                                                                    | `FloorplateAmenitiesController#plot_amenity`, sitemap twin                                                                                                                                                                                                   | same as units                                                                                          | same as units                                                                                                                                                               |
| `doors` (`:756`)                                                                                     | unit/amenity doors; plate-attached "access points" (code exists, 0 rows)  | `attached_with_type/id`, `x_plot int, y_plot int` (defaults 0), `floor int` (null on all 2,113 rows), `sort int default 1`, `lock_provider, access_code`; index `(attached_with_type, attached_with_id)`                                                   | polymorphic; `after_save :snatch_lock`, `re_arrange_door_names`                                                                                                     | door plot actions                                                                                                                                                                                                                                            | `ShortestPath` (door preferred over pin; `Amenity#ordered_doors.first`)                                | Door/Gate stop: yes, with `note`                                                                                                                                            |
| `elevators` (`:835`), `elevator_banks`, `elevator_galleries`                                         | vertical connector; one x/y reused on every served floor                  | `x_plot int, y_plot int, floorplate_id, sitemap_id, floorplate_covering_range` (string such as `"1-5"`; 3 malformed rows), `building, lock_provider, access_code, duplicate_of`; indexes `community_id`, `floorplate_id`, `sitemap_id`                     | `belongs_to :floorplate, :community`; `belongs_to :parent` (no column); `has_one :tour_stop, as: :stop` (never matches)                                             | `ToursController#add_elevator/update_elevator`, `ElevatorsController`                                                                                                                                                                                        | `ShortestPath` (bridges floors by the same record), `Floorplate#fetch_elevators`, serializer, jbuilder | Elevator: yes. Stairs/ramp need `kind` and `accessible`                                                                                                                     |
| `building_starting_points` (`:157`)                                                                  | per-building entry/exit gate                                              | `community_id, x_plot int, y_plot int, floor int, name, building, status` (never written), `lock_provider, access_code`                                                                                                                                    | `belongs_to :community`; `validate_building` (one per community+building); `has_one :tour_stop` (never matches)                                                     | `ToursController#building_starting_point` (a **GET** that creates at 40,10), `#update_building_starting_point`                                                                                                                                               | `ShortestPath` multi-building pass, serializer, jbuilder                                               | Entry: yes. A second entry or an exit per building: no                                                                                                                      |
| `floorplates` (`:1098`), `sitemaps` (`:2068`)                                                        | floor images and SVGs                                                     | `range` (`"1-5"`, `"3"`, `"13,14"`, `"-1"`), `image, svg_image, label_image, width float, height float, svg_metadata jsonb` (only `{width,height}`), `map_ocr_data jsonb`, `is_ocr_enabled`                                                                | `has_many :units (dependent: :destroy), :amenities, :elevators, :hallways, :access_points`; `FloorValidator`                                                        | floorplate CRUD                                                                                                                                                                                                                                              | everything                                                                                             | No viewBox, no SVG→image transform, no scale, no version                                                                                                                    |
| `communities` (`:215`)                                                                               | tenant/property                                                           | `is_sitemap default true, auto_wayfinding default false, self_tour, enable_svg_mode, show_map, automate_unit_stop, deleted_ids int[]` (a per-visitor skip list shared by all visitors), `product_options jsonb`, `locked`                                  | `Company has_many :communities`; users via `community_users`                                                                                                        | settings pages, syncs                                                                                                                                                                                                                                        | all                                                                                                    | flags only                                                                                                                                                                  |
| `versions` (`:2620`)                                                                                 | PaperTrail audit                                                          | `item_type, item_id, event, whodunnit, community_id, company_id, object text`                                                                                                                                                                              | —                                                                                                                                                                   | `has_paper_trail` on Amenity (create/destroy) and non-map models; one live manual write (`floorplates_controller.rb:136`)                                                                                                                                    | —                                                                                                      | Hallway, Unit, TourStop, Elevator, Door, Tour, BuildingStartingPoint, Path: **no audit**                                                                                    |
| `schedual_tours.stops_list int[]`, `visited_stops`, `stop_details`, `stop_galleries`, `portal_tours` | tour-side consumers                                                       | —                                                                                                                                                                                                                                                          | `TourStop before_destroy :remove_associated_stops` loops `SchedualTour.stops_list`                                                                                  | —                                                                                                                                                                                                                                                            | mobile                                                                                                 | unchanged                                                                                                                                                                   |
| `maps_positions`, `unit_elevators`, `tours.floor_elevator`                                           | unused                                                                    | —                                                                                                                                                                                                                                                          | no model, no code                                                                                                                                                   | —                                                                                                                                                                                                                                                            | —                                                                                                      | ignore                                                                                                                                                                      |

JSON/array columns in scope: `hallways.next_points`, `units/amenities.pointer_data`, `floorplates/sitemaps.svg_metadata/map_ocr_data`, `tours.sort_hash/copy_sort_hash/building_order`, `communities.deleted_ids/product_options`, `schedual_tours.stops_list`, `visited_stops.lat_lang`. No soft delete anywhere (no `deleted_at`, paranoia or discard). No draft/published state for map or tour data (the only publish pattern is `CalculatorConfig#publish!`). No `Rails.cache`, fragment cache or ETag on map data.

## 3. Existing Rails Services & Business Logic

| Component                                                              | Location                                                                                                                                                                                                                                                                                                                                                                                                   | Responsibility relevant here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShortestPath`                                                         | `app/helpers/shortest_path.rb` (`include DijkstraAlgo`, `extend self`)                                                                                                                                                                                                                                                                                                                                     | Graph builders: `fetch_hallways_coordinates_with_distance` (`:1823`; `hallways.where(id:)` per edge at `:1836` — N+1), `get_unit_data/get_amenity_data/get_elevator_data/get_starting_point_data/get_building_starting_exit_point_data` (`:1567-1778`): nearest hallway **point** by Euclidean distance, no limit, door preferred over pin, `ordered_doors.first` for amenities. Web variants `return_path_for_sitemap` (`:11`), `return_path_for_floorplate` (`:51`), `return_floorplate_path_for_multiple_buildings` (`:170`). Mobile variants `return_path_for_mobile` (`:321`), `return_floorplate_path_for_mobile` (`:364`), `return_floorplate_mobile_path_for_multiple_buildings` (`:485`), `return_path_points_to_mobile` (`:651`), `return_next_floor_to_mobile` (`:661`). Start floor hardcoded: `starting_floor = @floors_ids.first # For now …` (`:56, :176, :369`). An elevator is routable only when it has a visible `tour_stops` row |
| `DijkstraAlgo::Graph`                                                  | `app/helpers/dijkstra_algo.rb`                                                                                                                                                                                                                                                                                                                                                                             | O(V²) Dijkstra; `shortest_paths_with_sorting_in_floor(source, destinations, elevator_arr)` (`:158`), `traverse_back` (`:187`); every builder inserts the reverse edge, so the graph is effectively undirected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CommunityTour`, `CustomizeTourService`, `UpdateTourStopsSortingOrder` | `app/services/`                                                                                                                                                                                                                                                                                                                                                                                            | Mobile tour assembly; `UpdateTourStopsSortingOrder#sort` **writes** `tour_stops.sort`, `doors.sort`, `tours.sort_hash` from mobile reads; `CommunityTour#get_finalized_tour_stops_list_for_self_tour` has no else-guard for unknown `stop_type` (would raise)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Buildings`                                                            | `app/services/buildings.rb`                                                                                                                                                                                                                                                                                                                                                                                | building list from units/amenities                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Provider sync / swap services                                          | `app/services/*_service.rb`, `ProvidersDataUpdationService`                                                                                                                                                                                                                                                                                                                                                | Bulk upsert of units (all columns but `pointer_data`, from in-memory copies → can clobber plots mid-sync); swap services `delete_all`/`destroy_all` units → orphan doors/stops/paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `AutomateUnitStop` job                                                 | `app/jobs/automate_unit_stop.rb`                                                                                                                                                                                                                                                                                                                                                                           | creates/destroys unit tour stops from availability                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `SvgPlotRevalidator`, `SvgOptimizationWorker`                          | `app/services/`                                                                                                                                                                                                                                                                                                                                                                                            | clear `pointer_data` for vanished shapes; rewrite embedded raster only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Connect read layer                                                     | `app/controllers/concerns/connect/wayfinding_json.rb`, `inventory_json.rb`; `app/serializers/connect/wayfinding_serializer.rb`, `map_markers.rb`, `product_state.rb`, `response_envelope.rb`, `upload_url.rb`                                                                                                                                                                                              | `format.json` branch on `AutomatePlottingController#index/#shortest_path`: skips write-on-GET callbacks (`community_code`, `load_tour_users_chats`), `load_connect_community` (404), `check_community` (302); envelope `{data, meta{current_user,…}, flash_messages}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Authorization                                                          | `ApplicationController` (`:2-12` before_actions; `check_community` `:83-117`), `User` role predicates (`user.rb:102-164`), `Ability` (unused by map controllers), self-tour `check_authorization` (`api/self_tour/v1/communities_controller.rb:250`) = `api_access` (`ENV["API_ACCESS"] == "true"`, `application_helper.rb:86`) OR JWT HS256 with `ENV['SECRET_KEY_BASE']` (`:68`), payload `tour_user_id` | see §24                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Jobs                                                                   | Sidekiq (`config/application.rb`, `Procfile` worker); SuckerPunch for most `app/jobs/*`; `Procfile` has **no** `release:` **phase**                                                                                                                                                                                                                                                                        | migrations run by hand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 4. Existing Map/Path Persistence Flow

```
maps.js click (viewArea)
  → POST /save_hallways_point {floor_plate_id|sitemap_id, new_point{x,y,selected:true,next_points:[]}, previous_point}
  → HallwaysController#point_save
  → parent.hallways.create(x_plot, y_plot, selected, next_points)
  → previous.next_points << new.id ; previous.selected = false ; save
  → render json: parent.hallways.order("id ASC")        # full list
  → maps.js draw_initial_hallways: removes and redraws every dot and line (+8 centre)
```

- Move: `update_point` → `Hallway.update(x_plot, y_plot, selected: true)` (does not clear the others → 8 maps with more than one `selected`).
- Connect: `connect_leaf_point` → appends `next_point.id` unless the reverse exists (no self check → 38 self-loops).
- Delete: `remove_point` → `Hallway#delete_hallway_point(hallways)` (`app/models/hallway.rb`): seven branches rewire neighbours (`linked_hallways` vs `linked_by_hallways`), hard delete, select another node.
- Selection: `save_selected_point` → `update_all(selected: false)` then one `selected = true`.
- Routes are top level (`config/routes.rb:681-685`), take only a floorplate or sitemap id, and run no per-property authorization.
- No transaction across requests, no audit, no version, no idempotency. Auto wayfinding results (Run Algo) are never persisted; the orange route is recomputed on every click.
- Geometry: natural pixels of the floor image; the stored point is the icon's top-left; UIs add 8 to draw the centre (`maps.js draw_initial_hallways`, `return_x_y_values`; `mapState.ts:92 NODE_ANCHOR_OFFSET = 8`).

## 5. Existing Tour Stop Persistence Flow

```
Tour Setup (tours/index.html.haml) dropdown
  → POST /communities/:id/tours/:tour_id/ajaxplottourstoppoint {data_to_add: ["<id>:unit"|"<id>:amenity"], floor}
  → ToursController#ajaxplottourstoppoint (:307)
  → TourStop.create(stop_type, stop_id, latitude: st.x_plot, longitude: st.y_plot, tour_id: community_tour.id, name)
```

- Order: `rails_sortable` on `tour_stops.sort` plus `ToursController#sort_stops` (`:174-219`) writing `tours.sort_hash["building,floor"]` with elevator special-casing. Two orderings coexist: `sort` (read by `AutomatePlottingController`, `ShortestPath`, Connect) and `sort_hash` (read by `CustomizeTourService` for the mobile app).
- Visibility: `display_stop` toggle (`:220`).
- Delete: `TourStopsController#destroy` (`:16-41`) also destroys the stop's `Path`/`PathPoint`s, `VisitedStop`s, and **the Elevator or BuildingStartingPoint record itself**.
- The stop is not plotted on Tour Setup. Its position is the target's: units and amenities are pinned on `floorplates/:id/plotexp` (`UnitsController#ajaxplotunitforfloorplate` `:403-424`: image mode writes `x_plot/y_plot`, SVG mode writes `pointer_data`; then `TourStop.where(stop_id: unit.id).update_all(latitude:, longitude:)` at `:417` **without a** `stop_type` **filter**; same at `:395` and `floorplate_amenities_controller.rb:76`). Elevators are created at (10,40) by `add_elevator` and dragged; building entry/exit points are created at (40,10) by a GET (`:401-416`) and dragged; the tour start is plotted on `tours/starting_point` (`ajaxplotstartingpoint` `:271`, `Tour.where(community_id:).update_all(x_plot, y_plot)`).
- `latitude/longitude` on the stop is a snapshot; `ShortestPath` reads the live target coordinates, never the copy.
- Deleting an Elevator/BSP removes only the main tour's stop (`tours_controller.rb:464 TourStop.find_by(stop_id: elevator.id)`, also cross-type); per-visitor copies are orphaned (68 elevator + 47 BSP orphans in dev).

## 6. Existing Wayfinding & Shortest Path Flow

Web (`automate_plotting/index`, Run Algo):

```
GET /automate_plotting/shortest_path?community_id&path_type=sorting|actual shortest
  → AutomatePlottingController#shortest_path
  → ShortestPath.return_path_for_{sitemap|floorplate|floorplate_path_for_multiple_buildings}
     per floor: hallway nodes (Euclidean weights from next_points, both directions)
              + node 0 = tour start → nearest hallway on the FIRST floor
              + each visible unit/amenity → edge to nearest hallway point (door x/y if a door exists, else pin)
              + each elevator with a visible tour_stop → edge to nearest hallway point
     Dijkstra stop-to-stop in tour order (sort), then to the nearest elevator that reaches the next floor,
     repeat ascending to the last floor with stops, traverse back floor by floor, then elevator → start
  → {path_object: "<json>", floor_ids: "<json>", is_multiple_buildings}
  → maps.js draws orange jquery.line segments every 500 ms, clicking floor/building buttons as the path changes floor
```

Mobile (existing app): `DELETE /api/self_tour/v1/communities/:community_id/start_tour?token&tour_user_id` → `*_for_mobile` variants (`start_tour.json.jbuilder:386-394`) → `mobile_path` = array of positional tuples `[source_type, dest_type, source_id, dest_id, path_points[{x_plot,y_plot}], from_point_type, to_point_type, floor, building]`; elevator transitions encoded by removing same-elevator segments and reading the next segment's `floor` (`return_next_floor_to_mobile` → `elevator_next_floor`). The 1,684-line jbuilder emits per stop `id, x_plot, y_plot, type, name, directional_text, floorplate_image, lock fields, path_points, elevator_next_floor`. **After-actions write**: `update_deleted_stops_list` (`community.update(deleted_ids: [])`) and `restore_sort_hash` (`communities_controller.rb:16-18, 163`). Whole-tour route only; no from/to; no stairs, blockers, one-way or accessibility semantics; nothing persisted.

## 7. Current Legacy UI Dependencies

These must keep working unchanged:

- Screens: `floorplates/plotexp`, `sitemaps/plotexp`, `floorplate_amenities/plot_amenities`, `sitemaps/plot_amenities`, `sitemaps/plot_elevators`, `automate_plotting/index` (+ `_floorplate_map`, `_sitemap`, `_show_map`, `_decide_styling`), `tours/index` (Tour Setup), `tours/starting_point`, `tours/select_stops` (legacy star plotting), `tours/settings`, `elevators/*`, `tour_users/show`.
- JavaScript: `maps.js`, `tour_stop_plotting.js`, `unit-plotting.js`, `door-plotting.js`, `access-point-plotting.js`, `hallways.coffee`, `tour_stops.coffee`, `jquery.line`.
- Server: `ApplicationController#make_sure_one_selected_hallway`, `HallwaysController`, `ToursController`, `TourStopsController`, `UnitsController` plot actions, `FloorplateAmenitiesController`, `ElevatorsController`, `AutomatePlottingController`, `ShortestPath`, `DijkstraAlgo`, `start_tour.json.jbuilder`, `Api::V1::FloorplansController#update_tour_stops_list`, `Api::V2::ToursController`.
- Data they read: `hallways.{id,x_plot,y_plot,next_points,selected}`, `units/amenities.{x_plot,y_plot,floor,building,floorplate_id,pointer_data}`, `doors`, `elevators` (+`floors` from `floorplate_covering_range`), `building_starting_points`, `tour_stops.{stop_type,stop_id,sort,display_stop}`, `tours.{x_plot,y_plot,starting_floor,building,sort_hash}`.

Extra columns and tables are invisible to all of them; `render json: hallways` in the five legacy renders will carry extra keys that `maps.js` ignores (it reads only `id/x_plot/y_plot/next_points/selected`).

## 8. Confirmed Problems/Gaps

Only code- or data-confirmed issues. Counts are from `pynwheel_development`.

| Problem                                                                                                                                                                                                                                                                                                                                                                    | Existing behavior                                              | Risk                                                                                                     | Affected feature    | Recommended safe solution                                                                                                                          | Legacy impact          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 651 orphan hallways (485 on 24 deleted floorplates, 166 on 12 deleted sitemaps)                                                                                                                                                                                                                                                                                            | `has_many :hallways, as: :parent` has no `dependent`           | stale rows, wrong counts, routing on ghosts if a parent id is reused                                     | all                 | repair task (CSV export, then delete); add `dependent: :destroy` on both parents                                                                   | none                   |
| 38 self-loops; 4 `next_points` ids with no row; 8 maps with >1 `selected`, 3 with 0; 1 negative coordinate                                                                                                                                                                                                                                                                 | `connect_leaf_point` and `update_point` have no guards         | bad edges; editor chains from the wrong node                                                             | editor, routing     | repair task; `CHECK` constraints added `NOT VALID` then validated                                                                                  | none                   |
| Edges stored one way (3,967 directed, ~40 reciprocal, 38 of those self-loops)                                                                                                                                                                                                                                                                                              | readers treat adjacency as undirected                          | no canonical edge identity for metadata                                                                  | edge attributes     | `hallway_edges` with `from < to` as identity; `next_points` direction left as-is (`delete_hallway_point` branches on it)                           | none                   |
| Stop attaches to nearest hallway **point**, no distance limit; no stored link; no way to say "not linked"                                                                                                                                                                                                                                                                  | `get_*_data`                                                   | routes leave the corridor at the wrong dot; Connect bridges unsaveable (gaps M14/M24)                    | routing             | `hallway_attachments` (explicit/detached) honoured by the new service                                                                              | none                   |
| `TourStop belongs_to :stop` never resolves; 20 lookups by `stop_id` without `stop_type` (`units_controller.rb:194,353,395,417,487,515`, `floorplate_amenities_controller.rb:76,161`, `tours_controller.rb:464`, …); 26 `stop_id`s shared between elevator and BSP                                                                                                          | cross-type overwrite and delete                                | data corruption                                                                                          | stops               | new services always filter by `stop_type`; `before_destroy` on Elevator/BSP removes their stops in every tour; the 20 sites are a follow-up ticket | none                   |
| 134 orphan tour stops (112 in per-visitor copies); ~776 stops whose `latitude/longitude` differ from the target; 459 unit stops on units at (0,0); 139 unit stops with null `floorplate_id` in floorplate communities                                                                                                                                                      | `update_all` paths skip sync; elevator/BSP deletes miss copies | ghost stops, wrong text                                                                                  | Tour Setup, mobile  | repair task; new code never relies on the copies                                                                                                   | none                   |
| 2,535 plotted units whose `floor` is outside their floorplate's `range` (793 null floor); `elevators.building` ≠ `floorplates.building` on 215/217 (plate building is almost always `"1"` or empty)                                                                                                                                                                        | spreadsheet floor edits; free-text buildings                   | units missing from their own plate; grouping by strings                                                  | map, multi-building | report only; builder groups by floor overlap and unit building strings exactly as `ShortestPath` does                                              | none                   |
| `ShortestPath` never reads `pointer_data`; no transform between floor SVG viewBox and floor image (300–600 px residuals measured; `svg_metadata` holds only `{width,height}`)                                                                                                                                                                                              | two coordinate frames                                          | SVG-mode properties route on stale or zero `x_plot`                                                      | routing             | `space` column; `svg_to_image_transform` derived when aspect ratios match; conversion at save                                                      | none                   |
| N+1: `fetch_hallways_coordinates_with_distance` queries per edge, per floor, per building                                                                                                                                                                                                                                                                                  | `hallways.where(id: element).first` (`:1836`)                  | slow `start_tour` on large properties                                                                    | routing             | in-memory `index_by(&:id)`; output identical; snapshot-tested                                                                                      | none                   |
| Mobile GETs write (`deleted_ids`, `sort_hash`, `tour_stops.sort`, `doors.sort`); `deleted_ids` is shared by all concurrent visitors                                                                                                                                                                                                                                        | after_actions                                                  | shared mutable state                                                                                     | existing app        | leave for the existing app; new API is side-effect free                                                                                            | —                      |
| No per-property authorization on `HallwaysController`, `ToursController`, `TourStopsController`, `AutomatePlottingController` HTML, `ElevatorBanksController`; `api/v1/wayfinding#floorplate_path_points` has no auth and raises (nonexistent `path_points` association); `ENV['API_ACCESS']` globally bypasses the self-tour token; the token is not bound to a community | —                                                              | any signed-in user edits any property's graph by id                                                      | security            | **separate security ticket** (owner decision); the new endpoints enforce from day one                                                              | —                      |
| Provider swap services `delete_all` units; sync upserts rewrite `x_plot/y_plot/floorplate_id` from in-memory copies; grid `adjust_marker_positions` shifts units only                                                                                                                                                                                                      | callbacks skipped; race                                        | orphans; lost plots mid-sync; graph drift                                                                | pins                | out of scope; documented; version bumps intentionally not triggered by bulk ops                                                                    | —                      |
| CSRF strategy is Rails' default `:null_session` (`protect_from_forgery prepend: true` with no `with:`, `application_controller.rb:52`)                                                                                                                                                                                                                                     | bad token → nulled session → Devise 401                        | a proxy cannot tell a CSRF failure from an 8-hour timeout (`user.rb:60 timeout_in: 8.hours`)             | writes              | scoped `:exception` on the two new write actions only                                                                                              | none                   |
| Legacy screens render pending/unreviewed nodes if they exist                                                                                                                                                                                                                                                                                                               | no concept today                                               | legacy editor could chain to an unreviewed node and break the "`next_points` = confirmed adjacency" rule | editor              | `Hallway.routable` scope applied in `make_sure_one_selected_hallway` and the five legacy renders (no-op for existing rows)                         | none for existing data |
| Tests: minitest only; no fixtures for users, floorplates, hallways, tours, tour_stops; zero coverage of the controllers and `ShortestPath`                                                                                                                                                                                                                                 | —                                                              | regressions undetected                                                                                   | all                 | §29                                                                                                                                                | —                      |

---

## 9. Target Graph Architecture

```
Community
 └── Floorplate | Sitemap  (level)     +wayfinding_version, +svg_to_image_transform jsonb, +scale_ft_per_px
      ├── hallways (nodes)              existing; +source, +review_status, +confidence, +space, +community_id,
      │     └── next_points             +detection_run_id, +confirmed_at, +created_by_user_id
      │                                  existing; legacy-routable adjacency (meaning unchanged)
      ├── hallway_edges                 NEW: from_hallway_id < to_hallway_id, kind, path_points jsonb (interior polyline),
      │                                  review_status, auto_generated, detection_run_id, space
      ├── hallway_suppressions          NEW: tombstones for user deletions (node geometry, or edge pair + endpoint geometry)
      ├── hallway_attachments           NEW: stop→hallway link; attachable = Unit|Amenity|Door|Elevator|BuildingStartingPoint|Tour|WayfindingStop;
      │                                  mode explicit|detached (no row = nearest-point default)
      ├── hallway_detection_runs        NEW: one row per Detect run (client_request_id unique, counts, result, undo)
      ├── wayfinding_stops              NEW: physical stops with no legacy home: entry(extra)|exit|blocker|leasing|restroom|mail|parking|waypoint
      ├── elevators                     existing; +kind elevator|stairs|ramp, +accessible, +floor_positions jsonb
      ├── building_starting_points      existing (per-building entry gate)
      ├── doors                         existing; +note  (Door/Gate stops are Floorplate/Sitemap-attached doors)
      └── units / amenities             existing pins (+pointer_data)
 └── Tour (main) ── tour_stops          existing; +tours.tour_setup_version, +tour_stops.duration_minutes
```

**Ownership rule.** Existence-for-legacy-routing lives in `hallways.next_points`; edge attributes and pending edges live in `hallway_edges`. A `hallway_edges` row with `review_status='confirmed'` is mirrored into `next_points` on exactly one side; a `pending` row never is; an adjacency in `next_points` with no row is a legacy straight edge (kind `manual`, confirmed). This is one source of truth per fact, not two.

**How** `next_points` **stays correct.**

| Direction                                                     | Mechanism                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect creates or confirms an edge                           | `Wayfinding::GraphSave` appends `to_id` to the lower-id node's `next_points` unless present on either side (same transaction)                             |
| Connect deletes an edge                                       | service removes the id from **both** sides (data is one-way and inconsistent), deletes the row, writes a tombstone                                        |
| Legacy removes an adjacency (`delete_hallway_point` rewiring) | `Hallway after_save :prune_edge_rows_for_removed_links, if: :saved_change_to_next_points?` deletes rows whose pair vanished; one-directional, cannot loop |
| Legacy destroys a node                                        | FK `hallway_edges → hallways ON DELETE CASCADE` (both columns) + `dependent: :delete_all`                                                                 |
| Legacy adds an adjacency (`point_save`, `connect_leaf_point`) | nothing to do: an undecorated adjacency is a valid legacy edge                                                                                            |

Canonical ordering for new rows: `from = LEAST(a,b)`, `to = GREATEST(a,b)`, `CHECK (from_hallway_id < to_hallway_id)`, unique index on the pair; `path_points` oriented from `from` to `to`. Existing `next_points` direction is left untouched (normalising it would change which branch `delete_hallway_point` takes). Existence test used everywhere: `a.next_points.include?(b.id) || b.next_points.include?(a.id) || HallwayEdge.for_pair(a,b).exists?`.

Evaluated alternatives (brief §6–§7): (a) columns only on `hallways` cannot hold polylines or edge identity; (c) a new node table would require a translation layer in 12+ `floorplate.hallways` call sites and five views; a single opaque JSON blob was rejected because legacy, routing and auditing need per-row access. The only JSON columns introduced are `hallway_edges.path_points` and `elevators.floor_positions`.

```
Existing:      hallways, Hallway, next_points, Floorplate/Sitemap has_many :hallways.
Reuse:         every reader unchanged; next_points semantics unchanged; Hallway#delete_hallway_point unchanged.
Change:        Hallway (associations, validations, scopes, one after_save); Floorplate/Sitemap (dependent: :destroy; new has_many for the new tables).
Add:           hallway_edges, hallway_suppressions, hallway_attachments, hallway_detection_runs; columns on hallways.
Risk:          one callback on the legacy hallway save path (a single DELETE … WHERE (from,to) IN (...)); dependent: :destroy removes only unreachable rows.
Compatibility: legacy renders gain keys maps.js ignores; defaults make every row manual/confirmed/raster.
Migration:     additive, reversible; community_id backfilled from parents.
Rollback:      drop tables/columns; nothing legacy reads them.
```

Node columns on `hallways`:

```ruby
add_column :hallways, :source,             :string,  null: false, default: 'manual'     # manual | vector | inferred
add_column :hallways, :review_status,      :string,  null: false, default: 'confirmed'  # pending | confirmed
add_column :hallways, :confidence,         :float
add_column :hallways, :space,              :string,  null: false, default: 'raster'     # raster | svg
add_column :hallways, :community_id,       :integer
add_column :hallways, :detection_run_id,   :bigint
add_column :hallways, :confirmed_at,       :datetime
add_column :hallways, :created_by_user_id, :integer
add_index  :hallways, :community_id
add_index  :hallways, [:parent_type, :parent_id, :review_status, :space], name: 'index_hallways_routable_lookup'
add_index  :hallways, "parent_type, parent_id, space, (round(x_plot)::int), (round(y_plot)::int)", name: 'index_hallways_natural_key'
```

`Hallway` model additions: `SOURCES/REVIEW/SPACES` constants and inclusion validations; `belongs_to :detection_run, optional: true`; `has_many :edges_from/:edges_to` (`HallwayEdge`, `dependent: :delete_all`); `has_many :attachments` (`HallwayAttachment`, `dependent: :delete_all`); `before_validation :inherit_community_id`; `after_save :prune_edge_rows_for_removed_links`; `scope :routable, -> { where(review_status: 'confirmed', space: 'raster') }`; `scope :pending`. `HallwaysController#point_save` keeps working because defaults fill the new columns (no strong params or `as_json` override exists on `Hallway`). No `floor` column on nodes in this phase (null = all floors of the plate; a per-floor node would force every reader to filter).

## 10. Detect Hallways Persistence Strategy

Detection runs in the browser (`pyn-connect-web/src/core/utils/wayfinding/hallways/extract.ts`, `autoConnect.ts`, `snapStops.ts`); Rails is the gate. Results are submitted through `Wayfinding::GraphSave` with `origin: 'detect'`.

| Scenario (brief §5)                      | Rule enforced server-side                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** — plate has persisted paths        | `origin: 'detect'` payloads may only **add**. Any `nodes.move`, `nodes.delete`, `edges.delete`, `edges.reshape`, `links.detach` is rejected with 422. Existing rows are untouched. (Matches the client: a plate with any points only gets `knn` auto-connect edges, `hallwayEdits.ts detectionPatch`.)                                                                                                                                                                                               |
| **B** — detector finds additions         | Nodes: `source ∈ {vector, inferred}`, `review_status='pending'`, `confidence`, `detection_run_id`, `space`. Edges: `kind ∈ {traced, inferred, bridge, knn}`, `auto_generated=true`, `detection_run_id`; `review_status` derived: `pending` if either endpoint is pending, else `confirmed` (so a `knn` edge between two confirmed stored nodes is routable immediately and mirrored into `next_points`; an edge touching a pending node becomes routable when that node is confirmed).               |
| **C** — re-run                           | Natural keys: edges by canonical pair (unique index) plus tombstone geometry; nodes by `(parent, space, round(x), round(y))` within `TOL` (6 px raster; 0.4 % of the viewBox diagonal for `svg`) → the proposal merges onto the existing node and its edges are re-pointed. Request replay: `hallway_detection_runs.client_request_id` is unique; a duplicate returns the stored `result` (same `key_map`) without re-applying.                                                                      |
| **D** — user edits a detected item       | `nodes.move` or `nodes.confirm` sets `review_status='confirmed'` and `confirmed_at`, keeps `source` and `detection_run_id`; incident edges re-derive status and newly confirmed ones are mirrored. Hand-drawn items: `source='manual'`, `kind='manual'`, `auto_generated=false`. The three states are distinguishable: auto-detected (`detection_run_id` set), user-created (`source='manual'`), user-approved (`confirmed_at`). Pending→confirmed only; un-confirm exists solely as detection undo. |
| **E** — user deletes a persisted hallway | hard delete plus a `hallway_suppressions` tombstone (§12). Before adding, `Wayfinding::Suppressions.match` skips an edge proposal whose pair or endpoint geometry matches a tombstone within `TOL`, and a node proposal within `TOL` of a node tombstone. A hand re-creation (`origin: 'edit'`) at a suppressed geometry **deletes** the tombstone.                                                                                                                                                  |

```ruby
create_table :hallway_detection_runs do |t|
  t.integer :community_id, null: false
  t.string  :parent_type, null: false; t.integer :parent_id, null: false
  t.string  :client_request_id, null: false            # UUID from the client; idempotency key
  t.string  :status, null: false, default: 'applied'   # applied | undone
  t.string  :scope; t.string :detector_source          # plate|building|all ; vector|inferred|autoconnect
  t.string  :space, null: false, default: 'raster'
  t.integer :nodes_added, :edges_added, :nodes_skipped, :edges_skipped, default: 0
  t.jsonb   :result, null: false, default: {}          # key_map + skipped, replayed on duplicate request
  t.integer :triggered_by_user_id
  t.datetime :undone_at
  t.timestamps
end
add_index :hallway_detection_runs, :client_request_id, unique: true
add_index :hallway_detection_runs, [:parent_type, :parent_id]
```

Routability and legacy visibility: `ShortestPath` and the new builder use `Hallway.routable` (confirmed ∧ raster). Legacy pages hide pending/`svg` rows by adding `.routable` inside `ApplicationController#make_sure_one_selected_hallway` (every legacy HTML load passes through it) and in `HallwaysController`'s five renders; identical behaviour for all existing rows. Server-side undo: `Wayfinding::DetectionUndo.call(run)` deletes rows of that run that are still pending; confirmed rows stay because the user touched them.

```
Existing:      client-side detection (additive by contract in the browser only).
Reuse:         client algorithm; GraphSave transaction.
Change:        none in legacy.
Add:           hallway_detection_runs; origin-based rules; Suppressions matcher; DetectionUndo; .routable in two legacy places.
Risk:          .routable hides rows that do not exist yet; zero effect on current data.
Compatibility: legacy never sees pending or svg-space rows.
Migration:     create table.
Rollback:      drop table; remove the .routable additions (grep routable).
```

## 11. Manual Plotting Persistence Strategy

Each UI operation maps to a part of one `Wayfinding::GraphSave` diff, applied in one transaction (§16).

| UI operation           | Payload part                                                                    | Records written                                                                                                                                                                                                                                         | Legacy operation reproduced                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| add node               | `nodes.add {temp_key, x, y}`                                                    | `hallways` row (`selected: false`)                                                                                                                                                                                                                      | `point_save` without `selected` chaining                                                                                                                                                          |
| move node              | `nodes.move {id, x, y}`                                                         | `x_plot/y_plot`; confirms if pending                                                                                                                                                                                                                    | `update_point` without `selected: true`                                                                                                                                                           |
| delete node            | `nodes.delete [id]`                                                             | remove id from every `next_points` on the level; FK cascade removes edge/attachment rows; tombstone; destroy                                                                                                                                            | `delete_hallway_point`'s neighbour cleanup **without** its automatic prev→next relinking (the client sends explicit edges). Intentional, documented difference                                    |
| connect two nodes      | `edges.add {a, b, kind:'manual'}`                                               | `hallway_edges` row; mirror into `next_points`                                                                                                                                                                                                          | `connect_leaf_point`                                                                                                                                                                              |
| split / bend a path    | `edges.delete` + two `edges.add` with `points` / `edges.reshape {a, b, points}` | rows with interior polylines                                                                                                                                                                                                                            | none in legacy (straight lines only)                                                                                                                                                              |
| delete path            | `edges.delete {a, b}`                                                           | remove from both sides; delete row; tombstone                                                                                                                                                                                                           | none in legacy (only node delete)                                                                                                                                                                 |
| create / remove bridge | `links.set {attachable, hallway}` / `links.detach` / `links.clear`              | `hallway_attachments`                                                                                                                                                                                                                                   | none in legacy (nearest-point default)                                                                                                                                                            |
| place / move pins      | `pins.units/amenities/elevators/building_starting_points/tour_start`            | same columns as the legacy actions via `assign_attributes` + `save!(validate: false)` (keeps `after_update :remove_doors_plotting`, `after_commit :populate_image_urls`), then `TourStop.where(stop_type:, stop_id:).update_all(latitude:, longitude:)` | `ajaxplotunitforfloorplate`, `plot_amenity`, `update_elevator`, `update_building_starting_point`, `ajaxplotstartingpoint` (all tours of the community), with the missing `stop_type` filter fixed |
| additional stops       | `stops.create/update/delete`                                                    | `wayfinding_stops`; `elevators` rows for stairs/ramp; plate-attached `doors` for gates                                                                                                                                                                  | none                                                                                                                                                                                              |

Payload coordinates are **stored units**: raster icon top-left for hallways and legacy icon records (the client subtracts `NODE_ANCHOR_OFFSET`), the point itself for `wayfinding_stops`. The server does no coordinate math except the SVG→image conversion in §22. `selected` is never written by the new path; `make_sure_one_selected_hallway` still guarantees one selected node for the legacy page.

```
Existing:      five legacy hallway actions + five pin actions, each a separate request with side effects.
Reuse:         the model columns and callbacks they write.
Change:        none to the legacy actions (phase 1).
Add:           HallwaysController#save_graph, Wayfinding::GraphSave.
Risk:          new code path only.
Compatibility: identical rows result from either editor.
Migration:     none beyond §9.
Rollback:      flag off / remove the action.
```

## 12. Path Deletion Strategy

**Rejected: soft-delete flag on** `hallways`**.** A `deleted_at` would need filtering in `Floorplate#hallways`/`Sitemap#hallways` call sites (`floorplates_controller.rb:233`, `floorplate_amenities_controller.rb:115`, `sitemaps_controller.rb:91,111`, `automate_plotting_controller.rb:9,33`, `shortest_path.rb:790,836,886,948,1009,1080`), in `Hallway.find` inside all five `HallwaysController` actions, in the serializer, and in `delete_hallway_point`'s `linked_by_hallways` SQL; a `default_scope` would make `Hallway.find` raise for tombstones and leave soft-deleted ids inside live `next_points`.

**Chosen: hard delete +** `hallway_suppressions`**.**

```ruby
create_table :hallway_suppressions do |t|
  t.string  :parent_type, null: false; t.integer :parent_id, null: false; t.integer :community_id
  t.string  :kind,  null: false                     # node | edge
  t.string  :space, null: false, default: 'raster'
  t.float   :x1, null: false; t.float :y1, null: false   # node: the point; edge: endpoint A (storage units)
  t.float   :x2; t.float :y2                             # edge: endpoint B
  t.integer :hallway_a_id; t.integer :hallway_b_id       # edge between surviving nodes: canonical pair (no FK; may dangle)
  t.string  :removed_source; t.string :removed_kind
  t.string  :reason, null: false, default: 'user_delete'
  t.integer :removed_by_user_id
  t.datetime :created_at, null: false
end
add_index :hallway_suppressions, [:parent_type, :parent_id, :kind]
```

| Event                                                        | Tombstone                                                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect deletes a stored node (any source/review)            | yes (`kind='node'`, geometry at deletion)                                                                                                          |
| Connect deletes an edge between surviving nodes              | yes (`kind='edge'`, pair + both endpoints)                                                                                                         |
| Edges incident to a deleted node                             | no separate tombstone (the node tombstone covers them)                                                                                             |
| Detection undo                                               | no (not a user deletion)                                                                                                                           |
| Legacy `remove_point`                                        | **no in phase 1** (legacy users do not run Detect; `delete_hallway_point` also rewires). Phase-2 option: one `HallwaySuppression.create` inside it |
| Hand re-creation at a suppressed geometry (`origin: 'edit'`) | matching tombstones deleted (explicit intent wins)                                                                                                 |
| Floorplate destroyed                                         | `has_many :hallway_suppressions, as: :parent, dependent: :delete_all`                                                                              |
| Admin "forget deletions"                                     | `Wayfinding::Suppressions.clear!(parent)`                                                                                                          |

Stop deletion: `Elevator`, `BuildingStartingPoint` and `WayfindingStop` gain `before_destroy :destroy_legacy_tour_stops` that removes `TourStop.where(stop_type: '<type>', stop_id: id)` across all tours (running `TourStop#remove_associated_stops` for `SchedualTour.stops_list`) and their `VisitedStop`s — the fix for the 115 orphans. `hallway_attachments` rows cascade on hallway delete and are deleted with their attachable.

```
Existing:      hard delete with neighbour rewiring; no memory.
Reuse:         hard delete.
Change:        none.
Add:           hallway_suppressions; Suppressions module; before_destroy hooks on Elevator/BSP.
Risk:          hooks mass-delete stops in per-visitor tours (intended).
Compatibility: legacy delete paths unchanged.
Migration:     create table.
Rollback:      drop table; Suppressions calls become no-ops behind one module.
```

## 13. Tour Stop Persistence Strategy

**Representation decision: hybrid.** Physical infrastructure is stored once per community; tour membership stays in `tour_stops`.

| Stop type (UI `StopTypeId`)                                         | Existing representation                                                                                                                                                 | Persistable today?                                                              | Graph effect (new service)                               | Cross-floor?           | Needs schema/service change?                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| Entry (one per building)                                            | `building_starting_points`; tour start `tours.x_plot/y_plot/starting_floor/building`                                                                                    | yes (GET-with-side-effect `#building_starting_point`; `#ajaxplotstartingpoint`) | start node / building gate                               | gate between buildings | no                                                                                                                          |
| Entry (additional), Exit                                            | **Current system does not support this directly.** `building_starting_points.status` exists but is never written; `validate_building` forbids a second row per building | no                                                                              | start/destination/gate node                              | gate                   | `wayfinding_stops kind entry                                                                                                | exit` |
| Elevator                                                            | `elevators` (one x/y reused on all served floors)                                                                                                                       | yes                                                                             | node per served floor; floors bridged by the same record | yes                    | `kind='elevator'` default, `accessible`, optional `floor_positions`                                                         |
| Stairs                                                              | **Current system does not support this directly.**                                                                                                                      | no                                                                              | as elevator; skipped when step-free                      | yes                    | `elevators.kind='stairs'`, `accessible=false`; **no** `tour_stops` **row**, so legacy router/jbuilder never see a stairwell |
| Ramp                                                                | **Current system does not support this directly.**                                                                                                                      | no                                                                              | as elevator when it serves more than one floor           | decision D4            | `elevators.kind='ramp'`, `accessible=true`                                                                                  |
| Door / Gate                                                         | `doors` attached to Floorplate/Sitemap (access points: `Floorplate has_many :access_points, class_name: 'Door'`; `Door#ordinalize_access_point`; 0 rows)                | yes in code                                                                     | pass-through node with lock metadata                     | no                     | `doors.note`                                                                                                                |
| Blocker                                                             | **Current system does not support this directly.**                                                                                                                      | no                                                                              | not a node; cuts hallway edges within `radius_px`        | no                     | `wayfinding_stops kind blocker` + `radius_px`                                                                               |
| Leasing Office, Restroom, Mail & Packages, Parking Access, Waypoint | **Current system does not support this directly.**                                                                                                                      | no                                                                              | destination node attached by link or nearest point       | no                     | `wayfinding_stops`                                                                                                          |

```ruby
create_table :wayfinding_stops do |t|
  t.integer :community_id, null: false, index: true
  t.string  :map_type, null: false                 # Floorplate | Sitemap (as hallways.parent_type)
  t.integer :map_id,   null: false
  t.string  :kind, null: false                     # entry|exit|blocker|leasing|restroom|mail|parking|waypoint
  t.string  :name, null: false
  t.string  :building                              # free text, as units/elevators/BSP
  t.integer :floor                                 # "floor only" on a stacked plate; nil = every floor
  t.float   :x_plot; t.float :y_plot               # marker CENTRE, floor-image pixels; nil = unplaced ("To Plot")
  t.string  :space, null: false, default: 'raster'
  t.boolean :accessible, null: false, default: true
  t.string  :lock_provider, null: false, default: ''
  t.string  :access_code
  t.text    :note                                  # visitor instruction, <= 500 (model validation)
  t.float   :radius_px                             # blockers only; nil = max(w,h)*30/760
  t.integer :hallway_id                            # explicit link; nil = nearest-point rule
  t.string  :status, null: false, default: 'active'   # active | archived
  t.string  :source, null: false, default: 'manual'   # manual | detected | imported
  t.timestamps
end
add_index :wayfinding_stops, [:map_type, :map_id]
add_index :wayfinding_stops, [:community_id, :kind]
add_foreign_key :wayfinding_stops, :hallways, on_delete: :nullify
```

`WayfindingStop` duck-types the legacy stop interface (`x_plot, y_plot, name, floor, building, community, lock_provider, access_code, directional_text` (alias `note`), `description`, `paths`, and the lock `has_many … as: :stop` declared on `BuildingStartingPoint`), so a later `tour_stops.stop_type = 'wayfinding_stop'` works with the existing `classify.constantize` pattern. Validations: `kind` inclusion, `note` length, `floor` within `map.floors` for floorplates, `radius_px` only for blockers.

**Lifecycle (brief §10).**

| Step                    | `wayfinding_stops`                                                                | `elevators` (incl. stairs)                   | `building_starting_points` | Graph relationships                                                        |
| ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Create (unplaced)       | row with null x/y                                                                 | n/a (always placed)                          | n/a                        | excluded from the graph                                                    |
| Place                   | set x/y, map, floor, space                                                        | x/y                                          | x/y                        | attached at build time to nearest routable hallway (unless linked)         |
| Connect to hallway      | `hallway_id` or `hallway_attachments` row                                         | `hallway_attachments`                        | `hallway_attachments`      | explicit link preferred; FK nullify / cascade falls back to nearest        |
| Persist                 | version bump                                                                      | same                                         | same                       | cached graph/ETag invalidates                                              |
| Edit / move             | columns                                                                           | columns + `TourStop` copy sync               | same                       | explicit link kept; nearest recomputed                                     |
| Floor / building change | validated against plate range                                                     | `floorplate_covering_range` / `building`     | `floor` / `building`       | node appears on the new floor set at next build                            |
| Bridge deleted          | `links.detach` → `mode='detached'`; stop is excluded from routing until re-linked | same                                         | same                       | `GraphBuilder` skips detached stops (as unplotted units are skipped today) |
| Delete                  | destroy (or `status='archived'` if referenced by `tour_stops`)                    | `before_destroy` removes stops in every tour | same                       | attachments cascade                                                        |
| Regenerate routes       | nothing persisted; next request rebuilds                                          |                                              |                            |                                                                            |

**Tour Setup save** (`TourSetup::Save`): creates as `ajaxplottourstoppoint` does; removes via `TourStops::Remove` (the exact steps of `TourStopsController#destroy`); sets `display_stop` absolutely; writes `tour_stops.sort` 1..n in the given order (decision D1 on `sort_hash`); writes `duration_minutes` and the talking point when present. Legacy Tour Setup keeps working because **phase 1 writes no new** `stop_type` **values**. Phase 2 (destination kinds as tour stops) is gated by `tour_settings.enable_wayfinding_stops` and needs three guards first: an else-guard in `CommunityTour#get_finalized_tour_stops_list_for_self_tour`, a `wayfinding_stop` branch in `start_tour.json.jbuilder`, and a row branch in `tours/index.html.haml`.

```
Existing:      tour_stops per tour; elevators; building_starting_points; doors.
Reuse:         all; the classify.constantize pattern; lock associations as: :stop.
Change:        Elevator/BSP before_destroy; ToursController#save_setup; (phase 2) three guards.
Add:           wayfinding_stops; elevators.kind/accessible/floor_positions; doors.note; tour_stops.duration_minutes; tours.tour_setup_version.
Risk:          a stairs row given a tour_stops row would surface as "Elevator" in the old app (we never create one).
Compatibility: defaults keep every elevator an elevator; new kinds invisible to legacy until phase 2's flag.
Migration:     additive.
Rollback:      drop table/columns; flag off.
```

## 14. Stop-Type Routing Semantics

Derived from actual code; where no semantics exist, flagged as a decision rather than invented.

| Element                                        | Traversable                           | Direction                        | Destination                 | Start             | Vertical | Blocked                            | Cross-floor       | Cross-building               | Status                                                                                                         |
| ---------------------------------------------- | ------------------------------------- | -------------------------------- | --------------------------- | ----------------- | -------- | ---------------------------------- | ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| hallway node                                   | yes                                   | two-way (reverse edges inserted) | no                          | no                | no       | by blocker radius (new)            | no                | no                           | exists                                                                                                         |
| hallway edge (straight or polyline)            | yes                                   | two-way                          | —                           | —                 | no       | cut if within blocker radius (new) | no                | no                           | exists / polyline new                                                                                          |
| pending node, `svg`-space node                 | **no** (excluded by `routable`)       | —                                | —                           | —                 | —        | —                                  | —                 | —                            | new (D5)                                                                                                       |
| unit                                           | leaf via door-or-pin                  | two-way                          | yes                         | yes (new API)     | no       | no                                 | no                | no                           | exists                                                                                                         |
| amenity                                        | leaf via `ordered_doors.first`-or-pin | two-way                          | yes                         | yes (new API)     | no       | no                                 | no                | no                           | exists                                                                                                         |
| door (unit/amenity)                            | attachment point of its parent        | —                                | no                          | no                | no       | no                                 | no                | no                           | exists                                                                                                         |
| door/gate (plate access point)                 | pass-through node                     | two-way (D6)                     | yes                         | yes               | no       | no                                 | no                | no                           | new                                                                                                            |
| elevator                                       | node per served floor                 | two-way                          | yes (legacy emits as stop)  | yes (needs floor) | yes      | no                                 | yes (same record) | no                           | exists                                                                                                         |
| stairs                                         | as elevator                           | two-way                          | no                          | yes               | yes      | skipped when step-free             | yes               | no                           | new                                                                                                            |
| ramp                                           | as elevator when serving >1 floor     | two-way                          | no                          | —                 | D4       | no                                 | D4                | no                           | new                                                                                                            |
| blocker                                        | not a node                            | —                                | no                          | no                | no       | is the block                       | no                | no                           | new                                                                                                            |
| entry (BSP)                                    | gate node                             | two-way                          | yes (legacy multi-building) | yes               | no       | no                                 | no                | yes (gate↔gate outdoor edge) | exists                                                                                                         |
| exit / extra entry (`wayfinding_stops`)        | gate node                             | two-way                          | yes                         | yes               | no       | no                                 | no                | yes                          | new                                                                                                            |
| tour start (`tours`)                           | node 0                                | two-way                          | end of tour                 | yes               | no       | no                                 | no                | no                           | exists (first-floor assumption retained for the legacy engine; the new service uses `starting_floor` when set) |
| leasing / restroom / mail / parking / waypoint | leaf node                             | two-way                          | yes                         | yes               | no       | no                                 | no                | no                           | new                                                                                                            |

No one-way or lock-gated traversal exists anywhere in the code; none is introduced (D6).

## 15. Elevator/Stairs Cross-Floor Strategy

Reuse `elevators`. `ShortestPath` already bridges floors by the same Elevator id appearing on two floors (`elevator_id_to_uniq_id[floor][elevator_id]`, `elevators_which_have_next_floor`, `shortest_paths_with_sorting_in_floor`); `Elevator#floors/min_floor/max_floor` parse `floorplate_covering_range`; `Floorplate#fetch_elevators` picks per floor; `Connect::WayfindingSerializer#elevators` emits `floors`. A stairs row therefore needs zero new bridging mechanism.

```ruby
add_column :elevators, :kind,            :string,  null: false, default: 'elevator'   # elevator | stairs | ramp
add_column :elevators, :accessible,      :boolean, null: false, default: true         # stairs rows created with false
add_column :elevators, :floor_positions, :jsonb,   null: false, default: {}           # {"3": {"x": 118, "y": 46}} per-floor override
add_index  :elevators, [:community_id, :kind]
```

Model: `validates :kind, inclusion:`; scopes `vertical`, `step_free`; `position_on(floor)`. A `vertical_links` node-to-node table is deferred: no UI needs it yet and it would be a second bridging mechanism the legacy engine does not understand. Cross-building stays BSP-based (`get_building_starting_exit_point_data`), plus `wayfinding_stops` entry/exit gates in the new service. Weights in the new service (ported from the Next.js router `wayfindingRoute.ts`, scaled by plate diagonal ÷ √(760²+470²)): elevator `50 + 10·Δfloors`, stairs `90·Δ`, outdoor `500`; step-free skips `accessible=false` connectors. The three malformed ranges (`-1-6`, `P2-5`, `1-`) and the elevator/floorplate building mismatch are tolerated by grouping on floor overlap and unit building strings, exactly as `ShortestPath` does.

```
Existing:      elevators + ShortestPath bridging.
Reuse:         Elevator#floors, fetch_elevators, serializer.
Change:        Elevator validations/scopes.
Add:           kind, accessible, floor_positions.
Risk:          none for legacy (default kind).
Compatibility: existing rows unchanged.
Migration:     add columns with defaults.
Rollback:      drop columns.
```

## 16. Graph Save/Update/Delete Transaction Strategy

`Wayfinding::GraphSave.call(level:, community:, user:, origin: 'edit'|'detect', client_request_id:, base_version:, space:, diff:)`, with `diff = {nodes: {add, move, confirm, delete}, edges: {add, reshape, delete}, links: {set, detach, clear}, pins: {...}, stops: {create, update, delete}}`. Client mapping: `tempNodes → nodes.add`, `nodeOverrides → nodes.move`, `hiddenNodes → nodes.delete`, `hiddenEdges → edges.delete`, `tempEdges → edges.add`, `wfLinks → links.*`, `pinOverrides → pins`, `tempStops → stops`, `wfSvg[level] → space`, `wfEdited[level] == 'detected' → origin`.

Inside `ApplicationRecord.transaction`:

1. **Compare-and-swap version**: `UPDATE floorplates SET wayfinding_version = wayfinding_version + 1 WHERE id = ? AND wayfinding_version = ?` (sitemaps likewise). Zero rows → `Wayfinding::StaleVersion` → 409 carrying the current level graph, `changed_by` (from the latest PaperTrail summary row) and `changed_at`. The row lock serialises concurrent Connect saves on the same level.
2. **Replay**: `origin: 'detect'` with a known `client_request_id` → return the stored result.
3. **Validate everything before writing** (422 with per-item `{path, code, message}`; a 422 never leaves a partial save): ids belong to this level and this community (a foreign floorplate id is a 404, never a cross-tenant write); endpoints exist and share parent and space; no self-loop; duplicate edge is a no-op; raster coordinates within `[0, width] × [0, height]` when dimensions exist; `points` ≤ 500 finite pairs; pending→confirmed only; attachables of this community (unit `floorplate_id == level.id`; elevator floors ∩ plate floors non-empty, BSP floor ∈ plate floors, door attached to this plate — warnings, D9); payload caps 2,000 node ops and 4,000 edge ops.
4. **Apply in order**: `edges.delete` → `nodes.delete` (remove from all `next_points`, tombstones, cascade) → `nodes.add` (natural-key merge for `detect`; exact-duplicate refusal for `edit`) → `nodes.move`/`confirm` → `edges.add`/`reshape` (dedupe, tombstone filter, derived status, mirror) → `links` → `pins` → `stops`; keep exactly one `selected` node (mirrors `make_sure_one_selected_hallway`).
5. **Audit**: `has_paper_trail` on `Hallway`, `HallwayEdge`, `HallwayAttachment`, `WayfindingStop`, `TourStop` (whodunnit already set by `ApplicationController`; `info_for_paper_trail` fills `community_id/company_id`), plus one summary `PaperTrail::Version` row per save (`item_type: 'WayfindingGraph'`, the pattern live at `floorplates_controller.rb:136`).
6. **Return** `key_map {temp_key → id}`, `skipped`, `version`, the canonical level graph.

Partial failure: any exception rolls everything back; nothing happens outside the transaction (no jobs, no uploads). Idempotency: natural keys for nodes/edges/links, absolute positions for moves and pins, replay for detect runs; a timed-out retry fails only the CAS and receives the current graph to rebase, so it cannot double-create. Concurrency with legacy writers (no lock): `Hallway after_commit :bump_parent_wayfinding_version` (`update_all` on the parent, no callbacks) makes every legacy hallway save visible to the next Connect CAS; `after_commit` on Unit/Amenity/Elevator/BuildingStartingPoint bumps only when a plotting column changed (`saved_change_to_x_plot? || … pointer_data? || floorplate_id?`); `TourStop after_commit` bumps `tours.tour_setup_version`; bulk `upsert_all/update_all/delete_all` fire no callbacks (no sync churn, by design). `HallwaysController` legacy actions are untouched in phase 1; an optional phase-2 refactor routes them through `Wayfinding::Graph` primitives.

```
Existing:      no transactions across requests; no version; no audit.
Reuse:         model callbacks; PaperTrail infrastructure.
Change:        version-bump callbacks on Hallway/Unit/Amenity/Elevator/BSP/TourStop; has_paper_trail on Hallway/TourStop.
Add:           Wayfinding::GraphSave (+ errors), wayfinding_version / tour_setup_version columns.
Risk:          one update_all per legacy save; PaperTrail rows per hallway edit (small).
Compatibility: legacy saves unchanged in behaviour.
Migration:     integer columns default 0 not null.
Rollback:      remove callbacks; drop columns.
```

## 17. Draft vs Published Strategy

Investigation result: no publish state exists for map or tour data (`hallways`, `tour_stops`, `tours`, `elevators`, `doors`, `building_starting_points` have no status/version columns); the "How to Publish Changes" header button (`app/views/_header.html.haml:58`, shown when `touchscreen_app`) opens a help modal only; the only publish pattern is `calculator_configs.published_config_json/published_at`; `LaunchStatusable` tracks onboarding review, not content; Connect's `tour_published?` only means "the tour has a stop". Every legacy write is live and the existing Tour App computes routes at request time from live rows.

Introducing draft/published now would force a dual read path through `ShortestPath`'s loaders, `AutomatePlottingController`, the serializer and the jbuilder — the highest-risk legacy change available. The actual hazard named in the brief ("the Tour App receives half-finished edits") comes from the legacy one-click-one-request editor; one-transaction saves remove it: a Tour App request sees either the old graph or the new one, and the per-level version makes what it saw traceable.

**Decision: no publish gate in phase 1 (D3).** Additive path if an explicit Publish is wanted later: `floorplates.published_wayfinding_version integer` + `published_wayfinding_json jsonb` (a snapshot of the Tour App payload at publish time, mirroring `calculator_configs`), served by the Tour App API, with the legacy engine untouched.

## 18. Next.js API Strategy

Convention kept (PYN_CONNECT_PROGRESS.md decisions 3–4): `format.json` on existing controllers, no new API namespace, PORO serializers, Connect envelope. New **actions** on the owning controllers are inside the convention (`shortest_path` and `sort_stops` are the precedent).

| Endpoint                                                                                                                                                      | Purpose                                                  | Existing equivalent                                                                                                                                     | HTTP | Auth                                                                            | Data source                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Write?               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `PUT /communities/:community_id/wayfinding_graph.json` → `HallwaysController#save_graph` (route inside `resources :communities do` at `config/routes.rb:138`) | save one level's graph diff, links, pins and stops       | `point_save`, `update_point`, `remove_point`, `connect_leaf_point`, `save_selected_point`, plus the five pin actions (per-request, legacy side effects) | PUT  | Devise session + `check_community` + `can_edit_map?` + scoped CSRF `:exception` | `Wayfinding::GraphSave`                                                                                                                                                                                                                                                                                                                                                                                                                                       | yes, one transaction |
| `PUT /communities/:community_id/tours/save_setup.json` → `ToursController#save_setup` (inside `resources :tours … collection`)                                | save Tour Setup: create/remove/visibility/order/duration | `ajaxplottourstoppoint`, `sort_stops`, `display_stop`, `tour_stops#destroy`                                                                             | PUT  | same                                                                            | `TourSetup::Save`, `TourStops::Remove`                                                                                                                                                                                                                                                                                                                                                                                                                        | yes                  |
| `GET /automate_plotting.json?community_id=` (existing)                                                                                                        | map load                                                 | —                                                                                                                                                       | GET  | existing                                                                        | `Connect::WayfindingSerializer` + new keys: node fields, normalised `hallway_edges` (an adjacency without a row is emitted as `{id: null, kind:'manual', review_status:'confirmed', points: []}`), `hallway_suppressions`, `hallway_attachments`, `wayfinding_stops`, `elevators.kind/accessible/floor_positions`, `floorplates.svg_to_image_transform/scale_ft_per_px/wayfinding_space`; `meta.versions {"floorplate:507": 7, "tour": 3}`; `meta.csrf_token` | no                   |
| `GET /automate_plotting/shortest_path.json?community_id=&from=&to=&step_free=` (existing action; new optional params)                                         | preview a route on saved data so preview == Tour App     | legacy `{path_object,…}` shape when `from` is absent                                                                                                    | GET  | existing                                                                        | `Wayfinding::RouteService` in the Connect envelope                                                                                                                                                                                                                                                                                                                                                                                                            | no                   |

Why one save per level rather than JSON branches on the legacy actions: atomicity (the brief's §12 failure mode), no leakage of `selected`/chaining semantics, temp keys resolved in one `key_map`, one version check, zero change to legacy actions.

`save_graph` payload (abridged):

```json
{
  "request_id": "9b1c…",
  "level": { "kind": "floorplate", "id": 507 },
  "base_version": 7,
  "space": "raster",
  "origin": "edit",
  "nodes": {
    "add": [{ "temp_key": "j:1", "x": 412.5, "y": 188.0, "source": "manual" }],
    "move": [{ "id": 9001, "x": 400.0, "y": 190.0 }],
    "confirm": [9010],
    "delete": [9007]
  },
  "edges": {
    "add": [
      { "a": "j:1", "b": 9001, "kind": "manual", "points": [[405, 189]] }
    ],
    "reshape": [],
    "delete": [{ "a": 9001, "b": 9007 }]
  },
  "links": {
    "set": [
      { "attachable_type": "Unit", "attachable_id": 33120, "hallway": "j:1" }
    ],
    "detach": [{ "attachable_type": "Amenity", "attachable_id": 5120 }],
    "clear": []
  },
  "pins": {
    "units": [{ "id": 33120, "x": 402, "y": 171, "pointer": null }],
    "amenities": [],
    "elevators": [{ "id": 77, "x": 210, "y": 40 }],
    "building_starting_points": [],
    "tour_start": { "x": 40, "y": 10 }
  },
  "stops": {
    "create": [
      {
        "temp_key": "n:1",
        "kind": "restroom",
        "name": "Lobby restroom",
        "x": 640,
        "y": 410,
        "floor": 1,
        "note": "Past the mailroom"
      }
    ],
    "update": [],
    "delete": []
  }
}
```

Responses: 200 envelope `{data: {level, version, nodes, edges, links, pins, stops, key_map}, meta: {current_user, csrf_token}}`; 409 `{data: <current graph>, errors: [{code: 'stale_version', base_version, current_version, changed_by, changed_at}]}`; 422 `{errors: [{path: 'nodes.add[2].x', code: 'out_of_bounds', message}]}`; 403 `{errors: [{code: 'forbidden' | 'csrf'}]}`; 401 from Devise. Kill switch: `Connect::Flags.writes_enabled?(community)` from `PYN_CONNECT_WRITES=on|off` and `PYN_CONNECT_WRITES_COMMUNITY_IDS` (allowlist); when off the actions answer 404 `{code: 'disabled'}`. At GA a `communities.wayfinding_v2_enabled boolean default false` column replaces the ENV allowlist (D4). `auto_wayfinding` is **not** reused as the flag (it is a live legacy feature flag).

**CSRF strategy (G6/R5).** Real tokens, not a relaxed strategy:

- Rails `Connect::WritesJson` (new concern): `protect_from_forgery with: :exception, if: :connect_write?, prepend: true`; `skip_before_action :community_code, :load_tour_users_chats, if: :connect_write?`; `before_action :load_connect_community, :authorize_connect_map_edit!, if: :connect_write?`; `rescue_from ActionController::InvalidAuthenticityToken → 403 {code: 'csrf'}`. `connect_write?` = `request.format.json? && CONNECT_WRITE_ACTIONS.include?(action_name)` (`%w[save_graph]`, `%w[save_setup]`). Legacy actions stay on the default `:null_session`.
- Token delivery: `meta.csrf_token = form_authenticity_token` on the map and tour reads; the sign-in route handler already scrapes the `csrf-token` meta (`src/app/api/auth/sign-in/route.ts`) and stores it in a third httpOnly cookie. With the cookie session store (development), reads must merge any `Set-Cookie` into the stored session cookie (`mergeCookies` exists in `base.api.ts`); in production (Redis store) the cookie value is stable.
- Next.js: `base.api.ts` widens `RequestOptions.method` to include `PUT|PATCH`, adds `csrfToken` → `X-CSRF-Token` (+ `X-Requested-With: XMLHttpRequest`); route handlers `src/app/api/properties/[propId]/map/save/route.ts` and `.../tour-setup/save/route.ts` forward, map statuses to `{ok, version, keyMap, graph} | {ok:false, error: 'stale'|'invalid'|'forbidden'|'csrf'|'unauthorized'}`, and retry **once** on `csrf` with a fresh token.
- Devise 8-hour timeout: a write after timeout gets a clean 401 before any service code runs; the client keeps unsaved `LocalMapState`/`TourLocalState` in `sessionStorage` and sends the user to sign in (frontend slice).
- The `origins '*'` CORS block (no credentials) is left untouched.

```
Existing:      read-only format.json branches; base.api.ts GET/POST/DELETE; sign-in CSRF scrape.
Reuse:         WayfindingJson pattern, envelope, serializers, urls.ts, route-handler layering.
Change:        HallwaysController, ToursController (new actions); AutomatePlottingController#shortest_path (from/to branch);
               WayfindingSerializer, ResponseEnvelope (meta keys); base.api.ts; sign-in route; urls.ts.
Add:           Connect::WritesJson, Connect::Flags, two route lines, two Next.js route handlers, graphDiff.ts, tourSetup.api.ts.
Risk:          new paths only; scoped CSRF change affects two actions.
Compatibility: HTML and legacy JSON unchanged.
Migration:     none beyond §9/§16.
Rollback:      PYN_CONNECT_WRITES=off; remove actions/routes.
```

## 19. Tour App API Contract

For the **new** mobile app. Routes inside `namespace :api → namespace :self_tour → namespace :v1 → resources :communities do` (`config/routes.rb:742`):

```ruby
get :wayfinding,            to: 'wayfinding#show'        # GET /api/self_tour/v1/communities/:community_id/wayfinding
get 'wayfinding/route',     to: 'wayfinding#route'       # GET …/wayfinding/route?from=&to=&step_free=
get 'wayfinding/tour_route', to: 'wayfinding#tour_route' # GET …/wayfinding/tour_route?step_free=   (whole tour, new semantics)
```

Controller `Api::SelfTour::V1::WayfindingController < BaseController`: `before_action :check_authorization, :load_community` through a new concern `Api::SelfTour::V1::TokenAuthorization` that extracts the existing method bodies unchanged (`communities_controller.rb:250`); **no after_actions**, no session writes, no `community_code`. Gate: `community.auto_wayfinding && Connect::ProductState.tour?(community)` else 422 `{code: 'wayfinding_disabled'}`. `fresh_when etag: Wayfinding::GraphVersion.for(community)`; body `Rails.cache.fetch(['wf-graph', community.id, version])` (Redis in production). Emits `lock_provider` only, never `access_code`. Existing `start_tour` stays unchanged for the current app and both may be called with the same `token`/`tour_user_id`.

Identifiers: `hallway:<id>`, `unit:<id>`, `amenity:<id>`, `door:<id>`, `elevator:<id>` (any `kind`), `bsp:<id>`, `tour_start:<tour_id>`, `stop:<id>` (`wayfinding_stops`). Levels: `floorplate:<id>` / `sitemap:<id>` (the Next.js `MapLevel.id`). Coordinates: floor-image natural pixels, origin top-left, y down, stored values unchanged; `anchor: "icon_top_left"` for legacy icon records (tour start, elevators, BSPs, doors, unit/amenity pins), `"point"` for hallways and `wayfinding_stops`. `version` is the cache key and ETag. No publication state (none exists).

`GET …/wayfinding` (abridged):

```json
{
  "success": true,
  "version": "wf-1839-42",
  "community_id": 1839,
  "is_sitemap": false,
  "scale": { "unit": "px", "ft_per_px": null },
  "levels": [
    {
      "id": "floorplate:2364",
      "kind": "floorplate",
      "name": "Floors 1-6",
      "building": "1",
      "floors": [1, 2, 3, 4, 5, 6],
      "image": "https://…/2364.jpg",
      "width": 2000,
      "height": 1240,
      "svg": null,
      "space": "raster",
      "scale_ft_per_px": null
    }
  ],
  "buildings": ["1", "2"],
  "nodes": [
    {
      "id": "hallway:88",
      "kind": "hallway",
      "level": "floorplate:2364",
      "floor": null,
      "x": 410.5,
      "y": 220.0,
      "anchor": "point",
      "review": "confirmed"
    },
    {
      "id": "unit:5541",
      "kind": "unit",
      "level": "floorplate:2364",
      "floor": 4,
      "building": "1",
      "name": "1-402-C",
      "x": 300,
      "y": 180,
      "anchor": "icon_top_left",
      "attach": "door:91",
      "link": "explicit",
      "lock_provider": "Latch"
    },
    {
      "id": "elevator:7",
      "kind": "elevator",
      "vertical": "elevator",
      "accessible": true,
      "name": "Elevator 2",
      "level": "floorplate:2364",
      "floors_served": [1, 2, 3, 4, 5, 6],
      "x": 120,
      "y": 44,
      "anchor": "icon_top_left",
      "positions": { "3": { "x": 118, "y": 46 } }
    },
    {
      "id": "elevator:9",
      "kind": "elevator",
      "vertical": "stairs",
      "accessible": false,
      "name": "North stair",
      "floors_served": [1, 2]
    },
    {
      "id": "bsp:3",
      "kind": "entry",
      "building": "1",
      "level": "floorplate:2364",
      "floor": 1,
      "x": 40,
      "y": 10,
      "anchor": "icon_top_left"
    },
    {
      "id": "tour_start:77",
      "kind": "tour_start",
      "level": "floorplate:2364",
      "floor": 1,
      "x": 52,
      "y": 900,
      "anchor": "icon_top_left"
    },
    {
      "id": "stop:9",
      "kind": "restroom",
      "name": "Lobby restroom",
      "level": "floorplate:2364",
      "floor": 1,
      "x": 640,
      "y": 410,
      "anchor": "point",
      "note": "Past the mailroom on the left",
      "attach": "hallway:88",
      "link": "nearest"
    },
    {
      "id": "stop:12",
      "kind": "blocker",
      "level": "floorplate:2364",
      "floor": null,
      "x": 700,
      "y": 300,
      "radius_px": 78.9
    }
  ],
  "edges": [
    {
      "from": "hallway:88",
      "to": "hallway:89",
      "kind": "walk",
      "level": "floorplate:2364",
      "length_px": 61.2,
      "polyline": [
        [410.5, 220.0],
        [440, 226],
        [471.0, 230.1]
      ]
    }
  ],
  "vertical_connections": [
    {
      "id": "elevator:7",
      "kind": "elevator",
      "floors": [1, 2, 3, 4, 5, 6],
      "accessible": true
    },
    {
      "id": "elevator:9",
      "kind": "stairs",
      "floors": [1, 2],
      "accessible": false
    }
  ],
  "gates": [
    { "id": "bsp:3", "building": "1" },
    { "id": "stop:14", "building": "2", "kind": "exit" }
  ],
  "tour": {
    "id": 77,
    "start": "tour_start:77",
    "stops": [
      {
        "tour_stop_id": 9001,
        "node": "unit:5541",
        "sort": 1,
        "visible": true,
        "duration_minutes": 5
      }
    ]
  }
}
```

`attach` is the explicit link when set, else the computed nearest routable hallway, so the client draws the same bridge the server routes on; `link` is `explicit | nearest | detached`.

`GET …/wayfinding/route?from=tour_start:77&to=unit:5541&step_free=1` and `GET …/wayfinding/tour_route?step_free=0` (whole tour: start → visible stops in tour order → back, floor by floor, with the same ordering rules as the legacy engine but over the new graph and semantics):

```json
{
  "success": true,
  "version": "wf-1839-42",
  "from": "tour_start:77",
  "to": "unit:5541",
  "step_free": true,
  "avoid_blockers": true,
  "length_px": 797.4,
  "length_ft": null,
  "duration_s": null,
  "legs": [
    {
      "index": 0,
      "kind": "walk",
      "level": "floorplate:2364",
      "floor": 1,
      "building": "1",
      "from": "tour_start:77",
      "to": "elevator:7",
      "length_px": 512.0,
      "points": [
        [52, 900],
        [60, 842],
        [118, 46]
      ],
      "nodes": ["tour_start:77", "hallway:88", "hallway:89", "elevator:7"]
    },
    {
      "index": 1,
      "kind": "elevator",
      "via": "elevator:7",
      "name": "Elevator 2",
      "floor_from": 1,
      "floor_to": 4,
      "length_px": 0
    },
    {
      "index": 2,
      "kind": "walk",
      "level": "floorplate:2364",
      "floor": 4,
      "building": "1",
      "from": "elevator:7",
      "to": "unit:5541",
      "length_px": 285.4,
      "points": [
        [118, 46],
        [200, 120],
        [300, 180]
      ],
      "nodes": ["elevator:7", "hallway:88", "hallway:91", "unit:5541"]
    }
  ],
  "steps": [
    {
      "kind": "walk",
      "leg": 0,
      "title": "Walk to Elevator 2",
      "sub": "512 px on Floor 1"
    },
    {
      "kind": "elevator",
      "leg": 1,
      "title": "Take Elevator 2 to Floor 4",
      "sub": "Up 3 floors"
    },
    {
      "kind": "walk",
      "leg": 2,
      "title": "Walk to 1-402-C",
      "sub": "285 px on Floor 4"
    },
    {
      "kind": "arrive",
      "leg": 2,
      "title": "Arrive at 1-402-C",
      "sub": "Past the mailroom on the left",
      "dwell_s": 300
    }
  ],
  "warnings": ["No scale on floorplate:2364; distances are pixels"]
}
```

Errors: `422 { "success": false, "error": { "code": "no_path" | "not_linked" | "unknown_endpoint" | "no_vertical_link" | "blocked" | "no_step_free" | "no_building_link" | "no_plan" | "ambiguous_floor", "message": "…", "fix": {…} } }` — the same taxonomy as the Next.js router (`wayfindingRoute.ts` `R.notLinked`, `R.noVertical`, `R.blocked`, `R.noStepFree`, `R.noBuildingLink`, `R.noPlan`).

Cacheability: `version` = `Wayfinding::GraphVersion.for(community)` (max `updated_at` + counts over hallways, hallway_edges, hallway_attachments, wayfinding_stops, elevators, building_starting_points, doors, floorplates, sitemap, main tour, tour_stops); ETag + `private, max-age=0, must-revalidate`; `Rails.cache` body keyed by version (Redis in production).

```
Existing:      api/self_tour/v1 token scheme; BaseController logging; ProductState.
Reuse:         check_authorization/load_community (extracted unchanged), routes namespace.
Change:        none to existing actions.
Add:           WayfindingController, TokenAuthorization concern, 3 routes, Wayfinding::GraphSerializer/RouteSerializer.
Risk:          pre-existing token weaknesses (global API_ACCESS bypass; token not bound to a community) — flagged, not widened.
Compatibility: start_tour unchanged.
Migration:     none.
Rollback:      remove routes/controller; cache keys expire.
```

## 20. Shortest Path Architecture

| Criterion          | A — Rails authoritative                                                                                                             | B — Tour App computes from graph                                                           | C — shared algorithm                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Existing behaviour | `ShortestPath` already encodes door preference, floor-by-floor tour order, elevator selection, BSP gating, visibility, lock lookups | mobile re-implements all of it in Swift/Kotlin; `start_tour` still runs Ruby → two answers | Ruby cannot run on device; JS cannot run in Rails → "shared" can only mean a shared contract + golden fixtures |
| Next.js A\*        | stays an unsaved-preview tool; saved data routes through Rails                                                                      | would become the spec, duplicating domain rules in the client (forbidden by the brief)     | as A                                                                                                           |
| Performance        | graphs are small (35–370 nodes per plate); Dijkstra per floor is fine; cache by version                                             | device CPU fine but the whole graph ships on every start                                   | —                                                                                                              |
| Consistency        | one answer for CMS preview, Connect and Tour App                                                                                    | drift                                                                                      | —                                                                                                              |
| Offline            | the app can prefetch `wayfinding` + `tour_route` once per visit                                                                     | native offline at the cost above                                                           | —                                                                                                              |

**Recommendation: Option A.** New `app/services/wayfinding/`:

```ruby
module Wayfinding
  Node = Struct.new(:key, :kind, :record, :level_id, :floor, :building, :x, :y, :anchor, keyword_init: true)
  Edge = Struct.new(:from, :to, :kind, :weight_px, :polyline, :name, keyword_init: true)   # walk|link|elevator|stairs|ramp|outdoor

  class GraphBuilder      # per level: Hallway.routable + hallway_edges polylines; units/amenities via door-or-pin;
                          # plate doors; elevators by kind/accessible; BSPs; tour start; wayfinding_stops.active;
                          # blockers cut edges; explicit hallway_attachments else nearest-point rule (ShortestPath's);
                          # stack floors as "<level>@<floor>" copies; buildings via gates
    def initialize(community, step_free: false, avoid_blockers: true, include_pending: false); end
    def build -> Graph    # nodes{key=>Node}, adjacency{key=>[Edge]}, levels, version
  end

  class RouteService      # from/to and tour modes over GraphBuilder#build
    Result = Struct.new(:ok, :legs, :steps, :length_px, :length_ft, :duration_s, :warnings, :error, keyword_init: true)
    def initialize(community, from:, to:, step_free: false, avoid_blockers: true, from_floor: nil, to_floor: nil); end
    def call -> Result    # Dijkstra; reuse DijkstraAlgo::Graph for parity first, swap to a heap later
    def tour(step_free: false) -> Result   # start → visible stops in `sort` order → back, floor by floor
  end

  class GraphVersion; class Timing; class GraphSerializer; class RouteSerializer
end
```

Relationship to `ShortestPath`: **wrap, never modify** its outputs. The legacy engine keeps serving `start_tour` and the legacy Run Algo byte-identically; its only edits are `.routable` at the 8 load sites and the `index_by` N+1 fix, both guarded by the snapshot harness (§29). The new mobile app consumes `wayfinding/`_; Connect's "Test shortest path" calls the same service (Connect `shortest_path` from/to branch) so preview == app; Next.js keeps its local A_ only for unsaved page state. A parity harness compares `RouteService#tour` with `ShortestPath` on fixture communities (1411, 2934, 1468) where semantics overlap (no links, no stairs, no blockers) to prove the port is faithful before the new app depends on it. When the new app ships, `start_tour`/`ShortestPath` can be retired (D10).

## 21. Play Route / Simulation Architecture

Required per leg: `level`, `floor`, `building`, `kind` (`walk | elevator | stairs | ramp | outdoor | arrive`), centre-pixel `points` along the polyline (door then pin for unit/amenity, as `fetch_paths_arr_for_floorplate` emits today), `nodes`, `length_px`, `length_ft`, `duration_s`, `from`/`to` labels, the visitor `note`, `dwell_s`. Steps (`title`/`sub`) are built server-side by `Wayfinding::Timing` (walking 4.4 ft/s; elevator `30 + 8·Δ` s; stairs `15·Δ` s; feet only when a scale exists) so the app and Connect print the same text. Point-by-point vs stop-by-stop animation is a client concern over `legs[].points`.

| Missing today                          | Backend field that provides it                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| curved walk geometry (gap M21)         | `hallway_edges.path_points` (two-point polylines until then)                                                                            |
| step kind elevator vs stairs           | `elevators.kind`                                                                                                                        |
| elevator position per floor            | `elevators.floor_positions`                                                                                                             |
| real-world distance and time (M17, T3) | `floorplates.scale_ft_per_px decimal(10,6)`, `sitemaps.scale_ft_per_px` (nullable; `0.25` is only a UI hint, never assumed server-side) |
| visitor instruction at arrival         | `wayfinding_stops.note`, `doors.note` (units/amenities keep `stop_description`/`directional_text`)                                      |
| dwell per stop (T3)                    | `tour_stops.duration_minutes`                                                                                                           |

## 22. Coordinate/Geometry Strategy

Facts: all `x_plot/y_plot` are natural pixels of the floor image (units, amenities, doors, elevators, BSPs, tours, path points as integers; hallways as floats; `tour_stops.latitude/longitude` as decimal copies); legacy icon records store the icon's top-left and both UIs add 8 to draw the centre; `floorplates.width/height` come from MiniMagick at upload; `svg_metadata` holds only the SVG root `width/height` (viewBox not stored); `pointer_data` is in SVG user units and is never read by routing; no transform exists between the two frames (gap M20: 300–600 px residuals measured).

**Canonical routable frame = floor-image pixels, icon top-left for legacy icon records** (unchanged). `space` is recorded per node/edge/suppression/attachment/stop; `space='svg'` rows are excluded by `Hallway.routable` and hidden from legacy pages, and shown by Next.js on the SVG layer (the serializer exposes `floorplate.wayfinding_space = 'svg'` when any stored svg-space node exists, so `wfSvg[levelId]` is set on load).

**Conversion happens in Rails at save** (`Wayfinding::PlateTransform`): if `level.svg_to_image_transform` exists, an `svg`-space submission is converted (centre → minus 8 → top-left) and stored as `raster`; otherwise it is stored as `svg` unconverted. `Wayfinding::ReprojectPlate.call(level)` converts a plate's existing `svg` rows (nodes, edge polylines, suppressions, attachment anchors, stops) in one transaction once a transform is set.

```ruby
add_column :floorplates, :svg_to_image_transform, :jsonb   # {a,b,c,d,e,f, method: 'aspect'|'calibrated', viewBox: [x,y,w,h]}
add_column :sitemaps,    :svg_to_image_transform, :jsonb
add_column :floorplates, :scale_ft_per_px, :decimal, precision: 10, scale: 6
add_column :sitemaps,    :scale_ft_per_px, :decimal, precision: 10, scale: 6
```

Derivation `PlateTransform.derive(level)`: parse the SVG root `viewBox` (Nokogiri; `application_helper.rb:704-712` already does this as a fallback) and the image `width/height`; if `|vb_w/vb_h − W/H| / (W/H) ≤ 0.01` → scale-only transform (`a = W/vb_w, d = H/vb_h, b = c = 0, e = −vb_x·a, f = −vb_y·d`, `method: 'aspect'`); otherwise `nil`. A calibration UI (two or three reference points, least squares) is a later slice writing `method: 'calibrated'`. `wayfinding_stops` store the point itself (`anchor: "point"`); no second centre column for hallways (two coordinates to keep in sync while legacy still reads `x_plot`). The API speaks storage units and declares `anchor`; the Next.js client already adds 8 on read and subtracts on write.

```
Existing:      image pixels, icon top-left; SVG pointer_data in viewBox units; no transform.
Reuse:         frame and +8 convention.
Change:        none to readers.
Add:           space columns; svg_to_image_transform; scale_ft_per_px; PlateTransform; ReprojectPlate.
Risk:          svg-space rows exist but are non-routable until a transform is set (explicit, visible in Connect).
Compatibility: legacy never sees an SVG-unit coordinate.
Migration:     nullable jsonb/decimal columns.
Rollback:      drop columns; svg rows stay non-routable.
```

## 23. Performance Strategy

| Scope                          | Payload                                                                                                                                         | Today                                                                               | Change                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| Property (Map & Plotting open) | `floorplates/floorplans/units/amenities.json` + `automate_plotting.json` (all hallways of all levels, elevators, BSPs, tour, stops, doors, OCR) | one query per collection in `WayfindingSerializer`; galleries/banks grouped; no N+1 | add `meta.versions`, new keys |
| Level (tab switch)             | plan SVG via `plan-svg` route handler                                                                                                           | unchanged                                                                           | —                             |
| Level (save)                   | `save_graph` response = that level only                                                                                                         | new                                                                                 | —                             |
| Tour App                       | `wayfinding` (whole property, cached by version, ETag), `route`/`tour_route` on demand                                                          | new                                                                                 | —                             |

Sizes: 25–85 hallways per floorplate, 47 nodes and 20 stops on 2934, up to ~400 stops on the largest properties; `automate_plotting.json` stays one request well under 1 MB; no per-level read endpoint is needed for Connect.

Indexes to add (`algorithm: :concurrently`, `disable_ddl_transaction!`): `tour_stops(stop_type, stop_id)`, `units(floorplate_id)`, `hallways(community_id)`, `index_hallways_routable_lookup`, `index_hallways_natural_key`, `hallway_edges(from_hallway_id, to_hallway_id)` unique, `hallway_attachments(attachable_type, attachable_id, parent_type, parent_id)` unique, `hallway_suppressions(parent_type, parent_id, kind)`, `wayfinding_stops(map_type, map_id)` and `(community_id, kind)`, `elevators(community_id, kind)`. Already present: `hallways(parent_type, parent_id)` (`db/schema.rb:1266`), `doors(attached_with_type, attached_with_id)`, `elevators(floorplate_id)`, `(sitemap_id)`.

`ShortestPath#fetch_hallways_coordinates_with_distance` (`:1823-1849`): build `by_id = hallways.to_a.index_by(&:id)` once and replace `hallways.where(id: element).first` with `by_id[element]`; the output hash is keyed by `point.id` with `next_points_distance` in `next_points` order, so it is identical, with N queries → 0 per call. `get_access_point_data` (`:1784`) is dead code ("on hold"); leave it. `Wayfinding::GraphSave` loads the level's hallways once, validates in memory, batches `next_points` rewrites to one `UPDATE` per touched row, and uses `save!` (not `upsert_all`) for units/amenities/elevators so their callbacks run. Version bumps fire only on hallway/edge/attachment/stop changes and plotting-column changes; bulk `upsert_all/update_all/delete_all` fire no callbacks, so provider syncs cause no churn.

## 24. Authorization Strategy

Owner decision: hardening on the **new** endpoints only.

- **Connect writes**: `check_community` (existing rule, 302 → JSON 403 on the write path) plus a new `User#can_edit_map?(community)` = `can_access_community?(community.id) && (is_admin? || is_dwelo_admin?)` — Super admin, Company admin, Regional admin, Community admin, Community manager, Dwelo admin; excludes Community assistant, `visitor_detail_page` and New Client (D7). `User#can_access_community?` extracts `check_community`'s branches verbatim (`application_controller.rb:83-117`: super admin → all; Dwelo admin → assigned ∪ Dwelo-created communities ∪ communities of Dwelo-created companies; Company admin → own company's ∪ assigned; everyone else → assigned via `community_users`) so one rule serves both; `check_community` then delegates to it with its early returns kept (D6). `Connect::WritesJson#authorize_connect_map_edit!` renders 403 JSON. `Ability` (CanCanCan) stays unused by map controllers (its `Community, company_id:` rule would deny super-admin-assigned community users).
- **Connect reads**: unchanged (`check_community`; another company's property is "not found").
- **Tour App API**: the existing self-tour JWT scheme reused unchanged via the extracted concern. Pre-existing weaknesses, **flagged, not widened**: `ENV['API_ACCESS'] == 'true'` globally bypasses every self-tour and v1 endpoint; the token payload carries only `tour_user_id` and `tour_users` has no `community_id`, so a valid token for any property reads any `community_id`; `JsonWebToken` uses `SECRET_KEY_BASE_v2` while `decoded` uses `SECRET_KEY_BASE`. The new endpoints expose the map graph only (no `access_code`), so the exposure is bounded; binding the token to the community is part of the separate security ticket.
- **Legacy gap (separate security ticket)**: `HallwaysController`, `ToursController`, `TourStopsController`, `AutomatePlottingController` HTML, `ElevatorBanksController` run no per-property check (hallway routes are top level with no `community_id`, so `before_action :check_community` alone would be a no-op); `Api::V1::WayfindingController#floorplate_path_points` has no auth and raises; `Api::V1::CommunitiesController#delete_tour_stop` has no auth. Recommended design when picked up: a level-resolving `check_level_community` on `HallwaysController`, `check_community` on the others, behind `LEGACY_MAP_AUTHZ=log|enforce`, log-first for one release.

## 25. Legacy Compatibility Strategy

Invariant checked for every change: _what does the legacy system see afterwards, and can it still read and operate on the data?_

| Change                                                                                                      | What legacy sees                                                                                       | Can legacy still operate?                                                                       |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `hallways` new columns                                                                                      | the same rows; defaults `manual/confirmed/raster`; `render json:` carries extra keys `maps.js` ignores | yes; `point_save` creates rows that get the defaults                                            |
| `.routable` in `make_sure_one_selected_hallway` and the five renders                                        | identical set of rows for all existing data (none is pending or svg)                                   | yes                                                                                             |
| `hallway_edges`                                                                                             | nothing (never read)                                                                                   | yes; `next_points` is still the adjacency it edits; callbacks/FKs keep the edge rows consistent |
| `hallway_suppressions`, `hallway_attachments`, `hallway_detection_runs`, `wayfinding_stops`                 | nothing                                                                                                | yes                                                                                             |
| `elevators.kind/accessible/floor_positions`                                                                 | every row an elevator                                                                                  | yes; stairs rows have no `tour_stops` row so neither router nor jbuilder sees them              |
| `doors.note`, `tour_stops.duration_minutes`, `tours.tour_setup_version`, `floorplates/sitemaps` new columns | nothing                                                                                                | yes                                                                                             |
| version-bump callbacks                                                                                      | one extra `update_all` per legacy save                                                                 | yes                                                                                             |
| `has_paper_trail` on Hallway/TourStop                                                                       | extra `versions` rows                                                                                  | yes                                                                                             |
| `Elevator/BSP before_destroy`                                                                               | deleting an elevator now also removes its stops in per-visitor tours (today they are orphaned)         | yes; this is a fix                                                                              |
| `ShortestPath` `.routable` + `index_by`                                                                     | identical output (snapshot-tested)                                                                     | yes                                                                                             |
| New actions/routes/controllers                                                                              | nothing                                                                                                | yes                                                                                             |

Shared domain logic stays in Rails: `GraphSave`, `GraphBuilder`/`RouteService`, `TourSetup::Save`, `TourStops::Remove`, model callbacks and validations. Next.js only converts `LocalMapState` to a diff and renders responses; the mobile app only renders graph and route. Dual-read/dual-write (brief §29): **not needed** — one store; the `next_points` ↔ `hallway_edges` mirror is a single-direction consistency rule enforced by the service and one callback, not a second source of truth; no translation adapters; no backfill of a parallel store.

## 26. Migration/Backfill Strategy

Principles: additive only; nullable or defaulted; reversible `down`; run migrations before deploying code that reads them (no `release:` phase exists in `Procfile`; D5 proposes adding one); the repo's `NOT VALID` check-constraint + separate `validate_check_constraint` pattern (`db/migrate/20260901000000_add_highlight_all_units_on_hover_to_communities.rb`) is reused; `hallways.id` is `integer serial`, so FK columns are `integer`.

| #   | Migration                                                     | Contents                                                                                                                                                                                                                                                                    | Rollback               |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | `AddWayfindingColumnsToHallways`                              | §9 columns + indexes; backfill `community_id` with two `UPDATE … FROM floorplates/sitemaps` (orphans stay NULL)                                                                                                                                                             | remove columns/indexes |
| 2   | `CreateHallwayEdges`                                          | `from_hallway_id/to_hallway_id integer not null` (FK cascade), `kind, path_points jsonb default [], review_status default 'confirmed', auto_generated default false, detection_run_id, space default 'raster', created_by_user_id`, unique `(from,to)`, `CHECK (from < to)` | drop table             |
| 3   | `CreateHallwaySuppressions`                                   | §12                                                                                                                                                                                                                                                                         | drop table             |
| 4   | `CreateHallwayAttachments`                                    | §9; unique `(attachable, parent)`; FK cascade; `CHECK ((mode='detached' AND hallway_id IS NULL) OR (mode='explicit' AND hallway_id IS NOT NULL))`                                                                                                                           | drop table             |
| 5   | `CreateHallwayDetectionRuns`                                  | §10                                                                                                                                                                                                                                                                         | drop table             |
| 6   | `CreateWayfindingStops`                                       | §13                                                                                                                                                                                                                                                                         | drop table             |
| 7   | `AddKindAccessibleFloorPositionsToElevators`                  | §15                                                                                                                                                                                                                                                                         | drop columns           |
| 8   | `AddNoteToDoors`                                              | `note text`                                                                                                                                                                                                                                                                 | drop column            |
| 9   | `AddWayfindingVersionTransformScaleToFloorplatesAndSitemaps`  | `wayfinding_version integer default 0 not null`, `svg_to_image_transform jsonb`, `scale_ft_per_px decimal(10,6)` on both                                                                                                                                                    | drop columns           |
| 10  | `AddTourSetupVersionToTours`, `AddDurationMinutesToTourStops` | `tour_setup_version integer default 0 not null`; `duration_minutes integer`                                                                                                                                                                                                 | drop columns           |
| 11  | `AddPlottingIndexes`                                          | `tour_stops(stop_type, stop_id)`, `units(floorplate_id)` concurrently                                                                                                                                                                                                       | drop indexes           |
| 12  | `AddHallwayCheckConstraints`                                  | `CHECK (x_plot >= 0 AND y_plot >= 0) NOT VALID`, `CHECK (NOT (id = ANY(next_points))) NOT VALID`                                                                                                                                                                            | drop constraints       |
| 13  | `ValidateHallwayCheckConstraints`                             | after repair                                                                                                                                                                                                                                                                | —                      |

Backfill / repair (`lib/tasks/wayfinding_repair.rake`, `DRY_RUN=1` default, CSV export of affected rows to `tmp/` before mutating; run on staging first):

| Task                       | Finding                                                                                   | Action                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `repair:orphans`           | 651 hallways whose parent is gone                                                         | delete after export; root cause fixed by `dependent: :destroy`                                |
| `repair:self_loops`        | 38                                                                                        | `UPDATE hallways SET next_points = array_remove(next_points, id) WHERE id = ANY(next_points)` |
| `repair:dangling`          | 4 ids with no row                                                                         | rebuild `next_points` from `unnest` ∩ existing ids                                            |
| `repair:duplicates`        | repeated ids inside one array                                                             | `uniq`                                                                                        |
| `repair:selected`          | 8 parents >1 selected, 3 with 0                                                           | keep max id / select last                                                                     |
| `repair:negative_coords`   | 1 row (y = −14)                                                                           | clamp to 0 (D9)                                                                               |
| `repair:orphan_tour_stops` | 134                                                                                       | delete after export                                                                           |
| `backfill:community_id`    | all hallways                                                                              | two `UPDATE … FROM`                                                                           |
| `audit` (weekly Sidekiq)   | orphans, dangling, `community_id IS NULL`, edge rows not mirrored, mirrored pending edges | report only                                                                                   |

Compatibility period: none needed; no read path changes. Rollback: `down` per migration; deleted orphans restorable from CSV; other repairs are idempotent normalisations.

## 27. Rollout Strategy

| Step              | What                                                                                                                                                                                                                                                                                                                                                    | Where                                                              | Rollback                                              | Legacy effect                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------- |
| 0                 | This report; dated entry in `react-architecture.md` §20; answer PYN_CONNECT_PROGRESS.md §11 ("Read-only, or real writes?")                                                                                                                                                                                                                              | repo                                                               | —                                                     | none                                                      |
| 1                 | Legacy-pinning tests (five hallway actions, `tour_stops#destroy`) and `wayfinding:snapshot` of `ShortestPath` web + mobile outputs for 1411, 2934, 1468, 1839, 2919, 1105 on the dev DB                                                                                                                                                                 | `pyn-system` repo                                                  | —                                                     | none                                                      |
| 2                 | `wayfinding:repair` dry-run → review CSVs → `APPLY=1` on staging, then production                                                                                                                                                                                                                                                                       | `heroku run`                                                       | CSV restore                                           | cleans data the pages already tolerate (`rescue []`)      |
| 3                 | Migrations 1–11                                                                                                                                                                                                                                                                                                                                         | `heroku run rails db:migrate -a pyn-system` before the code deploy | `down`                                                | none (unread columns)                                     |
| 4                 | Rails code: models, `Wayfinding::*` save services, `TourSetup::Save`, `TourStops::Remove`, `Connect::WritesJson`, `Connect::Flags`, `save_graph`, `save_setup`, serializer keys, `meta.versions/csrf_token`, version-bump callbacks, PaperTrail, `.routable`, N+1 fix, `User#can_access_community?/can_edit_map?`; deploy with `PYN_CONNECT_WRITES=off` | `pyn-system`                                                       | flag off (endpoints 404 `disabled`) or revert release | new actions/routes only; one `update_all` per legacy save |
| 5                 | Next.js: `base.api.ts` PUT + CSRF, CSRF cookie at sign-in, `graphDiff.ts`, save route handlers, Save buttons behind `PYN_CONNECT_WRITES=on`                                                                                                                                                                                                             | `pyn-system-connect` after 4                                       | flag off → today's read-only screens                  | none                                                      |
| 6                 | Enable allowlisted communities (`PYN_CONNECT_WRITES_COMMUNITY_IDS`); run the legacy smoke list and `wayfinding:compare` on an allowlisted and a non-allowlisted community                                                                                                                                                                               | config                                                             | remove ids                                            | none                                                      |
| 7                 | Tour App API: `GraphBuilder`, `RouteService`, serializers, `WayfindingController`, routes; parity harness green                                                                                                                                                                                                                                         | `pyn-system`                                                       | remove routes/controller                              | none                                                      |
| 8                 | Migrations 12–13 (constraints) once repair is verified                                                                                                                                                                                                                                                                                                  | `pyn-system`                                                       | drop constraints                                      | none                                                      |
| 9                 | GA: `communities.wayfinding_v2_enabled` column; `Connect::Flags` prefers it                                                                                                                                                                                                                                                                             | `pyn-system`                                                       | drop column                                           | none                                                      |
| 10 (later, gated) | Phase 2: `tour_settings.enable_wayfinding_stops`, `tour_stops.stop_type = 'wayfinding_stop'` + three guards; optional `HallwaysController` refactor onto the service; retire `start_tour` when the new app ships (D10)                                                                                                                                  |                                                                    | flag off                                              | gated                                                     |

Heroku: two apps (`pyn-system`, `pyn-system-connect`); migrations are run by hand today; D5 recommends `release: bundle exec rails db:migrate` in `Procfile`.

## 28. Rollback Strategy

Order: Connect flag → Rails flag → code revert → migrations `down`. Never migrations first.

| Change                  | Rollback                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Connect Save buttons    | `PYN_CONNECT_WRITES=off` on `pyn-system-connect` → read-only screens shipped today                        |
| Write endpoints         | `PYN_CONNECT_WRITES=off` on `pyn-system` → 404 `{code: 'disabled'}`; or remove the two actions and routes |
| Tour App API            | remove routes/controller; cache keys expire                                                               |
| `.routable`, `index_by` | revert lines (grep `routable`)                                                                            |
| Callbacks, PaperTrail   | revert model lines                                                                                        |
| New tables/columns      | `down` migrations; nothing legacy depends on them                                                         |
| Repairs                 | restore from the CSV exports                                                                              |
| Constraints             | drop constraints                                                                                          |

Every proposed change above carries its own Existing / Reuse / Change / Add / Risk / Compatibility / Migration / Rollback block.

## 29. Testing Strategy

Existing infrastructure (verified): minitest + fixtures (`test/test_helper.rb`, `fixtures :all`), 14 model tests, one controller test (`schedual_tours`), fixtures for communities, companies, sitemaps, units, amenities, floorplans, legacy paths/path_points; **no** fixtures for users, floorplates, hallways, tours, tour_stops, community_users; no Devise test helpers; forgery protection disabled in test (`config/environments/test.rb:29`); no CI workflow; zero coverage of `HallwaysController`, `ToursController`, `TourStopsController`, `AutomatePlottingController`, `ShortestPath`.

Rails additions:

| Piece                                                                                                                | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/test_helper.rb`                                                                                                | `include Devise::Test::IntegrationHelpers`; `with_forgery_protection { }` helper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Fixtures                                                                                                             | `users` (super admin, company admin, regional admin, community admin assigned, community assistant, visitor_detail_page), `community_users`, `floorplates` (`range: "1-3"`, `"5"`), `hallways` (4-node graph), `hallway_edges`, `tours`, `tour_stops`, `elevators` (incl. a stairs row), `building_starting_points`, `wayfinding_stops`                                                                                                                                                                                                                                                                                                                                                                                |
| `test/controllers/hallways_controller_test.rb`                                                                       | `save_graph`: auth matrix (anonymous 401; other-company company admin 403; assistant 403; assigned community admin 200; super admin 200); CSRF with protection on (no header 403 `csrf`, bad header 403, `form_authenticity_token` 200); 409 on stale `base_version` with current graph; 422 per-item (out of bounds, unknown node, cross-level id, duplicate edge → no-op, foreign floorplate → 404); transaction rollback (failing pin after nodes written → counts and version unchanged); idempotent replay (second identical body → 409 with ids of the first); version +1 per save; PaperTrail summary row; `origin: 'detect'` rejects mutations. Legacy five actions pinned byte-for-byte **before** any change |
| `test/controllers/tours_controller_test.rb`                                                                          | `save_setup`: same matrix; create/remove/visibility/order; `TourStops::Remove` parity with `TourStopsController#destroy` (pinned first)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `test/controllers/automate_plotting_controller_test.rb`                                                              | `index.json` carries `meta.versions`, `meta.csrf_token`, new serializer keys; `shortest_path.json?from=&to=` returns the envelope, without `from` the legacy shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `test/controllers/api/self_tour/v1/wayfinding_controller_test.rb`                                                    | token required; `API_ACCESS` bypass behaviour pinned; ETag 304; no writes (`deleted_ids`, `sort_hash` unchanged); error taxonomy; `access_code` absent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `test/services/wayfinding/graph_save_test.rb`                                                                        | Scenarios A–E; natural-key merge; tombstones and their clearing; mirror/prune invariants (no dangling `next_points`, no mirrored pending edge, no unmirrored confirmed edge); `j:` resolution; pins update `TourStop` only with matching `stop_type`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `test/services/wayfinding/graph_builder_test.rb`, `route_service_test.rb`                                            | explicit/detached links; stairs and step-free; blockers; gates; tour mode ordering; stack-floor copies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `test/models/hallway_test.rb`, `hallway_edge_test.rb`, `wayfinding_stop_test.rb`, `elevator_test.rb`, `user_test.rb` | validations; `before_destroy` stop cleanup; `can_access_community?` truth table equal to `check_community`'s branches; `can_edit_map?` per role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ShortestPath` regression harness                                                                                    | `lib/tasks/wayfinding_snapshot.rake`: `wayfinding:snapshot[ids]` writes `tmp/wayfinding_snapshots/<id>.json` with web and mobile outputs for both `path_type`s; `wayfinding:compare[ids]` must be empty before the N+1 fix, after every Rails deploy, and before any later `ShortestPath` change. Minitest oracle test keeping the old `fetch_hallways_coordinates_with_distance` body as the oracle                                                                                                                                                                                                                                                                                                                   |
| Parity harness                                                                                                       | `RouteService#tour` vs `ShortestPath` on 1411, 2934, 1468 with no links/stairs/blockers: same stop order, same elevator choices, same hallway node sequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Playwright (`pyn-connect-web/tests/e2e`): keep the "no non-GET request" guard (`wayfinding.spec.ts:83-88`) as the default and allowlist the two save route handlers only when `PYN_CONNECT_E2E_WRITES=on`; new `wayfindingSave.spec.ts` (add junction → connect → save → reload → counts from `automate_plotting.json` grew exactly; move → save → reload position; delete → save → gone; stale save from a second context → 409 banner; sign-out mid-edit → 401 path) and `tourSetupSave.spec.ts` (add/hide/reorder/remove → save → reload; `tour_stops.sort` equals the screen order); extend the `rails runner` session mint (PYN_CONNECT_PROGRESS.md §7) to also print a masked CSRF token; use a cloned throwaway community so the real-data read specs keep their expected counts.

Legacy smoke list (minted session, after each Rails deploy, on an allowlisted and a non-allowlisted community): `floorplates/:id/plotexp` plot and move a unit; `automate_plotting` add/move/delete/connect a hallway point and Run Algo both path types; Tour Setup add, drag-sort, hide/show, delete; `tours/starting_point` move; `DELETE /api/self_tour/v1/communities/:id/start_tour` with a real tour user token; then `wayfinding:compare`.

## 30. Exact Files/Classes/Services That Would Need Changes

**Rails — change**

| File                                                                                                                              | Change                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/models/hallway.rb`                                                                                                           | constants, validations, associations, `inherit_community_id`, `prune_edge_rows_for_removed_links`, `bump_parent_wayfinding_version`, scopes `routable`/`pending`, `has_paper_trail`                 |
| `app/models/floorplate.rb`, `sitemap.rb`                                                                                          | `has_many :hallways, dependent: :destroy`; `has_many :hallway_edges/:hallway_suppressions/:hallway_attachments/:hallway_detection_runs/:wayfinding_stops, as: :parent/:map, dependent: :delete_all` |
| `app/models/elevator.rb`, `building_starting_point.rb`                                                                            | `kind`/`accessible` validations and scopes; `before_destroy :destroy_legacy_tour_stops`; version bump on plotting columns                                                                           |
| `app/models/door.rb`, `unit.rb`, `amenity.rb`                                                                                     | version bump `after_commit` on plotting-column changes                                                                                                                                              |
| `app/models/tour_stop.rb`                                                                                                         | `has_paper_trail`; `after_commit` bump of `tours.tour_setup_version`; `LEGACY_STOP_TYPES`                                                                                                           |
| `app/models/user.rb`                                                                                                              | `can_access_community?`, `can_read_map?`, `can_edit_map?`                                                                                                                                           |
| `app/controllers/application_controller.rb`                                                                                       | `check_community` delegates to `User#can_access_community?` (behaviour-preserving); `make_sure_one_selected_hallway` uses `.routable`                                                               |
| `app/controllers/hallways_controller.rb`                                                                                          | `include Connect::WritesJson`, `CONNECT_WRITE_ACTIONS`, `save_graph`; `.routable` in the five renders                                                                                               |
| `app/controllers/tours_controller.rb`                                                                                             | `include Connect::WritesJson`, `save_setup`                                                                                                                                                         |
| `app/controllers/automate_plotting_controller.rb`                                                                                 | `shortest_path` from/to branch                                                                                                                                                                      |
| `app/helpers/shortest_path.rb`                                                                                                    | `.routable` at the 8 load sites; `index_by` in `fetch_hallways_coordinates_with_distance`                                                                                                           |
| `app/serializers/connect/wayfinding_serializer.rb`, `response_envelope.rb`, `app/controllers/concerns/connect/wayfinding_json.rb` | new keys; `meta.versions`; `meta.csrf_token`                                                                                                                                                        |
| `config/routes.rb`                                                                                                                | `put :wayfinding_graph` (communities member), `put :save_setup` (tours collection), three `wayfinding` routes (self_tour v1)                                                                        |
| `Procfile`                                                                                                                        | `release: bundle exec rails db:migrate` (D5)                                                                                                                                                        |

**Rails — add**

`app/models/{hallway_edge,hallway_suppression,hallway_attachment,hallway_detection_run,wayfinding_stop}.rb`; `app/services/wayfinding/{graph_save,graph_builder,route_service,graph_version,suppressions,stop_links,explicit_links,plate_transform,reproject_plate,detection_undo,timing,graph_serializer,route_serializer,errors}.rb`; `app/services/tour_setup/save.rb`; `app/services/tour_stops/remove.rb`; `app/services/connect/flags.rb`; `app/controllers/concerns/connect/writes_json.rb`; `app/controllers/api/self_tour/v1/wayfinding_controller.rb`; `app/controllers/concerns/api/self_tour/v1/token_authorization.rb`; `app/serializers/connect/wayfinding_level_serializer.rb`; 13 migrations (§26); `lib/tasks/wayfinding_repair.rake`, `lib/tasks/wayfinding_snapshot.rake`; tests and fixtures (§29).

**Next.js — change**

`src/core/repository/remote/api/base.api.ts` (PUT/PATCH, `csrfToken`), `wayfinding.api.ts` (`saveWayfindingGraph`), `src/config/app/urls.ts`, `src/app/api/auth/sign-in/route.ts` + `src/core/session/session.server.ts` (CSRF cookie), `src/core/repository/parser/wayfinding.parser.ts` (new keys, save response), hooks `useMapWayfinding.ts`/`usePropertyMap.ts`/`useTourSetup.ts` (build diff, save, 409 rebase, 401 handling), `tests/e2e/wayfinding.spec.ts` and `tourSetup.spec.ts` (audit allowlist).

**Next.js — add**

`src/core/repository/remote/api/tourSetup.api.ts`; `src/app/api/properties/[propId]/map/save/route.ts`; `src/app/api/properties/[propId]/tour-setup/save/route.ts`; `src/core/utils/wayfinding/graphDiff.ts` (`LocalMapState` → payload, centre → top-left); `tests/e2e/wayfindingSave.spec.ts`, `tourSetupSave.spec.ts`.

**Docs**

`react-architecture.md` §20 dated entry; `PYN_CONNECT_PROGRESS.md` §11 answer; status rows in `gaps_map_plotting_feature.md` (M1, M2, M5, M6, M14–M18, M20, M21, M24) and `gaps_tour_setup_feature.md` (T1–T6, T8).

## 31. Recommended Implementation Order

1. This report (now); doc entries.
2. Legacy-pinning tests and `ShortestPath` snapshots.
3. Data repair (dry-run → staging → production).
4. Migrations 1–11.
5. Rails models, save services, Connect write endpoints, serializer keys, callbacks, audit, `.routable`, N+1 fix — behind `PYN_CONNECT_WRITES=off`.
6. Next.js write wiring behind `PYN_CONNECT_WRITES`.
7. Allowlist communities; smoke list; `wayfinding:compare`.
8. Tour App API: `GraphBuilder`, `RouteService`, serializers, controller; parity harness.
9. Migrations 12–13 (constraints).
10. GA flag column.
11. Gated phase 2 (new stop kinds as tour stops), optional legacy `HallwaysController` refactor onto the service, retirement of `start_tour` when the new app ships.

## 32. Open Questions / Decisions Required

Resolved on October 3, 2026: full additive schema ✔; full new semantics via the new API, legacy route byte-identical ✔; authorization hardening on new endpoints only, legacy gap as a separate ticket ✔; report as repo markdown ✔.

Still open (recommended default in bold):

| #   | Decision                                                                                                                                                                                             | Default                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| D1  | Tour Setup save writes `tour_stops.sort` only, or also rebuilds `tours.sort_hash` (needs the elevator special-casing in `sort_stops:174-219` specified)                                              | `sort` **only in phase 1**                               |
| D2  | `api/v1/wayfinding#floorplate_path_points` (no auth, raises): leave, guard, remove                                                                                                                   | **leave; include in the security ticket**                |
| D3  | `hallways.source` default `'manual'` vs `'stored'`                                                                                                                                                   | `'manual'`                                               |
| D4  | Ramp as vertical connector (`elevators.kind='ramp'`) vs same-floor marker; `release:` phase in `Procfile`; flags via ENV + allowlist first                                                           | **vertical; add release phase; ENV first, column at GA** |
| D5  | Pending/`svg`-space hallway rows hidden from legacy pages and non-routable vs shown                                                                                                                  | **hidden and non-routable**                              |
| D6  | Door/Gate semantics: plain pass-through node vs one-way or lock-gated (none exists in code); extract `check_community` into `User#can_access_community?` vs duplicate the rule                       | **pass-through; extract**                                |
| D7  | Inter-building edge weight without outdoor paths: constant `500·unit` vs requiring a drawn outdoor path; `can_edit_map?` = admins + Dwelo admin + Community manager                                  | **constant; that role set**                              |
| D8  | `wayfinding_stops` stored as centre (`anchor: "point"`) while legacy records stay icon top-left                                                                                                      | **yes, declared in the API**                             |
| D9  | Tombstone legacy `remove_point` deletions in phase 1; `TOL` values 6 px / 0.4 % diagonal; negative-coordinate row clamp vs delete; attachment floor checks for elevators/doors as warnings vs errors | **no; those values; clamp; warnings**                    |
| D10 | When the new mobile app ships: retire `start_tour`/`ShortestPath`, or keep both indefinitely                                                                                                         | keep both indefinitely                                   |

---

### Appendix A — Data quality queries (reproducible, `pynwheel_development`)

```sql
-- connected pieces per map (check 7)
with recursive edges as (select id a, unnest(next_points) b from hallways
  union select unnest(next_points), id from hallways),
reach(root,node) as (select id,id from hallways
  union select r.root, e.b from reach r join edges e on e.a=r.node join hallways hb on hb.id=e.b),
lbl as (select root id, min(node) comp from reach group by root)
select h.parent_type, h.parent_id, count(distinct l.comp) pieces, count(*) nodes
from hallways h join lbl l on l.id=h.id group by 1,2 having count(distinct l.comp) > 1;

-- orphan hallways (check 6)
select count(*) from hallways h left join floorplates f on h.parent_type='Floorplate' and f.id=h.parent_id
  left join sitemaps s on h.parent_type='Sitemap' and s.id=h.parent_id where f.id is null and s.id is null;

-- self-loops (check 3)
select count(*) from hallways where id = any(next_points);

-- orphan tour stops (check 8)
select ts.stop_type, count(*) from tour_stops ts
  left join units u on ts.stop_type='unit' and u.id=ts.stop_id
  left join amenities a on ts.stop_type='amenity' and a.id=ts.stop_id
  left join elevators e on ts.stop_type='elevator' and e.id=ts.stop_id
  left join building_starting_points b on ts.stop_type='building_starting_point' and b.id=ts.stop_id
where u.id is null and a.id is null and e.id is null and b.id is null group by 1;
```

### Appendix B — Next.js in-memory model that the save payload is derived from

`pyn-connect-web/src/core/utils/generator/map/mapState.ts`: `LocalMapState` fields `pinOverrides`, `nodeOverrides`, `tempNodes` (`TempNode {key, levelId, x, y, label, space, source, review, confidence}`), `tempEdges` (`TempEdge {a, b, points?, kind}`), `hiddenNodes`, `hiddenEdges`, `tempStops` (`TempStop {key, type, name, building, levelId, floorOnly, floors, accessible, lock, note, x, y, space}`), `wfLinks` (`"<levelId>|<anchorKey>" → pointKey | null`), `wfPlaces`, `wfEdited`, `wfSvg`, `wfUndo`. Node keys: `h:<id>` stored hallway, `j:<n>` page junction, `e:<id>` elevator, `b:<id>` building entry, `s:tour` tour start, `d:<id>` door, `n:<n>` page stop; `NODE_ANCHOR_OFFSET = 8` (`:92`). Diff rules in `src/core/utils/wayfinding/hallwayEdits.ts` (`graphPatch`, `detectionPatch`). Stop types in `src/core/utils/wayfinding/stopTypes.ts`. Router in `src/core/utils/wayfinding/wayfindingRoute.ts`.
