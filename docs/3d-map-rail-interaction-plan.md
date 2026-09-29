# 3D Map ↔ Right-Rail Interaction: Work Plan

**Goal:** the Beans 3D map should do everything the 2D map already does with the
right rail: filters, floor selection, floor-plan hover, unit hover, map hover, group
hover and click. Picking and highlighting must land on the actual 3D tile from any
camera angle, tilt or zoom.
**Scope:** `public/sdk/pyn-map-sdk-v1.js` (new map SDK) → `pynwheel-maps`
(`src/components/MapView/MapView.jsx`). The data comes through
`Api::Partner::Maps::SdkController`, and no payload change is needed (§9).
**Out of scope for this plan:** the old CMS map (`app/assets/javascripts/services/beans3dHandler.js`)
and v0 `pyn-map-sdk.js`. Both have the same gaps. §11 shows how to port the fix once it is proven here.
**Beans build studied:** `https://www.beans.ai/mapswidget/js/mapswidget-1.0.4-speed.js`
(32,440 lines) + `https://www.beans.ai/mapswidget/client/utils.js`, ArcGIS JS 4.27.
Line numbers below refer to that file as downloaded on 2026-09-25.
**Test property:** community 34 (`localhost:5173/?propertyId=34`).

---

## 1. TL;DR

The premise that *"the 3D map SDK does not expose exact X/Y coordinates"* is wrong.
Beans exposes no public API for this, but its engine object holds, for every
plotted unit:

- the **footprint polygon** (lng/lat ring),
- the **base elevation** of that unit's floor in metres (`z`),
- the **wall height** in metres,
- the **floor number**,
- the **live Esri `Graphic`** that is drawn in the scene,
- the **ArcGIS `SceneView`** itself (`toScreen`, `hitTest`, `highlight`, camera).

All of it is keyed by the same index as the array we pass to `render()`. That gives an
exact 3D prism for every unit. With that prism we can:

1. **Pick exactly (map → rail).** Replace the current "project the ground footprint and
   guess" hover exit with ArcGIS `hitTest`. `hitTest` ray-casts against the rendered
   extruded geometry, so it is correct from any angle, and it reports when the pointer
   leaves.
2. **Highlight exactly (rail → map).** Put ArcGIS's native highlight on the unit's own
   `Graphic`. It needs no redraw and does not disturb the filter colours.
3. **Anchor exactly.** Project the top-centre of the prism
   (`lng, lat, elevation + height`) to the screen, and re-project whenever the camera
   moves. Tooltips and pointers stay on the tile while the user orbits.
4. **Keep filters and floors composed.** Today a floor change silently throws away the
   filter set, and a filter that arrives before the engine is ready is dropped. Both
   are fixed in the SDK.

No workaround such as screen-scanning, DOM markers or colour-picking is needed.
Everything goes through documented ArcGIS 4.27 APIs, applied to objects Beans already
creates.

---

## 2. How Beans draws a unit (what we can reach)

The index is the join key end to end:

```
SDK _beans3dArr[i]                      (our array, built in _buildBeans3dArr)
  └─ BeansMap.render(..., _beans3dArr)  → engine.addressAndUnitWithOptions[i]
       └─ geocode + building polygons   → engine.unitPolygonsToExclude[i]
            { floor, floorLabel, elevation, coordinates:[ring], description,
              geojson: { properties: { elevation, height, ix:i, title, subtitle } } }
       └─ displayDataFor → selectable GeoJSONLayer  engine.unitsLayer
            feature.attributes = { ix:i, floor, elevation, height, color, title, unitName, … }
       └─ unitsLayer.queryFeatures()    → engine.markers[i]   (Esri Graphic, geometry.centroid)
```

`engine` = `beansWidget.primaryObj` (a `BeansEsri` for 3D). The SDK already resolves it
in `_beans3DInstance()`.

| Need | Where it lives in Beans | Ref (mapswidget-1.0.4-speed.js) |
|---|---|---|
| Footprint ring (lng/lat) | `engine.unitPolygonsToExclude[i].coordinates[0]` | 19780 |
| Base elevation (m) | `engine.unitPolygonsToExclude[i].geojson.properties.elevation` (also `markers[i].attributes.elevation`) | 19766, 29570 |
| Height (m) | `…geojson.properties.height` / `markers[i].attributes.height` | 19767 |
| Floor | `engine.unitPolygonsToExclude[i].floor` / `markers[i].attributes.floor` | 19782 |
| Drawn feature | `engine.markers[i]` (Graphic from `engine.unitsLayer`) | 29688-29694 |
| Unit layer | `engine.unitsLayer` (GeoJSONLayer, `outFields:["*"]`, editing enabled) | 29677-29700, 25815 |
| Scene | `engine.mapView` (ArcGIS `SceneView`) | 26007 |
| Real camera fly-to | `engine.mapView.goto` (**lowercase**, because Beans replaced `goTo` with a no-op) | 26027-26029 |
| Graphic constructor | `engine.GraphicCtor` | 25940 |
| Colour lookup table | `engine.colorMap` (`"#hex:opacity"` → colour code) | 25805, 29356 |

How the z is rendered: unit layers use `elevationInfo` in `absolute-height` mode with
`$feature.elevation`. `offsetGroundElevation` is added only when `useGroundElevation` is
on (`makeElevationInfo`, 25315). We pass neither option, and without
`useGroundElevation` the scene `Map` has no elevation ground (25959-25970). So the
bottom of a unit prism is at **z = elevation** and the top is at
**z = elevation + height**, in metres. Beans itself anchors its popup the same way, at
`elevation + 3` (`positionPopupOverGraphic`, 25771).

How Beans hovers: `mapView.on('pointer-move')` → `mapView.hitTest(event)`. It ranks the
results, skips rows outside `filteredRows` and other floors, then calls our
`onHover(onClickData, event)` (26182-26335). It **never** reports "nothing under the
cursor"; in that branch it only hides its own popup (26275). Hover is off on mobile
(`!so.ui.isMobileView`).

---

## 3. Why the 3D map does not interact today (root causes)

1. **The rail effects are switched off in 3D.** `MapView.jsx` returns early on
   `isThreeDMode` in the floor-plan hover effect (~1941), the unit hover effect (~1994),
   the map-hover group effect (~2070) and the amenity hover effect (~2132). The rail
   has nothing to call because the SDK has no 3D "highlight this unit" primitive.
   `highlightUnits()` in 3D rewrites `filteredRows` and forces a redraw, which would
   also clobber the filter set.
2. **The hover-exit polygon test never runs in the new map.** `_unit3DScreenRing()`
   needs `window.__esri.geometry.Point`. Only the old CMS map sets that global, in
   `app/assets/javascripts/eventBinders/delayedEvents.js`. The SDK never loads that
   file, so the ring is always `null` and hover exit falls back to a **30 px drift
   radius**. That explains the tooltip that sticks or vanishes early.
3. **Even when it runs, the polygon test is at the wrong height.** The ring is
   projected at the ground (`z` omitted, which means 0). At the default tilt of 65°, the
   footprint of a 5th-floor unit projected at ground level lands well below the tile
   the user actually sees. The old map's `get3DUnitScreenPosition` has the same bug.
4. **A floor change discards the filter set.** `changeFloor()` in 3D sets
   `filteredRows` to *every* unit on that floor (`_beans3dIndicesForFloor`), not
   *filtered ∩ floor*. The engine-ready replay (`_init3DMap`, ~2677) does the same.
5. **A filter applied before the engine is ready is lost.** `_update3DFilter` returns
   early when `mapView.ready` is false, and the ready poll replays only the floor. A
   property that boots straight into 3D (`availableViews === "3d"`) therefore starts
   with no filters applied.
6. **Beans' own highlight hooks are unused.** `beans3dHandler.js`
   `highlight3DUnit()` is a no-op ("redraw resets colours"). That is true for the
   *colour* route but not for `highlight()` on the graphic, which is independent of
   the colour codes.

---

## 4. Parity matrix

"2D today" is the behaviour implemented in `MapView.jsx` + SDK for SVG/image maps.

| # | Scenario | 2D today | 3D today | 3D target |
|---|---|---|---|---|
| S1 | Filters (beds, availability, sq ft, price) | matching units coloured, others dropped + non-interactive | `filteredRows` recolour works, but is lost on floor change / pre-ready (§3.4-5) | same as 2D; composed with floor |
| S2 | Floor tab (incl. "All") | show that floorplate | `selectedFloor` stacks floors ≤ N; filter lost | floor ∩ filters; "All" = filters only |
| S3 | Hover floor plan card in rail | its units highlighted, others dimmed, amenities dimmed | nothing | its units highlighted in 3D (halo + fill), others dimmed |
| S4 | Hover unit card in rail | unit highlighted, others dimmed | nothing | unit highlighted in 3D; anchor marker at tile top; off-screen/occluded hint |
| S5 | Hover unit on map | tooltip at unit, `onUnitHover` | tooltip, but exit is guessed (§3.2-3) | exact enter/exit from any angle via `hitTest` |
| S6 | Map hover group ("Highlight all units on hover") | whole floor plan highlighted | disabled | same as 2D |
| S7 | Click unit on map | unit modal | works (`onSelect`) | unchanged + selected-unit highlight persists while modal open |
| S8 | Click unit / floor plan card in rail | opens modal | opens modal | unchanged; optional "show on map" camera fly (decision D2) |
| S9 | Hover filtered-out unit on map | no response | Beans already skips rows outside `filteredRows` | unchanged |
| S10 | Hover amenity in rail | tooltip over the amenity pin | disabled | phase 3 (§6.8) |
| S11 | Mobile | tap → modal | tap → modal | unchanged (no hover on touch) |
| S12 | Switch 2D ↔ 3D mid-hover | n/a | hover cleared | hover + highlight cleared, re-applied from rail state on entry |

---

## 5. Design: one spatial index, four primitives

Everything lives in the SDK. React never touches Beans or Esri objects. It keeps calling
SDK methods with unit ids, as it does for 2D.

### 5.1 `Unit3DIndex`: the x/y/z scan

This is the "scan x/y/z after plotting and associate with rail objects" idea, done from
Beans' own geometry instead of from pixels.

For each index `i` in `_beans3dArr`:

```js
{
  ix, unitId, floor,
  ring:     [[lng, lat], …],        // unitPolygonsToExclude[i].coordinates[0]
  baseZ:    elevation (+ offsetGroundElevation when useGroundElevation),
  topZ:     baseZ + height,
  centroid: { lng, lat },           // markers[i].geometry.centroid, else ring centroid
  graphic:  markers[i] | null,      // live Esri Graphic for highlight
  mapped:   true | false            // false = Beans placeholder (coordinates: [])
}
```

- **Built lazily and invalidated by identity.** A full `displayDataFor` rebuilds
  `engine.unitsLayer` and refills `engine.markers`, which is async
  (`queryFeatures().then`). The index is stored together with the `unitsLayer` it was
  built from. Any read whose `engine.unitsLayer !== cached.layer` rebuilds it.
  `redraw()` (`displayDataFor(ix, true, true)`) keeps the same layer, so filter changes
  cost nothing.
- **Id mapping** goes through the existing `_toBaseIds` → `_beans3dIndicesForUnitIds`, so
  student-housing bedroom/space ids resolve to their door.
- **Coverage:** units whose Beans entry is the placeholder (`floor:1, coordinates:[]`,
  19793) are `mapped:false`. The SDK logs them once and exposes them through
  `get3DCoverage()` for QA, because these are units Beans has no polygon for. The
  rail can still list them. They just have no tile.

### 5.2 Pick: exact map → rail hover (replaces the drift/ground-ring logic)

The SDK attaches its own listener to the same `SceneView`:

```js
view.on("pointer-move", e => {           // rAF-throttled, desktop only
  const seq = ++this._3dPickSeq;
  view.hitTest(e, { include: [engine.unitsLayer] }).then(r => {
    if (seq !== this._3dPickSeq) return;  // stale async result
    const g  = r.results.find(x => x.graphic?.attributes?.ix != null)?.graphic;
    const ix = g ? g.attributes.ix : null;
    // honour filteredRows + selectedFloor exactly like Beans' pre-scan (26257-26262)
    this._set3DHoverIx(isPickable(ix) ? ix : null);
  });
});
view.on("pointer-leave", () => this._set3DHoverIx(null));
```

- `hitTest` intersects the rendered extruded mesh, so it is correct at any
  tilt/heading/zoom and for any floor. It resolves the front-most tile, so a unit
  hidden behind another cannot be hovered through it.
- Enter and leave both come from here, so the SDK now emits `onUnitHover(null)` when
  the pointer reaches open ground. That removes `_3D_HOVER_EXIT_RADIUS_PX`,
  `_3dHoverOrigin`, `_is3DPointerInsideUnit`, `_unit3DScreenRing`, the `window.__esri`
  dependency and the document-level `mousemove` tracker.
- Beans' `onHover` callback remains only as a no-op fallback in case `hitTest` is
  unavailable (feature-detected).
- `pointer-move` with `event.buttons > 0` (orbiting) is ignored, as in Beans.

### 5.3 Highlight: exact rail → map, with no redraw

```js
const lv = await view.whenLayerView(engine.unitsLayer);
this._3dHoverHandle?.remove();
this._3dHoverHandle = lv.highlight(graphics);   // one or many (floor-plan group)
```

- The highlight style is `view.highlightOptions`. Beans sets it at construction from
  `displayOptions.highlightOptions` (26011), defaulting to green. We pass
  `highlightOptions` built from the property's hover colour
  (`unitColors.hover`/`available`), the same colour 2D uses in `selectUnit`.
- Highlight does not touch the `color` attribute or `filteredRows`, so it survives
  `redraw()` and never conflicts with filters. That is exactly why the old map's
  colour-based attempt was abandoned.
- Beans' own selected-unit highlight (`engine.highlight`, 29857) only exists when
  `currentIx` is set. We never set `currentIx` (Beans card is hidden), so the two do not
  fight. **Spike check:** Beans calls `mapView.highlight(...)`. Confirm in 4.27 whether
  that exists on `SceneView` or whether only `LayerView.highlight` works. We use
  `LayerView.highlight` either way.
- **Dimming the rest** (2D does it at opacity 0.8) is a second, optional pass. Step 1
  ships halo only. Step 2 rewrites the `color` attribute of *non-group* graphics to the
  already-registered dim code (`engine.colorMap["#ffffff:0.7"]`, i.e. `defaultUnitShape`)
  with one `engine.unitsLayer.applyEdits({updateFeatures})`, and restores on leave. We
  deliberately avoid `redraw()` on hover, because it runs `displayPOIFor` and would
  flicker the amenity pins on every card hover.

### 5.4 Anchor: exact screen position that follows the camera

```js
screenAnchor(ix) → view.toScreen(new Point({ longitude, latitude, z: topZ,
                                             spatialReference: view.spatialReference }))
```

- The anchor is the **top-centre of the prism**. Beans' balloon and popup use the same
  point, so our tooltip lines up with Beans visuals.
- `Point` comes from `engine.markers[ix].geometry.centroid.clone()` (already a real Esri
  `Point`), with `.z = topZ`. Fallback: `require(["esri/geometry/Point"])` once, cached
  on the SDK. We never read `window.__esri` again.
- **Follows orbit/zoom:** while a rail hover or a map tooltip is active, the SDK watches
  `view.camera` (the same watcher pattern Beans uses at 26091) and re-emits the anchor
  through a new callback `onUnitAnchor({ unitId, x, y, visible, onScreen })`, throttled
  with rAF.
- **Visibility from any angle:** after projecting, run `view.hitTest(anchor, { include:
  [unitsLayer] })`. If the front-most result is the same `ix`, the tile is `visible`.
  Otherwise it is occluded (inner unit, far side of the building, a floor above it on
  "All"). If `toScreen` falls outside the container, it is `onScreen:false`. React uses
  these to draw an edge pointer or an "on the far side" hint instead of a tooltip in
  empty air (decision D1).
- The map-hover tooltip (S5) also switches from "where the cursor entered" to the unit
  anchor. That is steadier, and it matches where Beans' own popup would sit.

### 5.5 Focus (optional): bring a unit into view

`focus3DUnit(unitId)` → `view.goto({ target: graphic, tilt: current, heading: current },
{ duration: 600 })`. This must be **`goto`, lowercase**, because `goTo` is a no-op
(26028). If the unit's floor is above the selected floor, the SDK tells React to switch
floors first (`onActiveFloorChange`). It runs on click only, never on hover (decision D2).

### 5.6 Filters × floor: composition fix

A single source of truth in the SDK:

```js
this._3dFilterIds  // last highlightUnits(ids) from React, null = no filter
this._beans3dFloor // null = All
rows = indices(filterIds ?? all) ∩ (floor == null ? all : indicesForFloor(floor))
```

- `highlightUnits(ids)` in 3D stores `_3dFilterIds`, then recomputes. `changeFloor(n)`
  stores the floor, then recomputes. Neither overwrites the other.
- The engine-ready poll replays **both**. A call made before ready is queued, not
  dropped.
- Rail-hover calls must **not** go through `highlightUnits` in 3D. They use §5.3.
  `highlightUnits` remains the filter channel only. This is the key separation that
  2D does not need, because there a restore is cheap.

### 5.7 Floor-plan group (S3, S6)

`getHoverGroupUnits()` already resolves the group across all floors in 3D
(`_hoverGroupPool`). The group is intersected with the currently visible rows
(filters ∩ floor) and handed to §5.3 as one `highlight([...graphics])` call. The halo
shows every matching tile, including ones on other stacked floors on "All".

### 5.8 Amenities (S10, phase 3)

The SDK does not send amenities into Beans (the unit array is units only). The pins
seen in 3D are Beans' own POIs and dock amenities, resolved by name
(`_amenityForDesc` / `_dockAmenityForGraphic`, 26296). Beans reports an amenity hover as
`onHover(title, event, true)`. Rail → map parity needs a name map from Pynwheel amenity
→ Beans POI graphic (`engine.previousCustomMarkerObj` / `engine.mapGraphics`). The same
anchor and highlight primitives then apply. This is a separate slice because the
matching rule needs product sign-off.

---

## 6. SDK API additions (`pyn-map-sdk-v1.js`)

All additions are additive. 2D behaviour does not change.

| Method / callback | Purpose |
|---|---|
| `hoverUnits(unitIds \| null)` | Rail hover channel, all renderers. 3D: §5.3 highlight (+ optional dim). 2D: delegates to the existing highlight + dim path so React can drop its renderer branch later. `null` restores. |
| `get3DUnitAnchor(unitId)` → `{x, y, visible, onScreen} \| null` | One-shot §5.4 projection (container-relative + viewport). |
| `onUnitAnchor` (config callback) | Streams anchor updates while a hover is active and the camera moves. |
| `focusUnit(unitId)` | §5.5 (3D) / no-op in 2D for now. |
| `get3DCoverage()` → `{ mapped: [...ids], unmapped: [...ids] }` | QA / support. |
| `onUnitHover(unit \| null)` | Unchanged signature. In 3D it is now driven by `hitTest` and emits `null` on exit. |

Internal changes: `_3dFilterIds`, `_recompute3DRows()`, the ready-poll replay,
`_unit3DIndex()`, `_bind3DPicking()` / `_unbind3DPicking()` (removed in `destroy()` and on
`switchTo2DMap`), and deletion of the drift/ground-ring code (§5.2).

---

## 7. React changes (`pynwheel-maps`)

1. **Floor-plan and unit rail hover effects (~1941, ~1994):** stop returning on
   `isThreeDMode`. In 3D, call `PynMapSDK.hoverUnits(ids)` / `hoverUnits(null)`
   instead of `highlightUnits` + `applyUnitDimming`. The DOM dimming helpers do nothing
   in 3D (no `[data-pyn-unit-pid]` nodes), which is harmless.
2. **Map-hover group effect (~2070):** drop the `!isThreeDMode` term and use
   `hoverUnits(groupIds)` in 3D. The existing comment in the file already anticipates
   this.
3. **3D map tooltip:** position from `onUnitAnchor` / `get3DUnitAnchor` instead of
   `lastMousePosRef`. Hide when `onScreen === false`. When `visible === false`, show it
   in a muted "behind" style (D1). Remove the 3D-specific "never reposition" branch
   (~1002) now that the SDK's exit is exact.
4. **Rail unit hover in 3D (S4):** show the lightweight anchor marker (a pin/pulse at
   the anchor), since in 3D the unit is often not obvious even when highlighted.
   2D has no need for this. This is an intentional 3D-only addition, not a parity gap.
5. **Mode switch (S12):** on entering 3D, re-apply the current rail hover state once
   the SDK reports ready. On leaving, call `hoverUnits(null)`.

---

## 8. Delivery plan

| # | Step | Repo | Acceptance |
|---|---|---|---|
| 0 | **Spike** (½ day, throwaway): in DevTools on community 34, reach `PynMapSDK._beans3DInstance()`, and check `hitTest` with `include`, `LayerView.highlight`, `toScreen` at `topZ` across tilt 20°-85° and all headings, and `goto`. Record anything that differs from this plan. | — | screenshots of the anchor dot on the tile top at 4 headings × 3 tilts, all floors |
| 1 | Filter × floor composition + pre-ready queue (§5.6) | SDK | S1/S2: apply bed filter, switch floors 1→3→All, filter stays; boot a 3D-only property with a deep-linked filter |
| 2 | `Unit3DIndex` + `get3DCoverage` (§5.1) | SDK | index rebuilds after a full redraw (toggle satellite); coverage lists match Beans placeholders |
| 3 | Exact picking (§5.2), remove drift code | SDK | S5: enter/leave within 1 tile edge at any angle; no stuck tooltip on open ground; occluded unit not hoverable |
| 4 | `hoverUnits` highlight (§5.3, halo only) | SDK | S3/S4 work in the console; filters untouched after hover ends |
| 5 | Anchor + `onUnitAnchor` (§5.4) | SDK | anchor stays on the tile while orbiting; `visible`/`onScreen` flip correctly |
| 6 | React wiring (§7.1-7.3, 7.5) | maps | parity matrix S1-S9, S11, S12 pass |
| 7 | Dim-the-rest pass (§5.3 step 2) + group hover (§5.7, S6) | SDK + maps | matches 2D look; no POI flicker |
| 8 | Rail-hover anchor marker + optional focus (§7.4, §5.5) | both | per D1/D2 |
| 9 | Amenities (§5.8, S10) | both | after product sign-off on name matching |
| 10 | Port to the old CMS map (§11) | Rails | optional |

Steps 1-6 are the minimum for "3D behaves like 2D". Steps 7-9 are polish and extensions.

---

## 9. Backend

No change is required. The payload already carries `unitId`, `floor`, `floorplanId` /
`floorplanName` and `beans3dConfig`. One optional improvement: expose
`beans3dConfig.highlightColor` if the product wants a 3D highlight colour distinct from
the 2D hover colour.

---

## 10. Risks and gotchas

- **Beans internals are not a public contract.** `primaryObj`, `unitsLayer`, `markers`
  and `unitPolygonsToExclude` could change in a future `mapswidget` build. Mitigation:
  the URL is pinned (`1.0.4-speed`), every access is feature-detected, and missing
  internals degrade to today's behaviour (Beans `onHover`, no rail highlight) with a
  single console warning. The spike (step 0) gives a quick regression check whenever
  the Beans URL is bumped.
- **`goTo` is a no-op.** Use `mapView.goto`. Calling `goTo` fails silently.
- **Async `hitTest` ordering.** Guard it with a sequence counter (§5.2), or a fast
  swipe will flash the wrong unit.
- **`markers` fill asynchronously and are sparse** (only selectable units, only after
  `queryFeatures`). Always read through the index, which treats a missing graphic as
  "not yet". Never cache `markers[i]` across a full redraw.
- **Full `displayDataFor` swaps layers.** The old layers are removed after 200 ms
  (29744). Highlight handles on the old `LayerView` die with them, so re-apply the
  active hover after an index rebuild.
- **Units above the selected floor are hidden** (`definitionExpression floor <= N`,
  29818). Rail hover for such a unit gets `visible:false` plus a floor hint, never a
  tooltip in empty air.
- **Placeholder units** (Beans found no polygon) cannot be highlighted. `get3DCoverage`
  makes that visible, so it does not look like our bug.
- **Performance:** `hitTest` on every `pointer-move` is how Beans already works. Ours is
  rAF-throttled and limited to one layer, so the cost is lower than Beans' own handler.
- **Satellite / shadow / immersive toggles** run a full `displayDataFor` (new layers).
  They are covered by the identity-based index rebuild.

---

## 11. Porting to the old CMS map

`beans3dHandler.js` has the same holes: `highlight3DUnit` is a no-op, and
`get3DUnitScreenPosition` projects at z = 0. Once steps 2-5 are proven, move the
picking, highlight and anchor code into a small shared module
(`public/sdk/beans-3d-geometry.js`) that both the SDK and the CMS page load. The CMS
page then replaces its `mouseTracker`-based exit and the no-op highlight. This is kept
separate so the new map is not blocked on old-map QA.

---

## 12. Test plan (community 34 + one tall property)

Run each scenario at **tilt 30° / 65° / 85°**, **headings 0° / 90° / 180° / 270°**, zoomed
in and out, on **floor 1, a middle floor, the top floor and All**:

- S1-S2: filters survive floor switches and the 2D↔3D round-trip.
- S3-S4: rail hover highlights the right tiles. The halo clears on leave. Filter
  colours are unchanged afterwards.
- S5: sweep the cursor across a tile edge onto open ground. The tooltip closes
  immediately and never lingers. The tooltip stays anchored on the tile while dragging
  the camera (hover resumes after the drag).
- Occlusion: on All, hover the rail card of an inner or low unit. The anchor reports
  `visible:false`, and the UI shows the "behind" state instead of a floating tooltip.
- S7: the unit modal opens from a map click at any angle. The highlight persists while
  the modal is open.
- S11: iPhone/iPad Safari: tap opens the modal, and no hover code runs.
- Regression: the 2D map (SVG + image maps) is unchanged.

---

## 13. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| D1 | Rail hover of an occluded or off-screen unit: what do we show? | Muted anchor marker + "Floor N · behind building" chip; no auto camera move on hover |
| D2 | Should clicking a rail card also fly the 3D camera to the unit? | Yes, on click only, keeping the current tilt/heading; opening the modal stays primary |
| D3 | Dim non-hovered units in 3D (2D does at 0.8)? | Ship halo-only first (step 4), then add dimming (step 7) if the halo alone is not clear enough on busy buildings |
| D4 | 3D highlight colour | Reuse the property's 2D hover colour; add a CMS field only if design asks |
