# Gaps — Amenities tab (Pynwheel Connect)

Branch `feature/amenities_improvements`, September 26, 2026. Companion to `feature_aminities_improvments.md` (the brief), PYN_CONNECT_PROGRESS.md §21 and context.md §17. Earlier inventory gaps (G15–G21) live in `gaps_properties_detail_feature.md` §4–§5 and are referenced, not repeated.

## What is real

Everything the amenities design draws that the database holds is shown from it: the amenity's name, type, building, floor, image, gallery, video link and button label, description, directional text, plotted state, stop-list state (`breezway_lock_visible`), lock provider (amenity column or its first door), and the property's `show_amenity_name`, `self_tour`, `enable_locks` and lock options. The only backend change is the read-only exposure of those values on the existing `AmenitiesController#index` JSON branch (three row keys, four meta keys). The entries below are the design elements no existing column, table or controller can supply, and the write paths.

## Gap: GA1. Named floors for amenities ("Lobby", "Rooftop", "Floor 12")

### Requirement
The design's cards, Floor filter and dialog use floor names: "Lobby", "Rooftop", "Floor 12"; the Floor input's placeholder is "e.g. Lobby".

### Existing Rails source investigated
`amenities.floor` (integer) and `amenities.building` (string), set by `amenities/edit.html.haml` (a select over the plotted floorplate's `floors`, else a text field cast to integer); `floorplates.name` / `floor_name` / `range` for the plate an amenity is plotted on (`amenityable = Floorplate`).

### Existing DB data
Integers only for the amenity's own floor (e.g. 1, 2, 5, 8 on property 2157). A floorplate can carry a name ("Lobby") but the amenity form does not store which named floor an amenity is on beyond that plate.

### Why it cannot currently be exposed / used
There is no floor-name column or floors table for amenities; a name can only be guessed from the plotted floorplate, and an unplotted amenity has no plate.

### Why a minimal JSON / controller change is insufficient
Nothing exists to serialize. Deriving "Lobby" from a plate's `floor_name` when the amenity's integer floor is inside the plate's range would be new logic that the CMS itself does not apply anywhere.

### Future backend requirement
A floor-name lookup (per building + floor number) or a name column on `amenities`, maintained by the amenity form.

### Current frontend behaviour
The amenity's own floor reads "Floor N"; when it has none, the plotted floorplate's name is used (a numeric name also reads "Floor N"); otherwise "—" and the "No floor" filter option. The dialog's Floor placeholder is "e.g. 3".

## Gap: GA2. Tour publish state in the header (= G16)

The design's "4 stops staged · not yet published" has no CMS state; the header shows the real stop count. See `gaps_properties_detail_feature.md` G16.

## Gap: GA3. Every write on the tab (= G20)

### Requirement
Add / Edit / Delete Amenity; upload, replace, crop and remove the amenity image; add, replace, remove and reorder gallery images; the "Show amenity name on webpages" switch; the lock provider and its lock mapping.

### Existing Rails source investigated
`AmenitiesController#create` (`AmenityImagesJob`), `#update` (`permit!` + `update_locks` / `assign_lock`), `#destroy` (also deletes `TourStop`s and `VisitedStop`s), `#crop_amenity_image`, `#saveAmenityGallery`, `AmenityGalleriesController`, the sortable gallery (`rails_sortable`), `communities#update_amenity_toggle`, `#update_amenity_door_lock`. All are HTML form posts or JS responses; none answers JSON.

### Why a minimal JSON / controller change is insufficient
These are the flows the read-only rule forbids, not missing data. See `gaps_properties_detail_feature.md` G20 for the shared write-path gap.

### Current frontend behaviour
Save / Add close the dialog (its footer says so); Delete and Remove image open the shared confirm with no action; Replace / Upload open the dialog; the header switch is an indicator. The e2e spec asserts zero non-GET requests.

## Gap: GA4. Uploaded-file metadata (= G19)

The dialog's image row shows the stored file name and type only; no size or dimensions are stored for `amenities.image` or `amenity_galleries.image`. See G19.

## Frontend limitations that are not backend gaps

- **GA5. Inline video playback.** The CMS stores a URL (`video_link`: Matterport, Vimeo, YouTube, Realync share links seen in the data) and a button label. The legacy web page opens it in an iframe modal (`openAmenity3DTourModal`); no provider or embed metadata is stored. Connect shows the label as a link that opens the stored URL in a new tab. An in-page player would need per-provider embed handling in the frontend, which the brief did not ask for; no backend change is involved.
- **Rich text.** `description` and `directional_text` are wysihtml5 HTML. Connect's dialog shows them as plain text in a textarea (as the floor plan and unit dialogs do); the prototype's toolbar strip is decorative.
- **Lock device ("Select the lock") and Access Code.** The legacy form maps a Latch / Zerv / Igloohome / EdgeState / Dwelo lock to the amenity's door and takes an access code. The design has no field for either; `lock_devices` already exists on `units.json` meta and could be reused by the dialog when a field is designed. The access code is deliberately not exposed.
- **Tour Visiting Order Number.** A legacy form field with no counterpart in the design; not exposed. Units expose the same column as `tour_order`, so the one-line addition is known if a field is added.
- **Sort order.** The legacy page lists newest first (`order(id: :desc)`); Connect sorts by name, as the other three tabs do.
