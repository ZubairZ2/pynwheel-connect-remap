# R&D: Auto-Wayfinding and Hallway Detection for Beans SVG Maps

**Date:** October 25, 2026 · **Branch:** `improvements/beans-street-hallway-detection` (from `main` `362e3d7da`; see §13 for the completion pass) · **Brief:** "Improve Auto-Wayfinding and Hallway Detection for Beans SVG Maps"

Everything below was observed on the running local stack (Connect `next dev` on :3007 → the CMS puma on :3020 on the isolated production clone `pynwheel_audit_clone`), on the real production exports downloaded from the production bucket, and on the clone's real rows. Nothing was written to production. Evidence files are under `wayfinding_rnd/` (screenshots, before/after renders, metrics JSON, the harness scripts).

---

## 0. Outcome in one paragraph

Detect Hallways traced *drawn centrelines* (a stroked `Path` polyline) and inferred corridors inside every building outline; on a garden-style Beans property that gave sidewalk fragments plus a ring around each building (the margin between the units and the outline), and nothing on the roads and parking lots that visitors actually walk. On a flattened export with no layer names it gave up ("no named layers"). The replacement implemented and validated here reads the **walkable area** (roads, parking, sidewalks, decks) from the map — by Beans layer names when the export has them, by fill colour when it does not — rasterises it, skeletonises it to its medial axis and builds the network from that. On Cypress Terra the network now lies on pavement 96 % of its length instead of 59 %, inside buildings 0 % instead of 40 %, covers 62 % of the walkable surface within 12 units instead of 18 %, is one connected piece, joins all 113 units, and routes between every pair of sampled units along pavement. Jennifer Demo FP's flattened floor plan goes from nothing to 65 points / 68 paths through its corridors and the surrounding streets, every point a proposal to review. Two further gaps found on the way — the saved SVG-space network never reappeared on the page after a reload, and the Tour App's router ignored SVG-space rows entirely — are fixed too, and a real route now comes out of the Tour App service for Cypress Terra (unit 13102 → unit 6102, 624 px, 98 % on pavement).

---

## 1. Current-state analysis

### 1.1 The workflow behind the button

| Step | Where | What happens |
|---|---|---|
| Click *Detect Hallways → This floorplate / All floorplates* | `pyn-connect-web/src/core/hooks/useMapWayfinding.ts` `runDetect` → `detectOne` | For each floorplate in scope: if the plate already has points (stored or on the page) only Auto-Connect runs ("Existing paths kept"); otherwise the floor SVG is fetched. |
| Fetch | `GET /api/properties/:id/plan-svg?floorplate=<id>` and, for a Beans property, `…?background=1` | Connect's route handler resolves the file through the CMS's floorplates listing (`Connect::UploadUrl`) and streams the SVG text. Observed live for 8005: `plan-svg?floorplate=4606` and `plan-svg?background=1`, both 200. For 1412 only `plan-svg?floorplate=3638` (not a Beans property, no background). |
| Parse | `parseSvgTree` (DOMParser) | A plain element tree; `href`/`xlink:href` dropped (embedded rasters can be megabytes). |
| Stops | `elementCentres` on the units' `pointer_data.id` | Each plotted unit becomes a stop at its polygon's centre. |
| Detect | `detectHallways` in `src/core/utils/wayfinding/hallways/extract.ts` | **As shipped:** `detectSvgStructure` finds layers by *id keywords* (`Walkways`/`Sidewalk`/`Corridor`/`Hallway` strong, `Path` weak; `Footprints` or `Building outline(s)` as footprints; `Units`/`Amenities`/… as rooms). The walkway shapes are flattened and traced as drawn (`buildWayfindingGraph`, `bridgeComponentGaps`); corridors are inferred *inside* the footprints from "footprint minus rooms" (`inferCorridors`: grid, opening, Zhang–Suen thinning, spur pruning). The two graphs are unioned and bridged, stops are snapped onto the nearest edge, Auto-Connect adds k-NN links. |
| Page state | `detectionPatch` (`hallwayEdits.ts`) | Points become temporary page nodes in `svg` space; links go to `wfLinks`. |
| Save | `graphDiff.ts` → `PUT /communities/:id/wayfinding_graph.json` → `Wayfinding::GraphSave` | One payload per space; rows written to `hallways` / `hallway_edges` / `hallway_attachments` with `space: 'svg'` (viewBox units, no icon offset). |
| Routing | `Wayfinding::GraphBuilder` → `RouteService` → `TourApi::Routing` | The Tour App's graph. |

### 1.2 Confirmed root causes (not hypotheses)

**R1 — The engine looked for a drawn centreline, not for the walkable area.** Beans draws the sidewalk network as one stroked polyline (`Path`, 4 units wide, pattern stroke) and the roads and parking as *filled* polygons (`Road`, `#7F7E78`, with 530 white stall stripes in `Parking`). The shipped detector treats only the stroke as walkable ("weak walkway match") and never reads the road fill, so the drive loop, every parking lot and the pool deck were missing (figure `evidence/8005_f1_base.jpg`). Verified in code (`detectLayers.ts`: `WEAK_WALKABLE = ['path', …]`, no road/parking vocabulary; `OBSTACLES`/`FOOTPRINTS` only) and on the live page (214 points / 322 paths, identical to the harness).

**R2 — Corridor inference ran inside every building outline, whatever the width.** On Cypress Terra each building's outline minus its unit polygons leaves a 2–4-unit margin, not a corridor; the opening radius (`minHalfWidth = max(1.5, 0.0015·diagonal) = 2.5`) kept it, so every building got a *ring* of pending "corridor" points around its perimeter — the blue rings in the brief's screenshot. Measured: with the shipped gate 14 runs / 1,746 units of "corridor" on floor 1; at a half-width gate of 5 units, none (`wayfinding_rnd/scripts/indoor.ts`). The real indoor corridors of John Demo (median half-width 11–13 units) survive that gate.

**R3 — Jennifer Demo FP floors 1–3 is a flattened export, and the engine had no fallback.** Floorplate 3638 (`1350_N_Wells_St__Chicago__IL.svg`) has 882 paths and 108 ids, all of them `filter…`/`pattern…`/`clip…` definitions: no `BG`, `Units`, `Road` or `Walkways` group (`svg_tree.py`). `detectSvgStructure` therefore reports `namedLayers = 0` and `detectHallways` returns `no-layers`; the card says "No hallway found". The file *does* draw the pavement: one `#7F807B` road polygon, one `#CCC5B5` sidewalk ring, one `#C1C1C1` floor slab with `#837B6D` walls and `#F0E3D0` rooms painted over it (`svg_fills.py`) — exactly the Beans palette the named exports use.

**R4 — A saved SVG-space network disappeared on reload.** `generateLevelGraph` (`mapNodes.generator.ts`) placed stored hallways only when `space === 'raster'` and drew stored edges from `next_points` only on the raster layer; the SVG layer showed page junctions only. Observed live: after *Save changes · 709* the clone held 247 `space='svg'` rows and 349 edges, and the reloaded page showed "0 points · 0 paths". `graphDiff.ts` likewise built moves/deletes of stored nodes only for raster space, so a saved SVG network could not be edited and re-saved either.

**R5 — The Tour App's router never read SVG-space rows.** `Wayfinding::GraphBuilder#load_rows` loaded `Hallway.where(space: 'raster')` and `HallwayEdge.where(space: 'raster')`, every level was `space: 'raster'`, and units needed `x_plot > 0 OR y_plot > 0` with `floorplate_id = level`. Cypress Terra's units are pointer-placed (`pointer_data`, `x_plot = 0`, `floorplate_id NULL`) and its floorplates have no image (`width`/`height` NULL). Observed with `rails runner` on the clone after the save: `hallway nodes: 0; unit nodes: 0` and the route answered `unknown_endpoint`. `ReprojectPlate` would have converted the rows to raster, but only with an `svg_to_image_transform`, which an image-less floorplate can never have.

**R6 — Connect saves a detection as an ordinary edit.** `graphDiff.ts` sends `origin: 'edit'` for every save, so `GraphSave`'s detect rules (idempotent `hallway_detection_runs` row, merge onto existing nodes, tombstones, server-side undo) are never exercised; the clone has no `hallway_detection_runs` row after the save. Not fixed here (it is a save-protocol decision), listed in §11.

**Observations that are not defects:** the shared background is read beside the floor file and mapped through the two viewBoxes (`viewBoxMap`; both `0 0 1412 932` on every export seen); repeated detection on a plate with points keeps them ("Existing paths kept", by design); the plotting map and the wayfinding map of Cypress Terra are the same two files (`Floor_N_noBG.svg` over `bg.svg`), see §4.1.

---

## 2. Failure analysis

### 2.1 Cypress Terra (8005) — incorrect, incomplete network

| Symptom in the brief's screenshot | Cause | Evidence |
|---|---|---|
| Paths run around each building's perimeter | R2: ring of inferred "corridor" points in the margin inside `Building_outline` | 40 % of the shipped network's length lies inside building fills (`metrics/8005_f1.json`, baseline run of the shipped code: `edgeSamplesInBuilding 43 %`) |
| Roads, drive loop, parking aisles, pool deck not covered | R1: only the stroked `Path` sidewalk is read | coverage of the walkable surface within 12 units: 16 % |
| Two pieces; a sample route between distant units fails | the sidewalk fragments and the rings do not meet | shipped code: 2 components, 0 of 3 sampled routes |
| Lines are not centred on the street | the sidewalk stroke hugs the building side of the road | centring ratio 0.73 (1.0 = medial axis) |

### 2.2 Jennifer Demo FP (1412) — zero detection

Eligibility first (§3): Tour-enabled **yes** (`self_tour = t`); flagged as Beans **no** (`is_beans_svg = f`, `web_map_type = 2d-map`, no background); the floors 1–3 file is Beans-style by its address file name and palette but a **flattened** export. The detection is empty because of R3 — the file has no named layer at all, and the shipped engine has no reading other than layer names. It is not an API error (the `plan-svg` request answers 200 and the file renders), not a coordinate problem (viewBox `0 0 1412 932` like every other export), not backend filtering (detection runs entirely in the browser; nothing is sent). Its other two SVG floorplates are different cases: 3659 (floors 4–5, Las Vegas export) has `Road`/`walkway`/`Building Outlines` and detected 80 points as shipped; 1865 (floor 5) is a whole-property Boca Raton export beside a Penrose floor image and the page keeps that floor on the image.

With the street pass the same file yields **65 points / 68 paths** in colour mode on the live page ("the file has no named road, parking or walkway layer, so the pavement was recognised by its fill colours — the points are proposals to review"), one connected piece, 99 % of its length on pavement, through the interior corridors and around the block (`evidence/live_1412_detect_street_pass.jpg`, `evidence/1412_3638_poc.jpg`). No unit of floors 1–3 is placed on this SVG (the 167 units of floors 2–4 are plotted on the Penrose images), so "0/0 stops linked" is correct and the harness instead uses the file's 173 beige room shapes as synthetic stops: 145 of 173 within reach, three sampled room-to-room routes all on pavement.

---

## 3. Real-data inventory (clone of production, read-only queries)

| Count | What |
|---|---|
| 146 | properties with `is_beans_svg = t` |
| 2 | of those with `self_tour = t`: **8005 Cypress Terra**, **7860 Savannah place - COPY** |
| 60 | Beans properties with at least one SVG-only floorplate (no floor image) |
| 214 | SVG-only floorplates in all |

| Property | Tour | Beans flag | Map assets | Verdict for the test set |
|---|---|---|---|---|
| **8005 Cypress Terra** (Alliance, 198) | yes | yes | 3 SVG-only floorplates (`Floor_N_noBG.svg`, 1412×932) + shared `bg.svg`; 333 pointer-placed units; 1 tour, 0 stops; 0 amenities, doors, elevators, entry points | **A — primary** |
| **1412 Jennifer Demo FP** (Pynwheel Inc., 44) | yes | **no** | 4 image floorplates (Penrose), 3638 = flattened Chicago export (SVG only), 3659 = Las Vegas export with `walkway` (SVG only), 1865 = image + unrelated Boca Raton export | **B — included**: the flattened file is the zero-detection case the brief names; it fails the Beans-flag condition, so it is reported as a flattened-export case, not as a Beans regression |
| **7860 Savannah place - COPY** (783) | yes | yes | 1 SVG floorplate (`Serenity.svg`) whose `BG` is one `<rect>` filled with an embedded JPEG (`Serenity-Lake-Wales_Site-Map-1.jpg`) + 116 unit polygons; 102 pointer-placed units | **Qualifies by flags, has no street geometry**: the only Beans + Tour property besides Cypress Terra, but its "SVG" carries a raster background. Detection reports "no road, parking, walkway or deck layer, no pavement-coloured shape…" (correct: nothing to read). Listed as a limitation (§11). |
| **1411 John Demo** (44) | yes | no flag, Beans files | 6 floorplates each with PNG + `optimized.svg` (Beans: `BG/Road`, `Path`, `Parking`, `Building_Outline`), stored raster hallways | **C — generalisation check**: Beans geometry on a tour-enabled property |
| 7955 Washington Way, 7954 Sterling College Station | no | yes | `bg.svg` + `Floor_N_noBG.svg` / `optimized.svg` | **extra generalisation checks** on two more garden-style Beans backgrounds (not tour-enabled; used only to test the detector) |

### 4.1 Cypress Terra's two-map architecture

- The CMS row carries `background_svg_image = 1790021768-bg.svg` (`communities`) and each floorplate `svg_image = …Floor_N_noBG.svg`, `image` empty, `svg_metadata {1412, 932}`.
- **Plotting and wayfinding use the same pair of files.** Both tabs draw the floor file over the background (`plan-svg?floorplate=` and `plan-svg?background=1`); Detect Hallways receives the floor tree and the background tree and merges the background's shapes into the floor's frame through `viewBoxMap(bg.viewBox, floor.viewBox)` — identity here, both `0 0 1412 932`. There is no second coordinate system; the only separation is that the units live in the floor file and the streets and buildings in the background.
- **Saving** writes the detected rows against the floorplate (`parent = Floorplate 4606`, `space = 'svg'`, viewBox units: observed x 181…1120, y 2…932). The background has no rows of its own; it is read-only geometry.
- **Loading** those rows back is what R4 broke and what this branch fixes; after the fix the reloaded page shows the stored 247 points / 349 paths on the SVG layer and routes on them (530 SVG units, 20 points, 1101 → 13112), with *Save changes* disabled because nothing is pending.
- **The Tour App** receives the level with `space: 'svg'` and `svg_size 1412×932`; its map base uses the SVG viewBox as the frame when a level has no image (`tour-app/src/map/mapBase.ts` `frameOf`), so SVG-unit routes land on the same pixels. Rendering in the Tour App itself was not driven in this session (verified by reading the code only).

---

## 4. SVG findings (the real exports)

| File | viewBox | Named structure | Walkable geometry | Buildings | Notes |
|---|---|---|---|---|---|
| 8005 `bg.svg` (Cypress Terra) | 0 0 1412 932 | `g#BG` → `Road`, `Road_name`, `Green_area`, `Path`, `Parking`, `Building_outline`, `BASE`, `Pool_base`, `ST`, `PATH`, `Building_number`, `TRASH`, `Trees`, `POOL`, `North` | `Road`: 1 filled `#7F7E78` polygon (roads **and** parking surfaces) + white outline; `Path`: 1 stroked polyline, width 4, pattern stroke (sidewalk); `BASE`/`Pool_base`/`PATH`: pattern-filled pool deck | `Building_outline`: 13 buildings, filled `#F1DFD1` + black 0.5 outline twin | `Parking`: 530 white 0.5 stroke-only stall stripes (paint); `ST`: 26 stair icons at entrances; `Green_area`: pattern fills drawn **over** the road (islands) |
| 8005 `Floor_N_noBG.svg` | same | `Amenities` (16 named groups, polygon + text) and `Units` (13 `Building_N_2` groups, 113/110/110 polygons with Inter labels) | none | none | the floor file alone has nothing walkable (`no-hallway-layer`, correctly) |
| 1411 `optimized.svg` (John Demo) | 0 0 1419 938 | `BG` → `Road`, `Path`, `Neighborhood`, `Parking` (2,094 stripes + 168 filled `#7F7E78` lots), `Grass`, `Road_parking`, `Pool_base`, `Building_Outline`; `Amenities`; `Units/Floor_2_4` | `Road` fill + `Path` (filled `#D9D9D9` and stroked width 10) + filled parking lots | one `Building_Outline` (a courtyard block) + `Neighborhood` (`#C0C0C0`) | full export: background and floor in one file |
| 1412 3659 (Las Vegas) | 0 0 1412 932 | `BG` → `Road`, `Green Area`, `walkway` (`Pathway` filled + `Walkway` stroked 7.5), `Building Outlines` (`#C1C1C1`), `PARKING`, `Group 138` (`#69CBDB` canals) | `Road` fill + `walkway` | 7 outlines | unnamed `Group 137/138` resolved by colour (water → blocked) |
| 1412 1865 (Boca Raton) | 0 0 1412 932 | `BG` → `Walkways` (12, stroked 7–16 and filled), `Parking`, `Outline Floor 1`, `W YAMATO ROAD`, `Internal Road`, `Road`, `Cover Rd Gaps`, `External Buildings`, … | roads, internal roads, walkways, parking lots | `Outline Floor 1`, `External Buildings` | road names used as layer names (`W YAMATO ROAD`) |
| 1412 3638 (Chicago, flattened) | 0 0 1412 932 | **no named groups**; 108 ids all `filter/pattern/clip` | by colour only: `#7F807B` road, `#CCC5B5` sidewalk, `#C1C1C1` slab | `#837B6D` walls, `#F0E3D0` rooms, 421 black label glyph paths | Figma "flatten" export |
| 7955 `bg.svg`, 7954 `bg.svg` | 0 0 1412 932 | `BG` → `Road`, `Walkways` (closed stroke 3) / `Path` (stroke 3), `Green_Area`, `POOL_BASE`/`Pool_base`, `Parking` (white filled stall shapes), `Buildings_Outline` / `Building_out_line` | as Cypress | 26 / 31 outlines | 7954 wraps `BG` in an unnamed group; `Building_out_line` spelling |
| 7860 `Serenity.svg` | 0 0 1412 932 | `BG/Floor_1` = one `<rect>` with a JPEG pattern; `Units` polygons | **none** (raster) | none | the background is a photo |

**Conventions that hold across every Beans export seen:** the root group is the property address; `BG` holds the base map; walkable layers are named with a road/parking/walkway/path/deck word and filled `#7F7E78`/`#7F807B` (roads) or `#E0E2D6`/`#D9D9D9` (walkways, also stroked 3–16 wide); buildings are `Building…outline` groups filled `#F1DFD1` or `#C1C1C1` with a stroked twin; units are beige (`#F0E3D0`, `#EECEA5`, `#EDCFA4`); stall stripes are white hairline strokes; islands are pattern fills drawn over the road; the root `<svg>` carries `fill="none"` so stroke-only paths have no fill. **Conventions that do not hold:** the exact spelling of layer names (`Building_outline`, `Building Outlines`, `Buildings_Outline`, `Building_out_line`, `Outline Floor 1`), the presence of a `Parking` fill (Cypress: inside `Road`; John Demo: separate filled lots), whether a walkway is a stroke or a fill, and — in flattened exports — whether anything is named at all. The viewBox is always `0 0 1412 932` or `0 0 1419 938`; no transforms on the walkable geometry; filters are drop shadows on groups.

---

## 5. Approaches compared

| Approach | Centreline accuracy / coverage | Connectivity | Handles wrong + zero cases | Fit to Beans files | Robustness | Cost | Complexity / risk |
|---|---|---|---|---|---|---|---|
| **As shipped:** trace drawn walkway strokes + infer corridors inside every outline | sidewalk only; rings inside buildings; roads and parking never covered | fragments | no (needs a named walkway layer; rings on garden-style) | partial | low | 150–250 ms | — |
| Trace explicit street geometry (fill outlines) | a filled road's *outline* is the kerb, not the centre | — | no | — | — | — | rejected: outlines are the wrong line |
| Skeletonise walkable polygons (medial axis of roads + parking + walkways + decks), by layer names | on the medial axis by construction; covers every surface | one piece after small-gap bridging | fixes the Cypress case; not the flattened file | good — every Beans export names these layers | names vary → vocabulary + suffix rules | 0.6–0.8 s | moderate; reuses the existing raster primitives |
| **Skeletonise walkable area with painter's rasterisation, roles by layer name *then* by fill colour** (chosen) | as above | as above | **both**: layer mode for named exports, colour mode for flattened ones, each reported on the card | good | handles missing names, unknown inner names (`Vector 12`), paint over roads, stroke vs fill walkways | 0.6–1.7 s on 1412×932 at 1-unit cells | moderate; isolated in one new module; proposals flagged when colour-inferred |
| Graph from the drawn kerb lines (Voronoi of road outlines) | equivalent to the medial axis but needs clean closed outlines | needs exact topology | no (flattened file) | fragile: outlines are split, duplicated (shadow twins) | low | similar | higher |
| Obstacle-aware path generation (A* between stops over the free space) | finds *a* path, not the street centreline; no reusable network | per query | — | — | — | per query | different product (the Tour App routes on a stored graph) |
| Hybrid: semantic layers where present, geometry inference otherwise | this *is* the chosen approach | | | | | | |

Why the chosen approach also answers the brief's robustness questions: irregular and curved streets are handled by the raster (no polygon algebra); variable widths by the clearance-relative spur pruning; intersections become skeleton junctions; overlapping shapes by painter's order; disconnected regions by the two bridging passes (short gaps never through a building; wider gaps allowed through a building but flagged `door_…`); missing metadata by the colour fallback; malformed geometry by the existing path parser (yields what parsed before the error) and the `no-hallway-layer`/`no-layers` diagnostics; viewBox/transforms through `accumulatedMatrix` and `viewBoxMap`; external raster assets are ignored (`image`, pattern fills) and reported when nothing else is drawn.

---

## 6. Proof of concept — results

All runs: `wayfinding_rnd/scripts/harness.ts` (bundled with esbuild, run with node; it imports the engine from `pyn-connect-web/src` and the test SVG reader from `tests/e2e/helpers`). Stops are the clone's pointer-placed units aimed at their polygon centres (8005, 1411), the `Units` layer polygons where the clone places nothing on the SVG (3659, 1865, 7955, 7954), the beige room shapes for the flattened file. "Shipped" is the engine as merged on October 10 (first harness run, unchanged code); "proposed" is the engine on this branch.

| Map | Shipped: points / paths · on pavement · inside buildings · coverage ≤12 u · pieces · stops joined · sampled routes | Proposed: the same |
|---|---|---|
| **8005 Cypress Terra floor 1** | 214 / 322 · 56 % · 43 % · 16 % · 2 · 113/113 · **0 of 3** | **247 / 349 · 96 % · 0 % · 62 % · 1 · 113/113 · 3 of 3 (98 / 92 / 97 % on pavement)** |
| 8005 floor 3 | 211 / 320 · 56 % · 43 % · 16 % · 2 · 110/110 · 0 of 3 | 247 / 349 · 96 % · 0 % · 62 % · 1 · 110/110 · 3 of 3 |
| **1412 Jennifer floors 1–3 (flattened)** | **nothing** (`no-layers`) | **141 / 141 (65 / 68 on the live page, where no stops split the edges) · 99 % · 0 % · 29 % (60 % within the local clearance) · 1 · 145/173 rooms · 3 of 3 (100 %)** |
| 1412 floors 4–5 (3659) | 80 / 86 · 95 % · 2 % · 10 % · 2 · 48/56 · 1 of 3 | 290 / 319 · 92 % · 5 % · 48 % · 1 · 54/56 · 3 of 3 |
| 1412 floor 5 (1865, Boca Raton) | 182 / 226 · 94 % · 1 % · 19 % · 1 · 674/874 · 3 of 3 | 544 / 662 · 96 % · 0 % · 60 % · 1 · 803/874 · 3 of 3 |
| **1411 John Demo floor 2** | 175 / 203 · 79 % · 26 % · 24 % · 1 · 40/40 · 3 of 3 (26–76 % of each route inside buildings) | 315 / 390 · 86 % · 12 % (the inferred indoor corridors) · 57 % · 1 · 40/40 · 3 of 3 (the courtyard route runs through the inferred corridor, as it must) |
| 7955 Washington Way | 370 / 583 · 67 % · 27 % · 37 % · 2 · 300/300 · 2 of 3 | 730 / 882 · 91 % · 0 % · 86 % · 1 · 300/300 · 3 of 3 |
| 7954 Sterling College Station | 380 / 523 · 77 % · 20 % · 46 % · 1 · 18/18 · 3 of 3 (62–93 %) | 703 / 844 · 95 % · 0 % · 89 % · 1 · 18/18 · 3 of 3 (93–100 %) |
| 7860 Savannah place | nothing (`no-hallway-layer`) | nothing, same code, now with the reason spelled out (raster background) |

Repeatability: the same file gives the same node ids and coordinates on every run (asserted in `hallways.spec.ts`); a second Detect on a plate with points keeps them (unchanged rule).

**Live application (clone, Connect on :3007):**

| Step | Cypress Terra floor 1 | Jennifer Demo FP floors 1–3 |
|---|---|---|
| Detect, as shipped | "Hallways detected on 1 floorplate · 214 points, 322 paths" — rings and sidewalk fragments (`evidence/live_8005_detect_as_shipped.jpg`) | "No hallways detected · No hallway found" (`evidence/live_1412_detect_as_shipped.jpg`) |
| Detect, this branch | "247 points · 349 paths · the centrelines of the roads, parking, sidewalks and decks · walkways and outlines read from the shared background map · 113 of 113 stops joined" (`evidence/live_8005_detect_street_pass.jpg`) | "65 points · 68 paths · the centrelines of the roads, parking, sidewalks and decks · … · the pavement was recognised by its fill colours — the points are proposals to review" (`evidence/live_1412_detect_street_pass.jpg`) |
| Route on the page before saving | 1101 → 13112: 530 SVG units · 20 points (`evidence/live_8005_route_on_page.jpg`) | no stop on the SVG, by design |
| Save | 247 `hallways` rows (`space svg`, `vector`, `confirmed`, viewBox units), 349 `hallway_edges` (272 `traced` with polylines, 77 `knn`), 113 `hallway_attachments` (`Unit`, explicit, **with anchors** after the `graphDiff` change), `wayfinding_version 0 → 1`, 0 console errors | not saved (proposals; nothing to link) |
| Reload | "247 points · 349 paths", the stored network drawn on the SVG layer, *Save changes* disabled; route on the stored graph 530 SVG units · 20 points (`evidence/live_8005_stored_after_save_reload.jpg`) | — |
| Backend (`rails runner`, `Wayfinding::GraphBuilder` + `TourApi::Routing`) | levels `floorplate:4606/4605/4604 space=svg 1412×932`; 247 hallway nodes, 113 unit nodes, 349 edges; route `unit:1122476 (13102) → unit:1122809 (6102)`: success, 624 px, 1 leg, 17 points, **98 % on pavement, 0 % inside a building** (`metrics/route_8005_13102_6102.json`, `scripts/routeWalk.ts`) | — |

---

## 7. Performance and accuracy

**Metrics used** (all computed against the walkable mask the street pass builds, so the shipped and proposed networks are measured on the same surface; `scripts/harness.ts`):
- *on pavement* — share of 2-unit samples along every path that fall on walkable cells; *inside buildings* — share inside a building fill;
- *centring* — for samples on pavement, the clearance at the sample over the largest clearance within 10 units (1.0 = exactly on the medial axis); shipped 0.67–0.73 on Cypress, proposed 0.75; proposed 0.80–0.90 elsewhere;
- *coverage* — share of walkable cells within 12 units of the network, and within 1.25 × their own clearance + 2 units (so a wide parking lot counts as covered by its aisle centreline);
- *pieces* — connected components; *stops joined* — units with a link; *routes* — Dijkstra between the two most distant stops, the two in the middle thirds, and the two furthest apart vertically, sampled against the masks.

**Acceptance thresholds, taken from what the maps show rather than invented:** on a garden-style Beans property the network should lie ≥ 95 % on pavement and 0 % inside buildings (the rings were the defect), be one piece, join every plotted unit, and cover ≥ 60 % of the walkable surface within 12 units (public roads outside the fence and the interior of wide lots legitimately remain further than 12 units from a centreline). Cypress Terra meets all four; the two Sterling-style properties meet them; the flattened file meets the pavement and connectivity bars and reaches 60 % coverage only by the clearance measure (its wide sidewalk ring is 20–30 units across).

**Time** (node on this Mac, one core; the live page runs the same code in the browser):

| Map | Shipped | Proposed | Of which: open/close · thin · graph |
|---|---|---|---|
| 8005 floor 1 | 0.24 s | 0.81 s | 0.20 · 0.41 · 0.06 |
| 1412 3638 (flattened, 540k walkable cells) | 0.001 s | 1.69 s | 0.24 · 1.40 · 0.05 |
| 1411 1867 (large parking garage) | 0.82 s | 1.64 s | 0.19 · 0.56 · 0.05 |
| 7954 / 7955 | 0.03 / 0.10 s | 0.58 / 0.71 s | |

Memory: the grid is `Uint8Array`/`Float32Array` of ~1.3 M cells (≈ 10 MB transient). Thinning is the cost and grows with the widest surface (passes = half the widest width in cells: 38 on Cypress, 147 on the Chicago lot); `streetCell` is exposed to trade resolution for time (a 1.5-unit cell halves the work). The live Detect on Cypress Terra felt the same as before (the SVG fetch dominates).

---

## 8. Implementation (what this branch contains)

**Engine — Connect (`pyn-connect-web/src/core/utils/wayfinding/hallways/`)**
- `inferStreets.ts` (new): role classification (layer vocabulary with suffix rules, then HSL colour rules; paint inheritance, opacity, `fill="none"` roots, hairline stripes, thin glyph strokes), painter's rasterisation (filled areas and stroked walkways), closing → opening → clearance → thinning → clearance-relative spur pruning → junction tracing, with `mode` (`layers` / `colour` / `mixed`), the building rings and the masks for diagnostics.
- `inferCorridors.ts`: the raster primitives are exported and return counts; the algorithm is unchanged.
- `extract.ts`: `detectHallways` now runs the street pass first (`streets`, `vector` fallback when nothing walkable rasterises), the indoor pass gated by `indoorMinHalfWidth` (default `max(5, 0.3 % of the diagonal)`), unions them, bridges short gaps never through a building and wider gaps through a building as flagged `door_…` proposals, reports `source` (`streets` / `streets+inferred` / `vector` / `inferred` / `both`), `streetsMode`, `components`, `doorBridgeCount`; colour-mode points and door-bridge ends are `pending` with a 0.6 confidence; `streets: false` reproduces the previous engine.
- Card strings (`strings.ts`, `i18n/index.ts`, `wayfinding.generator.ts`, `useMapWayfinding.ts`, `mapState.ts`): "the centrelines of the roads, parking, sidewalks and decks", the colour-mode note, door-bridge and pieces notes, updated no-layer diagnostics.

**Persistence — Connect**
- `mapNodes.generator.ts`: the SVG layer places the stored `space: 'svg'` hallways (the point itself, no icon offset) with their source/review/confidence and draws stored edge rows with their polylines (raster rows unchanged).
- `graphDiff.ts`: stored nodes and edges of the payload's space can be moved and deleted; an SVG-space link carries the stop's SVG anchor (its stored pointer) so the backend can stand a pointer-placed unit on the map.

**Routing — Rails (`app/services/wayfinding/graph_builder.rb`)**
- A floorplate with a floor SVG and no floor image is an SVG-framed level: `space: 'svg'`, width/height from `svg_metadata`, its hallway and edge rows read in SVG space (no icon offset), pointer-placed units placed at their link's anchor. Image levels are untouched; `TourApi::Maps` already serialises `space` and `svg_size`, and the Tour App's map base already frames an image-less level by its viewBox.

**Not changed:** the legacy per-click hallway actions, `ShortestPath`, `ReprojectPlate`, the save protocol (`origin: 'edit'`, R6), the Tour App client.

---

## 9. Regression and acceptance tests

- `pyn-connect-web/tests/e2e/hallways.spec.ts` (pure, no browser): **34 passed**, the 3 failures are the pre-existing POC-fixture parity tests (`ENOENT`, the fixture folder is not on this Mac). Updated and added: the synthetic Beans floor + background (street centreline on the drawn stroke's middle, corridor inferred, one piece, `streets+inferred`); labelled `Walkways` walked along its middle, the indoor gate kept/dropping the corridor (`indoorMinHalfWidth`), `streets: false` reproducing the old engine; a background in another viewBox; a flattened file with pavement → colour mode, every point pending, warning `streets-from-colour`; a flattened file with nothing pavement-coloured → `no-layers`; named layers without pavement → `no-hallway-layer`; the production exports (set `PYN_CONNECT_REAL_SVG_FIXTURES` to a folder holding the files listed in the spec): Cypress Terra → `streets`, layers `Road/Path/BASE/Pool_base/PATH`, 113/113 joined, 0 inferred points, one piece, **identical on a second run**; John Demo → `streets+inferred`, one piece; Jennifer 3638 → colour mode, > 50 points, all pending, one piece, and `no-layers` with the street pass off; 3659 → streets.
- `tests/e2e/wayfindingLogic.spec.ts`: 16 passed. `tsc --noEmit`: clean.
- Rails: `test/services/wayfinding` + `test/services/tour_api`: **45 runs, 214 assertions, 0 failures** after the `GraphBuilder` change.
- Manual, on the clone (§6 live table): detect / route on page / save / reload / route on stored graph / backend route, Cypress Terra floor 1; detect, Jennifer floors 1–3.
- Proposed additions (not written): a Rails test for an SVG-framed level (rows in `svg` space, a unit with an anchored attachment, a route); a Playwright page test that saves a detected SVG network and asserts it after reload; a harness threshold check (`on pavement ≥ 95 %`, `inside buildings = 0 %`, `pieces = 1`) for the three real exports in CI when the fixtures are present.

---

## 10. Reproduce

```bash
# 1. real exports (public bucket, read-only) into a scratch folder, e.g. $A
#    uploads/community/background_svg_image/8005/1790021768-bg.svg, uploads/floorplate/svg_image/4606/1790024432-Floor_1_noBG.svg, …
# 2. harness (from pyn-connect-web): bundles the engine and the scripts
./node_modules/.bin/esbuild ../wayfinding_rnd/scripts/harness.ts --bundle --platform=node --format=esm --outfile=/tmp/harness.mjs
SCRATCH=<folder with assets/ and out/> node /tmp/harness.mjs            # all maps, or name them: 8005_f1 1412_3638
# 3. engine tests with the real exports
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3007 PYN_CONNECT_REAL_SVG_FIXTURES=<fixtures> ./node_modules/.bin/playwright test tests/e2e/hallways.spec.ts
# 4. backend route on the clone
COMMUNITY=8005 FROM=unit:1122476 TO=unit:1122809 TOUR_API=1 TOUR_STOPS=unit:1122476,unit:1122809 \
  DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_audit_clone bundle exec rails runner wayfinding_rnd/scripts/route_check.rb
```

The harness scripts import the engine by absolute path (`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/src/…`); adjust when the checkout moves.

---

## 11. Risks, limitations, next steps (prioritised)

1. **Save protocol (R6).** Connect sends every save as `origin: 'edit'`; the idempotent detection run, merge-onto-existing and server-side undo in `GraphSave` are unused. Send `origin: 'detect'` with the run's `request_id`, `scope` and `detector_source` from `detectionPatch`. Small, contained change; do it before rolling the detector out.
2. **Entrances.** Units link to the nearest network point in a straight line through their own building; 22 of 113 links on Cypress Terra cross *another* building's fill on the way. Beans draws stair/entrance icons (`ST`, 26 on Cypress Terra) — use them (and `Building_number` positions) as the building's entrances so a unit joins the network through its door. The data is in the file; the metric is in the harness.
3. **Public roads outside the fence** (Grant Road, Oak Hollow Drive) are part of the walkable mask and get centrelines. Harmless for routing (farther than any unit), but they add points to review; clip the mask to the property boundary when the export draws one (`BASE`/site outline) or to the convex hull of the buildings plus a margin.
4. **Indoor pass.** The width gate (`0.3 % of the diagonal`, ≥ 5 units) separates drawn margins from corridors on the five exports measured; the real multi-storey corridors of 1865 are not drawn as walkable in that export, so interior routing there still needs a floor plan with corridors. Expose the gate on the card if a property needs tuning.
5. **Colour mode is a proposal mode.** On the flattened Chicago file it recognised the pavement correctly, but a different palette (a grey roof, a grey lawn) would mislead it; everything it produces is `pending`, the card says so, and the reviewer confirms. Ask Beans for layered exports where possible; the flattened file is the only one of the 60 SVG-only Beans properties' sample that lacked names.
6. **Savannah place (7860)** and any "SVG" that is a raster in a `<pattern>`: nothing to read; the card now says so. Raster road segmentation was not attempted (the brief asked for vector maps).
7. **Node count** is 1.2–2× the shipped engine on garden-style maps (247 vs 214 on Cypress; 700 vs 380 on the Sterling properties with their many parking bays). The CMS accepts up to 2,000 nodes per save; the page handles it. A stronger spur limit or a 1.5-unit cell halves it if wanted.
8. **Time** is 0.6–1.7 s per floor in the browser, dominated by thinning on the widest surface; fine for a button, worth a worker if detection ever runs on "All floorplates" over 20+ floors.
9. **Routing frame for mixed properties.** A level with both an image and an SVG keeps routing in raster space (unchanged); `ReprojectPlate` still needs a transform. SVG-only levels route in SVG space now; the Tour App client frames them by the viewBox but its rendering of a Cypress Terra route was not driven here.
10. **`wayfinding_space`** in `Connect::WayfindingSerializer` and the "Not started / Complete" plate status now reflect SVG-space rows on reload (observed "Complete" on floor 1 after the save).

**Rollout order:** (1) save protocol, (2) entrances, then the detector as the default for Beans properties with a review pass on the first 10 (the harness gives the numbers per property before anyone looks).

---

## 12. Files changed on this branch

Rails: `app/services/wayfinding/graph_builder.rb`.
Connect: `src/core/utils/wayfinding/hallways/{inferStreets.ts (new), extract.ts, inferCorridors.ts}`, `src/core/utils/generator/map/{mapNodes.generator.ts, mapState.ts, wayfinding.generator.ts}`, `src/core/utils/wayfinding/graphDiff.ts`, `src/core/hooks/useMapWayfinding.ts`, `src/config/app/strings.ts`, `src/resources/i18n/index.ts`, `tests/e2e/hallways.spec.ts`.
Evidence and tooling: `wayfinding_rnd/` (this report's screenshots and renders, metrics JSON per map, the harness, the SVG inspection scripts, the backend route check).

**Clone residue:** Cypress Terra floor 1 (4606) on `pynwheel_audit_clone` now holds the saved network (247 hallways, 349 edges, 113 attachments, `wayfinding_version 1`); clone user 2181 has a throwaway password set for the browser sign-in. Both are local to the clone. The one earlier test save was deleted before the second (`DELETE … WHERE community_id = 8005`).

---

## 13. Addendum — completion pass (October 25, 2026, later the same day)

The two highest-priority open items of §11 were implemented and verified, and the branch was renamed `improvements/beans-street-hallway-detection`.

- **Save protocol (R6, §11.1) — done.** `graphDiff.ts` saves a level the page only detected on (nothing moved, confirmed or deleted since) as `origin: 'detect'` with `request_id`, `scope` (the run's `plate` / `building` / `all`) and `detector_source` (`vector`, or `inferred` when every point is a proposal). `Wayfinding::GraphSave` then records the run in `hallway_detection_runs` (idempotent on the request id, undoable server-side), merges proposals onto existing points and honours tombstones. An edit after detection falls back to `origin: 'edit'`. Test: `hallways.spec.ts` "a level the page only detected on is saved as a detect run…". Live on the clone: the page detected 210 points / 280 paths; the save wrote one `hallway_detection_runs` row (`applied`, `scope plate`, `detector_source vector`, `space svg`) and the CMS's detect rules merged 30 points that lay within its SVG tolerance (0.4 % of the diagonal, 6.8 units — an entrance split beside a junction) and dropped the 33 links those merges collapsed, leaving 180 points / 247 paths, every row carrying its `detection_run_id`, 113 links with anchors. The reloaded page shows the stored 180 / 247, and the backend route 13102 → 6102 on the merged network is 624.3 px, 16 points, 98 % on pavement, 0 % inside a building (`metrics/route_8005_final.json`).
- **Entrances (§11.2) — done.** `inferStreets` collects the centre of each icon under an entrance layer (`ST`, `Stairs`, `Entrance(s)`, `Door(s)`, `Exit(s)`, `Access`) from the floor file and the background; `detectHallways` aims a stop inside a building outline at that building's nearest entrance (an icon inside or within 0.8 % of the diagonal of the outline) and snaps the entrance to the network, so the link leaves through the door; stops without an entrance keep the nearest-point rule. The connection keeps the stop's own anchor. Reported as `entranceLinks`. Tests: the synthetic Beans fixture (4 of 4 through the `ST` icon, the link's join moves from x 70 to x ≈ 105) and Cypress Terra (113 of 113). Effect on Cypress floor 1: 210 points / 280 paths (fewer split points), 97 % on pavement, 0 % inside buildings, coverage 60 %, one piece, every route on pavement (`evidence/8005_f1_poc.jpg`, `evidence/8005_f1_poc_entrances_crop.jpg`).
- **Wording.** The pending-review panel now says what the proposals are (inferred corridors, colour-recognised pavement, links through a building) instead of "inferred from the floor's footprints and rooms".
- **Rails test added:** `test/services/wayfinding/graph_builder_svg_level_test.rb` — an image-less floorplate is an SVG-framed level (frame from `svg_metadata`, rows read without the icon offset, stored polylines walked), a pointer-placed unit stands at its link anchor and routes, raster rows on an SVG level and SVG rows on an image level are left out. Suites: Connect `hallways.spec.ts` 36 passed (+ the 3 pre-existing POC-fixture failures), `wayfindingLogic.spec.ts` 16 passed, `tsc` clean; Rails `test/services/wayfinding` + `test/services/tour_api` 48 runs, 230 assertions, 0 failures.
- **Still open:** public roads outside the fence (§11.3), the indoor gate on the card (§11.4), raster backgrounds (§11.6), the Tour App client's rendering of an SVG-space route (read, not driven). The `linksThroughOtherBuilding` metric in the harness counts crossings of *any* outline in the building layer, which on Cypress Terra includes two large non-building outlines (`OUTLINE`, the pool court); its value (31) overstates the problem — the overlays show the links leaving at the stair icons.
