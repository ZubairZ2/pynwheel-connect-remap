# Map & Plotting — gaps that need backend work (September 25, 2026)

**Scope of this file.** Only what the Connect Map & Plotting screen (`/properties/:id/map`, numeric ids) cannot do with read-only access to the existing CMS plus the minimal JSON branches added in phase 2g (`PYN_CONNECT_PROGRESS.md` §20). Everything the screen *does* do — render the stored floor images, pins, hallway graph, elevators, starting points and tour stops, run the CMS routing algorithm, and hold temporary edits on the page — is documented in `context.md` §16, not here.

**Rule in force.** The frontend never mutates the database. Every write-shaped action below is visible in the UI, applies to the page's local state where that is meaningful, says so, and sends nothing. The brief's read-only network audit (0 non-GET requests through every action) is in the progress doc.

---

## Gap: M1. Saving plots — pins, hallway nodes, connections, moves and removals

### UI Requirement
Place Pin, Move, Remove Pin, Junction, Connect, Start Plotting Hallways, Delete Node and the marker drags all change the map.

### Existing Rails Source Investigated
- Units: `UnitsController#ajaxplotunitforfloorplate` (`POST /communities/:cid/units/:provider_unit_id/ajaxplotunitforfloorplate`, params `x_plot`, `y_plot` or `pointer[...]`, `floorplate_id`; also updates `tour_stops.latitude/longitude`), `#ajaxplotunit` (sitemap), `#adjust_position`, `#remove_plot_from_floorplate` (also destroys TourStops and VisitedStops), `CommunitiesController#add_plots_on_floorplate` / `#remove_plots_from_floorplate` / `#save_pointer_data`.
- Amenities: `FloorplateAmenitiesController#plot_amenity`, `#plot_amenity_door`, `#remove_amenities_plot`; the sitemap twin.
- Hallways: `HallwaysController#point_save`, `#update_point`, `#remove_point`, `#connect_leaf_point`, `#save_selected_point` (`POST /save_hallways_point` and friends; `maps.js` 229–353).
- Elevators / starting points: `ToursController#update_elevator`, `#add_elevator`, `#ajaxplotstartingpoint`, `#update_building_starting_point`.

### Existing DB Data
`units.x_plot/y_plot/pointer_data/floorplate_id`, `amenities.x_plot/y_plot/pointer_data/amenityable_*`, `hallways` (`x_plot`, `y_plot`, `next_points int[]`, `selected`, polymorphic `parent`), `elevators.x_plot/y_plot`, `building_starting_points.x_plot/y_plot`, `tours.x_plot/y_plot`, `doors.x_plot/y_plot`.

### What Next.js Can Currently Do
Every one of these edits works on the page: the pin or node moves, appears or disappears, the panels and counts follow, and a selected item says "Temporary · this page only" or "Moved here · the CMS still holds x%, y%". Stored nodes and connections can be hidden on the page but not deleted. A reload restores the stored map.

### Why Full Functionality Cannot Be Implemented Read-Only
All of the endpoints above are form/AJAX POSTs behind `protect_from_forgery`, several with side effects that belong to the legacy flow (tour-stop cleanup, door renumbering via `Door` callbacks, `TourStop` coordinate copies). The Connect proxy holds no CSRF token and the brief keeps Connect read-only.

### Future Backend Requirement
JSON branches on the plotting actions (or one Connect plotting endpoint that reuses the same model code) and the CSRF strategy of gap G6/R5, once the phase 3 "read-only or real writes?" decision is taken. The payloads the screen would send already exist in `LocalMapState` (`pinOverrides`, `tempNodes`, `tempEdges`, `nodeOverrides`, `hiddenNodes`, `hiddenEdges`), all in the CMS's own pixel coordinates.

---

## Gap: M2. Publish

### UI Requirement
The design's Publish button pushes stops, pins and the pathway graph "live to the on-site touch app", then marks the tour published.

### Existing Rails Source Investigated
There is no publish action anywhere in the CMS. The Touch and Tour apps read the live tables (`api/v1/communities/:id/data.json`, `api/self_tour/v1/.../start_tour`); the listing's "Tour Published" is only "the tour has at least one stop" (gap G16 in the Property Detail gaps).

### Existing DB Data
None: no published flag, no publish timestamp, no staged copy.

### What Next.js Can Currently Do
Publish opens a dialog with the real counts (visible stops, stored pins, hallway nodes, still-unplotted items) and states that publishing from Connect is not available and nothing was sent. No success message.

### Why Full Functionality Cannot Be Implemented Read-Only
Nothing to call; and defining what "publish" means (a staged copy? a flag?) is new business logic.

### Future Backend Requirement
The business defines publish semantics; the CMS then gains a publish action and a state column the screen can show.

---

## Gap: M3. Floor SVG / background image uploads and Remove Plan

### UI Requirement
Upload SVG, Upload Image, drag-and-drop onto the plan, Remove Plan.

### Existing Rails Source Investigated
`FloorplatesController#create/#update` (multipart `floorplate[image]`, `floorplate[svg_image]`, with `SiteMapUploader`, MiniMagick dimension capture and the ≥ 1000×700 raster rule), `#upload_svg_image` (reads the root `<svg>` width/height into `svg_metadata`), `#destroy`; `SitemapsController` twins; `CommunitiesController#upload_svg_background`.

### Existing DB Data
`floorplates.image / svg_image / width / height / svg_metadata / standard_image_url`, `sitemaps.*`, `communities.background_svg_image`.

### What Next.js Can Currently Do
A picked or dropped file becomes a local object URL shown as the plan for that level ("Local preview · not uploaded" in the plan bar); Remove Plan hides the stored files on the page after a confirm. Nothing is uploaded or deleted. The stored raster's own natural size is used for coordinates when the CMS has no `width/height`.

### Why Full Functionality Cannot Be Implemented Read-Only
Uploads are multipart form posts with CSRF, image validation and dimension capture in the controller.

### Future Backend Requirement
A JSON/multipart upload branch on `floorplates#update` (gap G20's "Upload, Replace and Remove") plus the CSRF strategy.

---

## Gap: M4. Auto-Plot from the floor image (Textract) and from the SVG

### UI Requirement
"Auto-Plot from PMS Data": place every unplotted unit automatically.

### Existing Rails Source Investigated
- Raster: `CommunitiesController#floorplate_auto_plot_units` / `#sitemap_auto_plot_units` → `fetch_aws_detected_units` (AWS Textract on `validated_image_url`), `store_map_ocr_data` (writes `map_ocr_data`), `DwelloDevicesHelper#set_floorplate_markers_on_map` (for each text box longer than 2 characters, every still-unplotted unit whose `marketing_name` includes the text is updated to `left × width, top × height`; a later box wins). Disabled in development. `#suggest_floorplate_units` is the same OCR without plotting.
- SVG: `services/svgAutoPlotting.js` matches SVG element ids/text to unit names in the browser and posts `save_pointer_data`.

### Existing DB Data
`floorplates.map_ocr_data` (Textract boxes, normalised `left/top/width/height/text`): present on 12 floorplates locally (e.g. 2003 "Aertson Midtown" plate 2794 with 650 boxes, 1108 "100 Moffett" plate 1437, 4067, 4267, 3902). `is_ocr_enabled`. `units.pointer_data` for SVG placements.

### What Next.js Can Currently Do
Auto-Plot runs the CMS's own matching rule over the **stored** boxes (exposed in `automate_plotting.json` → `ocr`) and places temporary pins at the same `left × width, top × height` the CMS would save. The report lists every skipped record with the reason: no floorplate for its PMS floor, no OCR text stored for the plate, no label matching the name, or "the CMS auto-plots units only". Verified on 2003: 123 of 373 placed, 250 reported.

### Why Full Functionality Cannot Be Implemented Read-Only
Running Textract needs AWS credentials and a non-development environment, and the CMS stores its output (`map_ocr_data`) and the plots as it goes. SVG auto-plot needs the SVG file's geometry: fetching the S3 SVG from the browser needs CORS, and the placement is a write.

### Future Backend Requirement
A read-only "suggest" JSON that runs Textract without writing plots (or a job that refreshes `map_ocr_data` on upload), and the plotting write of M1.

---

## Gap: M5. The routing algorithm over local edits, across floors and buildings

### UI Requirement
"Run Algorithm (Animated)" on the current graph, including temporary junctions and connections.

### Existing Rails Source Investigated
`ShortestPath` (`app/helpers/shortest_path.rb`, 2,410 lines) with `DijkstraAlgo`: per-floor graphs from `hallways` + stops attached to their nearest node, `shortest_paths_with_sorting_in_floor`, elevator hops, traverse-back, entry/exit points per building (`return_floorplate_path_for_multiple_buildings`), the sitemap variant, and the mobile `*_for_mobile` variants the Tour app consumes. `AutomatePlottingController#shortest_path` runs it as a GET.

### Existing DB Data
`hallways`, `elevators` (`floorplate_covering_range`), `building_starting_points`, `tours.x_plot/y_plot/building_order`, `tour_stops` (sort, `display_stop`), `doors`.

### What Next.js Can Currently Do
- **Run Algorithm (Animated)** calls the real CMS algorithm (`GET /automate_plotting/shortest_path.json`, through `app/api/properties/[propId]/wayfinding-route`) and animates its legs on the plan, switching floors as the route does. Verified on 2919: 15 legs, 263 points over floors 1–7.
- **Preview with local edits** runs a local Dijkstra (`core/utils/wayfinding/localRoute.ts`) over the current floor's stored graph plus the page's junctions, connections and moved nodes: stops in tour order, doors as targets, nearest-node attachment, then the elevator towards floors with more stops or back to the start.

### Why Full Functionality Cannot Be Implemented Read-Only
The CMS algorithm can only see stored data, so temporary edits are not part of its run. The local preview covers one floor with the single-building rules; the multi-building entry/exit sequencing, the floor-by-floor traverse-back and the CMS's stop-precedence rewrites (`UpdateTourStopsSortingOrder`) live only in the CMS.

### Future Backend Requirement
Either the writes of M1 (so the CMS algorithm sees the edits) or a `shortest_path` variant that accepts a graph in the request body.

---

## Gap: M6. Vertical connections other than elevators

### UI Requirement
"Connect" across floors "becomes a vertical connection"; the Vertical Connections panel lists links that leave the floor.

### Existing Rails Source Investigated
The only vertical link the CMS knows is an `Elevator` (one x/y reused on every floor of `floorplate_covering_range`; `Elevator#floors`, `Floorplate#fetch_elevators`). Hallways have no cross-map edges (`next_points` only reference hallways of the same map).

### Existing DB Data
`elevators`, `elevator_banks`, `unit_elevators` (empty). No stair, no generic link table.

### What Next.js Can Currently Do
The panel lists the stored elevators that serve other floors ("Elevator Lobby · Floor 1 ↔ Floors 2–7 · Elevator / stair") and any temporary connection drawn between nodes on two levels ("Temporary connection"). The local route preview uses elevators only.

### Why Full Functionality Cannot Be Implemented Read-Only
A cross-floor connection has no table to land in, and creating an elevator is a write with a validated floor range.

### Future Backend Requirement
Decide whether a cross-floor connection is an Elevator (then M1's write) or a new link table the algorithm also reads.

---

## Gap: M7. Set as Building Starting Point

### UI Requirement
Choose a node as a building's designated entry/exit.

### Existing Rails Source Investigated
`ToursController#building_starting_point` (a **GET that creates** the `BuildingStartingPoint` and its `TourStop` at 40/10), `#update_building_starting_point` (drag), `BuildingStartingPointsController#update`; the tour's own start via `#ajaxplotstartingpoint` / `#save_starting_point`.

### Existing DB Data
`building_starting_points` (one per building, `validate_building`), `tours.x_plot/y_plot/starting_floor/building`.

### What Next.js Can Currently Do
The panel shows the stored tour start and every building's stored entry/exit with its floor ("Set"), or "Not set · Required" as the design does; "Set as Building Starting Point" records the choice on the page ("Local" pill) and the note says nothing is saved.

### Why Full Functionality Cannot Be Implemented Read-Only
Creating or moving a starting point is a write, and the creating action is a GET with side effects that must not be called.

### Future Backend Requirement
A JSON branch on `building_starting_points#update` / the tour start, with M1's CSRF strategy.

---

## Gap: M8. Marker colours

### UI Requirement
"Marker Colors by Bedroom" with pickable swatches per tier.

### Existing Rails Source Investigated
`BedroomMarkerColor` model (`bedroom_marker_colors`: per-bedroom available/model colour and opacity), unused by any controller or view; the kiosk colours markers by availability (`communities.available_units_color`, `model_units_color`, `amenities_color`, `coloring_mode`), and the legacy plotting page picks its marker colour and size per theme from `design.*_property_map_marker_color` / `property_map_size_integer` (`_decide_styling.html.haml`).

### Existing DB Data
`bedroom_marker_colors` is empty for every property in the local database (0 rows); the community colour columns are set (e.g. `#F9D648` / `#F57396` / `#d37474`).

### What Next.js Can Currently Do
Tiers are computed from the real floor-plan bedroom counts; colours come from `bedroom_marker_colors` where a row exists (none today), else the design's palette; a swatch pick recolours the page's pins. The panel also prints the CMS's availability colours so the kiosk's real behaviour is visible.

### Why Full Functionality Cannot Be Implemented Read-Only
Saving a tier colour is a write, and no kiosk surface reads `bedroom_marker_colors` yet.

### Future Backend Requirement
A write for `bedroom_marker_colors` and a decision on whether the kiosk should colour by bedroom at all.

---

## Gap: M9. SVG-pointer placements on the floor SVG

### UI Requirement
Show pins placed in SVG mode on the floor SVG, with the room shape the CMS highlights.

### Existing Rails Source Investigated
`units.pointer_data` (`{x_plot, y_plot, tag, id, selector}` in SVG user units); `services/svgHandler.js` fetches the SVG, finds the element by tag/id/selector and clones its shape as the pin.

### Existing DB Data
3,754 units carry `pointer_data` locally (e.g. 348: 136 of 305 plotted units also have a pointer; 4 SVG floor plates with `svg_metadata` width/height).

### What Next.js Can Currently Do
`units.json` / `amenities.json` now carry `svg_pointer`; a pin with a pointer and no raster x/y is positioned by the pointer against `svg_metadata`; when the floor plate has both files, a "Floor SVG" toggle shows the SVG (as an image) instead of the raster. The selected-pin panel says "Placed by SVG pointer on {element}".

### Why Full Functionality Cannot Be Implemented Read-Only
Resolving the pointer to the element's shape needs the SVG document itself. The stored S3 file is served without CORS headers for this origin, and in development the uploader path is not on disk (context.md §13).

### Future Backend Requirement
A CMS endpoint that serves the SVG with CORS (or proxies it), as the partner SDK's `svg` action does for the map SDK.

---

## Not gaps (decisions recorded elsewhere)

- The legacy **manual paths** (`paths` / `path_points`, Tour Setup's "draw map line") are not drawn: they are per-stop manual lines the auto-wayfinding page does not use. See `context.md` §16.
- **Doors** are drawn as small nodes (the design has no door concept); plotting a door is a write (`plot_unit_door`), covered by M1.
- **Zoom / pan** of the plan (the legacy `panzoom`) is not in the design and was not built.

---

# Update, September 26, 2026 — the plotting design (phase 2i, `PYN_CONNECT_PROGRESS.md` §22)

The Map & Plotting screen was rebuilt to `pyn-system-plotting.html`: building pills, floorplate tabs with their plotting progress, Manual Plot onto the polygons of the real floor SVG, the four-step Auto Plot wizard (Analyze · Match Pattern · Confirm · Result, with the full rule builder), the Plot Units & Amenities panel, Add Floorplate, plus the pathway tools the brief keeps from the previous phase. Gaps M1–M9 above still hold as written; this section records what the polygon-based screen adds to them. Everything the screen does — including reading the stored floor SVGs through this app's own `plan-svg` route, resolving stored `pointer_data` to their polygons, and Manual / Auto Plot on the page — is in `context.md` §18, not here.

## Gap: M10. Saving polygon placements (Manual Plot, Auto Plot) — extends M1

### UI Requirement
Dropping ticked units or amenities on a polygon, Auto Plot's "Confirm & Auto Plot", Unplot.

### Existing Rails Source Investigated
`UnitsController#ajaxplotunitforfloorplate` (`pointer[...]` params → `units.pointer_data`), `FloorplateAmenitiesController#plot_amenity` (amenities, the same hash), `CommunitiesController#save_pointer_data` (the legacy SVG auto-plot's bulk POST from `svgAutoPlotting.js`: `{ pointer_data: { <unit id>: { id, tag, x_plot, y_plot, selector } } }`), `#remove_plots_from_floorplate?svg_deletion=true`, `SvgPlotRevalidator` (drops placements whose shape a newly uploaded SVG no longer has).

### Existing DB Data
`units.pointer_data` / `amenities.pointer_data` (`{ id, tag, x_plot, y_plot, selector }`, viewBox units), `floorplates.svg_metadata`.

### What Can Be Implemented Locally
Both work on the page and produce exactly the hash the CMS stores (the polygon's raw id and tag, its centre in viewBox units, or the group selector), in `LocalMapState.pinOverrides` (`space: 'svg'`, `polygon`). Unplot removes a stored or local placement on the page.

### Why Backend Work Is Required
Writes behind `protect_from_forgery`, as M1.

### Future Backend Requirement
A JSON branch on `save_pointer_data` (already a JSON POST) for the CSRF strategy of G6/R5 would carry the Auto Plot result as is.

## Gap: M11. Remembering Auto Plot rules per building

### UI Requirement
"Use these rules next time for {building}" on the Confirm step.

### Existing Rails Source Investigated
The legacy auto-plot (`svgAutoPlotting.js`) hard-codes its matching (normalise, short name, variants, similarity ≥ 0.55) and stores no rule; no column or table holds a pattern.

### Existing DB Data
None.

### What Can Be Implemented Locally
The rules are remembered per building for the life of the page (`LocalMapState.apPatterns`): reopening the wizard on the same building starts from them.

### Why Backend Work Is Required
Nothing to store them in.

### Future Backend Requirement
A per-property (or per-building) JSON column for the last rules, if the business wants them kept.

## Gap: M12. The CMS's own SVG auto-plot

### UI Requirement
The legacy "Auto Plot" button of the SVG section (`autoPlotUnits()`).

### Existing Rails Source Investigated
`svgAutoPlotting.js` runs entirely in the browser over the mounted SVG (`#Units` group, building/floor groups, `<text>` labels, similarity), then POSTs `save_pointer_data`.

### What Can Be Implemented Locally
The wizard's matching is the same idea made explicit: "ignore separators + ignore letter case" reproduces the legacy `normalize`, the polygon's `<text>` label counts as a second key as the legacy matches labels, and the tokens / presets / find-replace / trim / pad cover the legacy "variants". The legacy similarity fallback (≥ 0.55 of matching characters in position) is not reproduced: it silently matches a unit to a near-miss, which the wizard reports as "No match · closest …" for the user to pick.

### Why Backend Work Is Required
Only the save (M10).

## Gap: M13. Floor SVGs in a development database restored from staging

Not a Connect gap. CarrierWave stores to disk in development while this database's files live on S3, so `floorplates.svg_image.url` names a file the CMS host does not hold. The `plan-svg` route reads the S3 copy that sits beside the floorplate's image (`uploads/floorplate/svg_image/<id>/<file>`, same bucket as `standard_image_url`) when the CMS host answers 404; on staging and production the uploader's own URL is that S3 URL and the fallback never runs.

**Update, September 27, 2026 (branch `feature/inventory_properties_issues`):** resolved at the source. `Connect::UploadUrl.upload` now answers the S3 copy itself whenever an uploader on file storage names a file that is not on disk (the bucket of the record's own `standard_image_url`, else the property's), so the floorplates JSON already carries the S3 SVG URL and the `plan-svg` route's own fallback was removed. The same rule serves the amenity galleries, elevator images and galleries, secondary images and the sitemap files (PYN_CONNECT_PROGRESS.md §23).

## Not gaps (decisions recorded elsewhere)

- **Polygon labels.** The design prints every polygon's id over it; the real floor SVGs already carry their room numbers as `<text>`, so Connect labels only the polygons that hold something, are hovered, or are open.
- **Two layers, two spaces.** A floorplate with both a floor SVG and a floor image shows one at a time (Floor SVG / Background image): stored `x_plot/y_plot` are pixels of the image and stored `pointer_data` is viewBox units of the SVG, and the two files do not share a frame (`context.md` §18). The pathway graph, elevators, entry points and the tour start are image-space records and draw on the image layer; the CMS plots them there too.
- **The OCR auto-plot of phase 2g** (Textract boxes, `map_ocr_data`) was superseded by the wizard; the Textract run itself stays a CMS action (M4 in the section above).

---

## Status update — September 30, 2026: tools removed from the Connect screen

The user chose to match `pyn-system-plotting.html` exactly, so Map & Plotting no longer offers the pathway tools (Select, Place Pin, Junction, Connect, Move, Start Plotting Hallways), Grid, Publish, the floor SVG / image upload bar and Remove Plan, the layer switch, Run Algorithm, Building Starting Points, Vertical Connections or Marker Colors. Gaps M1 (saving pathway edits), M2 (Publish), M3 (uploads / Remove Plan) and M5 (routing over local edits) therefore have no UI in Connect for now; they still describe the backend work if those tools return. The legacy CMS pages (Auto Wayfinding, Floor plates → Plot Units) remain the place to edit pathways and plans. Plotting itself (Manual Plot, Auto Plot, M4) is unchanged. PYN_CONNECT_PROGRESS.md §24.

---

## Wayfinding mode, Plot on Map and Additional Stops — October 1, 2026

Phase 2m (`PYN_CONNECT_PROGRESS.md` §26, `context.md` §22) brought the Plotting / Wayfinding switch, the Plot on Map panel and Additional Stops to the screen, on the stored data and the page's state only. The gaps below are what the existing DB, the existing Rails behaviour and the existing JSON cannot carry. Everything else in the brief is implemented.

## Gap: M14. Saving wayfinding edits — points, paths, moves, links, detected and cleared paths (extends M1)

### Requirement
Move / Connect / Add Point / Erase, Clear Paths, Detect Paths and "link this stop to that point" change the hallway graph.

### Existing Rails Source Investigated
`HallwaysController#point_save`, `#update_point`, `#remove_point`, `#connect_leaf_point`, `#save_selected_point` (`maps.js` 229–353); `ShortestPath#get_unit_data` / `get_elevator_data` / `get_starting_point_data` / `get_building_starting_exit_point_data` (attachment to the nearest hallway).

### Existing DB Data
`hallways.x_plot / y_plot / next_points / parent_*`. **No column records which point a stop joins**: the CMS always attaches a stop to its nearest hallway.

### What Can Be Implemented in Next.js Today
All of it on the page: the points, paths, counts, "Stops Linked", the Not linked list and the routes follow every edit; a stored point moved reads "Moved on this page"; Detect has Undo; a reload restores the stored graph. A hand-made stop link overrides the nearest-point rule on the page.

### What Cannot Be Implemented
Keeping any of it, and keeping an explicit stop → point link at all.

### Why It Requires Backend Persistence/Business Logic
The hallway endpoints are CSRF-protected form posts (M1). An explicit link is new data and would change `ShortestPath`'s attachment rule.

### Future Requirement
JSON write branches on `HallwaysController` (or one Connect wayfinding endpoint) taking `LocalMapState`'s `tempNodes` / `tempEdges` / `nodeOverrides` / `hiddenNodes` / `hiddenEdges`; a decision on stop → hallway links (a column, or keep nearest-point and drop the Connect link).

## Gap: M15. Additional Stops: the stop types, the visitor instruction and "applies to one floor"

### Requirement
Add Additional Stop with 12 types (Entry Point, Exit Point, Elevator, Stairs, Ramp, Door / Gate, Blocker, Leasing Office, Restroom, Mail & Packages, Parking Access, Waypoint), Name, Building, Floorplate, the floor of a stacked floorplate, floors served + wheelchair access (Elevator / Stairs), smart lock (Door / Gate), a visitor instruction; Edit, Move, Unplot, Delete.

### Existing Rails Source Investigated
`ToursController#building_starting_point` (a GET that **creates** "Building X Entry / Exit" and its tour stop), `#update_building_starting_point`, `#add_elevator` (creates "Elevator N" with a default range), `ElevatorsController#edit / update`, `doors` (unit / amenity doors and floorplate access points).

### Existing DB Data
`building_starting_points` (one entry / exit per building, `floor`, `directional_text`), `elevators` (`floorplate_covering_range`, `building`, `directional_text`, lock fields), `doors` (`attached_with` Floorplate = access point, lock fields). Nothing for stairs, ramps, blockers, leasing office, restroom, mail, parking or waypoints; no "exit only"; no accessibility flag; no "one floor of the stack" for an elevator; no visitor instruction on a door.

### What Can Be Implemented in Next.js Today
The stored stops are listed and drawn (elevators, entry / exit, tour start, access points), can be moved, unplotted and placed again on the page. Every type can be added as a temporary stop with full validation, placed, edited, linked, routed through (Elevator / Stairs join floors, Blocker cuts hallways, Entry / Exit join buildings) and removed. Nothing is saved; the dialog says so.

### What Cannot Be Implemented
Saving a stop, or any of the types / fields above that have no column.

### Why It Requires Backend Persistence/Business Logic
Creating entry points and elevators goes through GET-with-side-effect and form actions; the other types and fields need a schema and the self-tour app would have to read them.

### Future Requirement
A stops model (type, position, floorplate, floor-only, floors served, accessible, lock, instruction) or columns on the existing tables, JSON write endpoints, and the Tour app reading them.

## Gap: M16. Detect Paths from the floor's artwork

### Requirement
"Detect hallways on" this floorplate / a building / all buildings.

### Existing Rails Source Investigated
No detection exists in the CMS (hallways are drawn on Auto Wayfinding; `svgAutoPlotting.js` detects units, not corridors). `floorplates.map_ocr_data` holds Textract text boxes only.

### Existing DB Data
Positions of doors, units, amenities and stops on the floor image; no corridor geometry.

### What Can Be Implemented in Next.js Today
A proposal from those positions (a corridor spine with a point opposite each stop), shown as temporary paths with a review card, Undo, and the multi-floorplate skip rule. Verified on Alderwood Floor 2: 37 points, 36 paths, 119/119 linked.

### What Cannot Be Implemented
Detection from the image itself (walls and corridors), and saving the result (M14).

### Why It Requires Backend Persistence/Business Logic
Image analysis of the floor plan is new processing (server-side or a vision service); persistence is M14.

### Future Requirement
A detection service over the floor image or SVG, and M14 to store its result.

## Gap: M17. Walking distance and time on the route

### Requirement
The reference prints "120 ft · about 1 min" and per-step feet.

### Existing Rails Source Investigated
`ShortestPath` / `DijkstraAlgo` weigh Euclidean pixels; no scale anywhere (gap T3).

### Existing DB Data
Image pixels only.

### What Can Be Implemented in Next.js Today
The route's length in floor-image pixels ("797 px along the plan · 16 points"), per-step pixels, floors, elevator rides, stairwells, outdoor walks.

### What Cannot Be Implemented
Feet, metres or minutes.

### Why It Requires Backend Persistence/Business Logic
A per-floorplate scale (or a calibration) has to be stored.

### Future Requirement
A `scale` (feet per pixel) on `floorplates` / `sitemaps`, entered once per plan.

## Gap: M18. Blockers, stairs and step-free routes in the self-tour app

### Requirement
Routes avoid blockers; "Step-free route · elevators, no stairs".

### Existing Rails Source Investigated
`ShortestPath` routes over hallways and elevators only; there are no stairs, blockers or accessibility flags in its graph.

### Existing DB Data
None for blockers or stairs.

### What Can Be Implemented in Next.js Today
Test shortest path honours blockers added on the page (links within the blocker's radius are cut, and the error names the blocker) and Step-free (stairs left out, its own error).

### What Cannot Be Implemented
The visitors' app following the same rules.

### Why It Requires Backend Persistence/Business Logic
The routing the Tour app uses is the CMS's (`*_for_mobile`); it needs M15's data and new rules.

### Future Requirement
M15, then blockers / stairs / accessibility in `ShortestPath`.

## Gap: M19. Floorplate building vs unit building in multi-building properties

### Requirement
Buildings scope routes between buildings through their entry / exit points.

### Existing Rails Source Investigated
`return_floorplate_path_for_multiple_buildings`: buildings are the **units'** `building` values, floorplates are keyed by floor and shared, elevators per building (`fetch_elevator_according_to_building`), one starting point per unit building.

### Existing DB Data
`floorplates.building` is often blank or named differently from `units.building` / `elevators.building` / `building_starting_points.building` (Trestle: floorplates "1" / "2", elevators "N-1" / "N-3", entries "N-3" / "S").

### What Can Be Implemented in Next.js Today
Routing per floorplate (the plan the user sees), elevators by floor overlap, a record named for another floorplate's building kept off that floorplate, outdoor links between entries of different buildings. Verified on Trestle.

### What Cannot Be Implemented
An exact replica of the CMS's per-unit-building passes when the names disagree.

### Why It Requires Backend Persistence/Business Logic
Which floorplate a unit building's floors are on is not stored; reconciling the names is data work.

### Future Requirement
Consistent building names (or a floorplate ↔ building mapping) across `floorplates`, `units`, `elevators` and `building_starting_points`.
