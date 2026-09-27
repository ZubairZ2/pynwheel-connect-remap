# Tour Setup — gaps that need backend work (September 26, 2026)

**Scope of this file.** Only what the Connect Tour Setup screen (`/properties/:id/tour-setup`, numeric ids) cannot do with read-only access to the existing CMS plus the minimal JSON exposure of phase 2i (`PYN_CONNECT_PROGRESS.md` §22). Everything the screen *does* do — list the community tour's stops in their sort order with their plotted state, building, floor, source, lock and stored directional text; list the elevators with their galleries, Latch banks, lock provider and tour-stop state; the routing preview over the stored pathway graph and the building starting points; reorder, hide, edit, add and remove stops, gate and ungate elevators, add photos and banks, all on the page — is documented in `context.md` §18, not here.

**Rule in force.** The frontend never mutates the database. Every write-shaped action below is visible in the UI, applies to the page's local state, says so, and sends nothing. The read-only network audit (0 non-GET requests through every action) is in the progress doc.

---

## Gap: T1. Saving the tour: stop order, visibility, stops added or removed

### Requirement
Move up / down, Hide / Show, Add Stop, Remove, and the "Node n" numbering that follows the order.

### Existing Rails Source Investigated
`ToursController#sort_stops` (`POST /communities/:id/tours/sort_stops`, the `rails_sortable` drag order, keyed per building + floor in `tours.sort_hash`), `#display_stop` (toggles `tour_stops.display_stop`), `#ajaxplottourstoppoint` (creates `TourStop` rows for `unit:` / `amenity:` / `elevator:` ids and copies the record's x/y into `latitude/longitude`), `TourStopsController#destroy` (destroys the stop, its `Path`/`PathPoint`s and `VisitedStop`s, and the elevator or entry point itself when the stop is one), `#resetTourStopPoint`.

### Existing DB Data
`tour_stops` (`tour_id`, `stop_type`, `stop_id`, `sort`, `display_stop`, `name`, `latitude`, `longitude`), `tours.sort_hash`.

### What Can Be Implemented Locally
All of it, on the page: the list reorders, a hidden stop shows "Hidden from tour" and drops out of the routing endpoints, an added stop is a real unplotted-or-plotted unit or amenity of the property marked "Added here", a removed stop leaves the list. The counts in the tabs and the header follow. A reload restores the stored tour.

### Why Backend Work Is Required
Every one of these is a form/AJAX POST behind `protect_from_forgery`, with side effects that belong to the legacy flow (path cleanup, `VisitedStop` cleanup, destroying the elevator or entry point record). The Connect proxy holds no CSRF token and Connect is read-only by decision.

### Future Backend Requirement
JSON branches on `sort_stops`, `display_stop`, `ajaxplottourstoppoint` and `tour_stops#destroy` (or one Connect tour endpoint reusing the same model code) with the CSRF strategy of gap G6/R5. The payload the screen would send already exists in `TourLocalState.stops` (`kind`, `recordId`, order, `visible`).

---

## Gap: T2. The AI Concierge talking point

### Requirement
The design's "AI Concierge Talking Point" textarea on every stop card and in the Add / Edit Stop dialogs.

### Existing Rails Source Investigated
There is no AI concierge in the CMS. What the tour app reads out at a stop is `TourStop#stop_directional_text`: a unit's `units.stop_description`, else the record's `directional_text` (amenities, elevators, building starting points), else its `description` (`TourStop#get_stop_directional_text` falls back to "Follow the map below … and proceed to …"). Those are edited on the unit form (`units#update`), the amenity form (`amenities#update`), the elevator form (`elevators#update`) and the entry point form (`building_starting_points#update`).

### Existing DB Data
`units.stop_description`, `units.description`, `amenities.directional_text` / `description`, `elevators.directional_text` / `description`, `building_starting_points.directional_text` — HTML as stored (wysihtml5).

### What Can Be Implemented Locally
The textarea shows the stored text as plain text (`plainText`) and can be edited on the page; the placeholder says which column it is.

### Why Backend Work Is Required
Saving is a write to four different forms, and an "AI Concierge" text distinct from the directional text has no column.

### Future Backend Requirement
Decide whether the talking point *is* the directional text (then a JSON write on the four update actions) or a new per-stop column.

---

## Gap: T3. Distance and dwell time per stop

### Requirement
"240 ft" and "4 min" on every stop card; Dwell time in the Add / Edit Stop dialogs.

### Existing Rails Source Investigated
`ShortestPath` (`app/helpers/shortest_path.rb`) computes Euclidean pixel lengths between hallway nodes for the route but stores none of them; `tour_settings.length_stay_limit` is a whole-tour limit (45 minutes), not per stop; no distance or duration column exists on `tour_stops`.

### Existing DB Data
None per stop. Hallway coordinates are image pixels with no real-world scale on any table.

### What Can Be Implemented Locally
The cards print "—" with a title explaining why; the dwell time typed in the dialog is kept on the page and shown as "n min". The Routing tab reports route lengths in map pixels.

### Why Backend Work Is Required
Feet need a scale per floor image, and per-stop dwell time needs a column.

### Future Backend Requirement
A pixels-per-foot value per floorplate/sitemap (or a real-world scale on the SVG) and a `tour_stops.duration_minutes` column the tour app also reads.

---

## Gap: T4. Elevator banks: gating, photos, adding and removing banks

### Requirement
"Smart-lock gated" toggle, Add Photo (and reorder / remove photos), Add Elevator Bank, Delete elevator.

### Existing Rails Source Investigated
`ElevatorsController#update` (lock provider, access code, `assign_lock` through `AssignLocksHelper`), `#save_elevator_gallery` / `ElevatorGalleriesController` (photos), `#create` / `ToursController#add_elevator` (creates the elevator at 10/40 with a default range and its `TourStop`), `#destroy` (destroys the tour stop and `VisitedStop`s), `ElevatorBank#assign_multiple_locks` (Latch banks re-point the Latch locks and set `lock_provider`).

### Existing DB Data
`elevators` (`name`, `description`, `directional_text`, `floorplate_covering_range`, `building`, `lock_provider`, `access_code`, `image`), `elevator_galleries`, `elevator_banks` (`name`, `position`, `lock_type`, `lock_name`, `lock_id`), the lock tables (`latch_locks`, `remote_locks`, …).

### What Can Be Implemented Locally
The toggle flips the pill between "Gated · {provider}" and "Open access" on the page; Add Photo previews a local file in the gallery (object URL, never uploaded); photos reorder and drop on the page; Add Elevator Bank adds a card marked "Added here"; Delete hides the card. The stored lock provider, banks, gallery, directional text and description are all shown from the CMS.

### Why Backend Work Is Required
All writes, several with lock-vendor side effects (`assign_lock` talks to Latch / Dwelo / Zerv / Igloohome / EdgeState).

### Future Backend Requirement
JSON branches on the elevator, gallery and bank actions with the CSRF strategy of G6/R5; the vendor calls stay where they are.

---

## Gap: T5. Publish to Touch App (= M2 / G16)

The CMS has no publish action or state; the Touch and Tour apps read the live tables. The header therefore shows the real stop count and how many are hidden ("20 stops · 2 hidden from the tour") instead of "4 stops staged · not yet published", and Publish opens a dialog that says publishing from Connect is not available. See `gaps_map_plotting_feature.md` M2 and `gaps_properties_detail_feature.md` G16.

---

## Gap: T6. Route Preview as the CMS would route

### Requirement
"Compute Multi-Floor Route" between two chosen stops.

### Existing Rails Source Investigated
`AutomatePlottingController#shortest_path` routes the *whole tour* (start → every visible stop in sort order → back), through `ShortestPath` / `DijkstraAlgo`; it takes no "from / to" pair. `WayfindingController#floorplate_path_points` (mobile API) serves a floorplate's path points to the tour app.

### Existing DB Data
`hallways` (nodes, `next_points`), `elevators` (`floorplate_covering_range`), `doors`, `building_starting_points`, `tours.x_plot/y_plot`.

### What Can Be Implemented Locally
`stopRoute.ts` runs the same construction the CMS uses per floor (each stop, elevator and entry point attaches to its nearest hallway node; Dijkstra over the hallway links; an elevator serving both floors joins them) between the two chosen stops, and reports the legs, hops, pixel length, floor and building changes and the elevators ridden. The Map & Plotting screen still runs the real CMS algorithm for the whole tour ("Run Algorithm (Animated)").

### Why Backend Work Is Required
A stop-to-stop route from the CMS's own algorithm would need a new read endpoint (`shortest_path` with a from/to pair), and the CMS records no real-world scale for feet.

### Future Backend Requirement
Optional: a from/to variant of `shortest_path` so the preview and the tour app agree exactly; a scale per map for distances in feet.

---

## Gap: T7. Files in a development database restored from staging

Not a Connect gap, but the reason elevator photos and the tour stop images read "Photo unavailable" locally: CarrierWave stores to disk in development (`storage Rails.env.development? ? :file : :fog`) while this database's files live on S3. The floor images use their S3 copy (`standard_image_url`); elevator and gallery images have no such copy, so their URLs point at the CMS host, which has no file. On staging and production the same records serve from S3 and render.

**Update, September 27, 2026 (branch `feature/inventory_properties_issues`):** resolved. `Connect::UploadUrl.upload` now answers the S3 copy of any upload whose file is not on this machine (the bucket the property's `standard_image_url`s name), so the wayfinding JSON carries S3 URLs for elevator images and galleries and Tour Setup renders them locally; nothing changed for staging and production, where the uploader's URL already was that S3 URL (PYN_CONNECT_PROGRESS.md §23).

---

## Not gaps (decisions recorded elsewhere)

- **View on Plan / Plot on Plan** open the Map & Plotting screen on the stop's floorplate with its pin selected, or armed for plotting (`?level=&pin=&arm=1`); nothing is saved (M1 covers plotting).
- **Lock Vendors** opens the Integrations Hub preselected on the property (a demo screen, phase 2).
- The legacy Tour Setup page's **manual path drawing** (`draw_map_line`, `paths` / `path_points`) is not reproduced: the auto-wayfinding page does not use it (`context.md` §16).
